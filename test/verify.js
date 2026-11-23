const http = require('http');

function request(options, postData) {
  return new Promise((resolve, reject) => {
    const payload = postData ? (typeof postData === 'string' ? postData : JSON.stringify(postData)) : null;
    const headers = { ...(options.headers || {}) };
    if (payload) {
      headers['Content-Type'] = headers['Content-Type'] || 'application/json';
      headers['Content-Length'] = Buffer.byteLength(payload);
    }

    const req = http.request({ ...options, headers }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, headers: res.headers, data: parsed });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, raw: data });
        }
      });
    });
    req.on('error', reject);
    if (payload) {
      req.write(payload);
    }
    req.end();
  });
}

async function runTests() {
  console.log('--- Starting Integration Tests ---');

  // 1. Check System Status
  console.log('1. Testing /api/system/status...');
  const sysStatus = await request({
    hostname: '127.0.0.1',
    port: 5000,
    path: '/api/system/status',
    method: 'GET'
  });
  console.log('System Status response:', sysStatus.status, sysStatus.data);
  if (sysStatus.status !== 200) throw new Error('Status endpoint failed');

  // 2. Register a new user
  const testEmail = `test_${Date.now()}@example.com`;
  const testAuthHash = 'mock_auth_hash_from_client_sha256_' + Math.random().toString(36).substring(2);
  const testSalt = 'mock_salt_32_bytes_hex_abc1234567890';
  const testPinHash = 'mock_client_pin_hash_123456_sha256';

  console.log(`2. Testing registration with email ${testEmail} and 6-digit PIN...`);
  const regRes = await request({
    hostname: '127.0.0.1',
    port: 5000,
    path: '/api/auth/register',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    email: testEmail,
    authHash: testAuthHash,
    masterSalt: testSalt,
    pinHash: testPinHash
  });
  console.log('Register response:', regRes.status, regRes.data);
  if (regRes.status !== 201) throw new Error('Registration failed');
  if (regRes.data.user.hasPin !== true) throw new Error('PIN status was not true on registration');
  const token = regRes.data.token;

  // 3. Test salt retrieval
  console.log('3. Testing salt retrieval...');
  const saltRes = await request({
    hostname: '127.0.0.1',
    port: 5000,
    path: '/api/auth/salt',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: testEmail });
  console.log('Salt response:', saltRes.status, saltRes.data);
  if (saltRes.data.salt !== testSalt) throw new Error('Salt mismatch');

  // 4. Test login
  console.log('4. Testing login...');
  const loginRes = await request({
    hostname: '127.0.0.1',
    port: 5000,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    email: testEmail,
    authHash: testAuthHash
  });
  console.log('Login response:', loginRes.status, loginRes.data);
  if (loginRes.status !== 200) throw new Error('Login failed');

  // 5. Create a vault item
  console.log('5. Testing item creation...');
  const createRes = await request({
    hostname: '127.0.0.1',
    port: 5000,
    path: '/api/vault/items',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  }, {
    title: 'GitHub Test Account',
    category: 'login',
    website: 'https://github.com',
    username: 'dev_user',
    favorite: true,
    encryptedData: {
      iv: 'random_iv_base64_==',
      ciphertext: 'encrypted_mock_ciphertext_=='
    }
  });
  console.log('Create item response:', createRes.status, createRes.data);
  if (createRes.status !== 201) throw new Error('Create item failed');
  const itemId = createRes.data.item._id;

  // 6. Retrieve items
  console.log('6. Testing get items...');
  const getRes = await request({
    hostname: '127.0.0.1',
    port: 5000,
    path: '/api/vault/items',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log('Get items count:', getRes.data.items.length);
  if (getRes.data.items.length === 0) throw new Error('Item not found in vault');

  // 7. Toggle favorite
  console.log('7. Testing toggle favorite...');
  const favRes = await request({
    hostname: '127.0.0.1',
    port: 5000,
    path: `/api/vault/items/${itemId}/favorite`,
    method: 'PATCH',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log('Toggle favorite result:', favRes.data.item.favorite);

  // 8. Delete item
  console.log('8. Testing delete item...');
  const delRes = await request({
    hostname: '127.0.0.1',
    port: 5000,
    path: `/api/vault/items/${itemId}`,
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log('Delete response:', delRes.status, delRes.data);
  if (delRes.status !== 200) throw new Error('Delete failed');

  // 9. Testing 6-Digit PIN Verification
  console.log('9. Testing 6-Digit PIN Verification (Invalid PIN)...');
  const wrongPinRes = await request({
    hostname: '127.0.0.1',
    port: 5000,
    path: '/api/auth/verify-pin',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  }, { pinHash: 'wrong_pin_hash_000000' });
  console.log('Invalid PIN response:', wrongPinRes.status, wrongPinRes.data);
  if (wrongPinRes.status !== 401 || wrongPinRes.data.valid !== false) {
    throw new Error('Expected invalid PIN to return 401');
  }

  console.log('10. Testing 6-Digit PIN Verification (Valid PIN)...');
  const correctPinRes = await request({
    hostname: '127.0.0.1',
    port: 5000,
    path: '/api/auth/verify-pin',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  }, { pinHash: testPinHash });
  console.log('Valid PIN response:', correctPinRes.status, correctPinRes.data);
  if (correctPinRes.status !== 200 || correctPinRes.data.valid !== true) {
    throw new Error('Expected correct PIN to verify successfully');
  }

  // 11. Testing Setting / Updating PIN
  console.log('11. Testing Updating 6-Digit PIN...');
  const newPinHash = 'mock_new_pin_hash_987654_sha256';
  const updatePinRes = await request({
    hostname: '127.0.0.1',
    port: 5000,
    path: '/api/auth/set-pin',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  }, { pinHash: newPinHash });
  console.log('Update PIN response:', updatePinRes.status, updatePinRes.data);
  if (updatePinRes.status !== 200 || updatePinRes.data.hasPin !== true) {
    throw new Error('Expected set-pin to return 200 with hasPin true');
  }

  // Verify new PIN works
  const verifyNewPinRes = await request({
    hostname: '127.0.0.1',
    port: 5000,
    path: '/api/auth/verify-pin',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  }, { pinHash: newPinHash });
  console.log('Verify new PIN response:', verifyNewPinRes.status, verifyNewPinRes.data);
  if (verifyNewPinRes.status !== 200 || verifyNewPinRes.data.valid !== true) {
    throw new Error('Expected new PIN to verify successfully');
  }

  console.log('--- ALL INTEGRATION & 6-DIGIT PIN TESTS PASSED! ---');
}

runTests().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});

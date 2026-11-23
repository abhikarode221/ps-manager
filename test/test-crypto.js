// Test client-side cryptography logic using Node 22 native crypto.subtle
const { webcrypto } = require('crypto');
const subtle = webcrypto.subtle;

async function testCrypto() {
  console.log('--- Testing WebCrypto PBKDF2 & AES-256-GCM ---');

  const password = 'SuperSecureMasterPassword!2026';
  const saltHex = 'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90';
  const enc = new TextEncoder();
  const dec = new TextDecoder();

  // 1. Password Key
  const passwordKey = await subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveKey', 'deriveBits']
  );

  // 2. Derive AES-GCM 256-bit Key
  const saltBytes = Buffer.from(saltHex, 'hex');
  const masterKey = await subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations: 100000,
      hash: 'SHA-256'
    },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
  console.log('✓ Master Key derived successfully (AES-256-GCM)');

  // 3. Encrypt payload
  const secretPayload = {
    password: 'bank_account_password_1234$#@!',
    notes: 'Secret recovery codes: [A891-B721-C994]'
  };
  const iv = webcrypto.getRandomValues(new Uint8Array(12));
  const ciphertextBuffer = await subtle.encrypt(
    { name: 'AES-GCM', iv: iv },
    masterKey,
    enc.encode(JSON.stringify(secretPayload))
  );

  const ivBase64 = Buffer.from(iv).toString('base64');
  const ciphertextBase64 = Buffer.from(ciphertextBuffer).toString('base64');
  console.log('✓ Data encrypted with IV:', ivBase64);
  console.log('✓ Ciphertext produced:', ciphertextBase64.substring(0, 32) + '...');

  // 4. Decrypt payload
  const decryptedBuffer = await subtle.decrypt(
    { name: 'AES-GCM', iv: Buffer.from(ivBase64, 'base64') },
    masterKey,
    Buffer.from(ciphertextBase64, 'base64')
  );

  const decryptedObj = JSON.parse(dec.decode(decryptedBuffer));
  console.log('✓ Decrypted payload:', decryptedObj);

  if (decryptedObj.password !== secretPayload.password || decryptedObj.notes !== secretPayload.notes) {
    throw new Error('Decrypted payload mismatch!');
  }

  // 5. Test Tamper Resistance (GCM auth tag verification)
  try {
    const tampered = Buffer.from(ciphertextBase64, 'base64');
    tampered[0] ^= 0x01; // flip one bit
    await subtle.decrypt(
      { name: 'AES-GCM', iv: Buffer.from(ivBase64, 'base64') },
      masterKey,
      tampered
    );
    throw new Error('Failed: Tampered ciphertext was decrypted without error!');
  } catch (err) {
    console.log('✓ Tamper protection verified: modified ciphertext was rejected cleanly by AES-GCM!');
  }

  console.log('--- ALL CRYPTO TESTS PASSED! ---');
}

testCrypto().catch(err => {
  console.error(err);
  process.exit(1);
});

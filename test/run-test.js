const { spawn } = require('child_process');
const path = require('path');

const serverProcess = spawn('node', [path.join(__dirname, '../src/server.js')], {
  stdio: ['ignore', 'pipe', 'pipe']
});

let serverStarted = false;

serverProcess.stdout.on('data', data => {
  const str = data.toString();
  process.stdout.write('[Server] ' + str);
  if (str.includes('running on http://localhost:5000') || str.includes('AetherVault Server running')) {
    if (!serverStarted) {
      serverStarted = true;
      runTests();
    }
  }
});

serverProcess.stderr.on('data', data => {
  process.stderr.write('[Server Err] ' + data.toString());
});

function runTests() {
  setTimeout(() => {
    const testProcess = spawn('node', [path.join(__dirname, 'verify.js')], {
      stdio: 'inherit'
    });

    testProcess.on('exit', code => {
      console.log('Tests exited with code:', code);
      serverProcess.kill();
      process.exit(code);
    });
  }, 1000);
}

// Safety timeout 30s
setTimeout(() => {
  if (!serverStarted) {
    console.error('Server failed to start within timeout');
    serverProcess.kill();
    process.exit(1);
  }
}, 30000);

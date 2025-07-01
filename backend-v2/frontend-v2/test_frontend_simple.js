const { spawn } = require('child_process');
const path = require('path');

console.log('Starting frontend server...');
console.log('Working directory:', process.cwd());

const npm = spawn('npm', ['run', 'dev'], {
  cwd: path.resolve(__dirname),
  env: { ...process.env, NODE_ENV: 'development' },
  stdio: 'pipe'
});

npm.stdout.on('data', (data) => {
  console.log(`[STDOUT]: ${data.toString()}`);
});

npm.stderr.on('data', (data) => {
  console.error(`[STDERR]: ${data.toString()}`);
});

npm.on('error', (error) => {
  console.error(`[ERROR]: Failed to start process: ${error.message}`);
});

npm.on('close', (code) => {
  console.log(`[EXIT]: Process exited with code ${code}`);
});

// Give it some time to start
setTimeout(() => {
  console.log('\nChecking if server is accessible...');
  const http = require('http');
  
  http.get('http://localhost:3000', (res) => {
    console.log(`Server responded with status: ${res.statusCode}`);
    res.on('data', () => {}); // Consume response
  }).on('error', (err) => {
    console.error('Failed to connect to server:', err.message);
  });
}, 5000);

// Keep the script running
process.on('SIGINT', () => {
  console.log('\nStopping server...');
  npm.kill();
  process.exit();
});
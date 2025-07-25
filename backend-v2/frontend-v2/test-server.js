const http = require('http');

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end('<h1>Test Server Working!</h1>');
});

server.listen(3006, '0.0.0.0', () => {
  console.log('Test server running at http://localhost:3006');
});

server.on('error', (err) => {
  console.error('Server error:', err);
});
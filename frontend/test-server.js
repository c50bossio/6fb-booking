const http = require('http');

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Test server is working!\n');
});

const PORT = 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Test server running at http://localhost:${PORT}/`);
  console.log(`Also available at http://0.0.0.0:${PORT}/`);
  console.log(`And at http://127.0.0.1:${PORT}/`);
});

const http = require('http');

function keepAlive() {
  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Server is alive');
  });
  
  // Use 0.0.0.0 instead of localhost to make it accessible from outside
  server.listen(8080, '0.0.0.0', () => {
    console.log('Keep-alive server running on port 8080');
  });
}

module.exports = keepAlive;

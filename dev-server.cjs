const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const allowed = new Set(['demo.js', 'query.js', 'inline.js','history.js','content.js','json-viewer.js','log-copy.js']);
const server = http.createServer((request, response) => {
  const route = new URL(request.url, 'http://127.0.0.1').pathname;
  const name = ['/', '/explore', '/grafana/explore', '/ordinary'].includes(route) ? 'demo.html' : route.slice(1);
  if (name !== 'demo.html' && !allowed.has(name)) { response.writeHead(404); response.end(); return; }
  response.setHeader('Content-Type', name.endsWith('.html') ? 'text/html; charset=utf-8' : 'text/javascript; charset=utf-8');
  response.setHeader('Cache-Control', 'no-store');
  response.end(fs.readFileSync(path.join(__dirname, name)));
});
server.listen(4178, '127.0.0.1', () => console.log('Demo: http://127.0.0.1:4178/explore'));

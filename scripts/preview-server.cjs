// Dependency-free local preview; production remains GitHub Pages.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const option = (name, fallback) => args.includes(name) ? args[args.indexOf(name) + 1] : fallback;
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.json':'application/json','.mp3':'audio/mpeg','.woff2':'font/woff2'};
http.createServer((req, res) => {
  let file;
  try { file = path.resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://preview').pathname)); }
  catch { res.writeHead(400).end(); return; }
  if(file !== root && !file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  if(fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  fs.stat(file, (error, stat) => {
    if(error || !stat.isFile()) { res.writeHead(404).end(); return; }
    res.writeHead(200, {'Content-Type':types[path.extname(file)] || 'application/octet-stream', 'Cache-Control':'no-store'});
    fs.createReadStream(file).pipe(res);
  });
}).listen(Number(option('--port', '4173')), option('--host', '0.0.0.0'));

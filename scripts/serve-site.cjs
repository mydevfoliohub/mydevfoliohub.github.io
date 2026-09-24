const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const root = path.resolve(__dirname, '..');
const port = Number(process.env.PORT || 4173);
const rootFiles = new Set([
  'index.html', '404.html', 'offline.html', 'sw.js', 'site.webmanifest',
  'favicon.svg', 'favicon.ico', 'favicon-32x32.png', 'favicon-192x192.png',
  'favicon-512x512.png', 'pwa-maskable-512.png', 'icon.svg', 'icon.png',
  'social-preview.svg', 'social-preview.png'
]);
const publicDirectories = new Set(['assets', 'css', 'img', 'js']);
const mime = {
  '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json'
};

const server = http.createServer((request, response) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname); }
  catch { response.writeHead(400).end(); return; }
  if (pathname === '/') pathname = '/index.html';
  const parts = pathname.slice(1).split('/');
  if (parts.some(part => !part || part === '.' || part === '..') ||
      !(parts.length === 1 ? rootFiles.has(parts[0]) : publicDirectories.has(parts[0]))) {
    response.writeHead(404).end();
    return;
  }
  const file = path.resolve(root, ...parts);
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    response.writeHead(404).end();
    return;
  }
  const compressed = /\bgzip\b/.test(request.headers['accept-encoding'] || '') &&
    ['.html', '.js', '.css', '.svg'].includes(path.extname(file));
  response.writeHead(200, {
    'Content-Type': mime[path.extname(file)] || 'application/octet-stream',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    ...(compressed ? {'Content-Encoding': 'gzip', Vary: 'Accept-Encoding'} : {})
  });
  const stream = fs.createReadStream(file);
  if (compressed) stream.pipe(zlib.createGzip()).pipe(response);
  else stream.pipe(response);
});

if (require.main === module) {
  server.listen(port, '127.0.0.1', () => console.log(`Deviloq test server on http://127.0.0.1:${port}`));
}

module.exports = { server, port };

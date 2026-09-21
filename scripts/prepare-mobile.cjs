const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const webDir = path.resolve(root, 'www');
if (webDir !== path.join(root, 'www') || !webDir.startsWith(root + path.sep)) {
  throw new Error('Unexpected mobile output directory');
}

const files = [
  'index.html', '404.html', 'offline.html', 'sw.js',
  'site.webmanifest', 'favicon-192x192.png', 'favicon-32x32.png',
  'favicon-512x512.png', 'favicon.ico', 'favicon.svg',
  'pwa-maskable-512.png', 'icon.png', 'icon.svg',
  'social-preview.png', 'social-preview.svg'
];
const directories = ['assets', 'css', 'img', 'js'];

fs.rmSync(webDir, { recursive: true, force: true });
fs.mkdirSync(webDir);
for (const file of files) {
  fs.copyFileSync(path.join(root, file), path.join(webDir, file));
}
for (const directory of directories) {
  const source = path.join(root, directory);
  const destination = path.join(webDir, directory);
  if (fs.existsSync(source)) {
    fs.cpSync(source, destination, { recursive: true });
  } else {
    // Empty optional asset folders are not retained by Git. Keep the mobile
    // preparation deterministic when one of them is absent in a fresh clone.
    fs.mkdirSync(destination, { recursive: true });
  }
}

console.log(`Prepared ${webDir} from the website source.`);

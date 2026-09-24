const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const packages = [
  ['@fontsource-variable/inter', ['inter-latin-wght-normal.woff2'], 'LICENSE.inter'],
  ['@fontsource/ibm-plex-sans-arabic', [400, 600, 700].flatMap(weight => [
    `ibm-plex-sans-arabic-arabic-${weight}-normal.woff2`,
    `ibm-plex-sans-arabic-latin-${weight}-normal.woff2`
  ]), 'LICENSE.ibm-plex-sans-arabic']
];
const packageInfo = require(path.join(root, 'package.json'));
const output = path.join(root, 'assets', 'fonts');
fs.mkdirSync(output, { recursive: true });

for (const [name, files, licenseName] of packages) {
  const packageRoot = path.join(root, 'node_modules', ...name.split('/'));
  const installed = JSON.parse(fs.readFileSync(path.join(packageRoot, 'package.json'), 'utf8'));
  if (installed.version !== packageInfo.devDependencies[name]) {
    throw new Error(`Expected ${name}@${packageInfo.devDependencies[name]}. Run npm ci first.`);
  }
  for (const file of files) {
    fs.copyFileSync(path.join(packageRoot, 'files', file), path.join(output, file));
  }
  fs.copyFileSync(path.join(packageRoot, 'LICENSE'), path.join(output, licenseName));
}
console.log('Vendored the existing English and Arabic fonts for local delivery.');

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const packageRoot = path.join(root, 'node_modules', 'simple-icons');
const expectedVersion = require(path.join(root, 'package.json')).devDependencies['simple-icons'];
const packageInfo = require(path.join(packageRoot, 'package.json'));
if (packageInfo.version !== expectedVersion) {
  throw new Error(`Expected Simple Icons ${expectedVersion}, found ${packageInfo.version}. Run npm ci first.`);
}

const main = fs.readFileSync(path.join(root, 'js', 'main.js'), 'utf8');
const technologies = main.match(/const PROFILE_TECHNOLOGIES = \[([\s\S]*?)\n  \];/);
if (!technologies) throw new Error('Technology definitions were not found.');
const slugs = [...new Set([...technologies[1].matchAll(/icon: "([a-z0-9]+)"/g)].map(match => match[1]))];
const output = path.join(root, 'assets', 'icons');
fs.mkdirSync(output, { recursive: true });

const missing = [];
for (const slug of slugs) {
  const source = path.join(packageRoot, 'icons', `${slug}.svg`);
  if (!fs.existsSync(source)) {
    missing.push(slug);
    continue;
  }
  const svg = fs.readFileSync(source, 'utf8')
    .replace('<svg ', '<svg fill="#d8c7ff" ')
    .replace(/<title>[^<]*<\/title>/, '');
  fs.writeFileSync(path.join(output, `${slug}.svg`), svg);
}
fs.copyFileSync(path.join(packageRoot, 'LICENSE.md'), path.join(output, 'LICENSE.simple-icons.md'));
fs.copyFileSync(path.join(packageRoot, 'DISCLAIMER.md'), path.join(output, 'DISCLAIMER.simple-icons.md'));
fs.writeFileSync(
  path.join(root, 'js', 'vendor', 'icon-manifest.js'),
  `window.DEVILOQ_LOCAL_ICONS = Object.freeze(${JSON.stringify(slugs.filter(slug => !missing.includes(slug)))});\n`
);
console.log(`Vendored ${slugs.length - missing.length} technology icons from Simple Icons ${packageInfo.version}.`);
if (missing.length) console.log(`Using text fallbacks for: ${missing.join(', ')}`);

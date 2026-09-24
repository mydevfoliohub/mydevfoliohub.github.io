const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const packageRoot = path.join(root, 'node_modules', '@supabase', 'supabase-js');
const packageInfo = JSON.parse(fs.readFileSync(path.join(packageRoot, 'package.json'), 'utf8'));
const expectedVersion = require(path.join(root, 'package.json')).dependencies['@supabase/supabase-js'];
if (packageInfo.version !== expectedVersion) {
  throw new Error(`Expected Supabase ${expectedVersion}, found ${packageInfo.version}. Run npm ci first.`);
}

const vendorRoot = path.join(root, 'js', 'vendor');
fs.mkdirSync(vendorRoot, { recursive: true });
fs.copyFileSync(path.join(packageRoot, 'dist', 'umd', 'supabase.js'), path.join(vendorRoot, 'supabase.js'));
fs.copyFileSync(path.join(packageRoot, 'LICENSE'), path.join(vendorRoot, 'LICENSE.supabase-js'));
console.log(`Vendored Supabase ${packageInfo.version} for the static website and Android app.`);

const fs = require('node:fs');
const path = require('node:path');
const { test, expect } = require('@playwright/test');

test('HTML IDs and in-page links stay consistent', () => {
  const html = fs.readFileSync(path.resolve(__dirname, '..', 'index.html'), 'utf8');
  const ids = [...html.matchAll(/\bid=["']([^"']+)["']/g)].map(match => match[1]);
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
  const targets = [...html.matchAll(/\bhref=["']#([^"']+)["']/g)].map(match => match[1]);
  expect(duplicates).toEqual([]);
  expect(targets.filter(target => !ids.includes(target))).toEqual([]);
});

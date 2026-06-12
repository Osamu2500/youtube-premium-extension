const fs = require('fs');
const html = fs.readFileSync('f:/Youtube 2.0/src/popup/popup.html', 'utf8');
const js = fs.readFileSync('f:/Youtube 2.0/src/popup/popup-schema.js', 'utf8');

const htmlIds = [...html.matchAll(/id\s*=\s*['"]([^'"]+)['"]/g)].map(m => m[1]);
const jsIds = [...js.matchAll(/id\s*:\s*['"]([^'"]+)['"]/g)].map(m => m[1]);

const all = [...htmlIds, ...jsIds];
const dups = all.filter((e, i, a) => a.indexOf(e) !== i);
console.log("DUPLICATES:", [...new Set(dups)]);

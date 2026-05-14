const fs = require('fs');

const path = 'src/content/features/pages/subscriptions/folder-ui.js';
let txt = fs.readFileSync(path, 'utf8');

// The file was corrupted by double-escaping backticks and dollar signs.
// Let's replace literally `\`` with ``` and `\${` with `${`
const newTxt = txt
    .replace(/\\`/g, '`')
    .replace(/\\\${/g, '${');

fs.writeFileSync(path, newTxt);
console.log('Fixed literal escapes.');

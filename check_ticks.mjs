const fs = require('fs');
const txt = fs.readFileSync('src/content/features/pages/subscriptions/folder-ui.js', 'utf8');
let inTemplate = false;
let startLine = -1;
const lines = txt.split('\n');

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (let j = 0; j < line.length; j++) {
        // Handle escaped backticks
        if (line[j] === '\\' && line[j+1] === '`') {
            j++; // skip escaped
            continue;
        }
        if (line[j] === '`') {
            if (inTemplate) {
                inTemplate = false;
            } else {
                inTemplate = true;
                startLine = i + 1;
            }
        }
    }
}
if (inTemplate) {
    console.log(`Unclosed template starting at line ${startLine}`);
} else {
    console.log("No unclosed backticks found.");
}

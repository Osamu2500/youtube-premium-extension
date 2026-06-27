const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, 'src', 'content', 'features', 'global', 'layout', 'grid-layout.css');
const themesPath = path.join(__dirname, 'anime-themes.css');

let content = fs.readFileSync(targetPath, 'utf8');
const lines = content.split('\n');

// Keep up to line 673
const truncatedLines = lines.slice(0, 673);

const themesContent = fs.readFileSync(themesPath, 'utf8');

const finalContent = truncatedLines.join('\n') + '\n' + themesContent;

fs.writeFileSync(targetPath, finalContent, 'utf8');
console.log('CSS updated successfully!');

const fs = require('fs');
let content = fs.readFileSync('src/content/features/player/video-filters.js', 'utf8');
content = content.replace(/\\`/g, '`').replace(/\\\${/g, '${');
fs.writeFileSync('src/content/features/player/video-filters.js', content, 'utf8');
console.log('Done!');

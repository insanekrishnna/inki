const fs = require('fs');
let text = fs.readFileSync('src/renderer/renderer.js', 'utf-8');
text = text.replace(/[\uFFFD\uFEFF\u200B]/g, '');
text = text.replace(/\/\/ force hot reload.*/g, '');
fs.writeFileSync('src/renderer/renderer.js', text, 'utf-8');

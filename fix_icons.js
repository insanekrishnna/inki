const fs = require('fs');
const files = ['src/renderer/index.html', 'capture.html'];

for (const file of files) {
    let text = fs.readFileSync(file, 'utf-8');
    text = text.replace(
        '<polygon points="3 11 22 2 13 21 11 13 3 11"/>',
        '<path d="m3 3 7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/><path d="m13 13 6 6"/>'
    );
    fs.writeFileSync(file, text, 'utf-8');
}
console.log("Icons fixed!");

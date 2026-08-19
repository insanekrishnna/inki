const fs = require('fs');
let text = fs.readFileSync('src/renderer/index.html', 'utf-8');
const marker = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>';
const parts = text.split(marker);
if (parts.length < 2) {
    console.log("Marker not found");
    process.exit(1);
}
let tail = fs.readFileSync('new_tail.html', 'utf-8');
let newText = parts[0] + marker + "\n" + tail;
fs.writeFileSync('src/renderer/index.html', newText, 'utf-8');
console.log("Fixed successfully");

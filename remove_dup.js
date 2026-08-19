const fs = require('fs');

const files = ['src/renderer/index.html', 'capture.html'];

for (const file of files) {
    let text = fs.readFileSync(file, 'utf-8');
    
    // Find first bottom-toolbar
    const startIdx = text.indexOf('<div class="bottom-toolbar"');
    if (startIdx === -1) continue;
    
    // Find the second bottom-toolbar
    const secondIdx = text.indexOf('<div class="bottom-toolbar"', startIdx + 1);
    if (secondIdx === -1) {
        console.log("Only one bottom toolbar in " + file);
        continue;
    }
    
    // The first one is the one we want to remove.
    // Let's find its closing div
    // It's followed by <div class="statusbar">
    const endIdx = text.indexOf('<div class="statusbar">', startIdx);
    
    if (endIdx !== -1) {
        const firstToolbar = text.substring(startIdx, endIdx);
        text = text.substring(0, startIdx) + text.substring(endIdx);
        fs.writeFileSync(file, text, 'utf-8');
        console.log("Removed first toolbar from " + file);
    }
}

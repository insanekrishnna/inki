const fs = require('fs');
const path = require('path');

function searchFiles(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        if (file === 'node_modules' || file === '.git') continue;
        
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            searchFiles(fullPath);
        } else if (fullPath.endsWith('.html') || fullPath.endsWith('.tsx') || fullPath.endsWith('.js')) {
            const text = fs.readFileSync(fullPath, 'utf-8');
            if (text.includes('class="bottom-toolbar"')) {
                console.log(fullPath);
            }
        }
    }
}
searchFiles('.');

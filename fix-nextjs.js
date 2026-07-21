const fs = require('fs');
const path = require('path');

const dir1 = path.join(__dirname, 'src', 'components', 'blocks');
const dir2 = path.join(__dirname, 'src', 'components');

function processDir(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (file.endsWith('.tsx')) {
      const filepath = path.join(dir, file);
      let content = fs.readFileSync(filepath, 'utf8');
      
      content = content.replace(/import Image from "next\/image";\r?\n?/g, '');
      content = content.replace(/<Image/g, '<img');
      content = content.replace(/<\/Image>/g, '</img>');
      
      content = content.replace(/import Link from "next\/link";\r?\n?/g, '');
      content = content.replace(/<Link/g, '<a');
      content = content.replace(/<\/Link>/g, '</a>');
      
      if (content.includes('usePathname')) {
        content = content.replace(/import \{ usePathname \} from "next\/navigation";\r?\n?/g, '');
        content = content.replace(/const pathname = usePathname\(\);/g, 'const pathname = window.location.pathname;');
      }
      
      fs.writeFileSync(filepath, content, 'utf8');
    }
  }
}

processDir(dir1);
processDir(dir2);
console.log('Fixed imports');

import os, glob

for filepath in glob.glob('d:/P_projects/screen/inki/src/components/blocks/*.tsx') + glob.glob('d:/P_projects/screen/inki/src/components/*.tsx'):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Replace next/image
    content = content.replace('import Image from "next/image";\n', '')
    content = content.replace('import Image from "next/image";', '')
    content = content.replace('<Image', '<img')
    content = content.replace('</Image>', '</img>')
    
    # Replace next/link
    content = content.replace('import Link from "next/link";\n', '')
    content = content.replace('import Link from "next/link";', '')
    content = content.replace('<Link', '<a')
    content = content.replace('</Link>', '</a>')
    
    # We might need to handle usePathname (navbar.tsx)
    if 'usePathname' in content:
        content = content.replace('import { usePathname } from "next/navigation";\n', '')
        content = content.replace('const pathname = usePathname();', 'const pathname = window.location.pathname;')
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

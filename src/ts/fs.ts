import fs from 'node:fs';
import path from 'node:path';

export function ensureDirExists(p: string) {
    if (!fs.existsSync(p)) {
        fs.mkdirSync(p);
    }
}

export function copyDir(src: string, dest: string) {
    ensureDirExists(dest);

    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
            copyDir(srcPath, destPath);
            console.info(`✅ Copied directory ${srcPath} to ${destPath}`);
        } else {
            fs.copyFileSync(srcPath, destPath);
            console.info(`✅ Copied file ${srcPath} to ${destPath}`);
        }
    }
}

export function writeFile(p: string, content: string) {
    ensureDirExists(path.dirname(p));
    fs.writeFileSync(p, content);
}

export function getFilesWithExt(path: string, ext: string): string[] {
    return fs.readdirSync(path).filter((f) => f.endsWith(ext));
}

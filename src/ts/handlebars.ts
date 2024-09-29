import fs from 'node:fs';
import Handlebars from 'handlebars';

export function registerPartialFile(name: string, filePath: string) {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    Handlebars.registerPartial(name, fileContent);
}

export function compileTemplate(filePath: string) {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    return Handlebars.compile(fileContent);
}
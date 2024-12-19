import path from 'node:path';
import Handlebars from 'handlebars';
import readingTime from 'reading-time';
import { z } from 'zod';
import { getFilesWithExt, writeFile } from '../fs.js';
import { compileTemplate } from '../handlebars.js';
import { processMarkdownFile } from '../md.js';

const POSTS_PATH = 'src/md/blog';

const blogPostTemplate = compileTemplate('src/blog-post.hbs');
const blogIndexTemplate = compileTemplate('src/blog.hbs');

const frontmatterSchema = z.object({
    title: z.string().min(30).max(70),
    description: z.string().min(120).max(170),
});

type FrontMatter = z.output<typeof frontmatterSchema>;

export async function blog() {
    const files = getFilesWithExt(POSTS_PATH, '.md');
    const entries: (FrontMatter & {
        fileName: string;
        date: string;
        content: string;
    })[] = [];

    for (const filename of files) {
        const { html, data, md } = await processMarkdownFile(
            path.join(POSTS_PATH, filename),
            frontmatterSchema,
        );

        const date = new Date(z.string().date().parse(filename.slice(0, 10)))
            .toISOString()
            .slice(0, 10);

        const stats = readingTime(md);

        Handlebars.registerPartial('post', html);

        const homeHtml = blogPostTemplate({
            ...data,
            content: html,
            date,
            readingTime: stats.text,
        });

        const htmlFilename = filename.replace('.md', '.html');
        writeFile(path.join('dist/blog', htmlFilename), homeHtml);
        console.info(`✅ Generated ${data.title} [${filename}]`);

        entries.push({
            ...data,
            date,
            fileName: htmlFilename,
            content: html,
        });
    }

    const blogIndex = blogIndexTemplate({
        title: 'Alex McGovern',
        description: 'Personal blog of Alex McGovern',
        posts: entries.reverse(), // NOTE: Entries are named with ISO timestamps, so are naturally sorted oldest first, we want to reverse that
    });
    writeFile('dist/blog/index.html', blogIndex);
    console.info('✅ Generated blog index');
}

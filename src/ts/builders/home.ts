import path from 'node:path';
import Handlebars from 'handlebars';
import { z } from 'zod';
import { getFilesWithExt, writeFile } from '../fs.js';
import { compileTemplate } from '../handlebars.js';
import { processMarkdownFile } from '../md.js';

const WORK_EXP_PATH = 'src/md/work-experience';

const homeTemplate = compileTemplate('src/index.hbs');

const frontmatterSchema = z.object({
    jobTitle: z.string().max(70),
    company: z.string().max(70),
    endDate: z.union([z.number(), z.literal('present')]),
    startDate: z.number(),
});

type FrontMatter = z.output<typeof frontmatterSchema>;

export async function buildHomepage() {
    const { html: homepageIntro } = await processMarkdownFile(
        'src/md/homepage-intro.md',
    );
    Handlebars.registerPartial('homepageIntro', homepageIntro);

    const files = getFilesWithExt(WORK_EXP_PATH, '.md');
    const entries: (FrontMatter & { content: string })[] = [];

    for (const filename of files) {
        const { html, data } = await processMarkdownFile(
            path.join(WORK_EXP_PATH, filename),
            frontmatterSchema,
        );

        entries.push({
            ...data,
            content: html,
        });
    }

    const homeHtml = homeTemplate({
        title: 'Alex McGovern',
        description: 'Personal blog of Alex McGovern',
        workExperience: entries,
        homepageIntro: homepageIntro,
    });

    writeFile('dist/index.html', homeHtml);
    console.info('✅ Generated homepage');
}

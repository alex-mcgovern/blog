import fs from 'node:fs';

import matter from 'gray-matter';
import rehypePrettyCode from 'rehype-pretty-code';
import rehypeRaw from 'rehype-raw';
import rehypeStringify from 'rehype-stringify';
import remarkAlerts from 'remark-alerts';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';
import { ZodError, type z } from 'zod';
import { ALERT_ICONS } from './constants/ALERT_ICONS.js';

export function markdownToHtml(mdContent: string) {
    return (
        unified()
            .use(remarkParse)
            // .use(rehypeSanitize)
            .use(remarkGfm)
            .use(remarkAlerts, { classPrefix: 'md-alert', icons: ALERT_ICONS })
            .use(remarkRehype, { allowDangerousHtml: true })
            .use(rehypePrettyCode, {
                keepBackground: false,
            })
            .use(rehypeRaw)
            .use(rehypeStringify)
            .process(mdContent)
    );
}

type FrontMatter<T extends z.ZodObject<z.ZodRawShape>> = T extends undefined
    ? // biome-ignore lint/suspicious/noExplicitAny: output of `matter.data` is `{ [x: string]: any }`
      { [x: string]: any }
    : z.output<T>;

export async function processMarkdownFile<T extends z.ZodObject<z.ZodRawShape>>(
    filePath: string,
    frontMatterSchema?: T,
): Promise<{
    md: string;
    html: string;
    data: FrontMatter<T>;
}> {
    try {
        const raw = fs.readFileSync(filePath, 'utf-8');
        const { content, data } = matter(raw);
        const html = await markdownToHtml(content);

        return {
            md: raw,
            html: String(html),
            data: (frontMatterSchema
                ? frontMatterSchema.parse(data)
                : data) as FrontMatter<T>,
        };
    } catch (e) {
        if (e instanceof ZodError) {
            throw new Error(
                e.errors
                    .flat()
                    .map((e) => `\t[${e.path}] ${e.message}`)
                    .join('\n'),
            );
        } else {
            throw e;
        }
    }
}

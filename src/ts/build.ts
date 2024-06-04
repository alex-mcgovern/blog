import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import Handlebars from 'handlebars';
import readingTime from 'reading-time';
import rehypePrettyCode from 'rehype-pretty-code';
import rehypeRaw from 'rehype-raw';
import rehypeStringify from 'rehype-stringify';
import remarkAlerts from 'remark-alerts';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';
import { ZodError, z } from 'zod';

/**
 * Alert icons
 */

const ALERT_ICONS: Record<
  'note' | 'tip' | 'important' | 'warning' | 'caution',
  string
> = {
  note: '<svg class="md-alert-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><!--!Font Awesome Pro 6.5.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2024 Fonticons, Inc.--><path fill="currentColor" d="M256 48a208 208 0 1 1 0 416 208 208 0 1 1 0-416zm0 464A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM216 336c-13.3 0-24 10.7-24 24s10.7 24 24 24h80c13.3 0 24-10.7 24-24s-10.7-24-24-24h-8V248c0-13.3-10.7-24-24-24H216c-13.3 0-24 10.7-24 24s10.7 24 24 24h24v64H216zm40-144a32 32 0 1 0 0-64 32 32 0 1 0 0 64z"/></svg>',
  tip: '<svg class="md-alert-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512"><!--!Font Awesome Free 6.5.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc.--><path fill="currentColor" d="M297.2 248.9C311.6 228.3 320 203.2 320 176c0-70.7-57.3-128-128-128S64 105.3 64 176c0 27.2 8.4 52.3 22.8 72.9c3.7 5.3 8.1 11.3 12.8 17.7l0 0c12.9 17.7 28.3 38.9 39.8 59.8c10.4 19 15.7 38.8 18.3 57.5H109c-2.2-12-5.9-23.7-11.8-34.5c-9.9-18-22.2-34.9-34.5-51.8l0 0 0 0c-5.2-7.1-10.4-14.2-15.4-21.4C27.6 247.9 16 213.3 16 176C16 78.8 94.8 0 192 0s176 78.8 176 176c0 37.3-11.6 71.9-31.4 100.3c-5 7.2-10.2 14.3-15.4 21.4l0 0 0 0c-12.3 16.8-24.6 33.7-34.5 51.8c-5.9 10.8-9.6 22.5-11.8 34.5H226.4c2.6-18.7 7.9-38.6 18.3-57.5c11.5-20.9 26.9-42.1 39.8-59.8l0 0 0 0 0 0c4.7-6.4 9-12.4 12.7-17.7zM192 128c-26.5 0-48 21.5-48 48c0 8.8-7.2 16-16 16s-16-7.2-16-16c0-44.2 35.8-80 80-80c8.8 0 16 7.2 16 16s-7.2 16-16 16zm0 384c-44.2 0-80-35.8-80-80V416H272v16c0 44.2-35.8 80-80 80z"/></svg>',
  warning:
    '<svg class="md-alert-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><!--!Font Awesome Pro 6.5.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2024 Fonticons, Inc.--><path fill="currentColor" d="M248.4 84.3c1.6-2.7 4.5-4.3 7.6-4.3s6 1.6 7.6 4.3L461.9 410c1.4 2.3 2.1 4.9 2.1 7.5c0 8-6.5 14.5-14.5 14.5H62.5c-8 0-14.5-6.5-14.5-14.5c0-2.7 .7-5.3 2.1-7.5L248.4 84.3zm-41-25L9.1 385c-6 9.8-9.1 21-9.1 32.5C0 452 28 480 62.5 480h387c34.5 0 62.5-28 62.5-62.5c0-11.5-3.2-22.7-9.1-32.5L304.6 59.3C294.3 42.4 275.9 32 256 32s-38.3 10.4-48.6 27.3zM288 368a32 32 0 1 0 -64 0 32 32 0 1 0 64 0zm-8-184c0-13.3-10.7-24-24-24s-24 10.7-24 24v96c0 13.3 10.7 24 24 24s24-10.7 24-24V184z"/></svg>',
  important:
    '<svg class="md-alert-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><!--!Font Awesome Pro 6.5.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2024 Fonticons, Inc.--><path fill="currentColor" d="M208 416c0-26.5-21.5-48-48-48H64c-8.8 0-16-7.2-16-16V64c0-8.8 7.2-16 16-16H448c8.8 0 16 7.2 16 16V352c0 8.8-7.2 16-16 16H309.3c-10.4 0-20.5 3.4-28.8 9.6L208 432V416zm-.2 76.2l.2-.2 101.3-76H448c35.3 0 64-28.7 64-64V64c0-35.3-28.7-64-64-64H64C28.7 0 0 28.7 0 64V352c0 35.3 28.7 64 64 64h48 48v48 4 .3 6.4V496c0 6.1 3.4 11.6 8.8 14.3s11.9 2.1 16.8-1.5L202.7 496l5.1-3.8zM256 80c-13.3 0-24 10.7-24 24V216c0 13.3 10.7 24 24 24s24-10.7 24-24V104c0-13.3-10.7-24-24-24zm32 224a32 32 0 1 0 -64 0 32 32 0 1 0 64 0z"/></svg>',
  caution:
    '<svg class="md-alert-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><!--!Font Awesome Pro 6.5.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2024 Fonticons, Inc.--><path fill="currentColor" d="M17.1 292c-12.9-22.3-12.9-49.7 0-72L105.4 67.1c12.9-22.3 36.6-36 62.4-36H344.3c25.7 0 49.5 13.7 62.4 36L494.9 220c12.9 22.3 12.9 49.7 0 72L406.6 444.9c-12.9 22.3-36.6 36-62.4 36H167.7c-25.7 0-49.5-13.7-62.4-36L17.1 292zm41.6-48c-4.3 7.4-4.3 16.6 0 24l88.3 152.9c4.3 7.4 12.2 12 20.8 12H344.3c8.6 0 16.5-4.6 20.8-12L453.4 268c4.3-7.4 4.3-16.6 0-24L365.1 91.1c-4.3-7.4-12.2-12-20.8-12l-176.6 0c-8.6 0-16.5 4.6-20.8 12L58.6 244zM256 128c13.3 0 24 10.7 24 24V264c0 13.3-10.7 24-24 24s-24-10.7-24-24V152c0-13.3 10.7-24 24-24zM224 352a32 32 0 1 1 64 0 32 32 0 1 1 -64 0z"/></svg>',
};

/**
 * fs
 */
function ensureDirExists(p: string) {
  if (!fs.existsSync(p)) {
    fs.mkdirSync(p);
  }
}

function copyDir(src: string, dest: string) {
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

function writeFile(p: string, content: string) {
  ensureDirExists(path.dirname(p));
  fs.writeFileSync(p, content);
}

/**
 * Handlebars
 */
function registerPartialFile(name: string, filePath: string) {
  const fileContent = fs.readFileSync(filePath, 'utf8');
  Handlebars.registerPartial(name, fileContent);
}

function compileTemplate(filePath: string) {
  const fileContent = fs.readFileSync(filePath, 'utf8');
  return Handlebars.compile(fileContent);
}

/**
 * Partials
 */
registerPartialFile('head', 'src/partials/head.hbs');
registerPartialFile('nav', 'src/partials/nav.hbs');
registerPartialFile('footer', 'src/partials/footer.hbs');
registerPartialFile('posts', 'src/partials/posts.hbs');
registerPartialFile('postHeader', 'src/partials/post-header.hbs');

/**
 * Templates
 */
const homeTemplate = compileTemplate('src/index.hbs');
const blogPostTemplate = compileTemplate('src/blog-post.hbs');
const blogIndexTemplate = compileTemplate('src/blog.hbs');

/**
 * Static files
 */

const homeHtml = homeTemplate({
  title: 'Alex McGovern',
  description: 'Personal blog of Alex McGovern',
});
writeFile('dist/index.html', homeHtml);

copyDir('src/assets', 'dist/assets');
copyDir('src/css', 'dist/css');

/**
 * Blog posts
 */

const files = fs.readdirSync('src/md').filter((f) => f.endsWith('.md'));
const posts: { fileName: string; date: string; title: string }[] = [];

for (const file of files.reverse()) {
  try {
    const mdContent = fs.readFileSync(path.join('src/md', file), 'utf-8');

    // Parse the title and description from the front matter
    // Validate the front matter with zod
    const parsed = matter(mdContent);
    const { description, title } = z
      .object({
        title: z.string().min(30).max(70),
        description: z.string().min(120).max(170),
      })
      .parse(parsed.data);

    // Extract the date from the filename e.g. 2024-01-01-foo-bar.md
    // Validate the date format with zod
    const date = new Date(z.string().date().parse(file.slice(0, 10)))
      .toISOString()
      .slice(0, 10);

    // Get the reading time
    const stats = readingTime(mdContent);

    // Pipe the markdown content through unified to generate HTML
    const content = await unified()
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
      .process(parsed.content);

    Handlebars.registerPartial('post', String(content));

    const homeHtml = blogPostTemplate({
      title,
      description,
      content,
      date,
      readingTime: stats.text,
    });

    const htmlFilename = file.replace('.md', '.html');

    writeFile(path.join('dist/blog', htmlFilename), homeHtml);
    console.info(`✅ Generated ${title} [${file}]`);

    // Store the metadata for the blog index
    posts.push({
      fileName: htmlFilename,
      date,
      title,
    });
  } catch (e) {
    console.error(`❌ Error processing ${file}`);
    if (e instanceof ZodError) {
      console.error(
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

/**
 * Blog index page
 */

const blogIndex = blogIndexTemplate({
  title: 'Alex McGovern',
  description: 'Personal blog of Alex McGovern',
  posts,
});
writeFile('dist/blog/index.html', blogIndex);
console.info('✅ Generated blog index');

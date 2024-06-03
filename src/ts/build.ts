import fs from 'node:fs'
import path from 'node:path'
import rehypeSanitize from 'rehype-sanitize'
import rehypeStringify from 'rehype-stringify'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import { unified } from 'unified'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import matter from 'gray-matter'
import { z } from 'zod'
import Handlebars from 'handlebars'

/**
 * fs
 */
function ensureDirExists(p: string) {
    if (!fs.existsSync(p)) {
        fs.mkdirSync(p)
    }
}

function copyDir(src: string, dest: string) {
    ensureDirExists(dest)

    const entries = fs.readdirSync(src, { withFileTypes: true })

    for (const entry of entries) {
        const srcPath = path.join(src, entry.name)
        const destPath = path.join(dest, entry.name)

        if (entry.isDirectory()) {
            copyDir(srcPath, destPath)
            console.info(`✅ Copied directory ${srcPath} to ${destPath}`)
        } else {
            fs.copyFileSync(srcPath, destPath)
            console.info(`✅ Copied file ${srcPath} to ${destPath}`)
        }
    }
}

function writeFile(p: string, content: string) {
    ensureDirExists(path.dirname(p))
    fs.writeFileSync(p, content)
}

/**
 * Handlebars
 */
function registerPartialFile(name: string, filePath: string) {
    const fileContent = fs.readFileSync(filePath, 'utf8')
    Handlebars.registerPartial(name, fileContent)
}

function compileTemplate(filePath: string) {
    const fileContent = fs.readFileSync(filePath, 'utf8')
    return Handlebars.compile(fileContent)
}

/**
 * Partials
 */
registerPartialFile('head', 'src/partials/head.hbs')
registerPartialFile('nav', 'src/partials/nav.hbs')
registerPartialFile('footer', 'src/partials/footer.hbs')
registerPartialFile('posts', 'src/partials/posts.hbs')

/**
 * Templates
 */
const homeTemplate = compileTemplate('src/index.hbs')
const blogPostTemplate = compileTemplate('src/blog-post.hbs')
const blogIndexTemplate = compileTemplate('src/blog.hbs')

/**
 * Static files
 */

const homeHtml = homeTemplate({
    title: 'Alex McGovern',
    description: 'Personal blog of Alex McGovern',
})
writeFile('dist/index.html', homeHtml)

copyDir('src/assets', 'dist/assets')
copyDir('src/css', 'dist/css')

/**
 * Blog posts
 */

const files = fs.readdirSync('src/md').filter((f) => f.endsWith('.md'))
const posts: { fileName: string; date: string; title: string }[] = []

for (const file of files.reverse()) {
    const mdContent = fs.readFileSync(path.join('src/md', file), 'utf-8')

    // Parse the title and description from the front matter
    // Validate the front matter with zod
    const parsed = matter(mdContent)
    const { description, title } = z
        .object({
            title: z.string(),
            description: z.string(),
        })
        .parse(parsed.data)

    // Extract the date from the filename e.g. 2024-01-01-foo-bar.md
    // Validate the date format with zod
    const date = new Date(
        z.string().date().parse(file.slice(0, 10)),
    ).toLocaleDateString('en-GB', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    })

    // Pipe the markdown content through unified to generate HTML
    const content = await unified()
        .use(remarkParse)
        .use(remarkGfm)
        .use(remarkRehype)
        .use(rehypeSanitize)
        .use(rehypeHighlight)
        .use(rehypeStringify)
        .process(parsed.content)

    Handlebars.registerPartial('post', String(content))

    const homeHtml = blogPostTemplate({
        title,
        description,
        content,
    })

    const htmlFilename = file.replace('.md', '.html')

    writeFile(path.join('dist/blog', htmlFilename), homeHtml)
    console.info(`✅ Generated ${title} [${file}]`)

    // Store the metadata for the blog index
    posts.push({
        fileName: htmlFilename,
        date,
        title,
    })
}

/**
 * Blog index page
 */

const blogIndex = blogIndexTemplate({
    title: 'Alex McGovern',
    description: 'Personal blog of Alex McGovern',
    posts,
})
writeFile('dist/blog/index.html', blogIndex)
console.info('✅ Generated blog index')

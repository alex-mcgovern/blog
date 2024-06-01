import fs from "node:fs";
import path from "node:path";
import rehypeSanitize from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";
import rehypeDocument from "rehype-document";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import remarkGfm from "remark-gfm";
// @ts-expect-error — no type definitions for rehype-wrap
import rehypeWrap from "rehype-wrap";
import rehypeHighlight from "rehype-highlight";
import rehypeParse from "rehype-parse";
import matter from "gray-matter";
import { z } from "zod";

/**
 * Utils
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

function copyFile(src: string, dest: string) {
	ensureDirExists(path.dirname(dest));
	fs.copyFileSync(src, dest);
}

function writeFile(p: string, content: string) {
	ensureDirExists(path.dirname(p));
	fs.writeFileSync(p, content);
}

/**
 * Static files
 */

copyFile("src/index.html", "dist/index.html");
copyDir("src/assets", "dist/assets");
copyDir("src/css", "dist/css");

/**
 * Blog posts
 */

const files = fs.readdirSync("src/md").filter((f) => f.endsWith(".md"));
const meta: [string, string, string, string][] = [];

// Navigation element to be prepended to each blog post, parsed as a Remark AST node
const navElement = `<nav><a href="/">Home</a><a href="/blog">Blog</a></nav>`;
const navNode = unified().use(rehypeParse, { fragment: true }).parse(navElement)
	.children[0];

for (const file of files) {
	const mdContent = fs.readFileSync(path.join("src/md", file), "utf-8");

	// Parse the title and description from the front matter
	// Validate the front matter with zod
	const parsed = matter(mdContent);
	const { description, title } = z
		.object({
			title: z.string(),
			description: z.string(),
		})
		.parse(parsed.data);

	// Extract the date from the filename e.g. 2024-01-01-foo-bar.md
	// Validate the date format with zod
	const date = new Date(
		z.string().date().parse(file.slice(0, 10)),
	).toLocaleDateString("en-GB", {
		year: "numeric",
		month: "long",
		day: "numeric",
	});

	// Pipe the markdown content through unified to generate HTML
	const htmlContent = await unified()
		.use(remarkParse)
		.use(remarkGfm)
		.use(remarkRehype)
		.use(rehypeSanitize)
		.use(rehypeHighlight)
		.use(rehypeWrap, { wrapper: "main" })
		.use(() => (tree) => {
			if (
				tree.type === "root" &&
				"children" in tree &&
				Array.isArray(tree.children)
			) {
				tree.children.unshift(navNode);
			}
		})
		.use(rehypeDocument, {
			css: "../css/index.css",
			title: title,
			meta: [{ name: "description", content: description }],
			language: "en",
		})
		.use(rehypeStringify)
		.process(parsed.content);

	const htmlFilename = file.replace(".md", ".html");

	writeFile(path.join("dist/blog", htmlFilename), String(htmlContent));
	console.info(`✅ Generated ${title} [${file}]`);

	// Store the metadata for the blog index
	meta.push([htmlFilename, title, description, date]);
}

/**
 * Blog index page
 */

const anchors = meta.map(
	([htmlFilename, title, description, date]) =>
		`<a class="blog-index-link" href="${path.join("/blog", htmlFilename)}">
			<div class="blog-index-link-date">${date}</div>
			<div class="blog-index-link-title">${title}</div>
		</a>`,
);

const blogHtml = fs
	.readFileSync("src/blog.html", "utf-8")
	.replace("{{content}}", anchors.join("\n"));

writeFile("dist/blog/index.html", blogHtml);
console.info("✅ Generated blog index");

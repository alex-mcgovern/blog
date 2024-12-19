import { blog } from "./builders/blog.js";
import { home } from "./builders/home.js";
import { bundleCSS } from "./bundle-css.js";
import { copyDir, ensureDirExists } from "./fs.js";
import { registerPartialFile } from "./handlebars.js";

ensureDirExists("dist");
copyDir("src/assets", "dist/assets");
await bundleCSS("src/css/index.css", "dist/css/index.css");

registerPartialFile("head", "src/partials/head.hbs");
registerPartialFile("nav", "src/partials/nav.hbs");
registerPartialFile("footer", "src/partials/footer.hbs");
registerPartialFile("posts", "src/partials/posts.hbs");
registerPartialFile("postHeader", "src/partials/post-header.hbs");
registerPartialFile("workExperience", "src/partials/work-experience.hbs");

await home();
await blog();

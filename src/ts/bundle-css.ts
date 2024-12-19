import * as fs from "fs";
import * as path from "path";
import { ensureDirExists } from "./fs.js";

async function processImports(
  content: string,
  baseDir: string
): Promise<string> {
  const importRegex = /@import\s+['"]([^'"]+)['"];/g;
  let match;
  // biome-ignore lint/suspicious/noAssignInExpressions: <explanation>
  while ((match = importRegex.exec(content)) !== null) {
    const importPath = match[1];
    if (!importPath) {
      throw new Error("Invalid import statement");
    }
    const fullImportPath = path.resolve(baseDir, importPath);
    const importContent = fs.readFileSync(fullImportPath, "utf-8");
    const processedImportContent = await processImports(
      importContent,
      path.dirname(fullImportPath)
    );
    content = content.replace(match[0], processedImportContent);
  }
  return content;
}

export async function bundleCSS(entryPoint: string, outputPath: string) {
  // Validate that the input file is a CSS file
  if (path.extname(entryPoint) !== ".css") {
    throw new Error("The input file must be a CSS file.");
  }

  // Read the content of the input file
  let cssContent = fs.readFileSync(entryPoint, "utf-8");

  // Function to process @import statements

  // Process the @import statements in the CSS content
  cssContent = await processImports(cssContent, path.dirname(entryPoint));

  ensureDirExists(outputPath.split("/").slice(0, -1).join("/"));

  // Write the processed content to the output file
  fs.writeFileSync(outputPath, cssContent, "utf-8");
}

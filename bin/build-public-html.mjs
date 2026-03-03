import { promises as fs } from "node:fs";
import path from "node:path";

const inputDir = path.resolve(process.cwd(), process.env.PUBLIC_IN_DIR ?? "./public.src");
const outputDir = path.resolve(process.cwd(), process.env.PUBLIC_OUT_DIR ?? "./docs");

await fs.rm(outputDir, { recursive: true, force: true });
await fs.mkdir(outputDir, { recursive: true });
await copyTree(inputDir, outputDir);

async function copyTree(fromDir, toDir) {
  const entries = await fs.readdir(fromDir, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(fromDir, entry.name);
    const outPath = path.join(toDir, entry.name);

    if (entry.isDirectory()) {
      if (entry.name === "partials") {
        continue;
      }
      await fs.mkdir(outPath, { recursive: true });
      await copyTree(srcPath, outPath);
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(".html")) {
      const rendered = await renderHtmlWithIncludes(srcPath, inputDir, new Set());
      await fs.writeFile(outPath, rendered, "utf8");
      continue;
    }

    if (entry.isFile()) {
      await fs.copyFile(srcPath, outPath);
    }
  }
}

async function renderHtmlWithIncludes(filePath, rootDir, stack) {
  const normalized = path.normalize(filePath);
  if (stack.has(normalized)) {
    throw new Error(`Include cycle detected: ${[...stack, normalized].join(" -> ")}`);
  }
  stack.add(normalized);

  let content = await fs.readFile(filePath, "utf8");
  const currentDir = path.dirname(filePath);
  const includeRegex = /<!--\s*@include\s+(.+?)\s*-->/g;

  let match;
  while ((match = includeRegex.exec(content)) !== null) {
    const rawInclude = match[1].trim();
    const includePath = path.resolve(currentDir, rawInclude);
    if (!includePath.startsWith(rootDir)) {
      throw new Error(`Include path escapes root: ${rawInclude} in ${filePath}`);
    }
    const included = await renderHtmlWithIncludes(includePath, rootDir, stack);
    content = content.slice(0, match.index) + included + content.slice(match.index + match[0].length);
    includeRegex.lastIndex = 0;
  }

  stack.delete(normalized);
  return content;
}

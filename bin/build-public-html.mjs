import { promises as fs } from "node:fs";
import path from "node:path";
import { APP_CONTRACT } from "../src/app/contract-data.js";

const inputDir = path.resolve(process.cwd(), process.env.DOCS_SRC_DIR ?? process.env.PUBLIC_IN_DIR ?? "./docs.src");
const outputDir = path.resolve(process.cwd(), process.env.DOCS_OUT_DIR ?? process.env.PUBLIC_OUT_DIR ?? "./docs");
const ASSET_ATTR_PATTERN = createAssetAttrPattern(APP_CONTRACT.partialAssetAttributes);
const STYLESHEET_HREF_PATTERN = /(<link\b[^>]*\brel=["']stylesheet["'][^>]*\bhref=)(["'])([^"']+)\2/gi;

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
  const linkPartialRegex = /<link\s+[^>]*rel=["']partial["'][^>]*>/gi;

  let match;
  while ((match = includeRegex.exec(content)) !== null) {
    const rawInclude = match[1].trim();
    const includePath = path.resolve(currentDir, rawInclude);
    if (!includePath.startsWith(rootDir)) {
      throw new Error(`Include path escapes root: ${rawInclude} in ${filePath}`);
    }
    const included = rebaseEmbeddedAssetUrls(
      await renderHtmlWithIncludes(includePath, rootDir, stack),
      includePath,
      filePath
    );
    content = content.slice(0, match.index) + included + content.slice(match.index + match[0].length);
    includeRegex.lastIndex = 0;
  }

  // Source-only partial tag:
  // <link rel="partial" href="./partials/footer.html" />
  // Replace the tag itself with rendered partial content.
  while ((match = linkPartialRegex.exec(content)) !== null) {
    const tag = match[0];
    const hrefMatch = tag.match(/\shref=["']([^"']+)["']/i);
    if (!hrefMatch) {
      throw new Error(`Partial link is missing href in ${filePath}: ${tag}`);
    }
    const rawInclude = hrefMatch[1].trim();
    const includePath = path.resolve(currentDir, rawInclude);
    if (!includePath.startsWith(rootDir)) {
      throw new Error(`Include path escapes root: ${rawInclude} in ${filePath}`);
    }
    const included = rebaseEmbeddedAssetUrls(
      await renderHtmlWithIncludes(includePath, rootDir, stack),
      includePath,
      filePath
    );
    content = content.slice(0, match.index) + included + content.slice(match.index + tag.length);
    linkPartialRegex.lastIndex = 0;
  }

  stack.delete(normalized);
  return content;
}

function rebaseEmbeddedAssetUrls(html, fromFilePath, toFilePath) {
  const fromDir = path.dirname(fromFilePath);
  const toDir = path.dirname(toFilePath);

  let rebased = html.replace(ASSET_ATTR_PATTERN, (fullMatch, quote, value) => {
    const nextValue = rebaseRelativePath(value, fromDir, toDir);
    return nextValue === value ? fullMatch : fullMatch.replace(value, nextValue);
  });

  rebased = rebased.replace(STYLESHEET_HREF_PATTERN, (fullMatch, prefix, quote, value) => {
    const nextValue = rebaseRelativePath(value, fromDir, toDir);
    return nextValue === value ? fullMatch : `${prefix}${quote}${nextValue}${quote}`;
  });

  return rebased;
}

function rebaseRelativePath(value, fromDir, toDir) {
  if (isExternalOrSpecialRef(value)) {
    return value;
  }

  const absolutePath = path.resolve(fromDir, value);
  let relativePath = path.relative(toDir, absolutePath).split(path.sep).join("/");
  if (!relativePath.startsWith(".") && !relativePath.startsWith("/")) {
    relativePath = `./${relativePath}`;
  }
  return relativePath;
}

function isExternalOrSpecialRef(value) {
  return value.startsWith("/") || /^(?:[a-z]+:|\/\/|#|data:)/i.test(value);
}

function createAssetAttrPattern(attributeNames) {
  const escapedNames = attributeNames.map(escapeRegExp).join("|");
  return new RegExp(`\\b(?:${escapedNames})\\s*=\\s*(["'])([^"']+)\\1`, "gi");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

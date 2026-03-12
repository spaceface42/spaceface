import { promises as fs } from "node:fs";
import path from "node:path";
import { APP_CONTRACT } from "../../app/contract-data.js";

const root = process.cwd();
const sourceDocsDir = path.resolve(root, APP_CONTRACT.sourceDir);

const failures = [];
const htmlFiles = await collectHtmlFiles(sourceDocsDir);

for (const filePath of htmlFiles) {
  const html = await fs.readFile(filePath, "utf8");
  const refs = extractAssetRefs(html);
  for (const ref of refs) {
    if (isExternalOrSpecial(ref)) continue;
    const resolved = path.resolve(path.dirname(filePath), ref);
    if (!resolved.startsWith(sourceDocsDir)) {
      failures.push(`${rel(filePath)} -> ${ref} escapes source docs root`);
      continue;
    }
    if (!(await exists(resolved))) {
      failures.push(`${rel(filePath)} -> ${ref} does not exist (${rel(resolved)})`);
    }
  }
}

if (failures.length > 0) {
  console.error("[partial-paths] FAILED");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`[partial-paths] OK (${htmlFiles.length} html files checked)`);

function extractAssetRefs(html) {
  const refs = [];

  const attrPattern = createAssetAttrPattern(APP_CONTRACT.partialAssetAttributes);
  let match;
  while ((match = attrPattern.exec(html)) !== null) {
    refs.push(match[1].trim());
  }

  const linkPattern = /<link\b[^>]*\brel=["']stylesheet["'][^>]*\bhref=["']([^"']+)["'][^>]*>/gi;
  while ((match = linkPattern.exec(html)) !== null) {
    refs.push(match[1].trim());
  }

  return refs;
}

function isExternalOrSpecial(value) {
  return (
    value.startsWith("/") ||
    value === "./bin/app.js" ||
    value === "bin/app.js" ||
    /^(?:[a-z]+:|\/\/|#|data:)/i.test(value)
  );
}

async function collectHtmlFiles(dir) {
  const out = [];
  if (!(await exists(dir))) {
    return out;
  }
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await collectHtmlFiles(entryPath)));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith(".html")) {
      out.push(entryPath);
    }
  }
  return out;
}

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function rel(filePath) {
  return path.relative(root, filePath);
}

function createAssetAttrPattern(attributeNames) {
  const escapedNames = attributeNames.map(escapeRegExp).join("|");
  return new RegExp(`\\b(?:${escapedNames})\\s*=\\s*["']([^"']+)["']`, "gi");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

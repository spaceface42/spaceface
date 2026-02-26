#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync, readdirSync, copyFileSync } from "node:fs";
import { resolve, dirname, extname, relative, join, isAbsolute, normalize } from "node:path";

const inDir = resolve(process.env.HTML_IN_DIR ?? "./docs.src");
const outDir = resolve(process.env.HTML_OUT_DIR ?? "./docs");
const bundleSrc = process.env.HTML_BUNDLE_SRC ?? "./bin/bundle.min.js";
const shouldSwapBundle = process.env.HTML_SWAP_BUNDLE !== "0";
const siteBase = normalizeSiteBase(process.env.SITE_BASE ?? "");
const devScriptCandidates = new Set([
    "spaceface/app/main.pjax.js",
    "spaceface/app/main.js",
    "spaceface/app/main.prod.js",
]);

const skipDirs = new Set([
    resolve(inDir, "bin"),
    resolve(inDir, "content", "partials"),
]);

function normalizeSiteBase(input) {
    const base = String(input ?? "").trim();
    if (!base) return "";
    const prefixed = base.startsWith("/") ? base : `/${base}`;
    return prefixed.replace(/\/+$/, "");
}

function withSiteBase(value) {
    if (!siteBase) return value;
    if (!value) return value;
    if (
        value.startsWith("#") ||
        value.startsWith("mailto:") ||
        value.startsWith("tel:") ||
        value.startsWith("data:") ||
        value.startsWith("javascript:") ||
        /^[a-z]+:\/\//i.test(value)
    ) {
        return value;
    }

    if (value === siteBase || value.startsWith(`${siteBase}/`)) {
        return value;
    }

    let path = value;
    if (path.startsWith("./")) path = path.slice(2);
    while (path.startsWith("../")) path = path.slice(3);
    if (path.startsWith("/")) path = path.slice(1);
    if (!path) return `${siteBase}/`;

    return `${siteBase}/${path}`;
}

function isSubpath(child, parent) {
    const rel = relative(parent, child);
    return rel && !rel.startsWith("..") && !isAbsolute(rel);
}

function shouldSkipPath(path) {
    for (const skipDir of skipDirs) {
        if (path === skipDir || isSubpath(path, skipDir)) return true;
    }
    return false;
}

function listHtmlFiles(dir) {
    const entries = readdirSync(dir, { withFileTypes: true });
    const files = [];

    for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        if (shouldSkipPath(fullPath)) continue;

        if (entry.isDirectory()) {
            files.push(...listHtmlFiles(fullPath));
        } else if (entry.isFile() && extname(entry.name).toLowerCase() === ".html") {
            files.push(fullPath);
        }
    }

    return files;
}

function listAssetFiles(dir) {
    const entries = readdirSync(dir, { withFileTypes: true });
    const files = [];

    for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        if (shouldSkipPath(fullPath)) continue;
        if (entry.name === ".DS_Store") continue;

        if (entry.isDirectory()) {
            files.push(...listAssetFiles(fullPath));
        } else if (entry.isFile()) {
            const ext = extname(entry.name).toLowerCase();
            if (ext !== ".html") files.push(fullPath);
        }
    }

    return files;
}

function parseAttributes(tag) {
    const attrs = {};
    const attrRegex = /(\w+)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/g;
    let match;
    while ((match = attrRegex.exec(tag))) {
        const key = match[1].toLowerCase();
        let value = match[2];
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }
        attrs[key] = value;
    }
    return attrs;
}

function resolvePartialPath(htmlFile, src) {
    if (!src) return null;
    if (src.startsWith("/")) {
        return resolve(inDir, `.${normalize(src)}`);
    }
    return resolve(dirname(htmlFile), src);
}

function inlinePartials(html, htmlFile) {
    const linkRegex = /<link\s+[^>]*rel\s*=\s*("|')partial\1[^>]*>/gi;
    return html.replace(linkRegex, (tag) => {
        const attrs = parseAttributes(tag);
        const src = attrs.src ?? attrs.href;
        const partialPath = resolvePartialPath(htmlFile, src);
        if (!partialPath) {
            return `<!-- Missing partial src in ${relative(inDir, htmlFile)} -->`;
        }

        try {
            const partial = readFileSync(partialPath, "utf8").trim();
            return partial ? `${partial}\n` : "";
        } catch (error) {
            return `<!-- Failed to load partial ${src} -->`;
        }
    });
}

function swapBundleScript(html) {
    const scriptRegex = /<script\b[^>]*>/gi;
    return html.replace(scriptRegex, (tag) => {
        const attrs = parseAttributes(tag);
        if (!attrs.src) return tag;

        const normalized = attrs.src.replace(/^\.\//, "");
        if (!devScriptCandidates.has(normalized)) return tag;

        return tag.replace(/src\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/i, `src="${bundleSrc}"`);
    });
}

function rewriteBasePaths(html) {
    if (!siteBase) return html;
    return html.replace(
        /\b(href|src)\s*=\s*("([^"]*)"|'([^']*)')/gi,
        (match, attr, quotedValue, dqValue, sqValue) => {
            const value = dqValue ?? sqValue ?? "";
            const rewritten = withSiteBase(value);
            if (rewritten === value) return match;
            const quote = quotedValue[0];
            return `${attr}=${quote}${rewritten}${quote}`;
        }
    );
}

function ensureDir(path) {
    mkdirSync(path, { recursive: true });
}

function buildHtmlFiles() {
    const htmlFiles = listHtmlFiles(inDir);
    const assetFiles = listAssetFiles(inDir);

    for (const file of htmlFiles) {
        const relPath = relative(inDir, file);
        const outFile = resolve(outDir, relPath);
        const outFolder = dirname(outFile);

        ensureDir(outFolder);
        const html = readFileSync(file, "utf8");
        const inlined = inlinePartials(html, file);
        const swapped = shouldSwapBundle ? swapBundleScript(inlined) : inlined;
        const compiled = rewriteBasePaths(swapped);
        writeFileSync(outFile, compiled, "utf8");
    }

    for (const file of assetFiles) {
        const relPath = relative(inDir, file);
        const outFile = resolve(outDir, relPath);
        const outFolder = dirname(outFile);

        ensureDir(outFolder);
        copyFileSync(file, outFile);
    }

    console.log(`HTML build finished!`);
    console.log(`Input -> ${inDir}`);
    console.log(`Output -> ${outDir}`);
}

buildHtmlFiles();

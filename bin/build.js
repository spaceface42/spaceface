#!/usr/bin/env node
import { build } from "esbuild";
import { rmSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const outDir = resolve("./docs/bin");
const entryFile = process.env.ENTRY ?? "./src/app/main.pjax.ts";

// Clean previous build
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

const baseOutFile = resolve(outDir, "bundle.js");
const minOutFile = resolve(outDir, "bundle.min.js");

// 1️⃣ Regular (unminified) build
await build({
    entryPoints: [entryFile],
    bundle: true,
    platform: "browser",
    format: "esm",
    target: ["es2022"],
    outfile: baseOutFile,
    sourcemap: true,
    minify: false,
    define: {
        "process.env.NODE_ENV": '"development"',
    },
    loader: { ".ts": "ts", ".js": "js" },
});

// 2️⃣ Minified build
await build({
    entryPoints: [entryFile],
    bundle: true,
    platform: "browser",
    format: "esm",
    target: ["es2022"],
    outfile: minOutFile,
    sourcemap: true,
    minify: true,
    define: {
        "process.env.NODE_ENV": '"production"',
    },
    loader: { ".ts": "ts", ".js": "js" },
});

console.log("Build finished!");
console.log("Unminified ->", baseOutFile);
console.log("Minified ->", minOutFile);

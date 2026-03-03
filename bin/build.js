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

async function runBuild(name, minify, env) {
    await build({
        entryPoints: { [name]: entryFile },
        outdir: outDir,
        bundle: true,
        splitting: true,
        chunkNames: "chunks/[name]-[hash]",
        platform: "browser",
        format: "esm",
        target: ["es2022"],
        sourcemap: true,
        minify,
        define: {
            "process.env.NODE_ENV": JSON.stringify(env),
        },
        loader: { ".ts": "ts", ".js": "js" },
    });
}

// 1️⃣ Regular (unminified) build
await runBuild("bundle", false, "development");

// 2️⃣ Minified build
await runBuild("bundle.min", true, "production");

console.log("Build finished!");
console.log("Unminified ->", baseOutFile);
console.log("Minified ->", minOutFile);

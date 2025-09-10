#!/usr/bin/env node
import { build } from "esbuild";
import { rmSync } from "node:fs";
import { resolve } from "node:path";

const outDir = resolve("./docs/bin");

// Clean previous build
rmSync(outDir, { recursive: true, force: true });

await build({
    entryPoints: ["./src/spaceface/app/bin/main.ts"], // Adjust if your entry point is different
    bundle: true,
    platform: "browser", // Or 'node' if targeting Node.js
    format: "esm",
    target: ["es2022"],
    outdir: outDir,
    sourcemap: true,
    minify: true,
    define: {
        "process.env.NODE_ENV": '"production"',
    },
    loader: { ".ts": "ts", ".js": "js" },
});

console.log("Build finished! Output ->", outDir);

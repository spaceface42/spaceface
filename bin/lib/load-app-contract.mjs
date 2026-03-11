import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";

export async function loadAppContract() {
  const tempDir = mkdtempSync(join(tmpdir(), "spaceface-contract-"));
  const bundlePath = join(tempDir, "app-contract.mjs");

  try {
    await build({
      stdin: {
        contents: `
          export { APP_CONTRACT } from "./src/app/contract.ts";
        `,
        loader: "ts",
        resolveDir: process.cwd(),
        sourcefile: "app-contract-loader.ts",
      },
      bundle: true,
      platform: "node",
      format: "esm",
      target: "node20",
      outfile: bundlePath,
      logLevel: "silent",
    });

    const module = await import(pathToFileURL(bundlePath).href);
    return module.APP_CONTRACT;
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

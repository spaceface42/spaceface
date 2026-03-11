import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";

export async function runBundledCheck(options, runCheck) {
  const tempDir = mkdtempSync(join(tmpdir(), options.tempPrefix));
  const bundlePath = join(tempDir, options.bundleFile);

  try {
    await build({
      stdin: {
        contents: options.contents,
        loader: "ts",
        resolveDir: process.cwd(),
        sourcefile: options.sourcefile,
      },
      bundle: true,
      platform: "node",
      format: "esm",
      target: "node20",
      outfile: bundlePath,
      logLevel: "silent",
      plugins: options.plugins ?? [],
    });

    const runtime = await import(pathToFileURL(bundlePath).href);
    await runCheck(runtime);
    console.log(`[${options.label}] OK`);
  } catch (error) {
    console.error(`[${options.label}] FAILED`);
    console.error(error);
    process.exitCode = 1;
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

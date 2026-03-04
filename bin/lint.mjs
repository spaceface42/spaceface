import { spawnSync } from "node:child_process";

const args = process.argv.slice(2);
const eslintArgs = ["src", ...args];

const eslint = spawnSync("eslint", eslintArgs, { stdio: "inherit" });
if (eslint.status !== null) {
  process.exit(eslint.status);
}

if (eslint.error && eslint.error.code === "ENOENT") {
  console.warn("[lint] eslint binary not found; falling back to typecheck.");
  const tsc = spawnSync("tsc", ["-p", "./tsconfig.json", "--noEmit"], { stdio: "inherit" });
  if (tsc.status !== null) {
    process.exit(tsc.status);
  }
  if (tsc.error) {
    console.error(`[lint] fallback typecheck failed to start: ${tsc.error.message}`);
    process.exit(1);
  }
  process.exit(1);
}

if (eslint.error) {
  console.error(`[lint] failed to start eslint: ${eslint.error.message}`);
}
process.exit(1);

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const eslintArgs = ["src", ...args];
const eslintBin =
  process.platform === "win32"
    ? path.resolve(process.cwd(), "node_modules", ".bin", "eslint.cmd")
    : path.resolve(process.cwd(), "node_modules", ".bin", "eslint");

if (!existsSync(eslintBin)) {
  console.error("[lint] eslint binary not found at node_modules/.bin/eslint. Run `npm ci` first.");
  process.exit(1);
}

const eslint = spawnSync(eslintBin, eslintArgs, { stdio: "inherit" });
if (eslint.status !== null) {
  process.exit(eslint.status);
}

if (eslint.error) {
  console.error(`[lint] failed to start eslint: ${eslint.error.message}`);
}
process.exit(1);

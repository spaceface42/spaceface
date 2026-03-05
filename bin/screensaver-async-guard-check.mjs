import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const sourcePath = resolve(process.cwd(), "src/features/screensaver/ScreensaverFeature.ts");

try {
  const source = readFileSync(sourcePath, "utf8");

  // Guard against regressions where stale async work can mutate new-route state.
  assertContains(source, "private activationRunId = 0;", "missing activation run-id state guard");
  assertContains(source, "private partialLoadAbort?: AbortController;", "missing partial-load abort controller");
  assertContains(source, "this.invalidatePendingAsyncWork();", "missing async invalidation call sites");
  assertContains(
    source,
    "private async prepareScreensaverMarkup(target: HTMLElement, activationId: number): Promise<void>",
    "prepareScreensaverMarkup should validate target + activation id"
  );
  assertContains(
    source,
    "if (activationId !== this.activationRunId) return;",
    "missing activation id guard inside async paths"
  );
  assertContains(
    source,
    'loadPartialHtml(this.options.partialUrl ?? "", { cache: true, signal: abortController.signal })',
    "partial load should use abort signal"
  );
  assertContains(source, "private invalidatePendingAsyncWork(): void {", "missing async invalidation helper");
  assertContains(source, "this.partialLoadAbort?.abort();", "invalidation helper should abort in-flight partial fetch");

  console.log("[screensaver async guards] OK");
} catch (error) {
  console.error("[screensaver async guards] FAILED");
  console.error(error);
  process.exitCode = 1;
}

function assertContains(content, needle, message) {
  assert.ok(content.includes(needle), message);
}

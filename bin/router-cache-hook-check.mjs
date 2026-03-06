import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const tempDir = mkdtempSync(join(tmpdir(), 'spaceface-router-hooks-'));
const bundlePath = join(tempDir, 'router-harness.mjs');

const INDEX_URL = 'http://127.0.0.1:8787/index.html';
const PAGE2_URL = 'http://127.0.0.1:8787/slideplayer.html';

const INDEX_HTML = `
<!doctype html>
<html lang="en" data-mode="dev">
  <head><title>Index</title></head>
  <body data-page="index" class="page-index">
    <main data-route-container><section>Index content</section></main>
  </body>
</html>
`;

const PAGE2_HTML = `
<!doctype html>
<html lang="en" data-mode="dev">
  <head><title>Slideplayer</title></head>
  <body data-page="slideplayer" class="page-slideplayer">
    <main data-route-container><section>Page 2 content</section></main>
  </body>
</html>
`;

async function main() {
  try {
  await build({
    stdin: {
      contents: 'export { RouteCoordinator } from "./src/core/router.ts";',
      loader: 'ts',
      resolveDir: process.cwd(),
      sourcefile: 'router-harness.ts',
    },
    bundle: true,
    format: 'esm',
    platform: 'node',
    target: 'node20',
    outfile: bundlePath,
    logLevel: 'silent',
  });

  const { RouteCoordinator } = await import(pathToFileURL(bundlePath).href);

  const logger = createMemoryLogger();
  const { windowMock, documentMock } = createDomMocks(INDEX_URL, INDEX_HTML);
  globalThis.window = windowMock;
  globalThis.document = documentMock;
  globalThis.DOMParser = windowMock.DOMParser;
  globalThis.Node = windowMock.Node;
  globalThis.fetch = createFetchMock();

  const snapshots = [];
  const router = new RouteCoordinator({
    containerSelector: '[data-route-container]',
    logger,
    hooks: {
      onBeforeSwap: (ctx) => snapshots.push(captureSnapshot('before', ctx)),
      onAfterSwap: (ctx) => snapshots.push(captureSnapshot('after', ctx)),
    },
  });

  router.start();
  await router.navigate(PAGE2_URL); // network
  await router.navigate(INDEX_URL); // cache
  await router.navigate(PAGE2_URL); // cache
  const fetchCountBeforeHash = globalThis.fetch.calls.count;
  await router.navigate(`${PAGE2_URL}#details`); // same document hash only
  const fetchCountAfterHash = globalThis.fetch.calls.count;

  const page2Before = snapshots.filter((item) => item.path === '/slideplayer.html' && item.phase === 'before');
  const page2After = snapshots.filter((item) => item.path === '/slideplayer.html' && item.phase === 'after');
  assert.equal(page2Before.length, 2, 'slideplayer before-hook should run for network and cache paths');
  assert.equal(page2After.length, 2, 'slideplayer after-hook should run for network and cache paths');

  assert.deepEqual(page2Before[0], page2Before[1], 'before-hook context should be parity between network and cache');
  assert.deepEqual(page2After[0], page2After[1], 'after-hook context should be parity between network and cache');

  assert.equal(globalThis.fetch.calls.count, 1, 'slideplayer should be fetched once, second visit should come from cache');
  assert.equal(fetchCountAfterHash, fetchCountBeforeHash, 'hash-only navigation should not fetch/swap route content');
  assert.equal(globalThis.window.location.hash, '#details', 'hash-only navigation should update location hash');
  assert.equal(logger.debugEntries.filter((item) => item.message === 'route cache miss').length >= 1, true);
  assert.equal(logger.debugEntries.filter((item) => item.message === 'route cache hit').length >= 1, true);

  console.log('[router cache hook parity] OK');
  } catch (error) {
  console.error('[router cache hook parity] FAILED');
  console.error(error);
  process.exitCode = 1;
  } finally {
  rmSync(tempDir, { recursive: true, force: true });
  }
}

function captureSnapshot(phase, ctx) {
  return {
    phase,
    path: ctx.url.pathname,
    title: ctx.nextDocument.title,
    htmlLang: ctx.nextDocument.documentElement.lang,
    htmlDir: ctx.nextDocument.documentElement.getAttribute('dir'),
    htmlDataMode: ctx.nextDocument.documentElement.getAttribute('data-mode'),
    bodyClass: ctx.nextDocument.body.className,
    bodyPage: ctx.nextDocument.body.getAttribute('data-page'),
    nextContainerHtml: ctx.nextContainer.innerHTML,
  };
}

function createMemoryLogger() {
  return {
    debugEntries: [],
    debug(message, data) {
      this.debugEntries.push({ message, data });
      // console.debug(message, data); // noisy
    },
    info() {},
    warn(message, data) {
      console.warn(message, data);
    },
    error(message, data) {
      console.error(message, data?.error || data);
    },
  };
}

function createFetchMock() {
  const fn = async (url) => {
    fn.calls.count += 1;
    const normalized = new URL(url.toString(), INDEX_URL).toString();
    if (normalized === INDEX_URL) {
      return { ok: true, status: 200, text: async () => INDEX_HTML };
    }
    if (normalized === PAGE2_URL) {
      return { ok: true, status: 200, text: async () => PAGE2_HTML };
    }
    return {
      ok: false,
      status: 404,
      text: async () => '',
    };
  };
  fn.calls = { count: 0 };
  return fn;
}

import { JSDOM } from 'jsdom';

function createDomMocks(initialUrl, initialHtml) {
  const dom = new JSDOM(initialHtml, { url: initialUrl });
  const windowMock = dom.window;
  const documentMock = windowMock.document;

  // Prevent "Not implemented: navigation to another Document" errors
  windowMock.history.pushState = (_state, _title, url) => {
    dom.reconfigure({ url: new URL(url, dom.window.location.href).href });
  };
  windowMock.history.replaceState = (_state, _title, url) => {
    dom.reconfigure({ url: new URL(url, dom.window.location.href).href });
  };

  return { windowMock, documentMock };
}

await main();

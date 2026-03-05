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
  globalThis.DOMParser = FakeDOMParser;
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

  const page2Before = snapshots.filter((item) => item.path === '/slideplayer.html' && item.phase === 'before');
  const page2After = snapshots.filter((item) => item.path === '/slideplayer.html' && item.phase === 'after');
  assert.equal(page2Before.length, 2, 'slideplayer before-hook should run for network and cache paths');
  assert.equal(page2After.length, 2, 'slideplayer after-hook should run for network and cache paths');

  assert.deepEqual(page2Before[0], page2Before[1], 'before-hook context should be parity between network and cache');
  assert.deepEqual(page2After[0], page2After[1], 'after-hook context should be parity between network and cache');

  assert.equal(globalThis.fetch.calls.count, 1, 'slideplayer should be fetched once, second visit should come from cache');
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
    },
    info() {},
    warn() {},
    error() {},
  };
}

function createFetchMock() {
  const fn = async (url) => {
    fn.calls.count += 1;
    const normalized = new URL(url.toString(), INDEX_URL).toString();
    if (normalized !== PAGE2_URL) {
      return {
        ok: false,
        status: 404,
        text: async () => '',
      };
    }
    return {
      ok: true,
      status: 200,
      text: async () => PAGE2_HTML,
    };
  };
  fn.calls = { count: 0 };
  return fn;
}

class FakeElement {
  constructor(tagName) {
    this.tagName = tagName.toUpperCase();
    this.innerHTML = '';
    this.className = '';
    this.children = [];
    this.attributes = new Map();
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
    if (name === 'class') this.className = String(value);
  }

  getAttribute(name) {
    if (name === 'class') return this.className || null;
    return this.attributes.has(name) ? this.attributes.get(name) : null;
  }

  removeAttribute(name) {
    if (name === 'class') {
      this.className = '';
      return;
    }
    this.attributes.delete(name);
  }

  appendChild(child) {
    this.children.push(child);
    return child;
  }

  cloneNode(_deep) {
    const clone = new FakeElement(this.tagName);
    clone.className = this.className;
    for (const [name, value] of this.attributes.entries()) {
      clone.attributes.set(name, value);
    }
    return clone;
  }

  querySelector(selector) {
    for (const child of this.children) {
      if (matchesSelector(child, selector)) return child;
      const nested = child.querySelector(selector);
      if (nested) return nested;
    }
    return null;
  }
}

class FakeDocument {
  constructor() {
    this.title = '';
    this.documentElement = new FakeElement('html');
    this.body = new FakeElement('body');
  }

  querySelector(selector) {
    if (matchesSelector(this.body, selector)) return this.body;
    return this.body.querySelector(selector);
  }

  createElement(tagName) {
    return new FakeElement(tagName);
  }

  addEventListener() {}
  removeEventListener() {}
}

class FakeDOMParser {
  parseFromString(html) {
    return createDocumentFromHtml(html);
  }
}

function createDomMocks(initialUrl, initialHtml) {
  let currentUrl = new URL(initialUrl);
  const documentMock = createDocumentFromHtml(initialHtml);
  documentMock.implementation = {
    createHTMLDocument: () => new FakeDocument(),
  };

  const location = {
    get href() {
      return currentUrl.toString();
    },
    set href(next) {
      currentUrl = new URL(next, currentUrl);
    },
    get origin() {
      return currentUrl.origin;
    },
    get pathname() {
      return currentUrl.pathname;
    },
    get search() {
      return currentUrl.search;
    },
    get hash() {
      return currentUrl.hash;
    },
  };

  const history = {
    pushState: (_state, _title, url) => {
      location.href = String(url);
    },
    replaceState: (_state, _title, url) => {
      location.href = String(url);
    },
  };

  const windowMock = {
    location,
    history,
    addEventListener() {},
    removeEventListener() {},
  };

  return { windowMock, documentMock };
}

function createDocumentFromHtml(html) {
  const doc = new FakeDocument();

  doc.title = matchText(html, /<title>([\s\S]*?)<\/title>/i) ?? '';
  const htmlTag = matchText(html, /<html\b([^>]*)>/i) ?? '';
  const bodyTag = matchText(html, /<body\b([^>]*)>/i) ?? '';
  const htmlLang = matchAttr(htmlTag, 'lang') ?? '';
  doc.documentElement.lang = htmlLang;
  setMaybeAttr(doc.documentElement, 'dir', matchAttr(htmlTag, 'dir'));
  setMaybeAttr(doc.documentElement, 'data-mode', matchAttr(htmlTag, 'data-mode'));
  doc.body.className = matchAttr(bodyTag, 'class') ?? '';
  setMaybeAttr(doc.body, 'data-page', matchAttr(bodyTag, 'data-page'));

  const container = new FakeElement('main');
  container.setAttribute('data-route-container', 'true');
  container.innerHTML = matchRouteContainerHtml(html);
  doc.body.appendChild(container);

  return doc;
}

function matchRouteContainerHtml(html) {
  const match = html.match(/<([a-z0-9-]+)\b[^>]*data-route-container[^>]*>([\s\S]*?)<\/\1>/i);
  return match ? match[2] : '';
}

function matchText(input, pattern) {
  const match = input.match(pattern);
  return match?.[1] ?? null;
}

function matchAttr(tagText, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`${escaped}=["']([^"']*)["']`, 'i');
  const match = tagText.match(pattern);
  return match?.[1] ?? null;
}

function setMaybeAttr(element, name, value) {
  if (value == null) {
    element.removeAttribute(name);
    return;
  }
  element.setAttribute(name, value);
}

function matchesSelector(element, selector) {
  if (selector.startsWith('[') && selector.endsWith(']')) {
    const attr = selector.slice(1, -1).split('=')[0].trim();
    return element.getAttribute(attr) !== null;
  }
  return element.tagName.toLowerCase() === selector.toLowerCase();
}

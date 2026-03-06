import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSync } from 'esbuild';
import { JSDOM } from 'jsdom';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = resolve(__dirname, '..');

// 1. Compile morphdom.ts to a temporary CJS/MJS file so we can import/run it
const inFile = resolve(root, 'src/core/morphdom.ts');
const outFile = resolve(root, 'node_modules/.cache/morphdom.temp.mjs');

buildSync({
  entryPoints: [inFile],
  outfile: outFile,
  bundle: true,
  format: 'esm',
  target: 'es2022',
});

// 2. Import the compiled morphNode function
import { pathToFileURL } from 'node:url';
const { morphNode } = await import(pathToFileURL(outFile).href);

// 3. Setup JSDOM
const dom = new JSDOM(`<!DOCTYPE html><html><head></head><body></body></html>`);
const document = dom.window.document;
global.Node = dom.window.Node;

// 4. Test Runner Setup
const failures = [];
let passCount = 0;

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    failures.push(`${message}\n  Expected: ${JSON.stringify(expected)}\n  Actual:   ${JSON.stringify(actual)}`);
  }
}

function assertNodeEqual(actualHtml, expectedHtml, message) {
  if (actualHtml !== expectedHtml) {
    failures.push(`${message}\n  Expected: ${expectedHtml}\n  Actual:   ${actualHtml}`);
  }
}

function runTest(name, fn) {
  try {
    fn();
    passCount++;
  } catch (error) {
    failures.push(`Test "${name}" threw an error: ${error.message}\n${error.stack}`);
  }
}

// ============================================================================
// TESTS
// ============================================================================

runTest('Morphs text node content', () => {
  const fromEl = document.createElement('div');
  fromEl.textContent = 'Hello';
  const toEl = document.createElement('div');
  toEl.textContent = 'World';

  morphNode(fromEl, toEl);

  assertNodeEqual(fromEl.outerHTML, '<div>World</div>', 'Text content should be updated');
});

runTest('Adds, updates, and removes attributes', () => {
  const fromEl = document.createElement('div');
  fromEl.setAttribute('id', 'test1');
  fromEl.setAttribute('class', 'old-class');
  fromEl.setAttribute('data-remove', 'true');

  const toEl = document.createElement('div');
  toEl.setAttribute('id', 'test1'); // unchanged
  toEl.setAttribute('class', 'new-class'); // updated
  toEl.setAttribute('data-add', 'true'); // added

  morphNode(fromEl, toEl);

  assertNodeEqual(
    fromEl.outerHTML,
    '<div id="test1" class="new-class" data-add="true"></div>',
    'Attributes should be accurately synced'
  );
});

runTest('Adds, updates, and removes children', () => {
  const fromEl = document.createElement('ul');
  fromEl.innerHTML = `
    <li>First</li>
    <li class="remove-me">Second</li>
  `;

  const toEl = document.createElement('ul');
  toEl.innerHTML = `
    <li>First Updated</li>
    <li>Third (Added)</li>
  `;

  morphNode(fromEl, toEl);

  // Normalize whitespace for comparison
  const actual = fromEl.outerHTML.replace(/\s+/g, '');
  const expected = '<ul><li>FirstUpdated</li><li>Third(Added)</li></ul>'.replace(/\s+/g, '');

  assertNodeEqual(actual, expected, 'Children should be morphed correctly');
});

runTest('Replaces node completely if tag name differs', () => {
  const container = document.createElement('div');
  const fromEl = document.createElement('span');
  fromEl.textContent = 'Test';
  container.appendChild(fromEl);

  const toEl = document.createElement('div');
  toEl.textContent = 'Test';

  morphNode(fromEl, toEl);

  assertNodeEqual(
    container.innerHTML,
    '<div>Test</div>',
    'Span should be replaced by Div'
  );
});

runTest('Preserves unchanged elements by reference', () => {
  const fromEl = document.createElement('div');
  const child1 = document.createElement('p');
  child1.textContent = 'Preserve me';
  fromEl.appendChild(child1);

  const toEl = document.createElement('div');
  const child2 = document.createElement('p');
  child2.textContent = 'Preserve me';
  toEl.appendChild(child2);

  morphNode(fromEl, toEl);

  assertEqual(
    fromEl.firstChild === child1,
    true,
    'The exact same DOM node reference should be preserved'
  );
});

// ============================================================================
// Test execution
// ============================================================================

if (failures.length > 0) {
  console.error(`\n[morphdom tests] FAILED (${failures.length} failures)`);
  for (const failure of failures) {
    console.error(`\n❌ ${failure}`);
  }
  process.exit(1);
} else {
  console.log(`\n[morphdom tests] OK (${passCount} tests passed)`);
}

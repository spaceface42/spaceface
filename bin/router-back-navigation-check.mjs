import puppeteer from 'puppeteer';
import { createServer } from 'http';
import { spawn } from 'child_process';
import path from 'path';

import fs from 'fs/promises';

const PORT = 8081;

// Extremely simple Node.js static file server since PHP is broken locally
const server = createServer(async (req, res) => {
  try {
    const urlPath = req.url === '/' ? '/index.html' : req.url.split('?')[0];
    const filePath = path.join(process.cwd(), 'docs', urlPath);
    const content = await fs.readFile(filePath);
    if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    } else if (filePath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
    } else {
      res.setHeader('Content-Type', 'text/html');
    }
    res.writeHead(200);
    res.end(content);
  } catch (err) {
    res.writeHead(404);
    res.end('Not found');
  }
});

async function runTest() {
  console.log('[router-back-navigation] Starting local test server...');

  await new Promise(resolve => server.listen(PORT, resolve));

  // Wait for the server to be ready locally instead of via fetch
  await new Promise(resolve => setTimeout(resolve, 500));

  console.log('[router-back-navigation] Launching Puppeteer...');
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();

  const failures = [];

  try {
    // 1. Visit the index page
    console.log('[router-back-navigation] Visiting /index.html');
    await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'networkidle0' });
    let page1Title = await page.title();

    // Check we are on home
    const isHome = await page.evaluate(() => document.body.getAttribute('data-page') === 'home');
    if (!isHome) failures.push('Initial load not on home page');

    // 2. Click a link to navigate to another route
    console.log('[router-back-navigation] Navigating to /floating-images.html via client-side routing');
    await page.click('a[href="/floating-images.html"]');

    // Wait for the route coordinator to morph the DOM
    await page.waitForFunction(() => document.body.getAttribute('data-page') === 'floating-images');
    let page2Title = await page.title();

    if (page1Title === page2Title) {
      failures.push('Title did not change after navigating from home to floating-images');
    }

    // 3. Trigger browser back button
    console.log('[router-back-navigation] Triggering browser back button');
    await page.goBack();

    // Wait for the route coordinator to restore the previous page
    await page.waitForFunction(() => document.body.getAttribute('data-page') === 'home');

    // 4. Verify correctly restored state
    console.log('[router-back-navigation] Verifying restored DOM state');

    const isRestoredToHome = await page.evaluate(() => document.body.getAttribute('data-page') === 'home');
    if (!isRestoredToHome) failures.push('DOM did not restore body data-page attribute on back navigation');

    const restoredTitle = await page.title();
    if (restoredTitle !== page1Title) failures.push('Title was not restored correctly on back navigation');

    // 5. Navigate forward again
    console.log('[router-back-navigation] Triggering browser forward button');
    await page.goForward();

    // Wait for the route coordinator to restore the second page
    await page.waitForFunction(() => document.body.getAttribute('data-page') === 'floating-images');

    const isRestoredToPage2 = await page.evaluate(() => document.body.getAttribute('data-page') === 'floating-images');
    if (!isRestoredToPage2) failures.push('DOM did not restore body data-page attribute on forward navigation');

  } catch (err) {
    console.error('[router-back-navigation] Exception during test execution:', err);
    failures.push(err.message);
  } finally {
    console.log('[router-back-navigation] Cleaning up resources...');
    await browser.close();
    server.close();
  }

  if (failures.length > 0) {
    console.error('\n[router-back-navigation] FAILED');
    for (const f of failures) {
      console.error(` - ${f}`);
    }
    process.exit(1);
  } else {
    console.log('\n[router-back-navigation] OK (Popstate back/forward navigation correctly restores DOM)');
  }
}

runTest().catch(err => {
  console.error(err);
  process.exit(1);
});

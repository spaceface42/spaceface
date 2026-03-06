import { test } from "node:test";
import assert from "node:assert";
import { JSDOM } from "jsdom";
import { Features } from "./setup-test-env.mjs";

test("screensaver floating double init check", async () => {
    // Setup dom
    const dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <head><title>Test</title></head>
        <body>
          <div data-screensaver="true" hidden aria-hidden="true"></div>
        </body>
      </html>
    `, { url: "http://localhost/" });

    global.window = dom.window;
    global.document = dom.window.document;
    global.HTMLElement = dom.window.HTMLElement;

    // ...
});

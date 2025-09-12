// src/spaceface/system/bin/PartialUtils.ts
import { eventBus } from "./EventBus.js";

export async function fetchPartialWithRetry(
    url: string,
    timeout = 10000,
    retryAttempts = 3,
    cache?: Map<string, string>
): Promise<string> {
    if (cache?.has(url)) {
        return cache.get(url)!;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
        const res = await fetch(url, { signal: controller.signal, headers: { Accept: "text/html" } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const html = (await res.text()).trim();
        if (!html) throw new Error("Empty response");

        if (cache) cache.set(url, html);

        return html;
    } catch (err) {
        if (retryAttempts > 1) {
            await delay(Math.min((4 - retryAttempts) ** 2 * 100, 5000));
            return fetchPartialWithRetry(url, timeout, retryAttempts - 1, cache);
        }
        throw err;
    } finally {
        clearTimeout(timeoutId);
    }
}

export function insertHTML(container: ParentNode | Element, html: string, replace = true) {
    const template = document.createElement("template");
    template.innerHTML = html;

    if (container instanceof HTMLLinkElement) {
        container.replaceWith(...template.content.childNodes);
    } else if (container instanceof Element) {
        if (replace) container.innerHTML = "";
        container.append(...template.content.childNodes);
    } else {
        container.append(...template.content.childNodes);
    }
}

export function showPartialError(container: ParentNode | Element, error: Error, debug = false) {
    const div = document.createElement("div");
    div.className = "partial-error";
    div.textContent = "Partial load failed";
    if (debug) div.textContent += `: ${error.message}`;

    if (container instanceof HTMLLinkElement) {
        container.replaceWith(div);
    } else if (container instanceof Element) {
        container.innerHTML = "";
        container.appendChild(div);
    } else {
        container.appendChild(div);
    }
}

function delay(ms: number) {
    return new Promise(r => setTimeout(r, ms));
}

// src/spaceface/system/bin/PartialUtils.ts

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
        if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
        const html = (await res.text()).trim();
        if (!html) throw new Error("Empty response");

        if (cache) cache.set(url, html);

        return html;
    } catch (err) {
        if (retryAttempts > 1) {
            // Exponential backoff with full jitter:
            // attempt = 1..N (calculated from retryAttempts decreasing)
            const attempt = Math.max(1, 4 - retryAttempts); // 1,2,3...
            // base grows exponentially (100ms, 200ms, 400ms, ...)
            const base = Math.min(5000, 100 * Math.pow(2, attempt - 1));
            // full jitter: random between 0 and base, capped
            const wait = Math.min(Math.random() * base, 5000);
            await delay(wait);
            return fetchPartialWithRetry(url, timeout, retryAttempts - 1, cache);
        }
        // include URL in final error
        throw new Error(`Failed to fetch partial ${url}: ${(err as Error)?.message ?? String(err)}`);
    } finally {
        clearTimeout(timeoutId);
    }
}

export function insertHTML(container: ParentNode | Element, html: string, replace = true) {
    const template = document.createElement("template");
    template.innerHTML = html;

    // If container is an Element and attached to the DOM, replace it when requested;
    // otherwise append into the element or parent node.
    if (container instanceof Element && replace && container.parentElement) {
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

    if (container instanceof Element && container.parentElement) {
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

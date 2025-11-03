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

    if (timeout <= 0) {
        throw new TypeError("Timeout must be greater than 0");
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
        const res = await fetch(url, { signal: controller.signal, headers: { Accept: "text/html" } });
        if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
        const html = (await res.text()).trim();
        if (!html) throw new Error("Empty response");

        cache?.set(url, html);
        return html;
    } catch (err) {
        if (retryAttempts > 1) {
            const attempt = Math.max(1, 4 - retryAttempts); // 1, 2, 3...
            const base = Math.min(5000, 100 * Math.pow(2, attempt - 1));
            const wait = Math.min(Math.random() * base, 5000);
            await delay(wait);
            return fetchPartialWithRetry(url, timeout, retryAttempts - 1, cache);
        }
        throw new Error(`Failed to fetch partial ${url} after ${4 - retryAttempts} retries: ${(err as Error)?.message ?? String(err)}`);
    } finally {
        clearTimeout(timeoutId);
    }
}

export function insertHTML(container: ParentNode | Element, html: string, replace = true) {
    const template = document.createElement("template");
    template.innerHTML = html;

    updateContainer(container, template.content.childNodes, replace);
}

export function showPartialError(container: ParentNode | Element, error: Error, debug = false) {
    const div = document.createElement("div");
    div.className = "partial-error";
    div.textContent = "Partial load failed";
    if (debug) div.textContent += `: ${error.message}`;

    updateContainer(container, [div], true);
}

function updateContainer(container: ParentNode | Element, nodes: NodeList | Node[], replace: boolean) {
    if (container instanceof Element && replace && container.parentElement) {
        container.replaceWith(...nodes);
    } else if (container instanceof Element) {
        if (replace) container.innerHTML = "";
        container.append(...nodes);
    } else {
        container.append(...nodes);
    }
}

function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

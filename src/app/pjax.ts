// Minimal PJAX implementation (no dependencies)

type PjaxOptions = {
    containerSelector?: string;
    linkSelector?: string;
    scrollToTop?: boolean;
    cache?: boolean;
};

type CachedEntry = {
    title: string;
    html: string;
    url: string;
};

export class Pjax {
    private containerSelector: string;
    private linkSelector: string;
    private scrollToTop: boolean;
    private cacheEnabled: boolean;
    private cache = new Map<string, CachedEntry>();
    private currentRequest?: AbortController;

    constructor(options: PjaxOptions = {}) {
        this.containerSelector = options.containerSelector ?? '[data-pjax="container"]';
        this.linkSelector = options.linkSelector ?? 'a[href]';
        this.scrollToTop = options.scrollToTop ?? true;
        this.cacheEnabled = options.cache ?? true;
    }

    init(): void {
        document.addEventListener('click', this.onClick, true);
        window.addEventListener('popstate', this.onPopState);
    }

    destroy(): void {
        document.removeEventListener('click', this.onClick, true);
        window.removeEventListener('popstate', this.onPopState);
        this.currentRequest?.abort();
        this.currentRequest = undefined;
    }

    private onClick = (event: MouseEvent) => {
        if (event.defaultPrevented) return;
        if (event.button !== 0) return;
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

        const target = event.target as Element | null;
        const link = target?.closest?.(this.linkSelector) as HTMLAnchorElement | null;
        if (!link) return;
        if (link.hasAttribute('download')) return;
        if (link.getAttribute('rel') === 'external') return;
        if (link.target && link.target !== '_self') return;
        if (link.dataset.noPjax !== undefined) return;

        const href = link.href;
        if (!href) return;

        const url = new URL(href, window.location.href);
        if (url.origin !== window.location.origin) return;

        // Same-page hash only: let browser handle
        if (url.pathname === window.location.pathname && url.search === window.location.search && url.hash) {
            return;
        }

        event.preventDefault();
        void this.load(url.toString(), true);
    };

    private onPopState = () => {
        void this.load(window.location.href, false);
    };

    async load(url: string, pushState: boolean): Promise<void> {
        const container = document.querySelector<HTMLElement>(this.containerSelector);
        if (!container) {
            document.dispatchEvent(new CustomEvent('pjax:error', { detail: { url, error: new Error('PJAX container not found') } }));
            window.location.href = url;
            return;
        }

        this.currentRequest?.abort();
        const controller = new AbortController();
        this.currentRequest = controller;
        const requestToken = controller;

        container.setAttribute('data-pjax-loading', 'true');
        document.dispatchEvent(new CustomEvent('pjax:before', { detail: { url } }));

        try {
            const cached = this.cacheEnabled ? this.cache.get(url) : undefined;
            let title: string;
            let html: string;

            if (cached) {
                ({ title, html } = cached);
            } else {
                const res = await fetch(url, {
                    method: 'GET',
                    headers: { 'X-PJAX': 'true' },
                    signal: controller.signal,
                    credentials: 'same-origin',
                });
                if (!res.ok) throw new Error(`PJAX HTTP ${res.status}`);
                const text = await res.text();
                const parsed = new DOMParser().parseFromString(text, 'text/html');
                const nextContainer = parsed.querySelector<HTMLElement>(this.containerSelector);
                if (!nextContainer) throw new Error(`PJAX container "${this.containerSelector}" not found`);

                title = parsed.title || document.title;
                html = nextContainer.innerHTML;

                if (this.cacheEnabled) {
                    this.cache.set(url, { title, html, url });
                }
            }

            // Ensure only the latest request can update the DOM
            if (this.currentRequest !== requestToken) return;

            // Note: scripts inside the swapped HTML will not execute automatically.
            container.innerHTML = html;
            document.title = title;

            if (pushState) {
                history.pushState({ pjax: true }, '', url);
            }

            if (this.scrollToTop) {
                window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
            }

            document.dispatchEvent(new CustomEvent('pjax:complete', { detail: { url } }));
        } catch (error) {
            if ((error as any)?.name !== 'AbortError') {
                document.dispatchEvent(new CustomEvent('pjax:error', { detail: { url, error } }));
                window.location.href = url;
            }
        } finally {
            container.removeAttribute('data-pjax-loading');
        }
    }
}

export function initPjax(options: PjaxOptions = {}): Pjax {
    const pjax = new Pjax(options);
    pjax.init();
    return pjax;
}

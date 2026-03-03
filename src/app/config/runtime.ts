export const DEV_HOST_FRAGMENTS = ['localhost', '127.0.0.1'] as const;

export const DEFAULT_PJAX_CONTAINER_SELECTOR = '[data-pjax="container"]';

export function isDevHost(hostname: string): boolean {
    return DEV_HOST_FRAGMENTS.some(host => hostname.includes(host));
}

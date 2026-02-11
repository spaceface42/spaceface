export const VERSION = '2.0.0';
export class ServiceWorkerManager {
    swPath;
    options;
    customConfig;
    registration = null;
    isSupported;
    constructor(swPath = '/sw.js', options = {}, customConfig = {}) {
        this.swPath = swPath;
        this.options = {
            scope: '/',
            updateViaCache: 'none',
            ...options,
        };
        this.customConfig = customConfig;
        this.isSupported = 'serviceWorker' in navigator;
    }
    async register() {
        if (!this.isSupported) {
            throw new Error('ServiceWorker not supported');
        }
        try {
            this.registration = await navigator.serviceWorker.register(this.swPath, this.options);
            this.setupEventListeners();
            return this.registration;
        }
        catch (error) {
            console.error('SW registration failed:', error);
            throw error;
        }
    }
    configure() {
        if (this.customConfig.strategy) {
            this.setStrategy(this.customConfig.strategy);
        }
    }
    async unregister() {
        if (!this.registration)
            return false;
        try {
            return await this.registration.unregister();
        }
        catch (error) {
            console.error('SW unregistration failed:', error);
            return false;
        }
    }
    async update() {
        if (!this.registration)
            return null;
        try {
            await this.registration.update();
            return null;
        }
        catch (error) {
            console.error('SW update failed:', error);
            return null;
        }
    }
    getStatus() {
        if (!this.registration)
            return 'unregistered';
        if (this.registration.installing)
            return 'installing';
        if (this.registration.waiting)
            return 'waiting';
        if (this.registration.active)
            return 'active';
        return 'unknown';
    }
    setupEventListeners() {
        if (!this.registration)
            return;
        this.registration.addEventListener('updatefound', () => {
            const newWorker = this.registration?.installing;
            if (!newWorker)
                return;
            newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    this.onUpdateAvailable?.(newWorker);
                }
            });
        });
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            this.onControllerChange?.();
        });
    }
    async postMessage(message, transfer) {
        const sw = navigator.serviceWorker.controller;
        if (!sw)
            throw new Error('No active service worker');
        if (transfer) {
            sw.postMessage(message, { transfer });
        }
        else {
            sw.postMessage(message);
        }
    }
    waitForMessage(timeout = 5000) {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error('Message timeout')), timeout);
            const handler = (event) => {
                clearTimeout(timer);
                navigator.serviceWorker.removeEventListener('message', handler);
                resolve(event.data);
            };
            navigator.serviceWorker.addEventListener('message', handler);
        });
    }
    async activateWaiting() {
        if (!this.registration?.waiting)
            return false;
        try {
            await this.postMessage({ type: 'SKIP_WAITING' });
            return true;
        }
        catch (error) {
            console.error('Failed to activate waiting SW:', error);
            return false;
        }
    }
    setStrategy(config = {}) {
        if (!navigator.serviceWorker.controller) {
            console.warn('No active SW to set strategy');
            return;
        }
        this.postMessage({
            type: 'SET_STRATEGY',
            payload: config,
        });
    }
}
//# sourceMappingURL=ServiceWorkerManager.js.map
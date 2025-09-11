// src/spaceface/system/bin/ServiceWorkerManager.ts

export const VERSION = 'nextworld-1.0.0';
export class ServiceWorkerManager {
  private swPath: string;
  private options: RegistrationOptions;
  private customConfig: Record<string, any>;
  private registration: ServiceWorkerRegistration | null = null;
  private isSupported: boolean;

  constructor(
    swPath: string = '/sw.js',
    options: RegistrationOptions = {},
    customConfig: Record<string, any> = {}
  ) {
    this.swPath = swPath;
    this.options = {
      scope: '/',
      updateViaCache: 'none',
      ...options,
    };
    this.customConfig = customConfig;
    this.isSupported = 'serviceWorker' in navigator;
  }

  /**
   * Register the service worker
   */
  public async register(): Promise<ServiceWorkerRegistration | null> {
    if (!this.isSupported) {
      throw new Error('ServiceWorker not supported');
    }

    try {
      this.registration = await navigator.serviceWorker.register(
        this.swPath,
        this.options
      );

      this.setupEventListeners();
      return this.registration;
    } catch (error) {
      console.error('SW registration failed:', error);
      throw error;
    }
  }

  /**
   * Apply custom configuration after registration
   */
  public configure(): void {
    if (this.customConfig.strategy) {
      this.setStrategy(this.customConfig.strategy);
    }
  }

  /**
   * Unregister the service worker
   */
  public async unregister(): Promise<boolean> {
    if (!this.registration) return false;

    try {
      return await this.registration.unregister();
    } catch (error) {
      console.error('SW unregistration failed:', error);
      return false;
    }
  }

  /**
   * Update the service worker
   */
  public async update(): Promise<void | null> {
    if (!this.registration) return null;

    try {
      // registration.update() returns void
      await this.registration.update();
      return null;
    } catch (error) {
      console.error('SW update failed:', error);
      return null;
    }
  }

  /**
   * Get registration status
   */
  public getStatus(): 'unregistered' | 'installing' | 'waiting' | 'active' | 'unknown' {
    if (!this.registration) return 'unregistered';

    if (this.registration.installing) return 'installing';
    if (this.registration.waiting) return 'waiting';
    if (this.registration.active) return 'active';

    return 'unknown';
  }

  /**
   * Setup lifecycle event listeners
   */
  private setupEventListeners(): void {
    if (!this.registration) return;

    this.registration.addEventListener('updatefound', () => {
      const newWorker = this.registration?.installing;
      if (!newWorker) return;

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

  /**
   * Send a message to the service worker
   */
  public async postMessage(message: any, transfer?: Transferable[]): Promise<void> {
    const sw = navigator.serviceWorker.controller;
    if (!sw) throw new Error('No active service worker');

    if (transfer) {
      sw.postMessage(message, { transfer });
    } else {
      sw.postMessage(message);
    }
  }

  /**
   * Wait for message from service worker
   */
  public waitForMessage(timeout: number = 5000): Promise<any> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Message timeout')), timeout);

      const handler = (event: MessageEvent) => {
        clearTimeout(timer);
        navigator.serviceWorker.removeEventListener('message', handler);
        resolve(event.data);
      };

      navigator.serviceWorker.addEventListener('message', handler);
    });
  }

  /**
   * Activate the waiting service worker
   */
  public async activateWaiting(): Promise<boolean> {
    if (!this.registration?.waiting) return false;

    try {
      await this.postMessage({ type: 'SKIP_WAITING' });
      return true;
    } catch (error) {
      console.error('Failed to activate waiting SW:', error);
      return false;
    }
  }

  /**
   * Set runtime cache strategy (e.g., cache-first or network-first)
   */
  public setStrategy(config: Record<string, any> = {}): void {
    if (!navigator.serviceWorker.controller) {
      console.warn('No active SW to set strategy');
      return;
    }

    this.postMessage({
      type: 'SET_STRATEGY',
      payload: config,
    });
  }

  // Optional hooks for integration - override as needed
  public onUpdateAvailable?(newWorker: ServiceWorker): void;
  public onControllerChange?(): void;
}

// src/core/signals.ts

/**
 * A tiny reactive Signal primitive for decoupled state management.
 */
export interface Signal<T> {
  get value(): T;
  set value(newValue: T);
  subscribe(fn: (value: T) => void): () => void;
}

type Subscriber = () => void;
let activeSubscriber: Subscriber | null = null;

export function createSignal<T>(initialValue: T): Signal<T> {
  let currentValue = initialValue;
  const subscribers = new Set<Subscriber>();

  return {
    get value() {
      if (activeSubscriber) {
        subscribers.add(activeSubscriber);
      }
      return currentValue;
    },
    set value(newValue: T) {
      if (currentValue !== newValue) {
        currentValue = newValue;
        // Copy subscribers to prevent infinite loops if they mutate state
        const currentSubscribers = Array.from(subscribers);
        for (const sub of currentSubscribers) {
          sub();
        }
      }
    },
    // Manual subscribe for raw listeners without effects
    subscribe(fn: (value: T) => void) {
      const sub = () => fn(this.value);
      subscribers.add(sub);
      return () => {
        subscribers.delete(sub);
      };
    }
  };
}

/**
 * Creates a reactive effect that runs immediately and re-runs whenever
 * any accessed Signal changes.
 */
export function createEffect(fn: () => void | (() => void)): () => void {
  const cleanups = new Set<() => void>();

  const execute = () => {
    // Run previous cleanups (e.g., from an old render pass)
    for (const cleanup of cleanups) cleanup();
    cleanups.clear();

    const previousSubscriber = activeSubscriber;
    activeSubscriber = execute;

    const cleanupFn = fn();
    if (typeof cleanupFn === "function") {
      cleanups.add(cleanupFn);
    }

    activeSubscriber = previousSubscriber;
  };

  execute();
  return () => {
    for (const cleanup of cleanups) cleanup();
    cleanups.clear();
  };
}

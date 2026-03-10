// src/core/signals.ts

/**
 * A tiny reactive Signal primitive for decoupled state management.
 */
export interface Signal<T> {
  get value(): T;
  set value(newValue: T);
  subscribe(fn: (value: T) => void): () => void;
}

interface EffectSubscriber {
  notify: () => void;
  deps: Set<Set<EffectSubscriber>>;
}

let activeSubscriber: EffectSubscriber | null = null;

export function createSignal<T>(initialValue: T): Signal<T> {
  let currentValue = initialValue;
  const subscribers = new Set<EffectSubscriber>();

  return {
    get value() {
      if (activeSubscriber) {
        subscribers.add(activeSubscriber);
        activeSubscriber.deps.add(subscribers);
      }
      return currentValue;
    },
    set value(newValue: T) {
      if (currentValue !== newValue) {
        currentValue = newValue;
        // Copy subscribers to prevent infinite loops if they mutate state
        const currentSubscribers = Array.from(subscribers);
        for (const sub of currentSubscribers) {
          sub.notify();
        }
      }
    },
    // Manual subscribe for raw listeners without effects
    subscribe(fn: (value: T) => void) {
      const sub: EffectSubscriber = {
        notify: () => fn(currentValue),
        deps: new Set(),
      };
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
  const effectSubscriber: EffectSubscriber = {
    notify: () => execute(),
    deps: new Set(),
  };

  const cleanupDependencies = () => {
    for (const dep of effectSubscriber.deps) {
      dep.delete(effectSubscriber);
    }
    effectSubscriber.deps.clear();
  };

  const execute = () => {
    // Run previous cleanups (e.g., from an old render pass)
    for (const cleanup of cleanups) cleanup();
    cleanups.clear();
    cleanupDependencies();

    const previousSubscriber = activeSubscriber;
    activeSubscriber = effectSubscriber;
    let completed = false;
    try {
      const cleanupFn = fn();
      if (typeof cleanupFn === "function") {
        cleanups.add(cleanupFn);
      }
      completed = true;
    } finally {
      if (!completed) {
        cleanupDependencies();
      }
      activeSubscriber = previousSubscriber;
    }
  };

  execute();
  return () => {
    for (const cleanup of cleanups) cleanup();
    cleanups.clear();
    cleanupDependencies();
  };
}

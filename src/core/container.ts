// src/core/container.ts

/**
 * Lightweight Dependency Injection Container
 */
export interface Token<T> {
  name: string;
  readonly _type?: T;
}

export function createToken<T>(name: string): Token<T> {
  return { name };
}

export type Constructor<T> = new (...args: never[]) => T;

type DependencyKey<T> = Token<T> | Constructor<T>;

export class Container {
  private instances = new Map<DependencyKey<unknown>, unknown>();

  /**
   * Registers a singleton instance in the container.
   */
  provide<T>(key: DependencyKey<T>, instance: T): void {
    this.instances.set(key, instance);
  }

  /**
   * Resolves a dependency from the container.
   * Throws an error if the dependency was not registered.
   */
  resolve<T>(key: DependencyKey<T>): T {
    if (!this.instances.has(key)) {
      const name = typeof key === "function" ? key.name : key.name;
      throw new Error(`Dependency not found: ${name}`);
    }
    return this.instances.get(key) as T;
  }

  /**
   * Clears all registered instances.
   */
  destroy(): void {
    this.instances.clear();
  }
}

// src/core/feature.ts
import type { Container, Token, Constructor } from "./container.js";

/**
 * Base interface for all features in the vNext architecture.
 */
export interface Feature {
  /** Uniquely identifies the feature for dependency injection */
  readonly name: string;

  /** Called when the feature's DOM node is parsed and added to the document */
  mount?(el: HTMLElement, context?: FeatureMountContext): void | Promise<void>;

  /** Called when the feature's DOM node is removed from the document */
  destroy?(): void;
}

export interface FeatureConstructor extends Constructor<Feature> {
  /** The value of the `data-feature` attribute that triggers this feature */
  readonly selector: string;
  /** Static dependencies to inject when the feature is instantiated */
  readonly inject?: Array<Token<unknown> | Constructor<unknown>>;
}

export interface FeatureMountContext {
  signal: AbortSignal;
}

/**
 * Global Registry that watches the DOM using a MutationObserver
 * and automatically mounts/unmounts features based on `data-feature` attributes.
 */
export class FeatureRegistry {
  private featureConstructors = new Map<string, FeatureConstructor>();
  private activeInstances = new Map<HTMLElement, Map<string, ActiveFeatureRecord>>();
  private observer: MutationObserver | null = null;

  constructor(private container: Container) {}

  /**
   * Registers a given Feature class to be instantiated when its selector appears in the DOM.
   */
  register(FeatureClass: FeatureConstructor): void {
    if (this.featureConstructors.has(FeatureClass.selector)) {
      throw new Error(`Feature already registered for selector: ${FeatureClass.selector}`);
    }
    this.featureConstructors.set(FeatureClass.selector, FeatureClass);
  }

  /**
   * Starts fully automated DOM observation.
   */
  start(): void {
    if (this.observer) return;

    // Scan existing DOM first
    this.scanAndMount(document.body);

    // Watch for future DOM insertions/removals
    this.observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "attributes") {
          const target = mutation.target;
          if (target instanceof HTMLElement) {
            this.reconcileNodeFeatures(target);
          }
          continue;
        }
        // Handle removals first to cleanup
        for (const node of mutation.removedNodes) {
          if (node instanceof HTMLElement) {
            this.unmountNodeAndChildren(node);
          }
        }
        // Handle additions
        for (const node of mutation.addedNodes) {
          if (node instanceof HTMLElement) {
            this.scanAndMount(node);
          }
        }
      }
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-feature"],
    });
  }

  stop(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    // Cleanup all active features
    for (const [node] of this.activeInstances) {
      this.unmountNodeAndChildren(node);
    }
    this.activeInstances.clear();
  }

  private scanAndMount(root: HTMLElement): void {
    // Check root
    this.reconcileNodeFeatures(root);
    // Check children
    const elements = root.querySelectorAll<HTMLElement>("[data-feature]");
    for (const el of elements) {
      this.reconcileNodeFeatures(el);
    }
  }

  private reconcileNodeFeatures(node: HTMLElement): void {
    const featureIds = parseFeatureIds(node.getAttribute("data-feature"));
    const desiredIds = new Set(featureIds);
    const nodeInstances = this.activeInstances.get(node);

    if (nodeInstances) {
      for (const [id, record] of nodeInstances.entries()) {
        if (desiredIds.has(id)) continue;
        this.disposeRecord(node, id, record);
      }
      if (nodeInstances.size === 0) {
        this.activeInstances.delete(node);
      }
    }

    for (const id of featureIds) {
      const FeatureClass = this.featureConstructors.get(id);
      if (!FeatureClass) continue;

      let nextNodeInstances = this.activeInstances.get(node);
      if (nextNodeInstances?.has(id)) continue;

      let instance: Feature;
      if (FeatureClass.inject) {
        const deps = FeatureClass.inject.map((tok) => this.resolveDependency(tok));
        instance = new FeatureClass(...(deps as never[]));
      } else {
        instance = new FeatureClass();
      }

      if (!nextNodeInstances) {
        nextNodeInstances = new Map<string, ActiveFeatureRecord>();
        this.activeInstances.set(node, nextNodeInstances);
      }

      const record: ActiveFeatureRecord = {
        instance,
        mountToken: Symbol(id),
        mountController: new AbortController(),
      };
      nextNodeInstances.set(id, record);
      this.mountFeature(node, id, record);
    }
  }

  private unmountNodeAndChildren(root: HTMLElement): void {
    // Check children first (bottom-up cleanup)
    const elements = root.querySelectorAll<HTMLElement>("[data-feature]");
    for (let i = elements.length - 1; i >= 0; i--) { // Reverse order for safety
        this.unmountSingleNode(elements[i]);
    }
    // Check root
    this.unmountSingleNode(root);
  }

  private unmountSingleNode(node: HTMLElement): void {
    const instances = this.activeInstances.get(node);
    if (!instances) return;

    for (const [id, record] of Array.from(instances.entries())) {
      this.disposeRecord(node, id, record);
    }
    this.activeInstances.delete(node);
  }

  private resolveDependency(token: Token<unknown> | Constructor<unknown>): unknown {
    if (isFeatureConstructorToken(token)) {
      throw new Error(
        `Feature-to-feature injection is not supported yet: ${token.name}. Register shared services/tokens instead.`
      );
    }
    return this.container.resolve(token);
  }

  private mountFeature(node: HTMLElement, id: string, record: ActiveFeatureRecord): void {
    try {
      const mountResult = record.instance.mount?.(node, {
        signal: record.mountController.signal,
      });
      if (!isPromiseLike(mountResult)) {
        return;
      }

      void mountResult.catch((error) => {
        const activeRecord = this.activeInstances.get(node)?.get(id);
        if (activeRecord?.mountToken !== record.mountToken) {
          return;
        }

        if (record.mountController.signal.aborted && isAbortLikeError(error)) {
          this.removeRecord(node, id, record);
          return;
        }

        this.disposeRecord(node, id, record);
        queueMicrotask(() => {
          throw error;
        });
      });
    } catch (error) {
      this.disposeRecord(node, id, record);
      throw error;
    }
  }

  private disposeRecord(node: HTMLElement, id: string, record: ActiveFeatureRecord): void {
    record.mountController.abort();
    try {
      record.instance.destroy?.();
    } finally {
      this.removeRecord(node, id, record);
    }
  }

  private removeRecord(node: HTMLElement, id: string, record: ActiveFeatureRecord): void {
    const nodeInstances = this.activeInstances.get(node);
    if (!nodeInstances) return;

    const activeRecord = nodeInstances.get(id);
    if (activeRecord?.mountToken !== record.mountToken) {
      return;
    }

    nodeInstances.delete(id);
    if (nodeInstances.size === 0) {
      this.activeInstances.delete(node);
    }
  }
}

interface ActiveFeatureRecord {
  instance: Feature;
  mountToken: symbol;
  mountController: AbortController;
}

function parseFeatureIds(raw: string | null): string[] {
  if (!raw) return [];
  const uniqueIds = new Set<string>();
  const parts = raw.split(/\s+/);
  for (const part of parts) {
    const id = part.trim();
    if (!id) continue;
    uniqueIds.add(id);
  }
  return Array.from(uniqueIds);
}

function isFeatureConstructorToken(value: Token<unknown> | Constructor<unknown>): value is FeatureConstructor {
  if (typeof value !== "function") return false;
  return typeof (value as Partial<FeatureConstructor>).selector === "string";
}

function isPromiseLike(value: unknown): value is PromiseLike<void> {
  return typeof value === "object" && value !== null && typeof (value as PromiseLike<void>).then === "function";
}

function isAbortLikeError(error: unknown): boolean {
  return Boolean(
    error &&
    typeof error === "object" &&
    "name" in error &&
    (error as { name?: unknown }).name === "AbortError"
  );
}

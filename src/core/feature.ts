// src/core/feature.ts
import type { Container, Token, Constructor } from "./container.js";

/**
 * Base interface for all features in the vNext architecture.
 */
export interface Feature {
  /** Uniquely identifies the feature for dependency injection */
  readonly name: string;

  /** Called when the feature's DOM node is parsed and added to the document */
  mount?(el: HTMLElement): void;

  /** Called when the feature's DOM node is removed from the document */
  destroy?(): void;
}

export interface FeatureConstructor extends Constructor<Feature> {
  /** The value of the `data-feature` attribute that triggers this feature */
  readonly selector: string;
  /** Static dependencies to inject when the feature is instantiated */
  readonly inject?: Array<Token<any> | Constructor<any>>;
}

/**
 * Global Registry that watches the DOM using a MutationObserver
 * and automatically mounts/unmounts features based on `data-feature` attributes.
 */
export class FeatureRegistry {
  private featureConstructors = new Map<string, FeatureConstructor>();
  private activeInstances = new Map<HTMLElement, Map<string, Feature>>();
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
    this.container.provide(FeatureClass as Constructor<Feature>, null); // Register as type, instance managed per-node
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
      for (const [id, instance] of nodeInstances.entries()) {
        if (desiredIds.has(id)) continue;
        instance.destroy?.();
        nodeInstances.delete(id);
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
        const deps = FeatureClass.inject.map(tok => this.container.resolve(tok));
        instance = new FeatureClass(...deps);
      } else {
        instance = new FeatureClass();
      }
      instance.mount?.(node);

      if (!nextNodeInstances) {
        nextNodeInstances = new Map<string, Feature>();
        this.activeInstances.set(node, nextNodeInstances);
      }
      nextNodeInstances.set(id, instance);
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

    for (const instance of instances.values()) {
      instance.destroy?.();
    }
    this.activeInstances.delete(node);
  }
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

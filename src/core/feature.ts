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
  private activeInstances = new Map<HTMLElement, Feature[]>();
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
    this.maybeMountNode(root);
    // Check children
    const elements = root.querySelectorAll<HTMLElement>("[data-feature]");
    for (const el of elements) {
      this.maybeMountNode(el);
    }
  }

  private maybeMountNode(node: HTMLElement): void {
    const featureIds = node.getAttribute("data-feature")?.split(" ") || [];
    if (featureIds.length === 0) return;

    for (const id of featureIds) {
      const FeatureClass = this.featureConstructors.get(id);
      if (!FeatureClass) continue;

      // Instantiate
      let instance: Feature;
      if (FeatureClass.inject) {
        const deps = FeatureClass.inject.map(tok => this.container.resolve(tok));
        instance = new FeatureClass(...deps);
      } else {
        instance = new FeatureClass();
      }

      // Track
      let nodeInstances = this.activeInstances.get(node);
      if (!nodeInstances) {
        nodeInstances = [];
        this.activeInstances.set(node, nodeInstances);
      }
      nodeInstances.push(instance);

      // Mount
      instance.mount?.(node);
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

    for (const instance of instances) {
      instance.destroy?.();
    }
    this.activeInstances.delete(node);
  }
}

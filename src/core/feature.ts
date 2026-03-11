// src/core/feature.ts
import type { Logger } from "./logger.js";
import { createLogger } from "./logger.js";

/**
 * Base interface for all features in the v4 runtime.
 */
export interface Feature {
  /** Called when the feature's DOM node is parsed and added to the document */
  mount?(el: HTMLElement, context?: FeatureMountContext): void | Promise<void>;

  /** Called when the feature's DOM node is removed from the document */
  destroy?(): void;
}

export interface FeatureDefinition {
  selector: string;
  create(): Feature;
  loggerScope?: string;
}

export interface FeatureMountContext {
  signal: AbortSignal;
  logger: Logger;
}

export interface FeatureRegistryOptions {
  logger?: Logger;
}

/**
 * Global Registry that watches the DOM using a MutationObserver
 * and automatically mounts/unmounts features based on `data-feature` attributes.
 */
export class FeatureRegistry {
  private featureDefinitions = new Map<string, FeatureDefinition>();
  private activeInstances = new Map<HTMLElement, Map<string, ActiveFeatureRecord>>();
  private observer: MutationObserver | null = null;
  private logger: Logger;

  constructor(options: FeatureRegistryOptions = {}) {
    this.logger = options.logger ?? createLogger("features", "warn");
  }

  register(definition: FeatureDefinition): void {
    if (this.featureDefinitions.has(definition.selector)) {
      throw new Error(`Feature already registered for selector: ${definition.selector}`);
    }
    this.featureDefinitions.set(definition.selector, definition);
  }

  start(): void {
    if (this.observer) return;

    this.scanAndMount(document.body);

    this.observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "attributes") {
          const target = mutation.target;
          if (target instanceof HTMLElement) {
            this.reconcileNodeFeatures(target);
          }
          continue;
        }

        for (const node of mutation.removedNodes) {
          if (node instanceof HTMLElement) {
            this.unmountNodeAndChildren(node);
          }
        }

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

    for (const [node] of this.activeInstances) {
      this.unmountNodeAndChildren(node);
    }
    this.activeInstances.clear();
  }

  private scanAndMount(root: HTMLElement): void {
    this.reconcileNodeFeatures(root);
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
      const definition = this.featureDefinitions.get(id);
      if (!definition) continue;

      let nextNodeInstances = this.activeInstances.get(node);
      if (nextNodeInstances?.has(id)) continue;

      const record: ActiveFeatureRecord = {
        definition,
        instance: definition.create(),
        mountToken: Symbol(id),
        mountController: new AbortController(),
        logger: this.logger.child(definition.loggerScope ?? id),
      };

      if (!nextNodeInstances) {
        nextNodeInstances = new Map<string, ActiveFeatureRecord>();
        this.activeInstances.set(node, nextNodeInstances);
      }

      nextNodeInstances.set(id, record);
      this.mountFeature(node, id, record);
    }
  }

  private unmountNodeAndChildren(root: HTMLElement): void {
    const elements = root.querySelectorAll<HTMLElement>("[data-feature]");
    for (let i = elements.length - 1; i >= 0; i -= 1) {
      this.unmountSingleNode(elements[i]);
    }
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

  private mountFeature(node: HTMLElement, id: string, record: ActiveFeatureRecord): void {
    try {
      const mountResult = record.instance.mount?.(node, {
        signal: record.mountController.signal,
        logger: record.logger,
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

        record.logger.error("feature mount failed", { selector: id, error });
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
  definition: FeatureDefinition;
  instance: Feature;
  mountToken: symbol;
  mountController: AbortController;
  logger: Logger;
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

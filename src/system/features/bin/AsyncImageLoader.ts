export const VERSION = 'nextworld-1.2.0' as const;

import {
  AsyncImageLoaderOptions,
  SourceDataInterface,
  ImageMetadataInterface,
  ImageLoadResultInterface
} from '../../types/bin.js';

export class AsyncImageLoader {
  private container: Element | null;
  private includePicture: boolean;
  private cache = new WeakMap<HTMLImageElement, boolean>();
  private destroyed = false;

  constructor(container: Element, options: AsyncImageLoaderOptions = {}) {
    if (!(container instanceof Element)) {
      throw new Error("AsyncImageLoader: container must be a DOM Element.");
    }
    this.container = container;
    this.includePicture = options.includePicture ?? false;
  }

  private ensureActive(): void {
    if (this.destroyed || !this.container) {
      throw new Error("AsyncImageLoader: Instance destroyed.");
    }
  }

  public getImages(selector = "img"): HTMLImageElement[] {
    this.ensureActive();
    if (!selector.trim()) return [];

    const images = new Set<HTMLImageElement>();

    this.container!.querySelectorAll(selector).forEach(el => {
      if (el instanceof HTMLImageElement) {
        if (!this.includePicture && el.closest("picture")) return;
        images.add(el);
      }
    });

    return [...images];
  }

  // ---------- Overloads ----------
  public async waitForImagesToLoad(
    selector?: string,
    includeFailed?: false
  ): Promise<HTMLImageElement[]>;

  public async waitForImagesToLoad(
    selector: string,
    includeFailed: true
  ): Promise<ImageLoadResultInterface[]>;

  // ---------- Implementation ----------
  public async waitForImagesToLoad(
    selector = "img",
    includeFailed = false
  ): Promise<HTMLImageElement[] | ImageLoadResultInterface[]> {
    const images = this.getImages(selector);

    const results = await Promise.all(
      images.map(img => {
        if (this.cache.has(img)) return { element: img, loaded: true };

        if (img.complete && img.naturalWidth > 0) {
          this.cache.set(img, true);
          return { element: img, loaded: true };
        }

        return new Promise<ImageLoadResultInterface>(resolve => {
          img.addEventListener(
            "load",
            () => {
              this.cache.set(img, true);
              resolve({ element: img, loaded: true });
            },
            { once: true }
          );
          img.addEventListener(
            "error",
            () => resolve({ element: img, loaded: false }),
            { once: true }
          );
        });
      })
    );

    return includeFailed
      ? results
      : results.filter(r => r.loaded).map(r => r.element);
  }

  public getImageData(selector = "img"): ImageMetadataInterface[] {
    return this.getImages(selector).map(img => {
      const sources: SourceDataInterface[] = [];

      if (this.includePicture) {
        const picture = img.closest("picture");
        if (picture) {
          picture.querySelectorAll("source").forEach(source => {
            sources.push({
              srcset: source.srcset || "",
              type: source.type || "",
              media: source.media || ""
            });
          });
        }
      }

      return {
        element: img,
        src: img.src || "",
        alt: img.alt || "",
        href: img.closest("a")?.href ?? null,
        sources
      };
    });
  }

  public destroy(): void {
    this.container = null;
    this.destroyed = true;
  }
}

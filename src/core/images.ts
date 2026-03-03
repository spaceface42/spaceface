export interface ImageReadyResult {
  element: HTMLImageElement;
  ok: boolean;
  reason: "loaded" | "error" | "timeout" | "aborted";
}

export interface WaitForImagesReadyOptions {
  selector?: string;
  timeoutMs?: number;
  signal?: AbortSignal;
}

export function selectImageElements(root: ParentNode, selector = "img"): HTMLImageElement[] {
  return Array.from(root.querySelectorAll(selector)).filter((node): node is HTMLImageElement => node instanceof HTMLImageElement);
}

export async function waitForImagesReady(
  root: ParentNode,
  options: WaitForImagesReadyOptions = {}
): Promise<ImageReadyResult[]> {
  const selector = options.selector ?? "img";
  const timeoutMs = options.timeoutMs ?? 10000;
  const images = selectImageElements(root, selector);
  if (images.length === 0) return [];

  return Promise.all(images.map((image) => waitForImageReady(image, timeoutMs, options.signal)));
}

async function waitForImageReady(
  image: HTMLImageElement,
  timeoutMs: number,
  signal?: AbortSignal
): Promise<ImageReadyResult> {
  if (signal?.aborted) {
    return { element: image, ok: false, reason: "aborted" };
  }

  if (image.complete) {
    return image.naturalWidth > 0
      ? { element: image, ok: true, reason: "loaded" }
      : { element: image, ok: false, reason: "error" };
  }

  return new Promise<ImageReadyResult>((resolve) => {
    let settled = false;

    const finalize = (result: ImageReadyResult): void => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(result);
    };

    const onLoad = (): void => finalize({ element: image, ok: true, reason: "loaded" });
    const onError = (): void => finalize({ element: image, ok: false, reason: "error" });
    const onAbort = (): void => finalize({ element: image, ok: false, reason: "aborted" });

    const timer = window.setTimeout(() => {
      finalize({ element: image, ok: false, reason: "timeout" });
    }, timeoutMs);

    const cleanup = (): void => {
      window.clearTimeout(timer);
      image.removeEventListener("load", onLoad);
      image.removeEventListener("error", onError);
      signal?.removeEventListener("abort", onAbort);
    };

    image.addEventListener("load", onLoad);
    image.addEventListener("error", onError);
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

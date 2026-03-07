export interface RebindOnRouteOptions<TBinding> {
  getNextBinding: () => TBinding | null;
  currentBinding: TBinding | null;
  hasActiveState: boolean;
  onInit: () => void;
  onDestroy: () => void;
  equals?: (a: TBinding, b: TBinding) => boolean;
}

/**
 * Standard route-swap rebind policy for DOM-bound feature instances.
 * Keeps behavior deterministic when a feature instance is reused across routes.
 */
export function rebindOnRoute<TBinding>(options: RebindOnRouteOptions<TBinding>): TBinding | null {
  const nextBinding = options.getNextBinding();
  const equals = options.equals ?? ((a: TBinding, b: TBinding) => Object.is(a, b));

  if (nextBinding == null) {
    if (options.currentBinding != null || options.hasActiveState) {
      options.onDestroy();
    }
    return null;
  }

  if (options.currentBinding == null) {
    options.onInit();
    return nextBinding;
  }

  if (!equals(options.currentBinding, nextBinding)) {
    options.onDestroy();
    options.onInit();
    return nextBinding;
  }

  if (!options.hasActiveState) {
    options.onInit();
  }

  return nextBinding;
}

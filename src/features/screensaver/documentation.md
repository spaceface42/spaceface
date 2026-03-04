# Screensaver Feature Documentation

The screensaver feature activates after inactivity and overlays a runtime-generated screensaver host.

## Markup Requirements

No required static markup.

By default, the feature generates this host at runtime (if missing):

```html
<div data-screensaver="true" aria-hidden="true" hidden></div>
```

Optional:
- You may provide your own host in HTML with `data-screensaver`.
- You may pass `targetSelector` to mount into a custom element.

## Behavior Summary

- Arms an inactivity timer (`idleMs`).
- On idle timeout:
  - loads optional partial content (`partialUrl`),
  - shows target with `.is-active`,
  - emits `screensaver:shown`,
  - starts a dedicated floating-images instance inside screensaver content.
- On user activity:
  - hides target,
  - emits `screensaver:hidden`,
  - stops floating-images after fade cleanup delay.

## Partial Content

If `partialUrl` is configured, HTML is fetched once and cached.

Supported selectors inside partial:
- floating root: `[data-screensaver-floating]` (or `[data-floating-images]`)
- floating item: `[data-screensaver-floating-item]` (or `[data-floating-item]` / `.floating-image`)

If no floating root/items exist, feature creates fallback floating markup.

## TypeScript Options

`ScreensaverFeatureOptions`:
- `idleMs` (required)
- `partialUrl` (optional)
- `targetSelector` (optional)

Example registration:

```ts
registry.register(
  new ScreensaverFeature({
    idleMs: 6000,
    partialUrl: "./resources/screensaver/index.html",
  }),
  { mode: "any" }
);
```

## Notes

- Default selector contract is `data-screensaver`.
- No legacy id fallback is used.

# App HTML Attribute Documentation

This file explains runtime-relevant HTML attributes used by the app shell.

## `<html lang="en" data-mode="dev">`

Example:

```html
<html lang="en" data-mode="dev">
```

Meaning:

- `lang="en"`
  - Standard HTML language metadata for accessibility, screen readers, and browser text behavior.
  - Not specific to this app runtime.

- `data-mode="dev"` (app-specific)
  - Controls runtime mode resolution in `src/app/main.ts` (`readModeFromDom()`).
  - Accepted values:
    - `dev` -> development behavior
    - `prod` -> production behavior
  - Any non-`prod` value falls back to `dev`.

Runtime effects of mode:

- Logging defaults differ between `dev` and `prod`.
- Some diagnostics (for example animation metrics helper usage) are enabled only in `dev`.

## Related Optional HTML Attributes

These are also read from `<html>` at runtime:

- `data-log-sink`
  - `none` -> disables console sink
  - `console` / `force` -> enables console sink

- `data-animation-metrics`
  - `on` -> logs animation scheduler stats periodically (dev mode only)
- `data-event-log`
  - `on` -> logs every event bus emission to console (dev mode only)

## Body/Page Attribute

- `<body data-page="...">`
  - Used for page-level styling variants and route identity cues.
  - Example:

```html
<body data-page="slideplayer">
```

## Recommendation

Use this minimal safe shell:

```html
<html lang="en" data-mode="dev">
  <body data-page="index">
    ...
  </body>
</html>
```

## Full Attribute Registry

All `data-*` attributes currently used by runtime code and feature markup:

- `data-mode`
  - On `<html>`; runtime mode (`dev` or `prod`).
- `data-log-sink`
  - Optional on `<html>`; console sink behavior.
- `data-animation-metrics`
  - Optional on `<html>`; periodic animation metric logging in dev mode.
- `data-event-log`
  - Optional on `<html>`; enables `eventBus.onAny(...)` console logging in dev mode.
- `data-page`
  - On `<body>`; page identity/style variant marker.
- `data-route-container`
  - Route swap mount point used by router.
- `data-router`
  - Optional on links; `data-router="off"` disables route interception.
- `data-nav-link`
  - Nav link key used by runtime to set `aria-current="page"` after route swaps.
  - Expected values currently match `body[data-page]` (for example `index`, `slideplayer`).
- `data-slideshow`
  - Slideshow feature root.
- `data-slide`
  - Slideshow slide item.
- `data-slide-prev`
  - Slideshow previous button.
- `data-slide-next`
  - Slideshow next button.
- `data-slideplayer`
  - SlidePlayer feature root.
- `data-slideplayer-stage`
  - SlidePlayer stage wrapper for stacked slide fade behavior.
- `data-slideplayer-image`
  - SlidePlayer slide item.
- `data-slideplayer-prev`
  - SlidePlayer previous button.
- `data-slideplayer-next`
  - SlidePlayer next button.
- `data-slideplayer-bullets`
  - SlidePlayer bullet container.
- `data-slideplayer-bullet`
  - SlidePlayer bullet item.
- `data-slideplayer-bullet-index`
  - Optional explicit slide index mapping for bullets.
- `data-floating-images`
  - FloatingImages feature container.
- `data-floating-item`
  - FloatingImages item.
- `data-screensaver`
  - Screensaver host element (auto-created when missing).
- `data-screensaver-floating`
  - Screensaver floating root container.
- `data-screensaver-floating-item`
  - Screensaver floating item.
- `data-screensaver-partial`
  - Internal mount for loaded screensaver partial content.

## Event Bus Tap

- The app event bus supports `onAny((eventName, payload) => ...)` and `onceAny(...)`.
- In dev mode, set `data-event-log="on"` on `<html>` to enable a built-in console sink for all events.

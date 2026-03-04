# Floating Images Code Reference

Source of truth:

- `public.src/index.html`
- `public.src/resources/spacesuit/features.css`
- `public.src/resources/spacesuit/styles.css` (base/layout only)
- `src/features/floating-images/FloatingImagesFeature.ts`

## Markup Contract

Required:

- Container: `data-floating-images`
- Items: `data-floating-item` (or `.floating-image`)

Default selectors from code:

- container: `[data-floating-images]`
- item: `[data-floating-item], .floating-image`

## HTML Fragment (Current)

```html
<section class="card">
    <h2>Floating Images (ported feature)</h2>
    <p class="muted">
        Lifecycle-managed animation that deactivates when route swap removes
        this container.
    </p>
    <div data-floating-images>
        <img
            data-floating-item
            src="./content/floatingimages/a.svg"
            class="floating-image"
            alt="floatingimage-1"
        />
        <img
            data-floating-item
            src="./content/floatingimages/b.svg"
            class="floating-image"
            alt="floatingimage-1"
        />
        <img
            data-floating-item
            src="./content/floatingimages/c.svg"
            class="floating-image"
            alt="floatingimage-1"
        />
        <img
            data-floating-item
            src="./content/floatingimages/d.svg"
            class="floating-image"
            alt="floatingimage-1"
        />
        <img
            data-floating-item
            src="./content/floatingimages/e.svg"
            class="floating-image"
            alt="floatingimage-1"
        />
        <img
            data-floating-item
            src="./content/floatingimages/a.svg"
            class="floating-image"
            alt="floatingimage-1"
        />
        <img
            data-floating-item
            src="./content/floatingimages/c.svg"
            class="floating-image"
            alt="floatingimage-1"
        />
    </div>
</section>
```

## HTML Fragment (Simplified, Minimal Readable)

```html
<section>
    <h2>Floating Images</h2>
    <div data-floating-images>
        <img
            data-floating-item
            src="./content/floatingimages/a.svg"
            alt="Floating A"
        />
        <img
            data-floating-item
            src="./content/floatingimages/b.svg"
            alt="Floating B"
        />
        <img
            data-floating-item
            src="./content/floatingimages/c.svg"
            alt="Floating C"
        />
        <img
            data-floating-item
            src="./content/floatingimages/d.svg"
            alt="Floating D"
        />
    </div>
</section>
```

## Notes

- Keep at least 2-3 items for meaningful motion.
- Container should have explicit dimensions via CSS.
- Feature sets each item to `position: absolute` at runtime.
- If container is `position: static`, feature promotes it to `position: relative`.
- Hover behavior is configured in TypeScript options (`none`, `slow`, `pause`).

## Recent Changes

- Created dedicated feature stylesheet: `public.src/resources/spacesuit/features.css`.
- Moved feature-specific CSS out of `styles.css` into `features.css`:
    - Slideshow rules
    - SlidePlayer rules
    - Floating Images rules
    - Screensaver rules
- `styles.css` now holds shared/base page styles only.
- Pages now load `features.css` explicitly:
    - `public.src/index.html`
    - `public.src/slideplayer.html`
- Removed inline screensaver `<style>` from `public.src/resources/features/screensaver/index.html`; styling now comes from `features.css`.

#D8D8D8 light neutral background
#C4C4C4 mid gray
#A9A9A8 device silver
#8D8C8A darker metal gray
#5F5A56 deep warm gray
#2D2927 near-black details
#E86A2F orange accent ring
#F3F3F3 off-white body part
#B99A7A muted bronze contact tint
#111111 UI/text black

:root {
--color-bg-light: #d8d8d8;
--color-gray-200: #c4c4c4;
--color-metal-300: #a9a9a8;
--color-metal-500: #8d8c8a;
--color-gray-700: #5f5a56;
--color-near-black: #2d2927;
--color-accent-orange: #e86a2f;
--color-off-white: #f3f3f3;
--color-bronze-muted: #b99a7a;
--color-black: #111111;
}

## Src System Check - 2026-03-04

Scope checked:
- `src/app/*`
- `src/core/*`
- `src/features/*`

Validation commands run:
- `npm run typecheck:docs` -> PASS
- `npm run build:dev` -> PASS
- `npm run smoke:docs` -> PASS after build
- `npm run lint` -> BLOCKED in current environment (`spawnSync ... eslint.cmd EINVAL`)

Observed transient state:
- `smoke:docs` failed before rebuild because generated file `docs/slideplayer.html` was missing.
- This is generated output state, not a `src` authored-code defect.

Primary finding (high severity):
- `SlideshowFeature` has no `onRouteChange` handler, while route swaps keep feature instances by identity when names match.
- Result: when both old and new routes include `[data-slideshow]`, the same slideshow instance can keep stale DOM references (`root`, `slides`, listeners/timer) after PJAX container swap.

Key references:
- `src/features/slideshow/SlideshowFeature.ts`
- `src/core/startup.ts` (`reconcileFeaturesInternal` keeps same instance when feature object identity is unchanged)
- `src/app/main.ts` (single `SlideshowFeature` instance registered once and reused)

Recommended fix:
- Add `onRouteChange` to `SlideshowFeature` mirroring `SlidePlayerFeature` / `FloatingImagesFeature` pattern:
  - if no slideshow root on new route: destroy when active
  - if root changed: destroy + init
  - if root same and active: keep

Risk if left unfixed:
- autoplay/events can target detached elements after route swap
- controls can become inconsistent on pages that preserve slideshow selector across routes

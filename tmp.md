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

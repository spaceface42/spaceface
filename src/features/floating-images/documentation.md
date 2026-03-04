# Floating Images Feature Documentation

This feature animates image (or element) items inside a bounded container.

## Required Markup

```html
<section>
  <h2>Floating Images</h2>
  <div data-floating-images>
    <img data-floating-item src="./content/floatingimages/a.svg" alt="Floating A" />
    <img data-floating-item src="./content/floatingimages/b.svg" alt="Floating B" />
    <img data-floating-item src="./content/floatingimages/c.svg" alt="Floating C" />
  </div>
</section>
```

Required selectors:
- Container: `data-floating-images`
- Items: `data-floating-item`

Default selector contract in code:
- `containerSelector`: `[data-floating-images]`
- `itemSelector`: `[data-floating-item], .floating-image`

## Behavior Summary

- Waits for item images to load before measuring/animating.
- Converts items to absolutely-positioned moving elements.
- Bounces items inside container bounds.
- Pauses animation when out of viewport.
- Optionally pauses when screensaver is shown.

## CSS Requirements

Container must have explicit size in CSS (example):

```css
[data-floating-images] {
  position: relative;
  height: 260px;
  overflow: hidden;
}
```

Item baseline styles (example):

```css
[data-floating-item] {
  width: 12%;
  height: auto;
  pointer-events: auto;
}
```

Notes:
- If container is `position: static`, feature promotes it to `position: relative`.
- Feature sets runtime styles (`position`, `left`, `top`, `transform`) on items.

## TypeScript Options

`FloatingImagesFeatureOptions`:
- `containerSelector` (default: `[data-floating-images]`)
- `itemSelector` (default: `[data-floating-item], .floating-image`)
- `baseSpeed` (default: `46`)
- `pauseOnScreensaver` (default: `true`)
- `hoverBehavior` (default: `"none"`) values: `"none" | "slow" | "pause"`
- `hoverSlowMultiplier` (default: `0.2`)

Example registration:

```ts
registry.register(new FloatingImagesFeature({ hoverBehavior: "pause", hoverSlowMultiplier: 0.2 }), {
  requiredSelector: "[data-floating-images]",
  mode: "any",
});
```

## Common Pitfalls

- Missing container height: animation appears broken because bounds are near zero.
- Too few items: effect looks static or sparse.
- Missing `alt` text on images: accessibility regression.
- Non-image items are supported, but must be measurable elements with visible size.

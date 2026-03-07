# SlidePlayer Feature Documentation

This feature powers image-based slide players using `data-slideplayer-*` markup.

## Required Markup

```html
<section data-slideplayer>
  <div data-slideplayer-stage>
    <img data-slideplayer-image src="slide-1.jpg" alt="Slide 1" />
    <img data-slideplayer-image src="slide-2.jpg" alt="Slide 2" />
    <img data-slideplayer-image src="slide-3.jpg" alt="Slide 3" />
  </div>
</section>
```

Required elements:
- `data-slideplayer`: feature root
- `data-slideplayer-image`: one or more slides

Recommended (for stacked fade styling):
- `data-slideplayer-stage`: slide stage container

## Optional Controls

Prev / Next buttons:

```html
<button type="button" data-slideplayer-prev>Prev</button>
<button type="button" data-slideplayer-next>Next</button>
```

Bullet navigation (only works if bullets are in HTML):

```html
<div data-slideplayer-bullets>
  <button type="button" data-slideplayer-bullet aria-label="Go to slide 1"></button>
  <button type="button" data-slideplayer-bullet aria-label="Go to slide 2"></button>
  <button type="button" data-slideplayer-bullet aria-label="Go to slide 3"></button>
</div>
```

Notes:
- Bullets map to slides by order.
- If bullet markup is missing, SlidePlayer does nothing with bullets.

## Full Recommended Fragment

```html
<section class="card" data-slideplayer>
  <h2>Image SlidePlayer Demo</h2>

  <div class="row controls">
    <button type="button" data-slideplayer-prev>Prev</button>
    <button type="button" data-slideplayer-next>Next</button>
  </div>

  <div data-slideplayer-stage>
    <img data-slideplayer-image src="./content/floatingimages/a.svg" alt="Slide A" />
    <img data-slideplayer-image src="./content/floatingimages/b.svg" alt="Slide B" />
    <img data-slideplayer-image src="./content/floatingimages/c.svg" alt="Slide C" />
  </div>

  <div data-slideplayer-bullets>
    <button type="button" data-slideplayer-bullet aria-label="Go to slide 1"></button>
    <button type="button" data-slideplayer-bullet aria-label="Go to slide 2"></button>
    <button type="button" data-slideplayer-bullet aria-label="Go to slide 3"></button>
  </div>
</section>
```

## Behavior Summary

- First slide and first bullet are visible pre-JS via CSS fallback (`:first-child`).
- After init, JS marks containers as `.is-ready`.
- Runtime active state:
  - slides: `.is-active`
  - bullets: `.active`
  - *Note: Active slide state is automatically preserved and restored during page navigation (via back/forward routing).*
- Slide transition uses opacity animation.

## Keyboard

- Arrow keys (`Left` / `Right`) navigate SlidePlayer.
- Keyboard input is ignored inside editable fields (`input`, `textarea`, `select`, `contenteditable`).

## Config (TypeScript)

`SlidePlayerFeature` options:

- `rootSelector` (default: `[data-slideplayer]`)
- `slideSelector` (default: `[data-slideplayer-image]`)
- `prevSelector` (default: `[data-slideplayer-prev]`)
- `nextSelector` (default: `[data-slideplayer-next]`)
- `bulletsSelector` (default: `[data-slideplayer-bullet]`)
- `autoplayMs` (default: `5000`)
- `pauseOnScreensaver` (default: `true`)

Example registration:

```ts
registry.register(new SlidePlayerFeature({ autoplayMs: 5000, pauseOnScreensaver: true }), {
  requiredSelector: "[data-slideplayer]",
  mode: "any",
});
```

## Common Pitfalls

- Missing `data-slideplayer-stage`: fade/stack behavior will not work correctly.
- Bullet count not matching slide count: extra bullets are ignored; missing bullets just reduce direct navigation.
- Missing `aria-label` on bullets: weaker accessibility.

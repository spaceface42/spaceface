# Spaceface

Spaceface is a lightweight TypeScript runtime for building fast, interactive static pages.

The core philosophy is simple: write static HTML, sprinkle in declarative `data-` attributes, and let the runtime wire up features (like slideshows, floating images, and screensavers) without the overhead of a heavy Virtual DOM framework.

---

## 🚀 Quick Start

**Prerequisites:** Node (version in `.nvmrc`) and PHP (for the local dev server).

### Installation & Development
```bash
# Install dependencies
npm ci

# Build the development bundle and start the local server
npm run demo:docs
```

### Production Build
```bash
# Build the production minified bundle and process HTML
npm run build:prod
```

### Quality Checks
```bash
npm run typecheck
npm run lint
npm run verify:docs  # Runs all strict lifecycle and smoke tests
```

---

## 🏗 Architecture & Mental Model

Spaceface completely separates the **Source of Truth** from the **Build Output**:

- **Source Code**: Lives in `src/` (TypeScript logic) and `public.src/` (HTML/CSS/assets).
- **Build Output**: Everything compiles into the `docs/` folder. The `docs/` folder is totally generated and can be rebuilt at any time.

### The Runtime Lifecycle
1. `main.ts` resolves the runtime config via the `<html data-mode="dev|prod">` attribute.
2. The **FeatureRegistry** scans the DOM and activates features based on specific CSS selectors.
3. The **StartupPipeline** initializes all active features, isolating failures so one broken feature doesn't crash the page.
4. The **RouteCoordinator** intercepts same-origin link clicks, fetches the next page in the background, swaps the `[data-route-container]` content, and updates the SEO `<meta>` tags.
5. As the DOM changes, features are intelligently reconciled (torn down or initialized).

---

## 📁 Project Layout

- `src/core/`: Framework primitives (event bus, router, lifecycle, logger, animation scheduler).
- `src/features/`: The actual interactive modules.
- `src/app/main.ts`: The composition root that wires everything together.
- `public.src/`: The raw HTML/CSS and build-time partials (e.g., `<link rel="partial" href="...">`).
- `docs/`: The generated static site output (served to users).
- `bin/`: Build scripts, validators, and the local PHP server.

---

## ✨ Features

Spaceface ships with several built-in interactive features triggered by DOM attributes:

### `SlideshowFeature`
- **Trigger**: `[data-slideshow]`
- **Description**: A basic controlled slideshow. Listens to global `slideshow:next` / `slideshow:prev` events.

### `SlidePlayerFeature`
- **Trigger**: `[data-slideplayer]`
- **Description**: An advanced auto-playing slideshow. Displays `[data-slideplayer-image]` elements. Includes support for local next/prev/bullet controls and automatically pauses when the screensaver activates.

### `FloatingImagesFeature`
- **Trigger**: `[data-floating-images]`
- **Description**: Creates bouncing DVD-logo-style floating elements from `[data-floating-item]`. Highly optimized using `requestAnimationFrame` and `IntersectionObserver`.

### `ScreensaverFeature`
- **Trigger**: `[data-screensaver]` (auto-created if missing).
- **Description**: Activates after user inactivity. Can load dynamic HTML partials at runtime. Automatically manages its own scoped `FloatingImagesFeature` instance.

---

## 🤖 CI/CD (GitHub Actions)

- **CI (`.github/workflows/ci.yml`)**: Runs typechecks, formatting linting, and smoke tests on `main` and all pull requests.
- **Deploy (`.github/workflows/pages.yml`)**: On push to `main`, this rebuilds the entire `docs/` folder from scratch, minifies the HTML, and deploys it directly to GitHub Pages.

---

## 💡 Important Notes

- **Partials**: Build-time partials in `public.src` use `<link rel="partial" href="..." />`.
- **Scripts**: Route swaps update HTML and `<meta>` tags, but `<script>` tags in swapped markup are **not** auto-executed.
- **Production Mode**: Set `data-mode="prod"` on your `<html>` tag to silence development logging.

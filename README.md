# Spaceface

Spaceface is a lightweight TypeScript runtime for building fast, interactive static pages.

The core philosophy is simple: write static HTML, sprinkle in declarative `data-` attributes, and let the runtime wire up features (like slideshows, floating images, and screensavers) without the overhead of a heavy Virtual DOM framework.

---

## 🚀 Quick Start

**Prerequisites:** Node (version in `.nvmrc`).

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
npm run typecheck:docs
npm run verify:docs
```

---

## 🏗 Architecture & Mental Model

Spaceface completely separates the **Source of Truth** from the **Build Output**:

- **Source Code**: Lives in `src/` (TypeScript logic) and `docs.src/` (HTML/CSS/assets).
- **Build Output**: Everything compiles into the `docs/` folder. The `docs/` folder is totally generated and can be rebuilt at any time.

### The Runtime Lifecycle
1. `src/app/main.ts` boots shared signals and the feature registry.
2. The **FeatureRegistry** watches `data-feature="..."` nodes with a global `MutationObserver`.
3. Features mount when matching nodes appear and destroy when nodes or feature ids disappear.
4. Shared cross-feature state flows through signals such as `userActivitySignal` and `screensaverActiveSignal`.
5. Animated features use the unified `FrameScheduler` for read/write frame phases.

---

## 📁 Project Layout

- `src/core/`: Framework primitives (signals, feature registry, container, logger, scheduler, partial loader).
- `src/features/`: The actual interactive modules.
- `src/app/main.ts`: The composition root that wires everything together.
- `docs.src/`: The authored HTML and static assets.
- `docs/`: The generated static site output (served to users).
- `bin/`: Build scripts, validators, and the local Node docs server.

---

## ✨ Features

Spaceface vNext ships with interactive features triggered by `data-feature="..."`:

### `SlideshowFeature`
- **Trigger**: `data-feature="slideshow"`
- **Description**: A signal-aware slideshow that pauses and resumes based on screensaver state.

### `SlidePlayerFeature`
- **Trigger**: `data-feature="slideplayer"`
- **Description**: An image-first player with prev/next controls, bullet navigation, autoplay, and screensaver-aware pause.

### `FloatingImagesFeature`
- **Trigger**: `data-feature="floating-images"`
- **Description**: Creates bouncing floating elements from `[data-floating-item]` using the shared frame scheduler.

### `ScreensaverFeature`
- **Trigger**: `data-feature="screensaver"`
- **Description**: Activates after inactivity, loads `resources/features/screensaver/index.html`, and exposes its visibility through `screensaverActiveSignal`.

---

## 🤖 CI/CD (GitHub Actions)

- **CI (`.github/workflows/ci.yml`)**: Runs typechecks, formatting linting, and smoke tests on `main` and all pull requests.
- **Deploy (`.github/workflows/pages.yml`)**: On push to `main`, this rebuilds the entire `docs/` folder from scratch, minifies the HTML, and deploys it directly to GitHub Pages.

---

## 💡 Important Notes

- **Build Output**: `npm run build:dev` writes HTML to `docs/` and bundles `src/app/main.ts` to `docs/dist/main.js`.
- **Dev Server**: `npm run serve:docs` serves the generated `docs/` folder with a Node static server.
- **Current Scope**: The active vNext branch is focused on the feature-registry runtime rather than the older router-based PJAX shell.

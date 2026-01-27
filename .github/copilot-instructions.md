# Copilot Instructions for Spaceface

Welcome to the Spaceface codebase! This document provides essential guidance for AI coding agents to be productive in this project. Spaceface is a TypeScript-first toolkit for building display-focused web apps, such as slideshows, screensavers, and floating imagery. It emphasizes modularity, framework-agnostic design, and robust lifecycle management.

## Big Picture Architecture

Spaceface is organized into modular utilities and feature controllers:

- **Utilities**: Found in `sources/system/bin/`, these include `EventBus`, `EventBinder`, `EventWatcher`, `PartialFetcher`, and more. They provide foundational functionality like event handling, partial HTML loading, and lifecycle management.
- **Feature Controllers**: Located in `sources/system/features/`, these include `SlidePlayer`, `ScreensaverController`, and `FloatingImagesManager`. They manage specific display features.
- **CSS and Styling**: Styles are modular and located in `spaceface/spacesuit/`. Key files include `main.css`, `layout.css`, and `variables.css`.

### Data Flow and Communication

- **Event-Driven Architecture**: The `EventBus` and `EventBinder` are central to communication between components. Use them for app-level wiring with automatic cleanup.
- **Partial Loading**: `PartialFetcher` and `PartialLoader` handle dynamic HTML content loading, reducing full-page reloads.

## Developer Workflows

### Building the Project

- Install dependencies: `npm install`
- Build the project: `node ./bin/build.js`

### Debugging

- Use the `EventLogger` utility in `sources/system/bin/` to log and debug event flows.
- CSS debugging tools are available in `spaceface/spacesuit/debug/`.

### Testing

- No explicit test framework is defined. Add tests in `sources/system/features/` or `sources/system/bin/` as needed.

## Project-Specific Conventions

- **TypeScript First**: All code is written in TypeScript. Ensure strong typing and defensive runtime checks.
- **Lifecycle Management**: Use `.ready` promises and `.initError` checks for initializing feature controllers.
- **Modular Design**: Keep utilities and features decoupled. Avoid introducing framework dependencies.

## Integration Points

- **External Dependencies**: The project uses `esbuild` for bundling. Install it with `npm install --save-dev esbuild`.
- **Cross-Component Communication**: Use `EventBus` for decoupled communication between modules.

## Examples

### Creating a SlidePlayer

```typescript
import { SlidePlayer } from "./sources/system/features/SlidePlayer";

const player = new SlidePlayer();
await player.ready;
if (player.initError) {
    console.error("Failed to initialize SlidePlayer:", player.initError);
}
```

### Using EventBus

```typescript
import { EventBus } from "./sources/system/bin/EventBus";

const bus = new EventBus();
bus.on("custom-event", (data) => {
    console.log("Received custom-event:", data);
});
bus.emit("custom-event", { key: "value" });
```

## Key Files and Directories

- `sources/system/bin/`: Core utilities.
- `sources/system/features/`: Feature controllers.
- `spaceface/spacesuit/`: CSS and styling.
- `bin/build.js`: Build script.

For more details, refer to the [README.md](../README.md).

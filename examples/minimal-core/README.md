# Minimal Core Starter

This example is the smallest standalone Spaceface setup in the repo.

It uses:

- one authored HTML page
- one custom feature mounted from `data-feature="counter-card"`
- the generated core package bundle only
- no screensaver or editorial built-ins

## Run It

1. Build the package output:

   ```bash
   npm run build:lib
   ```

2. Serve the repository root:

   ```bash
   npm run serve:root
   ```

3. Open:

   [http://127.0.0.1:8080/examples/minimal-core/index.html](http://127.0.0.1:8080/examples/minimal-core/index.html)

## What It Demonstrates

- importing the public runtime from `dist/spaceface.js`
- registering one custom `featureId`
- host-scoped startup through `registry.start(appRoot)`
- local reactive UI with `createSignal(...)` and `createEffect(...)`

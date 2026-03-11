# Starter Site Skeleton

This folder is a minimal second-site skeleton for the Spaceface runtime.

Current repo behavior:

- the active build still targets `sites/spaceface/`
- this skeleton is not wired into `package.json`
- no site discovery or multi-site build orchestration exists yet

Use this folder as a starting point when a second real site begins:

1. rename `sites/starter/` to the real site name
2. adapt `app/contract-data.js`
3. adapt `app/runtime.ts`
4. replace the authored pages under `public/`
5. add explicit build commands only when the site is actually ready to run

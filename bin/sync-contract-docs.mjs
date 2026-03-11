import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadAppContract } from "./lib/load-app-contract.mjs";

const root = process.cwd();
const writeMode = process.argv.includes("--write");
const appContract = await loadAppContract();

const files = [
  {
    path: resolve(root, "README.md"),
    start: "<!-- CONTRACT:README:START -->",
    end: "<!-- CONTRACT:README:END -->",
    content: renderReadmeContract(appContract),
  },
  {
    path: resolve(root, "architecture.md"),
    start: "<!-- CONTRACT:ARCH:START -->",
    end: "<!-- CONTRACT:ARCH:END -->",
    content: renderArchitectureContract(appContract),
  },
];

const dirtyFiles = [];

for (const file of files) {
  const current = readFileSync(file.path, "utf8");
  const next = replaceBlock(current, file.start, file.end, file.content);
  if (next !== current) {
    dirtyFiles.push(file.path);
    if (writeMode) {
      writeFileSync(file.path, next, "utf8");
    }
  }
}

if (!writeMode && dirtyFiles.length > 0) {
  console.error("[contract-docs] FAILED");
  for (const filePath of dirtyFiles) {
    console.error(`- out of sync: ${filePath}`);
  }
  process.exit(1);
}

console.log(writeMode ? "[contract-docs] synced" : "[contract-docs] OK");

function replaceBlock(source, startMarker, endMarker, blockContent) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker);
  if (start === -1 || end === -1 || end < start) {
    throw new Error(`Missing contract markers: ${startMarker} / ${endMarker}`);
  }

  const before = source.slice(0, start + startMarker.length);
  const after = source.slice(end);
  return `${before}\n${blockContent}\n${after}`;
}

function renderReadmeContract(contract) {
  const routes = contract.routes
    .map(
      (route) =>
        `- \`${route.file}\`: \`body[data-page="${route.page}"]\`; features ${joinInlineCode(route.featureSelectors)}`
    )
    .join("\n");

  const features = contract.features
    .map((feature) => {
      const note = feature.singletonNote ? `; note: ${feature.singletonNote}` : "";
      return `- \`${feature.selector}\`: root \`${feature.root}\`; hooks ${joinInlineCode(feature.internals)}${note}`;
    })
    .join("\n");

  return [
    "### Routes",
    routes,
    "",
    "### Feature Hooks",
    features,
    "",
    "### Shared Contracts",
    `- Page hooks: ${joinInlineCode(contract.pageHooks)}`,
    `- Activity inputs: ${joinInlineCode(contract.activityInputs)}`,
    `- Partial asset attributes rebased at build time and runtime: ${joinInlineCode(contract.partialAssetAttributes)}`,
  ].join("\n");
}

function renderArchitectureContract(contract) {
  const routes = contract.routes
    .map(
      (route) =>
        `- \`${route.file}\`: page id \`${route.page}\`; nav id \`${route.id}\`; required hooks ${joinInlineCode(route.requiredHooks ?? [])}; features ${joinInlineCode(route.featureSelectors)}`
    )
    .join("\n");

  const features = contract.features
    .map((feature) => {
      const singleton = feature.singletonNote ? `; singleton note: ${feature.singletonNote}` : "";
      return `- \`${feature.selector}\`: root \`${feature.root}\`; internals ${joinInlineCode(feature.internals)}${singleton}`;
    })
    .join("\n");

  const partials = contract.partials
    .map(
      (partial) =>
        `- \`${partial.file}\`: host hook \`${partial.hostHook}\`; features ${joinInlineCode(partial.featureSelectors)}; required hooks ${joinInlineCode(partial.requiredHooks)}`
    )
    .join("\n");

  return [
    "### Source Of Truth",
    "- Authored contract: [`src/app/contract.ts`](./src/app/contract.ts)",
    "- Runtime registration: [`src/app/runtime.ts`](./src/app/runtime.ts)",
    "- Doc sync command: `npm run sync:contracts`",
    "",
    "### Routes",
    routes,
    "",
    "### Features",
    features,
    "",
    "### Partials",
    partials,
    "",
    "### Shared Rules",
    `- Activity reset inputs: ${joinInlineCode(contract.activityInputs)}`,
    `- Rebased partial asset attributes: ${joinInlineCode(contract.partialAssetAttributes)}`,
    `- Page hooks: ${joinInlineCode(contract.pageHooks)}`,
  ].join("\n");
}

function joinInlineCode(values) {
  if (values.length === 0) {
    return "`none`";
  }
  return values.map((value) => `\`${value}\``).join(", ");
}

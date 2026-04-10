import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { APP_CONTRACT } from "../../app/contract-data.js";

const root = process.cwd();
const writeMode = process.argv.includes("--write");

const files = [
  {
    path: resolve(root, "README.md"),
    start: "<!-- CONTRACT:README:START -->",
    end: "<!-- CONTRACT:README:END -->",
    content: renderReadmeContract(APP_CONTRACT),
  },
  {
    path: resolve(root, "architecture.md"),
    start: "<!-- CONTRACT:ARCH:START -->",
    end: "<!-- CONTRACT:ARCH:END -->",
    content: renderArchitectureContract(APP_CONTRACT),
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
        `- \`${route.file}\`: \`body[data-page="${route.page}"]\`; features ${joinInlineCode(route.featureIds)}`
    )
    .join("\n");

  const features = contract.features
    .map((feature) => {
      const note = feature.singletonNote ? `; note: ${feature.singletonNote}` : "";
      return `- \`${feature.featureId}\`: root \`${feature.root}\`; hooks ${joinInlineCode(feature.internals)}${note}`;
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
        `- \`${route.file}\`: page id \`${route.page}\`; nav id \`${route.id}\`; hooks ${formatHookSummary(route.hooks ?? [])}; features ${joinInlineCode(route.featureIds)}`
    )
    .join("\n");

  const features = contract.features
    .map((feature) => {
      const singleton = feature.singletonNote ? `; singleton note: ${feature.singletonNote}` : "";
      return `- \`${feature.featureId}\`: root \`${feature.root}\`; internals ${joinInlineCode(feature.internals)}${singleton}`;
    })
    .join("\n");

  const partials = contract.partials
    .map(
      (partial) =>
        `- \`${partial.file}\`: host hook \`${partial.hostHook}\`; features ${joinInlineCode(partial.featureIds)}; hooks ${formatHookSummary(partial.hooks)}`
    )
    .join("\n");

  return [
    "### Source Of Truth",
    "- Shared contract data: [`app/contract-data.js`](./app/contract-data.js)",
    "- TypeScript helpers: [`app/contract.ts`](./app/contract.ts)",
    "- Runtime registration: [`app/runtime.ts`](./app/runtime.ts)",
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

function formatHookSummary(hooks) {
  if (hooks.length === 0) {
    return "`none`";
  }

  const required = hooks.filter((hook) => hook.presence === "required").map((hook) => hook.selector);
  const optional = hooks.filter((hook) => hook.presence === "optional").map((hook) => hook.selector);
  const parts = [];

  if (required.length > 0) {
    parts.push(`required ${joinInlineCode(required)}`);
  }
  if (optional.length > 0) {
    parts.push(`optional ${joinInlineCode(optional)}`);
  }

  return parts.join("; ");
}

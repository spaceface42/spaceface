// app/main.ts
import {
  FeatureRegistry,
  attachConsoleLogSink,
  createLogger,
  initActivityTracking,
  type LogLevel,
} from "../src/spaceface.js";
import { APP_CONTRACT, getDefaultLogLevel, getDocumentMode } from "./contract.js";
import { createRuntimeFeatureDefinitions } from "./runtime.js";
import { initStartupSequence } from "./startup/initStartupSequence.js";

const DEFAULT_LOG_LEVEL: LogLevel = getDefaultLogLevel(getDocumentMode());
const logger = createLogger("MU/TH/UR", DEFAULT_LOG_LEVEL);

function main(): void {
  attachConsoleLogSink(DEFAULT_LOG_LEVEL);
  logger.info("boot start", { mode: getDocumentMode(), app: APP_CONTRACT.name });

  applyCurrentNavState();

  // 1. Initialize optional DOM-driven startup enhancements.
  initStartupSequence();

  // 2. Initialize global shared signals/activity.
  initActivityTracking();

  // 3. Initialize the global feature registry.
  const registry = new FeatureRegistry({ logger: logger.child("features") });

  // 4. Register features from the app contract.
  for (const definition of createRuntimeFeatureDefinitions()) {
    registry.register(definition);
  }

  // 5. Start DOM observation within the app host root.
  registry.start(document.body);
  logger.info("boot complete");
}

// Boot
try {
  main();
} catch (error) {
  logger.error("boot failed", error);
  setTimeout(() => {
    throw error;
  }, 0);
}

function applyCurrentNavState(): void {
  const currentPage = document.body?.dataset.page;
  if (!currentPage) return;

  const links = document.querySelectorAll<HTMLAnchorElement>("[data-nav-link]");
  for (const link of links) {
    if (link.dataset.navLink === currentPage) {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
  }
}

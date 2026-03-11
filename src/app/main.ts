// src/app/main.ts
import { FeatureRegistry } from "../core/feature.js";
import { attachConsoleLogSink, createLogger, type LogLevel } from "../core/logger.js";
import { initActivityTracking } from "../features/shared/activity.js";
import { APP_CONTRACT, getDefaultLogLevel, getDocumentMode } from "./contract.js";
import { createRuntimeFeatureDefinitions } from "./runtime.js";

const DEFAULT_LOG_LEVEL: LogLevel = getDefaultLogLevel(getDocumentMode());
const logger = createLogger("spaceface", DEFAULT_LOG_LEVEL);

function main(): void {
  attachConsoleLogSink(DEFAULT_LOG_LEVEL);
  logger.info("boot start", { mode: getDocumentMode(), app: APP_CONTRACT.name });

  applyCurrentNavState();

  // 1. Initialize Global Shared Signals/Activity
  initActivityTracking();

  // 2. Initialize Global Feature Registry
  const registry = new FeatureRegistry({ logger: logger.child("features") });

  // 3. Register Features from the app contract
  for (const definition of createRuntimeFeatureDefinitions()) {
    registry.register(definition);
  }

  // 4. Start DOM Observation
  registry.start();
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

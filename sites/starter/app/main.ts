import {
  FeatureRegistry,
  attachConsoleLogSink,
  createLogger,
  initActivityTracking,
  type LogLevel,
} from "../../../src/spaceface.js";
import { APP_CONTRACT, getDefaultLogLevel, getDocumentMode } from "./contract.js";
import { createRuntimeFeatureDefinitions } from "./runtime.js";

const DEFAULT_LOG_LEVEL: LogLevel = getDefaultLogLevel(getDocumentMode());
const logger = createLogger("starter", DEFAULT_LOG_LEVEL);

function main(): void {
  attachConsoleLogSink(DEFAULT_LOG_LEVEL);
  logger.info("boot start", { mode: getDocumentMode(), app: APP_CONTRACT.name });

  applyCurrentNavState();
  initActivityTracking();

  const registry = new FeatureRegistry({ logger: logger.child("features") });
  for (const definition of createRuntimeFeatureDefinitions()) {
    registry.register(definition);
  }

  registry.start();
  logger.info("boot complete");
}

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

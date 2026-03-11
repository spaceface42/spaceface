import type { LogLevel } from "../core/logger.js";
import { APP_CONTRACT } from "./contract-data.js";

export { APP_CONTRACT };
export type { FeatureContract, RouteContract, PartialContract, AppContract } from "./contract-data.js";
import type { FeatureContract } from "./contract-data.js";

export function getDocumentMode(documentMode = document.documentElement?.dataset.mode): string {
  return documentMode ?? "prod";
}

export function getDefaultLogLevel(documentMode: string): LogLevel {
  return documentMode === "dev" ? "debug" : "warn";
}

export function getFeatureContract(featureId: string): FeatureContract {
  const feature = APP_CONTRACT.features.find((entry) => entry.id === featureId);
  if (!feature) {
    throw new Error(`Unknown feature contract: ${featureId}`);
  }
  return feature;
}

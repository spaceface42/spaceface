import { FeatureRegistry, userActivitySignal } from "../../dist/spaceface.js";
import { ScreensaverFeature, screensaverActiveSignal } from "../../dist/screensaver.js";

// Minimal standalone setup: the page only needs an element with
// data-feature="screensaver" for the feature to mount.
const registry = new FeatureRegistry();

registry.register({
  featureId: "screensaver",
  create: () =>
    new ScreensaverFeature({
      scenePartialUrls: {
        "floating-images": "../../public/resources/features/screensaver-scenes/floating-images.html",
      },
    }),
});

registry.start(document.body);

const terminal = createTerminal();
let lastActivityMessage = 0;

writeTerminalMessage("screensaver demo ready — waiting for activity");

screensaverActiveSignal.subscribe((active) => {
  writeTerminalMessage(active ? "screensaver active" : "screensaver hidden — activity detected");
});

userActivitySignal.subscribe((timestamp) => {
  // Mouse movement can be frequent; keep the one-line terminal readable.
  if (timestamp - lastActivityMessage < 800) return;
  lastActivityMessage = timestamp;
  if (!screensaverActiveSignal.value) {
    writeTerminalMessage("user activity received — idle timer restarted");
  }
});

function createTerminal() {
  const output = document.createElement("div");
  output.className = "minimal-demo-terminal";
  output.setAttribute("role", "status");
  output.setAttribute("aria-live", "polite");
  document.body.append(output);
  return output;
}

function writeTerminalMessage(message) {
  terminal.textContent = `> ${message}`;
}

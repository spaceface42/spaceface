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

// The demo has no authored HTML, so the little terminal is created here.
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
  const style = document.createElement("style");
  style.textContent = `
    .minimal-demo-terminal {
      position: fixed;
      right: 1rem;
      bottom: 1rem;
      z-index: 20;
      max-width: calc(100vw - 2rem);
      padding: 0.65rem 0.8rem;
      overflow: hidden;
      color: #b7ffcf;
      background: #101712e6;
      border: 1px solid #b7ffcf66;
      border-radius: 0.35rem;
      box-shadow: 0 0.5rem 2rem #0008;
      font: 0.78rem/1.2 ui-monospace, SFMono-Regular, Menlo, monospace;
      white-space: nowrap;
      text-overflow: ellipsis;
    }
  `;
  document.head.append(style);

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

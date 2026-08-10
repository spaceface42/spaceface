import { FeatureRegistry } from "../../dist/spaceface.js";
import { ScreensaverFeature } from "../../dist/screensaver.js";

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

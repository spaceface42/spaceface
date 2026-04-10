import { FeatureRegistry, createEffect, createSignal } from "../../dist/spaceface.js";

class CounterCardFeature {
  constructor() {
    this.count = createSignal(0);
    this.root = null;
    this.valueEl = null;
    this.incrementButton = null;
    this.resetButton = null;
    this.cleanupEffect = undefined;
  }

  mount(el) {
    this.root = el;
    this.valueEl = el.querySelector(".minimal-card__value");
    this.incrementButton = el.querySelector(".minimal-card__button--primary");
    this.resetButton = el.querySelector(".minimal-card__button--ghost");

    if (!this.valueEl || !this.incrementButton || !this.resetButton) {
      return;
    }

    this.incrementButton.addEventListener("click", this.handleIncrement);
    this.resetButton.addEventListener("click", this.handleReset);

    this.cleanupEffect = createEffect(() => {
      if (!this.valueEl) return;
      this.valueEl.textContent = String(this.count.value);
    });
  }

  destroy() {
    this.incrementButton?.removeEventListener("click", this.handleIncrement);
    this.resetButton?.removeEventListener("click", this.handleReset);
    this.cleanupEffect?.();
    this.cleanupEffect = undefined;
    this.root = null;
    this.valueEl = null;
    this.incrementButton = null;
    this.resetButton = null;
  }

  handleIncrement = () => {
    this.count.value += 1;
  };

  handleReset = () => {
    this.count.value = 0;
  };
}

const appRoot = document.getElementById("app");
if (!(appRoot instanceof HTMLElement)) {
  throw new Error("Minimal core example requires #app");
}

const registry = new FeatureRegistry();
registry.register({
  featureId: "counter-card",
  create: () => new CounterCardFeature(),
});
registry.start(appRoot);

import type { Feature, FeatureMountContext } from "../../core/feature.js";
import { createLogger, type Logger } from "../../core/logger.js";
import { screensaverActiveSignal } from "../shared/screensaverState.js";

interface PortfolioStageItem {
  categories: string[];
  categoryLabel: string;
  el: HTMLElement;
  summary: string;
  title: string;
}

interface PortfolioStageItemSnapshot {
  ariaHidden: string | null;
  element: HTMLElement;
  hadActiveClass: boolean;
  hidden: boolean;
  slot: string | null;
  zIndex: string;
}

interface PortfolioStageButtonSnapshot {
  ariaDisabled: string | null;
  element: HTMLElement;
}

interface PortfolioStageFilterSnapshot {
  ariaPressed: string | null;
  element: HTMLElement;
  hadActiveFilterClass: boolean;
}

interface PortfolioStageDetailsToggleSnapshot {
  ariaDisabled: string | null;
  ariaExpanded: string | null;
  element: HTMLElement;
}

interface PortfolioStageDetailsSnapshot {
  element: HTMLElement;
  hidden: boolean;
}

interface PortfolioStageTextTargetSnapshot {
  element: HTMLElement;
  textContent: string;
}

interface PortfolioStageDomSnapshot {
  details: PortfolioStageDetailsSnapshot | null;
  detailsToggle: PortfolioStageDetailsToggleSnapshot | null;
  filters: PortfolioStageFilterSnapshot[];
  items: PortfolioStageItemSnapshot[];
  nextButton: PortfolioStageButtonSnapshot | null;
  prevButton: PortfolioStageButtonSnapshot | null;
  rootFilterValue: string | null;
  textTargets: PortfolioStageTextTargetSnapshot[];
}

type PortfolioStageWrapDirection = "left" | "right";

export interface PortfolioStageFeatureOptions {
  stepAnimationMs?: number;
  stageSelector?: string;
  itemSelector?: string;
  prevSelector?: string;
  nextSelector?: string;
  filterSelector?: string;
  titleSelector?: string;
  categorySelector?: string;
  indexSelector?: string;
  summarySelector?: string;
  detailsSelector?: string;
  detailsToggleSelector?: string;
  activeClass?: string;
  activeFilterClass?: string;
}

export class PortfolioStageFeature implements Feature {
  private static readonly SWIPE_THRESHOLD_PX = 42;
  private static readonly SWIPE_OFF_AXIS_THRESHOLD_PX = 26;
  private static readonly SLOT_LAYOUT_REM: Record<number, { x: number; y: number }> = {
    [-3]: { x: -31, y: -0.4 },
    [-2]: { x: -22, y: -0.4 },
    [-1]: { x: -14, y: -0.4 },
    [0]: { x: 0, y: -0.4 },
    [1]: { x: 14, y: -0.4 },
    [2]: { x: 22, y: -0.4 },
    [3]: { x: 31, y: -0.4 },
  };
  private static keyboardOwner: PortfolioStageFeature | null = null;

  private options: Required<PortfolioStageFeatureOptions>;
  private root: HTMLElement | null = null;
  private stage: HTMLElement | null = null;
  private items: PortfolioStageItem[] = [];
  private visibleIndexes: number[] = [];
  private currentFilter = "all";
  private currentVisibleIndex = 0;
  private detailsOpen = false;
  private detachPrevClick?: () => void;
  private detachNextClick?: () => void;
  private detachFilterClicks: Array<() => void> = [];
  private detachItemClicks: Array<() => void> = [];
  private detachDetailsToggleClick?: () => void;
  private detachKeydown?: () => void;
  private detachPointerDown?: () => void;
  private detachPointerUp?: () => void;
  private detachPointerCancel?: () => void;
  private detachTouchStart?: () => void;
  private detachTouchEnd?: () => void;
  private detachTouchCancel?: () => void;
  private detachStageClick?: () => void;
  private addedRootTabIndex = false;
  private ownsKeyboardBinding = false;
  private playTimer: ReturnType<typeof setTimeout> | null = null;
  private swipePointerId: number | null = null;
  private swipeStartX = 0;
  private swipeStartY = 0;
  private initialDomSnapshot: PortfolioStageDomSnapshot | null = null;
  private pendingWrapTransitions = new Map<HTMLElement, () => void>();
  private logger: Logger = createLogger("portfolio-stage", "warn");

  constructor(options: PortfolioStageFeatureOptions = {}) {
    this.options = {
      stepAnimationMs: options.stepAnimationMs ?? 140,
      stageSelector: options.stageSelector ?? "[data-portfolio-stage-stage]",
      itemSelector: options.itemSelector ?? "[data-portfolio-stage-item]",
      prevSelector: options.prevSelector ?? "[data-portfolio-stage-prev]",
      nextSelector: options.nextSelector ?? "[data-portfolio-stage-next]",
      filterSelector: options.filterSelector ?? "[data-portfolio-stage-filter]",
      titleSelector: options.titleSelector ?? "[data-portfolio-stage-current-title]",
      categorySelector: options.categorySelector ?? "[data-portfolio-stage-current-category]",
      indexSelector: options.indexSelector ?? "[data-portfolio-stage-current-index]",
      summarySelector: options.summarySelector ?? "[data-portfolio-stage-current-summary]",
      detailsSelector: options.detailsSelector ?? "[data-portfolio-stage-details]",
      detailsToggleSelector: options.detailsToggleSelector ?? "[data-portfolio-stage-details-toggle]",
      activeClass: options.activeClass ?? "is-active",
      activeFilterClass: options.activeFilterClass ?? "is-selected",
    };
  }

  mount(el: HTMLElement, context?: FeatureMountContext): void {
    this.logger = context?.logger ?? this.logger;
    this.root = el;
    this.stage = this.resolveStage(el);
    this.items = this.collectItems(el);
    this.currentFilter = this.readInitialFilter();
    this.currentVisibleIndex = 0;
    this.detailsOpen = false;
    this.initialDomSnapshot = this.captureInitialDomSnapshot();

    if (this.root.getAttribute("tabindex") === null) {
      this.root.setAttribute("tabindex", "0");
      this.addedRootTabIndex = true;
    }

    this.recomputeVisibleIndexes();
    this.bindControls();
    this.render();
  }

  destroy(): void {
    this.detachPrevClick?.();
    this.detachPrevClick = undefined;
    this.detachNextClick?.();
    this.detachNextClick = undefined;
    this.detachDetailsToggleClick?.();
    this.detachDetailsToggleClick = undefined;
    this.detachKeydown?.();
    this.detachKeydown = undefined;
    this.detachPointerDown?.();
    this.detachPointerDown = undefined;
    this.detachPointerUp?.();
    this.detachPointerUp = undefined;
    this.detachPointerCancel?.();
    this.detachPointerCancel = undefined;
    this.detachTouchStart?.();
    this.detachTouchStart = undefined;
    this.detachTouchEnd?.();
    this.detachTouchEnd = undefined;
    this.detachTouchCancel?.();
    this.detachTouchCancel = undefined;
    this.detachStageClick?.();
    this.detachStageClick = undefined;

    for (const detach of this.detachFilterClicks) {
      detach();
    }
    this.detachFilterClicks = [];
    for (const detach of this.detachItemClicks) {
      detach();
    }
    this.detachItemClicks = [];
    if (this.root && this.addedRootTabIndex) {
      this.root.removeAttribute("tabindex");
    }

    this.cancelPlayback();
    this.clearPendingWrapTransitions();
    this.restoreInitialDomSnapshot();
    this.root = null;
    this.stage = null;
    this.items = [];
    this.visibleIndexes = [];
    this.currentFilter = "all";
    this.currentVisibleIndex = 0;
    this.detailsOpen = false;
    this.addedRootTabIndex = false;
    this.initialDomSnapshot = null;
    if (this.ownsKeyboardBinding && PortfolioStageFeature.keyboardOwner === this) {
      PortfolioStageFeature.keyboardOwner = null;
    }
    this.ownsKeyboardBinding = false;
    this.swipePointerId = null;
    this.swipeStartX = 0;
    this.swipeStartY = 0;
  }

  private bindControls(): void {
    if (!this.root) return;

    const prevButton = this.root.querySelector<HTMLElement>(this.options.prevSelector);
    if (prevButton) {
      const onPrev = () => {
        this.prev();
        this.focusRoot();
      };
      prevButton.addEventListener("click", onPrev);
      this.detachPrevClick = () => prevButton.removeEventListener("click", onPrev);
    }

    const nextButton = this.root.querySelector<HTMLElement>(this.options.nextSelector);
    if (nextButton) {
      const onNext = () => {
        this.next();
        this.focusRoot();
      };
      nextButton.addEventListener("click", onNext);
      this.detachNextClick = () => nextButton.removeEventListener("click", onNext);
    }

    const detailsToggle = this.root.querySelector<HTMLElement>(this.options.detailsToggleSelector);
    if (detailsToggle) {
      const onToggle = () => {
        this.toggleDetails();
        this.focusRoot();
      };
      detailsToggle.addEventListener("click", onToggle);
      this.detachDetailsToggleClick = () => detailsToggle.removeEventListener("click", onToggle);
    }

    const filterButtons = Array.from(this.root.querySelectorAll<HTMLElement>(this.options.filterSelector));
    this.detachFilterClicks = filterButtons.map((button) => {
      const onClick = () => {
        this.setFilter(button.getAttribute("data-portfolio-stage-filter") ?? "all");
        this.focusRoot();
      };
      button.addEventListener("click", onClick);
      return () => button.removeEventListener("click", onClick);
    });

    this.detachItemClicks = this.items.map((item, index) => {
      const onClick = (event: MouseEvent) => {
        event.stopPropagation?.();
        const visiblePosition = this.visibleIndexes.indexOf(index);
        if (visiblePosition === -1) return;
        if (visiblePosition === this.currentVisibleIndex) {
          this.toggleDetails();
          return;
        }
        this.playToVisibleIndex(visiblePosition);
      };
      item.el.addEventListener("click", onClick);
      return () => item.el.removeEventListener("click", onClick);
    });

    if (PortfolioStageFeature.keyboardOwner === null) {
      const onKeydown = (event: KeyboardEvent) => {
        if (screensaverActiveSignal.value || shouldIgnoreKeydown(event)) return;

        if (event.key === "ArrowLeft") {
          event.preventDefault();
          this.prev();
        } else if (event.key === "ArrowRight") {
          event.preventDefault();
          this.next();
        } else if (event.key === "Escape" && this.detailsOpen) {
          event.preventDefault();
          this.detailsOpen = false;
          this.render();
        }
      };
      document.addEventListener("keydown", onKeydown);
      this.detachKeydown = () => document.removeEventListener("keydown", onKeydown);
      PortfolioStageFeature.keyboardOwner = this;
      this.ownsKeyboardBinding = true;
    } else if (PortfolioStageFeature.keyboardOwner !== this) {
      this.logger.warn("ignored duplicate portfolio-stage keyboard binding", {
        reason: "singleton-enforced",
      });
    }

    if (!this.stage) return;

    const onStageClick = (event: MouseEvent) => {
      const visiblePosition = this.findClickedVisiblePosition(event);
      if (visiblePosition === null) return;
      if (visiblePosition === this.currentVisibleIndex) {
        this.toggleDetails();
        return;
      }
      this.playToVisibleIndex(visiblePosition);
      this.focusRoot();
    };

    const onPointerDown = (event: PointerEvent) => {
      if (typeof event.button === "number" && event.button !== 0) return;
      this.swipePointerId = event.pointerId;
      this.swipeStartX = event.clientX;
      this.swipeStartY = event.clientY;
      this.focusRoot();
      if (typeof this.stage?.setPointerCapture === "function") {
        try {
          this.stage.setPointerCapture(event.pointerId);
        } catch {
          // Pointer capture is best-effort for swipe polish.
        }
      }
    };

    const onPointerUp = (event: PointerEvent) => {
      if (this.swipePointerId === null || event.pointerId !== this.swipePointerId) return;
      releasePointerCapture(this.stage, event.pointerId);
      this.handleSwipeDelta(event.clientX - this.swipeStartX, event.clientY - this.swipeStartY);
    };

    const onPointerCancel = (event: PointerEvent) => {
      releasePointerCapture(this.stage, event.pointerId);
      this.resetSwipeState();
    };

    const onTouchStart = (event: TouchEvent) => {
      const touch = event.changedTouches[0];
      if (!touch) return;
      this.swipePointerId = -1;
      this.swipeStartX = touch.clientX;
      this.swipeStartY = touch.clientY;
      this.focusRoot();
    };

    const onTouchEnd = (event: TouchEvent) => {
      if (this.swipePointerId !== -1) return;
      const touch = event.changedTouches[0];
      if (!touch) return;
      this.handleSwipeDelta(touch.clientX - this.swipeStartX, touch.clientY - this.swipeStartY);
    };

    const onTouchCancel = () => this.resetSwipeState();

    this.stage.addEventListener("click", onStageClick);
    this.stage.addEventListener("pointerdown", onPointerDown);
    this.stage.addEventListener("pointerup", onPointerUp);
    this.stage.addEventListener("pointercancel", onPointerCancel);
    this.stage.addEventListener("touchstart", onTouchStart, { passive: true });
    this.stage.addEventListener("touchend", onTouchEnd, { passive: true });
    this.stage.addEventListener("touchcancel", onTouchCancel, { passive: true });

    this.detachStageClick = () => this.stage?.removeEventListener("click", onStageClick);
    this.detachPointerDown = () => this.stage?.removeEventListener("pointerdown", onPointerDown);
    this.detachPointerUp = () => this.stage?.removeEventListener("pointerup", onPointerUp);
    this.detachPointerCancel = () => this.stage?.removeEventListener("pointercancel", onPointerCancel);
    this.detachTouchStart = () => this.stage?.removeEventListener("touchstart", onTouchStart);
    this.detachTouchEnd = () => this.stage?.removeEventListener("touchend", onTouchEnd);
    this.detachTouchCancel = () => this.stage?.removeEventListener("touchcancel", onTouchCancel);
  }

  private collectItems(root: HTMLElement): PortfolioStageItem[] {
    return Array.from(root.querySelectorAll<HTMLElement>(this.options.itemSelector)).map((el) => {
      const rawCategory = el.getAttribute("data-portfolio-stage-category")?.trim() ?? "Work";
      return {
        el,
        title: el.getAttribute("data-portfolio-stage-title")?.trim() ?? "Untitled work",
        categoryLabel: rawCategory,
        categories: rawCategory.split(",").map(normalizeFilterValue).filter(Boolean),
        summary: el.getAttribute("data-portfolio-stage-summary")?.trim() ?? "",
      };
    });
  }

  private captureInitialDomSnapshot(): PortfolioStageDomSnapshot | null {
    if (!this.root) return null;

    const prevButton = this.root.querySelector<HTMLElement>(this.options.prevSelector);
    const nextButton = this.root.querySelector<HTMLElement>(this.options.nextSelector);
    const details = this.root.querySelector<HTMLElement>(this.options.detailsSelector);
    const detailsToggle = this.root.querySelector<HTMLElement>(this.options.detailsToggleSelector);
    const textTargets = this.collectTextTargets();

    return {
      rootFilterValue: this.root.getAttribute("data-portfolio-stage-filter-value"),
      items: this.items.map((item) => ({
        element: item.el,
        hidden: item.el.hidden,
        ariaHidden: item.el.getAttribute("aria-hidden"),
        slot: item.el.getAttribute("data-portfolio-stage-slot"),
        zIndex: item.el.style.zIndex,
        hadActiveClass: item.el.classList.contains(this.options.activeClass),
      })),
      filters: Array.from(this.root.querySelectorAll<HTMLElement>(this.options.filterSelector)).map((button) => ({
        element: button,
        ariaPressed: button.getAttribute("aria-pressed"),
        hadActiveFilterClass: button.classList.contains(this.options.activeFilterClass),
      })),
      prevButton: prevButton
        ? {
            element: prevButton,
            ariaDisabled: prevButton.getAttribute("aria-disabled"),
          }
        : null,
      nextButton: nextButton
        ? {
            element: nextButton,
            ariaDisabled: nextButton.getAttribute("aria-disabled"),
          }
        : null,
      details: details
        ? {
            element: details,
            hidden: details.hidden,
          }
        : null,
      detailsToggle: detailsToggle
        ? {
            element: detailsToggle,
            ariaExpanded: detailsToggle.getAttribute("aria-expanded"),
            ariaDisabled: detailsToggle.getAttribute("aria-disabled"),
          }
        : null,
      textTargets,
    };
  }

  private collectTextTargets(): PortfolioStageTextTargetSnapshot[] {
    if (!this.root) return [];

    const targets = new Set<HTMLElement>();
    const selectors = [
      this.options.titleSelector,
      this.options.categorySelector,
      this.options.indexSelector,
      this.options.summarySelector,
    ];

    for (const selector of selectors) {
      for (const target of this.root.querySelectorAll<HTMLElement>(selector)) {
        targets.add(target);
      }
    }

    return Array.from(targets).map((element) => ({
      element,
      textContent: element.textContent ?? "",
    }));
  }

  private restoreInitialDomSnapshot(): void {
    if (!this.root || !this.initialDomSnapshot) return;

    restoreAttribute(this.root, "data-portfolio-stage-filter-value", this.initialDomSnapshot.rootFilterValue);

    for (const snapshot of this.initialDomSnapshot.items) {
      snapshot.element.hidden = snapshot.hidden;
      restoreAttribute(snapshot.element, "aria-hidden", snapshot.ariaHidden);
      restoreAttribute(snapshot.element, "data-portfolio-stage-slot", snapshot.slot);
      snapshot.element.classList.toggle(this.options.activeClass, snapshot.hadActiveClass);
      snapshot.element.style.zIndex = snapshot.zIndex;
    }

    for (const snapshot of this.initialDomSnapshot.filters) {
      snapshot.element.classList.toggle(this.options.activeFilterClass, snapshot.hadActiveFilterClass);
      restoreAttribute(snapshot.element, "aria-pressed", snapshot.ariaPressed);
    }

    if (this.initialDomSnapshot.prevButton) {
      restoreAttribute(
        this.initialDomSnapshot.prevButton.element,
        "aria-disabled",
        this.initialDomSnapshot.prevButton.ariaDisabled
      );
    }
    if (this.initialDomSnapshot.nextButton) {
      restoreAttribute(
        this.initialDomSnapshot.nextButton.element,
        "aria-disabled",
        this.initialDomSnapshot.nextButton.ariaDisabled
      );
    }
    if (this.initialDomSnapshot.details) {
      this.initialDomSnapshot.details.element.hidden = this.initialDomSnapshot.details.hidden;
    }
    if (this.initialDomSnapshot.detailsToggle) {
      restoreAttribute(
        this.initialDomSnapshot.detailsToggle.element,
        "aria-expanded",
        this.initialDomSnapshot.detailsToggle.ariaExpanded
      );
      restoreAttribute(
        this.initialDomSnapshot.detailsToggle.element,
        "aria-disabled",
        this.initialDomSnapshot.detailsToggle.ariaDisabled
      );
    }

    for (const snapshot of this.initialDomSnapshot.textTargets) {
      snapshot.element.textContent = snapshot.textContent;
    }
  }

  private readInitialFilter(): string {
    if (!this.root) return "all";
    const activeFilter = this.root.querySelector<HTMLElement>(`${this.options.filterSelector}.${this.options.activeFilterClass}`);
    if (!activeFilter) return "all";
    return normalizeFilterValue(activeFilter.getAttribute("data-portfolio-stage-filter") ?? "all");
  }

  private recomputeVisibleIndexes(): void {
    const nextVisibleIndexes = this.items
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => this.currentFilter === "all" || item.categories.includes(this.currentFilter))
      .map(({ index }) => index);

    if (nextVisibleIndexes.length > 0) {
      this.visibleIndexes = nextVisibleIndexes;
    } else {
      this.currentFilter = "all";
      this.visibleIndexes = this.items.map((_item, index) => index);
    }

    if (this.visibleIndexes.length === 0) {
      this.currentVisibleIndex = 0;
      return;
    }

    if (this.currentVisibleIndex >= this.visibleIndexes.length) {
      this.currentVisibleIndex = 0;
    }
  }

  private setFilter(value: string): void {
    this.cancelPlayback();
    this.currentFilter = normalizeFilterValue(value);
    this.currentVisibleIndex = 0;
    this.detailsOpen = false;
    this.recomputeVisibleIndexes();
    this.render();
  }

  private next(): void {
    this.cancelPlayback();
    this.advanceVisibleIndexBy(1);
  }

  private prev(): void {
    this.cancelPlayback();
    this.advanceVisibleIndexBy(-1);
  }

  private toggleDetails(): void {
    if (!this.getCurrentItem()) return;
    this.detailsOpen = !this.detailsOpen;
    this.render();
  }

  private render(): void {
    if (!this.root) return;

    const currentItem = this.getCurrentItem();
    const currentIndex = currentItem ? this.items.indexOf(currentItem) : -1;
    const previousSlots = this.readRenderedSlots();
    const visibleSlots = this.getVisibleSlots();
    const previousSlotRange = getSlotRange(previousSlots);
    const nextSlotRange = getSlotRange(visibleSlots);

    this.clearPendingWrapTransitions();

    for (let i = 0; i < this.items.length; i += 1) {
      const item = this.items[i];
      const slot = visibleSlots.get(i);
      const isVisible = slot !== undefined;
      const isActive = slot === 0 && i === currentIndex;
      item.el.hidden = !isVisible;
      item.el.setAttribute("aria-hidden", String(!isVisible));
      item.el.classList.toggle(this.options.activeClass, isActive);
      if (isVisible) {
        item.el.setAttribute("data-portfolio-stage-slot", String(slot));
        item.el.style.zIndex = String(100 - Math.abs(slot ?? 0));
        const wrapDirection = getWrapEnterDirection(previousSlots.get(i), slot, previousSlotRange, nextSlotRange);
        if (wrapDirection) {
          this.queueWrapEntry(item.el, wrapDirection, slot);
        }
      } else {
        item.el.removeAttribute("data-portfolio-stage-slot");
        item.el.style.zIndex = "";
      }
    }

    this.root.setAttribute("data-portfolio-stage-filter-value", this.currentFilter);

    const filterButtons = Array.from(this.root.querySelectorAll<HTMLElement>(this.options.filterSelector));
    for (const button of filterButtons) {
      const isActive = normalizeFilterValue(button.getAttribute("data-portfolio-stage-filter") ?? "all") === this.currentFilter;
      button.classList.toggle(this.options.activeFilterClass, isActive);
      button.setAttribute("aria-pressed", String(isActive));
    }

    const prevButton = this.root.querySelector<HTMLElement>(this.options.prevSelector);
    const nextButton = this.root.querySelector<HTMLElement>(this.options.nextSelector);
    const disablePaging = this.visibleIndexes.length <= 1;
    if (prevButton) prevButton.setAttribute("aria-disabled", String(disablePaging));
    if (nextButton) nextButton.setAttribute("aria-disabled", String(disablePaging));

    this.updateTextTargets(this.options.titleSelector, currentItem?.title ?? "");
    this.updateTextTargets(this.options.categorySelector, currentItem?.categoryLabel ?? "");
    this.updateTextTargets(this.options.summarySelector, currentItem?.summary ?? "");
    this.updateTextTargets(
      this.options.indexSelector,
      currentItem ? formatStageIndex(this.currentVisibleIndex + 1, this.visibleIndexes.length) : "00 / 00"
    );

    const details = this.root.querySelector<HTMLElement>(this.options.detailsSelector);
    const detailsToggle = this.root.querySelector<HTMLElement>(this.options.detailsToggleSelector);
    const canShowDetails = Boolean(currentItem?.summary);
    if (details) {
      details.hidden = !(this.detailsOpen && canShowDetails);
    }
    if (detailsToggle) {
      detailsToggle.setAttribute("aria-expanded", String(this.detailsOpen && canShowDetails));
      detailsToggle.setAttribute("aria-disabled", String(!canShowDetails));
    }
  }

  private getVisibleSlots(): Map<number, number> {
    const slotMap = new Map<number, number>();
    const total = this.visibleIndexes.length;
    if (total === 0) return slotMap;

    for (let visiblePosition = 0; visiblePosition < total; visiblePosition += 1) {
      const itemIndex = this.visibleIndexes[visiblePosition];
      if (typeof itemIndex !== "number") continue;
      const offset = getWrappedOffset(this.currentVisibleIndex, visiblePosition, total);
      if (Math.abs(offset) > 3) continue;
      slotMap.set(itemIndex, offset);
    }

    return slotMap;
  }

  private readRenderedSlots(): Map<number, number> {
    const slotMap = new Map<number, number>();

    for (let i = 0; i < this.items.length; i += 1) {
      const rawSlot = this.items[i].el.getAttribute("data-portfolio-stage-slot");
      if (rawSlot === null) continue;
      const slot = Number(rawSlot);
      if (!Number.isFinite(slot)) continue;
      slotMap.set(i, slot);
    }

    return slotMap;
  }

  private clearPendingWrapTransitions(): void {
    for (const [element, cancel] of this.pendingWrapTransitions) {
      cancel();
      element.removeAttribute("data-portfolio-stage-wrap-enter");
    }
    this.pendingWrapTransitions.clear();
  }

  private queueWrapEntry(element: HTMLElement, direction: PortfolioStageWrapDirection, slot: number): void {
    element.setAttribute("data-portfolio-stage-wrap-enter", direction);
    void element.offsetWidth;

    const cancel = scheduleNextFrame(() => {
      this.pendingWrapTransitions.delete(element);
      if (!this.root) return;
      if (element.getAttribute("data-portfolio-stage-slot") !== String(slot)) return;
      if (element.getAttribute("data-portfolio-stage-wrap-enter") !== direction) return;
      element.removeAttribute("data-portfolio-stage-wrap-enter");
    });

    this.pendingWrapTransitions.set(element, cancel);
  }

  private updateTextTargets(selector: string, value: string): void {
    if (!this.root) return;
    const targets = this.root.querySelectorAll<HTMLElement>(selector);
    for (const target of targets) {
      target.textContent = value;
    }
  }

  private getCurrentItem(): PortfolioStageItem | null {
    if (this.visibleIndexes.length === 0) return null;
    const itemIndex = this.visibleIndexes[this.currentVisibleIndex];
    return typeof itemIndex === "number" ? (this.items[itemIndex] ?? null) : null;
  }

  private resolveStage(root: HTMLElement): HTMLElement | null {
    return root.matches(this.options.stageSelector)
      ? root
      : root.querySelector<HTMLElement>(this.options.stageSelector);
  }

  private focusRoot(): void {
    if (this.root && typeof this.root.focus === "function") {
      this.root.focus();
    }
  }

  private resetSwipeState(): void {
    this.swipePointerId = null;
    this.swipeStartX = 0;
    this.swipeStartY = 0;
  }

  private handleSwipeDelta(deltaX: number, deltaY: number): void {
    this.resetSwipeState();
    if (Math.abs(deltaX) < PortfolioStageFeature.SWIPE_THRESHOLD_PX) return;
    if (Math.abs(deltaY) > PortfolioStageFeature.SWIPE_OFF_AXIS_THRESHOLD_PX) return;
    if (Math.abs(deltaY) > Math.abs(deltaX) * 0.7) return;

    if (deltaX < 0) {
      this.next();
    } else {
      this.prev();
    }
  }

  private findClickedVisiblePosition(event: MouseEvent): number | null {
    if (!this.stage || this.visibleIndexes.length === 0) return null;

    const directItem = this.findVisiblePositionFromTarget(event.target);
    if (directItem !== null && directItem !== this.currentVisibleIndex) {
      return directItem;
    }

    if (typeof event.clientX !== "number" || typeof event.clientY !== "number") {
      return directItem;
    }

    const stageRect = this.stage.getBoundingClientRect();
    const rootFontSize = resolveRootFontSize(this.stage);
    const centerX = stageRect.left + stageRect.width / 2;
    const centerY = stageRect.top + stageRect.height / 2;

    let bestVisiblePosition: number | null = directItem;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (let visiblePosition = 0; visiblePosition < this.visibleIndexes.length; visiblePosition += 1) {
      const itemIndex = this.visibleIndexes[visiblePosition];
      const item = this.items[itemIndex];
      if (!item) continue;

      const slot = Number(item.el.getAttribute("data-portfolio-stage-slot"));
      const layout = PortfolioStageFeature.SLOT_LAYOUT_REM[slot];
      if (!layout) continue;

      const projectedX = centerX + layout.x * rootFontSize;
      const projectedY = centerY + layout.y * rootFontSize;
      const distance = Math.hypot(event.clientX - projectedX, event.clientY - projectedY);

      if (distance < bestDistance) {
        bestDistance = distance;
        bestVisiblePosition = visiblePosition;
      }
    }

    return bestVisiblePosition;
  }

  private findVisiblePositionFromTarget(target: EventTarget | null): number | null {
    if (!(target instanceof HTMLElement)) return null;

    let node: HTMLElement | null = target;
    while (node && this.root && node !== this.root) {
      if (node.matches(this.options.itemSelector)) {
        const itemIndex = this.items.findIndex((item) => item.el === node);
        if (itemIndex === -1) return null;
        const visiblePosition = this.visibleIndexes.indexOf(itemIndex);
        return visiblePosition >= 0 ? visiblePosition : null;
      }
      node = node.parentElement;
    }

    return null;
  }

  private advanceVisibleIndexBy(delta: number): void {
    if (this.visibleIndexes.length <= 1 || delta === 0) return;
    this.currentVisibleIndex =
      (this.currentVisibleIndex + delta + this.visibleIndexes.length) % this.visibleIndexes.length;
    this.detailsOpen = false;
    this.render();
  }

  private playToVisibleIndex(targetVisibleIndex: number): void {
    this.cancelPlayback();
    if (this.visibleIndexes.length <= 1) return;

    const stepTowardTarget = () => {
      const total = this.visibleIndexes.length;
      if (total <= 1) {
        this.cancelPlayback();
        return;
      }

      const delta = getWrappedOffset(this.currentVisibleIndex, targetVisibleIndex, total);
      if (delta === 0) {
        this.cancelPlayback();
        return;
      }

      this.advanceVisibleIndexBy(delta > 0 ? 1 : -1);

      if (Math.abs(delta) <= 1) {
        this.cancelPlayback();
        return;
      }

      this.playTimer = setTimeout(stepTowardTarget, this.options.stepAnimationMs);
    };

    stepTowardTarget();
  }

  private cancelPlayback(): void {
    if (this.playTimer !== null) {
      clearTimeout(this.playTimer);
      this.playTimer = null;
    }
  }
}

function resolveRootFontSize(node: HTMLElement): number {
  const documentElement = node.ownerDocument?.documentElement;
  if (!documentElement || typeof getComputedStyle !== "function") {
    return 16;
  }

  const value = getComputedStyle(documentElement).fontSize;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 16;
}

function normalizeFilterValue(value: string): string {
  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : "all";
}

function formatStageIndex(current: number, total: number): string {
  const max = Math.max(total, 0);
  return `${String(current).padStart(2, "0")} / ${String(max).padStart(2, "0")}`;
}

function getWrappedOffset(from: number, to: number, total: number): number {
  if (total <= 0) return 0;
  let delta = to - from;
  if (delta > total / 2) {
    delta -= total;
  } else if (delta < -total / 2) {
    delta += total;
  }
  return delta;
}

function getSlotRange(slots: Map<number, number>): { min: number | null; max: number | null } {
  if (slots.size === 0) {
    return { min: null, max: null };
  }

  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;

  for (const slot of slots.values()) {
    min = Math.min(min, slot);
    max = Math.max(max, slot);
  }

  return {
    min: Number.isFinite(min) ? min : null,
    max: Number.isFinite(max) ? max : null,
  };
}

function getWrapEnterDirection(
  previousSlot: number | undefined,
  nextSlot: number,
  previousRange: { min: number | null; max: number | null },
  nextRange: { min: number | null; max: number | null },
): PortfolioStageWrapDirection | null {
  if (previousSlot === undefined || previousRange.min === null || previousRange.max === null) {
    return null;
  }
  if (nextRange.min === null || nextRange.max === null) {
    return null;
  }

  if (previousSlot === previousRange.min && previousSlot < 0 && nextSlot === nextRange.max && nextSlot > 0) {
    return "right";
  }

  if (previousSlot === previousRange.max && previousSlot > 0 && nextSlot === nextRange.min && nextSlot < 0) {
    return "left";
  }

  return null;
}

function shouldIgnoreKeydown(event: KeyboardEvent): boolean {
  if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) {
    return true;
  }

  const target = event.target;
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;

  const tagName = target.tagName;
  return tagName === "INPUT" || tagName === "TEXTAREA" || tagName === "SELECT";
}

function restoreAttribute(element: HTMLElement, name: string, value: string | null): void {
  if (value === null) {
    element.removeAttribute(name);
    return;
  }

  element.setAttribute(name, value);
}

function scheduleNextFrame(callback: () => void): () => void {
  if (typeof requestAnimationFrame === "function") {
    const handle = requestAnimationFrame(() => callback());
    return () => {
      if (typeof cancelAnimationFrame === "function") {
        cancelAnimationFrame(handle);
      }
    };
  }

  const handle = setTimeout(callback, 0);
  return () => clearTimeout(handle);
}

function releasePointerCapture(target: HTMLElement | null, pointerId: number): void {
  if (
    !target ||
    typeof target.hasPointerCapture !== "function" ||
    typeof target.releasePointerCapture !== "function" ||
    !target.hasPointerCapture(pointerId)
  ) {
    return;
  }

  try {
    target.releasePointerCapture(pointerId);
  } catch {
    // Pointer capture release should never break swipe behavior.
  }
}

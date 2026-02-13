export class AnimationPolicy {
    pausedReasons = new Set();
    set(reason, paused) {
        if (paused)
            this.pausedReasons.add(reason);
        else
            this.pausedReasons.delete(reason);
    }
    has(reason) {
        return this.pausedReasons.has(reason);
    }
    isPaused() {
        return this.pausedReasons.size > 0;
    }
    list() {
        return Array.from(this.pausedReasons);
    }
    clear() {
        this.pausedReasons.clear();
    }
}
//# sourceMappingURL=AnimationPolicy.js.map
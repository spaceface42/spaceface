import { clamp } from '../bin/math.js';

import type {
    ContainerDimensionsInterface,
    ImageMotionInterface,
    ImageMotionStateInterface
} from './types.js';

const DAMPING = 0.85;
const MIN_VELOCITY = 0.1;
const MAX_SPEED = 2.5;
const VELOCITY_JITTER = 0.02;

export class DriftMotion implements ImageMotionInterface {
    initialize(state: ImageMotionStateInterface, dims: ContainerDimensionsInterface): void {
        state.x = Math.random() * Math.max(0, dims.width - state.size.width);
        state.y = Math.random() * Math.max(0, dims.height - state.size.height);
        state.vx = (Math.random() - 0.5) * 3;
        state.vy = (Math.random() - 0.5) * 3;
    }

    step(state: ImageMotionStateInterface, dims: ContainerDimensionsInterface): void {
        this.handleCollisions(state, dims);
        this.applyVelocityJitter(state);
    }

    reset(state: ImageMotionStateInterface, dims: ContainerDimensionsInterface): void {
        state.x = Math.random() * Math.max(0, dims.width - state.size.width);
        state.y = Math.random() * Math.max(0, dims.height - state.size.height);
    }

    private handleCollisions(state: ImageMotionStateInterface, dims: ContainerDimensionsInterface): void {
        if (state.x <= 0 || state.x + state.size.width >= dims.width) {
            state.vx = -state.vx * DAMPING;
            const signX = state.vx >= 0 ? 1 : -1;
            state.vx = Math.abs(state.vx) < MIN_VELOCITY ? signX * MIN_VELOCITY : state.vx;
            state.x = clamp(state.x, 0, Math.max(0, dims.width - state.size.width));
        }

        if (state.y <= 0 || state.y + state.size.height >= dims.height) {
            state.vy = -state.vy * DAMPING;
            const signY = state.vy >= 0 ? 1 : -1;
            state.vy = Math.abs(state.vy) < MIN_VELOCITY ? signY * MIN_VELOCITY : state.vy;
            state.y = clamp(state.y, 0, Math.max(0, dims.height - state.size.height));
        }
    }

    private applyVelocityJitter(state: ImageMotionStateInterface): void {
        state.vx += (Math.random() - 0.5) * VELOCITY_JITTER;
        state.vy += (Math.random() - 0.5) * VELOCITY_JITTER;

        const speedSquared = state.vx ** 2 + state.vy ** 2;
        if (speedSquared > MAX_SPEED ** 2) {
            const scale = MAX_SPEED / Math.sqrt(speedSquared);
            state.vx *= scale;
            state.vy *= scale;
        }
    }
}

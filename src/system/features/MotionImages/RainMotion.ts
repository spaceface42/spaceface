import type {
    ContainerDimensionsInterface,
    ImageMotionInterface,
    ImageMotionStateInterface
} from './types.js';

export class RainMotion implements ImageMotionInterface {
    initialize(state: ImageMotionStateInterface, dims: ContainerDimensionsInterface): void {
        state.x = Math.random() * Math.max(0, dims.width - state.size.width);
        state.y = -Math.random() * Math.max(state.size.height, dims.height);
        state.vx = (Math.random() - 0.5) * 0.4;
        state.vy = 1 + Math.random() * 1.8;
    }

    step(state: ImageMotionStateInterface, dims: ContainerDimensionsInterface): void {
        if (state.x < -state.size.width) {
            state.x = Math.max(0, dims.width - state.size.width);
        } else if (state.x > dims.width) {
            state.x = -state.size.width;
        }

        if (state.y > dims.height) {
            state.x = Math.random() * Math.max(0, dims.width - state.size.width);
            state.y = -state.size.height - Math.random() * Math.max(state.size.height, dims.height * 0.25);
            state.vx = (Math.random() - 0.5) * 0.4;
            state.vy = 1 + Math.random() * 1.8;
        }
    }

    reset(state: ImageMotionStateInterface, dims: ContainerDimensionsInterface): void {
        state.x = Math.random() * Math.max(0, dims.width - state.size.width);
        state.y = -Math.random() * Math.max(state.size.height, dims.height);
        state.vx = (Math.random() - 0.5) * 0.4;
        state.vy = 1 + Math.random() * 1.8;
    }
}

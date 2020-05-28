import { Gif, GifFrame } from '../util/loadGif';
import { Vec, vecZero } from './vec';

export enum FrameSampleMode {
    Repeat,
    Stretch
}

export class LayerId {

    public readonly type = 'id';

    constructor(
        public readonly value: number,
    ) { }

    public equals(other: LayerId): boolean {
        return this.value === other.value;
    }
}

export class LayerIndex {

    public readonly type = 'index';

    public constructor(
        public readonly index: number,
    ) { }
}

export class Layer {

    public static create(
        id: LayerId,
        gif: Gif | undefined,
    ): Layer {
        return new Layer(id, gif, vecZero, { x: 1, y: 1 }, FrameSampleMode.Repeat, false, undefined);
    }

    readonly #mask: HTMLCanvasElement;
    readonly #maskCtx: CanvasRenderingContext2D;

    #maskVersion = 0;

    constructor(
        public readonly id: LayerId,
        public readonly gif: Gif | undefined,
        public readonly position: Vec,
        public scale: Vec,
        public readonly frameSampleMode: FrameSampleMode,
        public readonly hidden: boolean,
        mask: HTMLCanvasElement | undefined,
    ) {
        this.#mask = mask ?? document.createElement('canvas');

        const width = gif ? gif.width : 1;
        const height = gif ? gif.height : 1;

        if (this.#mask.width !== width || this.#mask.height !== height) {
            this.#mask.width = width;
            this.#mask.height = height;
        }
        this.#maskCtx = this.#mask.getContext('2d')!;
    }

    public toJson() {
        return {
            ...this,
            gif: this.gif ? {
                ...this.gif,
                frames: this.gif.frames.map(frame => ({
                    info: frame.info
                }))
            } : undefined,
        };
    }

    public get mask() { return this.#mask; }
    public get maskCtx() { return this.#maskCtx; }
    public get maskVersion() { return this.#maskVersion; }

    public get width(): number { return this.gif?.width ?? 1; }
    public get height(): number { return this.gif?.height ?? 1; }

    public setGif(gif: Gif): Layer {
        return new Layer(this.id, gif, vecZero, { x: 1, y: 1 }, this.frameSampleMode, this.hidden, undefined);
    }

    public move(delta: Vec): Layer {
        const newPosition = {
            x: this.position.x + delta.x,
            y: this.position.y + delta.y,
        };
        return this.setPosition(newPosition);
    }

    public setPosition(pos: Vec): Layer {
        return new Layer(this.id, this.gif, pos, this.scale, this.frameSampleMode, this.hidden, this.#mask);
    }

    public setScale(scale: Vec): Layer {
        return new Layer(this.id, this.gif, this.position, scale, this.frameSampleMode, this.hidden, this.#mask);
    }

    public setHidden(hidden: boolean): Layer {
        return new Layer(this.id, this.gif, this.position, this.scale, this.frameSampleMode, hidden, this.#mask);
    }

    public getFrame(index: number, total: number): GifFrame | undefined {
        if (!this.gif) {
            return undefined;
        }

        switch (this.frameSampleMode) {
            case FrameSampleMode.Stretch:
                return this.gif.frames[Math.floor(index / total * this.gif.frames.length)];

            case FrameSampleMode.Repeat:
            default:
                return this.gif.frames[index % this.gif.frames.length];
        }
    }

    public touchMask() {
        this.#maskVersion++;
    }
}
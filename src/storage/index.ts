import * as localforage from 'localforage';
import { Gif, GifFrame } from '../load_gif';
import { Document } from '../model/document';
import { EditorState } from '../model/editorState';
import { Layer, LayerId } from '../model/layer';

const debug = true;

const version = 0;

const versionKey = 'version';
const stateKey = 'state';
const gifKey = (layer: Layer) => `gif-${layer.id.value}`;
const maskKey = (layer: Layer) => `mask-${layer.id.value}`;

export class Storage {

    private _pendingStore?: EditorState;
    private readonly _storeDelay = 1000;

    private _storedGifs = new Map<number, Gif>();
    private _storedMasks = new Map<number, number>();
    private _storedState: EditorState | undefined;

    public triggerStore(state: EditorState): void {
        if (!this._pendingStore) {
            setTimeout(() => {
                if (this._pendingStore) {
                    this.store(this._pendingStore);
                }
                this._pendingStore = undefined;
            }, this._storeDelay);
        }
        this._pendingStore = state;
    }

    private async store(state: EditorState): Promise<void> {
        if (!this.needsToBeStored(state)) {
            if (debug) {
                console.log('Skipped storing');
            }
            return;
        }

        if (debug) {
            console.log('Storing');
        }

        const keysToDelete: string[] = [];
        await localforage.iterate((_, key) => {
            if (key.startsWith('gif-') || key.startsWith('mask-')) {
                const layerId = +(key.match(/-(\d)/)?.[1] as any);
                if (!state.doc.layers.some(layer => layer.id.value === layerId)) {
                    keysToDelete.push(key);
                }
            }
        });

        await Promise.all(keysToDelete.map(key => localforage.removeItem(key)));

        await localforage.setItem(versionKey, version);
        await localforage.setItem(stateKey, { ...state, doc: state.doc.toJson() });

        for (const layer of state.doc.layers) {
            if (layer.gif) {
                if (this._storedGifs.get(layer.id.value) !== layer.gif) {
                    const data = (layer.gif?.frames || []).map(x => x.canvas.toDataURL('image/png'));
                    this._storedGifs.set(layer.id.value, layer.gif);
                    if (debug) {
                        console.log(`Storing Gif ${layer.id.value}`);
                    }
                    await localforage.setItem(gifKey(layer), data);
                }
            } else {
                this._storedGifs.delete(layer.id.value);
                await localforage.removeItem(gifKey(layer));
            }

            if (this._storedMasks.get(layer.id.value) !== layer.maskVersion) {
                const mask = layer.mask.toDataURL('image/png');
                this._storedMasks.set(layer.id.value, layer.maskVersion);
                if (debug) {
                    console.log(`Storing Mask ${layer.id.value}`);
                }
                await localforage.setItem(maskKey(layer), mask);
            }
        }
    }

    public async load(): Promise<EditorState | undefined> {
        const storedVersion = await localforage.getItem<number>(versionKey);
        if (storedVersion !== version) {
            return;
        }

        const serializedState = await localforage.getItem<EditorState | undefined>(stateKey);
        if (!serializedState) {
            return;
        }

        const layers = await Promise.all(serializedState.doc.layers.map(async serializedLayer => {
            const serializedGif = serializedLayer.gif;
            let frames: GifFrame[] = [];
            if (serializedGif) {
                const frameData = await localforage.getItem<string[]>(gifKey(serializedLayer));
                const zipped = serializedLayer.gif!.frames.map((x, i) => [x, frameData[i]] as const);
                frames = await Promise.all(zipped.map(async ([serializedFrame, currentFrameData]) => {
                    const canvas = document.createElement('canvas');
                    await drawDataUriToCanvas(canvas, serializedGif, currentFrameData);
                    const frame: GifFrame = { info: serializedFrame.info, canvas };
                    return frame;
                }));
            }

            const gif: Gif | undefined = serializedGif ? { ...serializedGif, frames } : undefined;
            const layer = new Layer(
                new LayerId(serializedLayer.id.value),
                gif,
                serializedLayer.position,
                serializedLayer.scale ?? { x: 1, y: 1 },
                serializedLayer.frameSampleMode,
                undefined);

            if (gif) {
                this._storedGifs.set(serializedLayer.id.value, gif);
                const maskData = await localforage.getItem<string>(maskKey(serializedLayer));
                await drawDataUriToCanvas(layer.mask, gif, maskData);
                this._storedMasks.set(serializedLayer.id.value, 0);
            }
            return layer;
        }));

        const editorState = new EditorState(
            Document.fromLayers(layers),
            serializedState.drawSettings,
            serializedState.playback,
            serializedState.activeLayerId ? new LayerId(serializedState.activeLayerId.value) : undefined);

        this._storedState = editorState;
        return editorState;
    }

    public reset(): Promise<void> {
        return localforage.clear();
    }

    private needsToBeStored(state: EditorState): boolean {
        if (!this._storedState) {
            return true;
        }

        if (this._storedState !== state) {
            // TODO: exclude playback settings
            return true;
        }

        for (const layer of state.doc.layers) {
            if (this._storedGifs.get(layer.id.value) !== layer.gif) {
                return true;
            }

            if (this._storedMasks.get(layer.id.value) !== layer.maskVersion) {
                return true;
            }
        }

        return false;
    }
}

async function drawDataUriToCanvas(canvas: HTMLCanvasElement, gif: Gif, currentFrameData: string) {
    canvas.width = gif.width;
    canvas.height = gif.height;

    const ctx = canvas.getContext('2d')!;

    const img = new Image();
    const loadPromise = new Promise((resolve, reject) => {
        img.onload = () => {
            ctx.drawImage(img, 0, 0);
            resolve();
        };
        img.onerror = (e) => {
            console.error(e);
            reject(e);
        };
    });
    img.src = currentFrameData;
    await loadPromise;
    return canvas;
}

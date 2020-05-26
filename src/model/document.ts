import { Gif, GifFrame } from '../load_gif';
import { Layer, LayerId } from './layer';
import { Vec } from './vec';

export class Document {

    public static readonly empty = new Document([], 0);

    public static fromLayers(layers: Layer[]): Document {
        let maxLayerId = 0;
        for (const layer of layers) {
            maxLayerId = Math.max(maxLayerId, layer.id.value);
        }
        return new Document(layers, maxLayerId + 1);
    }

    private constructor(
        public readonly layers: readonly Layer[],
        private readonly layerIdCounter: number,
    ) { }

    public toJson() {
        return {
            ...this,
            layers: this.layers.map(layer => layer.toJson()),
        };
    }

    public get baseLayer(): Layer | undefined {
        return this.layers[0];
    }

    public get width(): number {
        return this.baseLayer?.gif?.width ?? 0;
    }

    public get height(): number {
        return this.baseLayer?.gif?.height ?? 0;
    }

    public get frameCount(): number {
        return this.baseLayer?.gif?.frames.length ?? 0;
    }

    public getFrameRelativeToBaseLayer(targetLayer: LayerId, index: number): GifFrame | undefined {
        const layer = this.getLayer(targetLayer);
        if (!layer || !layer.gif) {
            return undefined;
        }

        return layer.getFrame(index, this.frameCount);
    }

    public addNewLayer(gif: Gif | undefined): { document: Document, layer: Layer } {
        const { state, id } = this.nextLayerId();
        const newLayer = Layer.create(id, gif);
        return {
            document: state.updateLayers([...this.layers, newLayer]),
            layer: newLayer,
        };
    }

    public deleteLayer(target: LayerId): Document {
        const layers = this.layers.filter(x => !x.id.equals(target));
        return this.updateLayers(layers);
    }

    public reorderLayer(target: LayerId, newIndex: number): Document {
        const targetLayerIndex = this.layers.findIndex(x => x.id.equals(target));
        if (targetLayerIndex < 0 || targetLayerIndex === newIndex) {
            return this;
        }
        const targetLayer = this.layers[targetLayerIndex];

        const newLayers: Layer[] = [];
        for (let i = 0; i < this.layers.length; ++i) {
            const layer = this.layers[i];
            if (layer.id.equals(targetLayer.id)) {
                continue;
            }

            if (i === newIndex) {
                if (newIndex < targetLayerIndex) {
                    newLayers.push(targetLayer, layer);
                } else {
                    newLayers.push(layer, targetLayer);
                }
            } else {
                newLayers.push(layer);
            }
        }
        return this.updateLayers(newLayers);
    }

    public setGif(layerId: LayerId, gif: Gif): Document {
        return this.updateLayer(layerId, layer => layer.setGif(gif));
    }

    public moveLayer(layerId: LayerId, delta: Vec): Document {
        return this.updateLayer(layerId, layer => layer.move(delta));
    }

    public getLayer(id: LayerId): Layer | undefined {
        return this.layers.find(x => x.id.equals(id));
    }

    private updateLayers(layers: Layer[]): Document {
        return new Document(layers, this.layerIdCounter);
    }

    private nextLayerId(): { id: LayerId, state: Document } {
        const id = new LayerId(this.layerIdCounter);
        const state = new Document(this.layers, this.layerIdCounter + 1);
        return { state, id };
    }

    public updateLayer(layerId: LayerId, f: (layer: Layer) => Layer): Document {
        const index = this.layers.findIndex(x => x.id.equals(layerId));
        if (index < 0) {
            return this;
        }

        const newLayers = [...this.layers];
        newLayers.splice(index, 1, f(this.layers[index]));
        return new Document(newLayers, this.layerIdCounter);
    }
}
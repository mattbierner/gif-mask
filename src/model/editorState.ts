import { GifFrame } from '../util/loadGif';
import { Document } from './document';
import { DrawingSettings, DrawingToolType } from './drawing';
import { Layer, LayerId } from './layer';


export enum RenderMode {
    Normal,
    ActiveMask,
}

export interface PlaybackSettings {
    readonly renderMode: RenderMode;
    readonly zoom: number;
    readonly currentFrameIndex: number;
    readonly playing: boolean;
}

export class EditorState {

    public static readonly empty = new EditorState(
        Document.empty,
        {
            tool: DrawingToolType.Brush,
            strokeSize: 40,
        },
        {
            renderMode: RenderMode.Normal,
            zoom: 1,
            currentFrameIndex: 0,
            playing: false
        },
        undefined
    );

    public constructor(
        public readonly doc: Document,
        public readonly drawSettings: DrawingSettings,
        public readonly playback: PlaybackSettings,
        public readonly activeLayerId: LayerId | undefined,
    ) { }

    public get currentFrame(): GifFrame | undefined {
        return this.doc.baseLayer?.gif?.frames[this.playback.currentFrameIndex];
    }

    public get activeLayer(): Layer | undefined {
        return this.activeLayerId && this.doc.getLayer(this.activeLayerId);
    }

    public updateDocument(doc: Document): EditorState {
        return new EditorState(doc, this.drawSettings, this.playback, this.activeLayerId);
    }

    public updateActiveLayer(layerId: LayerId): EditorState {
        return new EditorState(this.doc, this.drawSettings, this.playback, layerId);
    }

    public updatePlayback(settings: PlaybackSettings) {
        return new EditorState(this.doc, this.drawSettings, settings, this.activeLayerId);
    }

    public setPlaying(playing: boolean): EditorState {
        if (playing === this.playback.playing) {
            return this;
        }
        return this.updatePlayback({ ...this.playback, playing: playing });
    }

    public setActiveFrame(index: number): EditorState {
        const frame = index % this.doc.frameCount;
        return this.updatePlayback({
            ...this.playback,
            currentFrameIndex: frame < 0 ? this.doc.frameCount + frame : frame,
        });
    }
}

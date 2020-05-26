import { Gif } from '../load_gif';
import { Document } from '../model/document';
import { DrawingSettings } from '../model/drawing';
import { EditorState } from '../model/editorState';
import { LayerId, LayerIndex } from '../model/layer';

export enum ActionType {
    Loaded,
    UpdateDoc,

    AddLayer,
    DeleteLayer,
    SelectLayer,
    MoveLayer,
    SetLayerGif,

    UpdateDrawing,
    ToggleMaskRendering,
    ChangeZoom,

    SetPlaying,
    SetActiveFrame,
    IncrementFrame,
}

export class Loaded {
    public readonly type = ActionType.Loaded;

    constructor(
        public readonly state: EditorState,
    ) { }
}

export class UpdateDoc {
    public readonly type = ActionType.UpdateDoc;

    constructor(
        public readonly doc: Document,
    ) { }
}

export class AddLayer {
    public readonly type = ActionType.AddLayer;

    constructor(
        public readonly gif: Gif | undefined
    ) { }
}

export class DeleteLayer {
    public readonly type = ActionType.DeleteLayer;

    constructor(
        public readonly target: LayerId,
    ) { }
}

export class SelectLayer {
    public readonly type = ActionType.SelectLayer;

    constructor(
        public readonly target: LayerId | LayerIndex,
    ) { }
}

export class MoveLayer {
    public readonly type = ActionType.MoveLayer;

    constructor(
        public readonly target: LayerId,
        public readonly newIndex: number,
    ) { }
}

export class SetLayerGif {
    public readonly type = ActionType.SetLayerGif;

    constructor(
        public readonly target: LayerId,
        public readonly gif: Gif,
    ) { }
}

export class UpdateDrawing {
    public readonly type = ActionType.UpdateDrawing;

    constructor(
        public readonly drawing: DrawingSettings,
    ) { }
}

export class ToggleMaskRendering {
    public readonly type = ActionType.ToggleMaskRendering;

    constructor(
        public readonly target: LayerId,
    ) { }
}

export class ChangeZoom {
    public readonly type = ActionType.ChangeZoom;

    constructor(
        public readonly value: number,
    ) { }
}

export class SetPlaying {
    public readonly type = ActionType.SetPlaying;

    constructor(
        public readonly playing: boolean
    ) { }
}

export class SetActiveFrame {
    public readonly type = ActionType.SetActiveFrame;

    constructor(
        public readonly index: number
    ) { }
}

export class IncrementFrame {
    public readonly type = ActionType.IncrementFrame;

    constructor(
        public readonly by: number
    ) { }
}


export type Actions =
    | Loaded
    | UpdateDoc
    | AddLayer
    | DeleteLayer
    | SelectLayer
    | MoveLayer
    | SetLayerGif
    | UpdateDrawing
    | ToggleMaskRendering
    | ChangeZoom
    | SetPlaying
    | SetActiveFrame
    | IncrementFrame
    ;

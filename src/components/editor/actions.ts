import { DrawingToolType, QuickMaskType } from '../../model/drawing';
import { LayerId } from '../../model/layer';
import { Vec } from '../../model/vec';

export enum EditorActionType {
    SetDrawTool,
    IncrementStroke,
    SetStroke,

    QuickMask,

    SetLayerPosition,
    SetLayerScale,
}

export class SetDrawTool {
    public readonly type = EditorActionType.SetDrawTool;

    constructor(
        public readonly tool: DrawingToolType,
    ) { }
}

export class QuickMask {
    public readonly type = EditorActionType.QuickMask;

    constructor(
        public readonly mask: QuickMaskType,
    ) { }
}

export class IncrementStroke {
    public readonly type = EditorActionType.IncrementStroke;

    constructor(
        public readonly by: number
    ) { }
}

export class SetStroke {
    public readonly type = EditorActionType.SetStroke;

    constructor(
        public readonly stroke: number
    ) { }
}

export class SetLayerPosition {
    public readonly type = EditorActionType.SetLayerPosition;

    constructor(
        public readonly layer: LayerId,
        public readonly position: Vec,
    ) { }
}

export class SetLayerScale {
    public readonly type = EditorActionType.SetLayerScale;

    constructor(
        public readonly layer: LayerId,
        public readonly scale: Vec,
    ) { }
}

export type EditorAction =
    | SetDrawTool
    | IncrementStroke
    | SetStroke
    | QuickMask
    | SetLayerPosition
    | SetLayerScale
    ;
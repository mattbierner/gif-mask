export enum DrawingToolType {
    Brush,
    Erase,
    Line,
    Move,
}

export interface DrawingTool {
    readonly type: DrawingToolType;
    readonly title: string;
    readonly icon: string;
    readonly key: string;
}

export interface DrawingSettings {
    readonly tool: DrawingToolType;
    readonly strokeSize: number;
}

export class Tools {
    static readonly Brush: DrawingTool = {
        type: DrawingToolType.Brush,
        title: "Brush",
        icon: '/images/icons/brush.svg',
        key: 'b',
    };

    static readonly Erase: DrawingTool = {
        type: DrawingToolType.Erase,
        title: "Erase",
        icon: '/images/icons/eraser.svg',
        key: 'e',
    };

    static readonly Line: DrawingTool = {
        type: DrawingToolType.Line,
        title: "Line",
        icon: '/images/icons/ruler.svg',
        key: 'g',
    };

    static readonly Move: DrawingTool = {
        type: DrawingToolType.Move,
        title: "Move",
        icon: '/images/icons/move.svg',
        key: 'v',
    };
}

export enum QuickMaskType {
    RevealAll,
    HideAll,
    ShowRight,
    ShowLeft,
    ShowBottom,
    ShowTop
}

export interface QuickMask {
    readonly type: QuickMaskType;
    readonly title: string;
}

export const quickMasks = new Map<QuickMaskType, QuickMask>([
    [QuickMaskType.RevealAll, { type: QuickMaskType.RevealAll, title: "Reveal All" }],
    [QuickMaskType.HideAll, { type: QuickMaskType.HideAll, title: "Hide All" }],
    [QuickMaskType.ShowRight, { type: QuickMaskType.ShowRight, title: "Show Right" }],
    [QuickMaskType.ShowLeft, { type: QuickMaskType.ShowLeft, title: "Show Left" }],
    [QuickMaskType.ShowBottom, { type: QuickMaskType.ShowBottom, title: "Show Bottom" }],
    [QuickMaskType.ShowTop, { type: QuickMaskType.ShowTop, title: "Show Top" }],
]);
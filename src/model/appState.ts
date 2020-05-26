import { EditorState } from './editorState';

export enum AppStage {
    Loading,
    Ready
}

export const Loading = { type: AppStage.Loading } as const;

export class Ready {
    public readonly type = AppStage.Ready;
    public constructor(
        public readonly editorState: EditorState,
    ) { }
}

export type AppState = typeof Loading | Ready;
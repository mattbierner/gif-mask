import { AppStage, AppState, Ready } from '../model/appState';
import { EditorState, RenderMode } from '../model/editorState';
import * as actions from './actions';

function editorStateReducer(state: EditorState, action: actions.Actions): EditorState {
    switch (action.type) {
        case actions.ActionType.UpdateDoc:
            {
                return state.updateDocument(action.doc);
            }
        case actions.ActionType.AddLayer:
            {
                const { document, layer } = state.doc.addNewLayer(action.gif);
                return state
                    .updateDocument(document)
                    .updateActiveLayer(layer.id);
            }
        case actions.ActionType.DeleteLayer:
            {
                return state.updateDocument(state.doc.deleteLayer(action.target));
            }
        case actions.ActionType.SelectLayer:
            {
                const target = action.target.type === 'id'
                    ? action.target
                    : (state.doc.layers[action.target.index]?.id ?? state.activeLayerId);
                return state.updateActiveLayer(target);
            }
        case actions.ActionType.MoveLayer:
            {
                return state.updateDocument(state.doc.reorderLayer(action.target, action.newIndex));
            }
        case actions.ActionType.SetLayerGif:
            {
                return state.updateDocument(state.doc.setGif(action.target, action.gif));
            }
        case actions.ActionType.UpdateDrawing:
            {
                return new EditorState(
                    state.doc,
                    action.drawing,
                    state.playback,
                    state.activeLayerId
                );
            }
        case actions.ActionType.ToggleMaskRendering:
            {
                if (state.activeLayerId?.equals(action.target)) {
                    return state.updatePlayback({
                        ...state.playback,
                        renderMode: state.playback.renderMode === RenderMode.Normal ? RenderMode.ActiveMask : RenderMode.Normal,
                    });
                } else {
                    return state
                        .updateActiveLayer(action.target)
                        .updatePlayback({
                            ...state.playback,
                            renderMode: RenderMode.ActiveMask,
                        });
                }
            }
        case actions.ActionType.ToggleLayerVisibility:
            {
                return state.updateDocument(state.doc.updateLayer(action.target, layer => layer.setHidden(!layer.hidden)));
            }
        case actions.ActionType.ChangeZoom:
            {
                return state.updatePlayback({
                    ...state.playback,
                    zoom: action.value,
                });
            }
        case actions.ActionType.SetPlaying:
            {
                return state.setPlaying(action.playing);
            }
        case actions.ActionType.SetActiveFrame:
            {
                return state.setActiveFrame(action.index);
            }
        case actions.ActionType.IncrementFrame:
            {
                return state.setActiveFrame(state.playback.currentFrameIndex + action.by);
            }
        default:
            {
                throw new Error('Unknown action');
            }
    }
}

export function reducer(state: AppState, action: actions.Actions): AppState {
    switch (action.type) {
        case actions.ActionType.Loaded:
            {
                return new Ready(action.state);
            }

        default:
            if (state.type === AppStage.Ready) {
                return new Ready(editorStateReducer(state.editorState, action));
            }
            throw new Error('Bad state');
    }
}
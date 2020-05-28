import * as React from 'react';
import { AppStage, AppState } from '../../model/appState';
import { DrawingToolType, Tools } from '../../model/drawing';
import { EditorState } from '../../model/editorState';
import { Layer } from '../../model/layer';
import { clamp } from '../../util/math';
import * as actions from '../../views/main/actions';
import * as editorActions from './actions';
import { EditorBottomBar } from './bottomBar';
import { EditorArea } from './editorArea';
import { SideBar } from './sidebar';

export function GifEditor(props: {
    dispatch: React.Dispatch<actions.Actions>,
    state: AppState,
    didTouchLayer: () => void,
}) {
    const editorRef = React.useRef<EditorArea>();

    const dispatchEditor = React.useCallback((action: editorActions.EditorAction): void => {
        if (props.state.type !== AppStage.Ready) {
            return;
        }

        switch (action.type) {
            case editorActions.EditorActionType.SetDrawTool:
                {
                    return props.dispatch(new actions.UpdateDrawing({
                        ...props.state.editorState.drawSettings,
                        tool: action.tool,
                    }));
                }
            case editorActions.EditorActionType.IncrementStroke:
                {
                    return dispatchEditor(new editorActions.SetStroke(props.state.editorState.drawSettings.strokeSize + action.by));
                }
            case editorActions.EditorActionType.SetStroke:
                {
                    return props.dispatch(new actions.UpdateDrawing({
                        ...props.state.editorState.drawSettings,
                        strokeSize: clamp(action.stroke, 1, 500)
                    }));
                }
            case editorActions.EditorActionType.QuickMask:
                {
                    editorRef.current?.quickMask(action.mask);
                    return;
                }
            case editorActions.EditorActionType.SetLayerPosition:
                {
                    const doc = props.state.editorState.doc;
                    return props.dispatch(new actions.UpdateDoc(
                        doc.updateLayer(action.layer, (layer: Layer) =>
                            layer.setPosition(action.position))));
                }
            case editorActions.EditorActionType.SetLayerScale:
                {
                    const doc = props.state.editorState.doc;
                    return props.dispatch(new actions.UpdateDoc(
                        doc.updateLayer(action.layer, (layer: Layer) =>
                            layer.setScale(action.scale))));
                }
            default:
                {
                    throw new Error(`Unknown editor action ${action}`);
                }
        }
    }, [props.state, props.dispatch]);

    React.useEffect(() => {
        const listerner = (e: KeyboardEvent) => {
            if (props.state.type !== AppStage.Ready) {
                return;
            }

            switch (e.key.toLowerCase()) {
                case '=': return dispatchEditor(new editorActions.IncrementStroke(1));
                case '-': return dispatchEditor(new editorActions.IncrementStroke(-1));
                case '+': return dispatchEditor(new editorActions.IncrementStroke(5));
                case '_': return dispatchEditor(new editorActions.IncrementStroke(-5));

                case 'x':
                    {
                        const tool = props.state.editorState.drawSettings.tool === DrawingToolType.Brush
                            ? DrawingToolType.Erase
                            : DrawingToolType.Brush;
                        return dispatchEditor(new editorActions.SetDrawTool(tool));
                    }

                case Tools.Brush.key: return dispatchEditor(new editorActions.SetDrawTool(DrawingToolType.Brush));
                case Tools.Erase.key: return dispatchEditor(new editorActions.SetDrawTool(DrawingToolType.Erase));
                case Tools.Line.key: return dispatchEditor(new editorActions.SetDrawTool(DrawingToolType.Line));
                case Tools.Move.key: return dispatchEditor(new editorActions.SetDrawTool(DrawingToolType.Move));

                case ' ': return props.dispatch(new actions.SetPlaying(!props.state.editorState.playback.playing));

                case 'arrowright': return props.dispatch(new actions.IncrementFrame(1));
                case 'arrowleft': return props.dispatch(new actions.IncrementFrame(-1));
            }
        };
        document.addEventListener('keydown', listerner);
        return () => {
            document.removeEventListener('keydown', listerner);
        };
    }, [props.state, props.dispatch]);

    const editorState = props.state.type === AppStage.Ready
        ? props.state.editorState
        : EditorState.empty;

    return (
        <div style={{
            maxWidth: '100%',
            flex: 1,
            display: 'grid',
            gridTemplateColumns: '120px 1fr',
        }}>
            <SideBar
                dispatch={props.dispatch}
                dispatchEditor={dispatchEditor}
                editorState={editorState} />

            <div style={{
                display: 'flex',
                flexDirection: 'column',
                maxWidth: '100%',
                overflow: 'hidden',
            }}>
                <EditorArea ref={editorRef as React.Ref<EditorArea>}
                    dispatch={props.dispatch}
                    editorState={editorState}
                    didTouchLayer={props.didTouchLayer} />

                <EditorBottomBar
                    dispatch={props.dispatch}
                    editorState={editorState} />
            </div>
        </div>
    );
}


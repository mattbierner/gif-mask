import * as React from 'react';
import { AppStage, AppState } from '../../model/appState';
import { DrawingToolType, QuickMaskType, Tools } from '../../model/drawing';
import { EditorState, RenderMode } from '../../model/editorState';
import { Layer } from '../../model/layer';
import { Vec, vecZero } from '../../model/vec';
import { clamp } from '../../util/math';
import * as actions from '../../views/actions';
import * as editorActions from './actions';
import { EditorBottomBar } from './bottomBar';
import { render } from './render';
import { SideBar } from './sidebar';
import ReactDOM = require('react-dom');

export function GifEditor(props: {
    dispatch: React.Dispatch<actions.Actions>,
    state: AppState,
    didTouchLayer: () => void,
}) {
    const editorRef = React.useRef<EditorArea>();

    const dispatchEditor = React.useCallback((action: editorActions.EditorAction) => {
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
                    return props.dispatch(new actions.UpdateDrawing({
                        ...props.state.editorState.drawSettings,
                        strokeSize: clamp(props.state.editorState.drawSettings.strokeSize + action.by, 1, 200)
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
                    state={props.state}
                    didTouchLayer={props.didTouchLayer} />

                <EditorBottomBar
                    dispatch={props.dispatch}
                    editorState={editorState} />
            </div>
        </div>
    );
}

class EditorArea extends React.Component<{
    dispatch: React.Dispatch<actions.Actions>,
    state: AppState,
    didTouchLayer: () => void,
}> {
    private _canvas?: HTMLCanvasElement;
    private _ctx?: CanvasRenderingContext2D;

    private _workingCanvas?: HTMLCanvasElement;
    private _workingCtx?: CanvasRenderingContext2D;

    private _layerMovingShift = vecZero;
    private _activeTool: DrawingToolType | undefined;

    componentDidMount() {
        const canvasArea = ReactDOM.findDOMNode(this) as HTMLElement;
        this._canvas = (canvasArea).getElementsByTagName('canvas')[0];
        this._ctx = this._canvas.getContext('2d') || undefined;

        this._workingCanvas = document.createElement('canvas');
        this._workingCtx = this._workingCanvas.getContext('2d')!;

        let isDrawing = false;
        let mouseDownPosition = vecZero;

        canvasArea.onmousedown = (e) => {
            if (this.props.state.type !== AppStage.Ready) {
                return;
            }

            const activeLayer = this.getActiveLayer();
            if (!activeLayer) {
                return;
            }

            const editorState = this.props.state.editorState;
            const zoom = this.props.state.editorState.playback.zoom;

            isDrawing = true;
            mouseDownPosition = this.getPositionInCanvas(e);
            this._layerMovingShift = vecZero;
            this._activeTool = editorState.drawSettings.tool;

            const relativePosition = this.getPositionInLayer(mouseDownPosition, activeLayer, zoom);

            const maskCtx = this.getActiveLayerMaskCtx()!;
            maskCtx.fillStyle = 'black';
            maskCtx.strokeStyle = 'black';
            maskCtx.lineJoin = maskCtx!.lineCap = 'round';
            maskCtx.lineWidth = editorState.drawSettings.strokeSize / activeLayer.scale.x;
            maskCtx.globalCompositeOperation = editorState.drawSettings.tool === DrawingToolType.Erase
                ? 'destination-out'
                : 'source-over';

            switch (editorState.drawSettings.tool) {
                case DrawingToolType.Brush:
                case DrawingToolType.Erase:
                    maskCtx.beginPath();
                    maskCtx.moveTo(relativePosition.x, relativePosition.y);
                    maskCtx.lineTo(relativePosition.x, relativePosition.y);
                    maskCtx.stroke();
                    this.onDidEditActiveLayer();
                    break;
            }
        };

        canvasArea.onmousemove = (e) => {
            if (this.props.state.type !== AppStage.Ready) {
                return;
            }

            if (!isDrawing) {
                return;
            }

            const activeLayer = this.getActiveLayer();
            if (!activeLayer) {
                return;
            }

            const maskCtx = this.getActiveLayerMaskCtx();
            if (!maskCtx) {
                return;
            }
            const zoom = this.props.state.editorState.playback.zoom;

            switch (this._activeTool) {
                case DrawingToolType.Brush:
                case DrawingToolType.Erase:
                    {
                        const { x, y } = this.getPositionInLayer(this.getPositionInCanvas(e), activeLayer, zoom);
                        maskCtx.lineTo(x, y);
                        maskCtx.stroke();
                        this.onDidEditActiveLayer();
                        break;
                    }
                case DrawingToolType.Line:
                    {
                        const mouseDownRelativePosition = this.getPositionInLayer(mouseDownPosition, activeLayer, zoom);
                        const { x, y } = this.getPositionInLayer(this.getPositionInCanvas(e), activeLayer, zoom);
                        const dx = mouseDownRelativePosition.x - x;
                        const dy = mouseDownRelativePosition.y - y;
                        const angle = Math.atan2(dy, dx);

                        maskCtx.clearRect(0, 0, 10000, 10000);

                        maskCtx.save();
                        maskCtx.translate(mouseDownRelativePosition.x, mouseDownRelativePosition.y);
                        maskCtx.rotate(angle);
                        maskCtx.fillRect(0, -1000, 1000, 2000);
                        maskCtx.restore();

                        maskCtx.save();
                        maskCtx.translate(mouseDownRelativePosition.x, mouseDownRelativePosition.y);
                        maskCtx.rotate(angle + Math.PI);
                        maskCtx.clearRect(0, -1000, 1000, 2000);
                        maskCtx.restore();
                        this.onDidEditActiveLayer();

                        break;
                    }
                case DrawingToolType.Move:
                    {
                        if (activeLayer !== this.props.state.editorState.doc.baseLayer) {
                            const { x, y } = this.getPositionInCanvas(e);
                            const dx = x - mouseDownPosition.x;
                            const dy = y - mouseDownPosition.y;
                            this._layerMovingShift = {
                                x: Math.round(dx / zoom),
                                y: Math.round(dy / zoom),
                            };
                            this.requestCanvasRender();
                        }
                        break;
                    }
            }
        };

        document.body.addEventListener('mouseup', e => {
            if (this.props.state.type !== AppStage.Ready) {
                return;
            }

            if (!isDrawing) {
                return;
            }

            isDrawing = false;
            this._layerMovingShift = vecZero;
            this._activeTool = undefined;

            const activeLayer = this.getActiveLayer();
            if (!activeLayer) {
                return;
            }

            const zoom = this.props.state.editorState.playback.zoom;
            const mouseDownRelativePosition = this.getPositionInLayer(mouseDownPosition, activeLayer, zoom);
            const maskCtx = this.getActiveLayerMaskCtx()!;

            switch (this.props.state.editorState.drawSettings.tool) {
                case DrawingToolType.Brush:
                case DrawingToolType.Erase:
                    {
                        maskCtx.closePath();
                        break;
                    }
                case DrawingToolType.Line:
                    {
                        const { x, y } = this.getPositionInLayer(this.getPositionInCanvas(e), activeLayer, zoom);
                        const dx = mouseDownRelativePosition.x - x;
                        const dy = mouseDownRelativePosition.y - y;
                        const angle = Math.atan2(dy, dx);

                        maskCtx.clearRect(0, 0, 10000, 10000);

                        maskCtx.save();
                        maskCtx.translate(mouseDownRelativePosition.x, mouseDownRelativePosition.y);
                        maskCtx.rotate(angle);
                        maskCtx.fillRect(0, -1000, 1000, 2000);
                        maskCtx.restore();

                        maskCtx.save();
                        maskCtx.translate(mouseDownRelativePosition.x, mouseDownRelativePosition.y);
                        maskCtx.rotate(angle + Math.PI);
                        maskCtx.clearRect(0, -1000, 1000, 2000);
                        maskCtx.restore();
                        break;
                    }
                case DrawingToolType.Move:
                    {
                        if (this.props.state.editorState.doc.baseLayer?.id.equals(activeLayer.id)) {
                            return;
                        }

                        const { x, y } = this.getPositionInCanvas(e);
                        const dx = (x - mouseDownPosition.x);
                        const dy = (y - mouseDownPosition.y);

                        return this.props.dispatch(new actions.UpdateDoc(this.props.state.editorState.doc.updateLayer(activeLayer.id, layer => layer.setPosition({
                            x: Math.round(layer.position.x + dx / zoom),
                            y: Math.round(layer.position.y + dy / zoom)
                        }))));
                    }
            }

            this.onDidEditActiveLayer();
        });
    }

    render() {
        this.requestCanvasRender();

        const editorState = this.props.state.type === AppStage.Ready ? this.props.state.editorState : EditorState.empty;
        const canvasWidth = Math.ceil(editorState.doc.width * editorState.playback.zoom);
        const canvasHeight = Math.ceil(editorState.doc.height * editorState.playback.zoom);

        return (
            <div style={{
                display: 'flex',
                flex: 1,
                overflow: 'scroll',
                userSelect: 'none',
                border: '10px solid transparent',
            }}>
                <canvas
                    width={canvasWidth}
                    height={canvasHeight}
                    style={{
                        display: 'block',
                        border: '1px solid lightgrey',
                        alignSelf: 'center',
                        margin: 'auto',
                        cursor: this.getCursor(),
                    }} />
            </div>
        );
    }

    private _renderCanvas() {
        if (this.props.state.type !== AppStage.Ready) {
            return;
        }

        if (!this._ctx || !this._workingCanvas || !this._workingCtx) {
            return;
        }

        const activeLayer = this.getActiveLayer();
        const zoom = this.props.state.editorState.playback.zoom;

        this._ctx.clearRect(0, 0, 10000, 10000);

        if (this.props.state.editorState.playback.renderMode === RenderMode.ActiveMask) {
            if (activeLayer && activeLayer.gif) {
                this._ctx.save();
                {
                    const x = (activeLayer.position.x + this._layerMovingShift.x) * zoom;
                    const y = (activeLayer.position.y + this._layerMovingShift.y) * zoom;
                    const layerWidth = activeLayer.gif.width * activeLayer.scale.x * zoom;
                    const layerHeight = activeLayer.gif.height * activeLayer.scale.y * zoom;

                    this._ctx.drawImage(activeLayer.mask, x, y, layerWidth, layerHeight);
                    this._ctx.globalCompositeOperation = 'source-out';
                    this._ctx.fillStyle = 'black';
                    this._ctx.fillRect(0, 0, 10000, 10000);

                    this._ctx.globalCompositeOperation = 'source-over';
                    this._ctx.strokeStyle = 'red';
                    this._ctx.strokeRect(x - 1, y - 1, layerWidth + 2, layerHeight + 2);
                }
                this._ctx.restore();
            }
        } else {
            let docToRender = this.props.state.editorState.doc;
            if (activeLayer && activeLayer !== docToRender.baseLayer) {
                docToRender = docToRender.moveLayer(activeLayer.id, this._layerMovingShift);
            }

            render(
                docToRender,
                this.props.state.editorState.playback.currentFrameIndex,
                zoom,
                this._ctx,
                {
                    showBordersFor: activeLayer && this._activeTool === DrawingToolType.Move ? [activeLayer.id] : []
                });
        }
    }

    public quickMask(mask: QuickMaskType) {
        const active = this.getActiveLayer();
        if (!active || !active.gif) {
            return;
        }

        switch (mask) {
            case QuickMaskType.RevealAll: return this.revealAll(active);
            case QuickMaskType.HideAll: return this.hideAll(active);
            case QuickMaskType.ShowRight: return this.showRight(active);
            case QuickMaskType.ShowLeft: return this.showLeft(active);
            case QuickMaskType.ShowBottom: return this.showBottom(active);
            case QuickMaskType.ShowTop: return this.showTop(active);
        }
    }

    private hideAll(layer: Layer): void {
        layer.maskCtx.clearRect(0, 0, 10000, 10000);
        this.onDidEditActiveLayer();
    }

    private revealAll(layer: Layer): void {
        layer.maskCtx.save();
        {
            layer.maskCtx.globalCompositeOperation = 'source-over';
            layer.maskCtx.fillStyle = 'black';
            layer.maskCtx.fillRect(0, 0, 10000, 10000);
        }
        layer.maskCtx.restore();
        this.onDidEditActiveLayer();
    }

    private showLeft(layer: Layer): void {
        this.revealAll(layer);
        layer.maskCtx.clearRect(layer.gif!.width / 2, 0, layer.gif!.width, layer.gif!.height);
        this.onDidEditActiveLayer();
    }

    private showRight(layer: Layer): void {
        this.revealAll(layer);
        layer.maskCtx.clearRect(0, 0, layer.gif!.width / 2, layer.gif!.height);
        this.onDidEditActiveLayer();
    }

    private showTop(layer: Layer): void {
        this.revealAll(layer);
        layer.maskCtx.clearRect(0, layer.gif!.height / 2, layer.gif!.width, layer.gif!.height / 2);
        this.onDidEditActiveLayer();
    }

    private showBottom(layer: Layer): void {
        this.revealAll(layer);
        layer.maskCtx.clearRect(0, 0, layer.gif!.width, layer.gif!.height / 2);
        this.onDidEditActiveLayer();
    }

    private onDidEditActiveLayer() {
        const activeLayer = this.getActiveLayer();
        if (activeLayer) {
            activeLayer?.touchMask();
            this.props.didTouchLayer();
        }
        this.requestCanvasRender();
    }

    private requestCanvasRender() {
        requestAnimationFrame(() => this._renderCanvas());
    }

    private getPositionInLayer(canvasPos: Vec, layer: Layer, zoom: number): Vec {
        if (!layer.gif) {
            return vecZero;
        }

        const x = (canvasPos.x / zoom) - (layer.position.x);
        const y = (canvasPos.y / zoom) - (layer.position.y);

        return {
            x: x / layer.scale.x,
            y: y / layer.scale.y,
        };
    }

    private getPositionInCanvas(e: MouseEvent): Vec {
        const rect = this._canvas!.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left),
            y: (e.clientY - rect.top),
        };
    }

    private getActiveLayerMaskCtx(): CanvasRenderingContext2D | undefined {
        const activeLayer = this.getActiveLayer();
        return activeLayer?.maskCtx || undefined;
    }

    private getActiveLayer(): Layer | undefined {
        if (this.props.state.type !== AppStage.Ready) {
            return;
        }

        const editorState = this.props.state.editorState;
        return editorState.doc.layers.find(x => editorState.activeLayerId?.equals(x.id));
    }

    private getCursor(): string {
        if (this.props.state.type !== AppStage.Ready) {
            return 'auto';
        }

        switch (this.props.state.editorState.drawSettings.tool) {
            case DrawingToolType.Move: return 'move';

            default: return 'auto';
        }
    }
}

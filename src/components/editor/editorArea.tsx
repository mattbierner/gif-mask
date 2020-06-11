import * as React from 'react';
import { DrawingToolType, QuickMaskType } from '../../model/drawing';
import { EditorState, RenderMode } from '../../model/editorState';
import { Layer } from '../../model/layer';
import { Vec, vecZero } from '../../model/vec';
import * as actions from '../../views/main/actions';
import { render, renderMask } from './render';
import ReactDOM = require('react-dom');

interface EventWithPosition {
    readonly clientX: number;
    readonly clientY: number;
}

/**
 * State of the currently drawing tool
 */
interface ActiveToolState {
    readonly tool: DrawingToolType;
    readonly mouseDownPosition: Vec;
    readonly layerMovingShift: Vec;
}

export class EditorArea extends React.Component<{
    dispatch: React.Dispatch<actions.Actions>,
    editorState: EditorState,
    didTouchLayer: () => void,
}> {
    private _canvas?: HTMLCanvasElement;
    private _ctx?: CanvasRenderingContext2D;

    // Scratch canvas and context used for drawing operations
    private _scratchCanvas?: HTMLCanvasElement;
    private _scratchCtx?: CanvasRenderingContext2D;

    private _activeTool?: ActiveToolState;

    componentDidMount() {
        const element = ReactDOM.findDOMNode(this) as HTMLElement;
        this._canvas = element.getElementsByTagName('canvas')[0];
        this._ctx = this._canvas.getContext('2d') || undefined;

        this._scratchCanvas = document.createElement('canvas');
        this._scratchCtx = this._scratchCanvas.getContext('2d')!;

        element.addEventListener('touchstart', this.onTouchStart, { passive: false });
        element.addEventListener('touchmove', this.onTouchMove, { passive: false });

        document.body.addEventListener('mouseup', this.onMouseUp);
        document.body.addEventListener('touchend', this.onTouchEnd);
    }

    componentWillUnmount() {
        const element = ReactDOM.findDOMNode(this) as HTMLElement;

        element.addEventListener('touchstart', this.onTouchStart);
        element.addEventListener('touchmove', this.onTouchMove);

        document.body.removeEventListener('mouseup', this.onMouseUp);
        document.body.removeEventListener('touchend', this.onTouchEnd);
    }

    render() {
        this.requestCanvasRender();

        const canvasWidth = Math.ceil(this.props.editorState.doc.width * this.props.editorState.playback.zoom);
        const canvasHeight = Math.ceil(this.props.editorState.doc.height * this.props.editorState.playback.zoom);

        return (
            <div
                onMouseDown={e => this.onMouseDown(e)}
                onMouseMove={e => this.onMouseMove(e)}
                style={{
                    gridArea: 'editor',
                    display: 'flex',
                    flex: 1,
                    overflow: 'scroll',
                    overflowY: 'scroll',
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

    private onMouseDown(e: EventWithPosition): void {
        const { activeLayer, drawSettings, playback } = this.props.editorState;
        if (!activeLayer) {
            return;
        }

        const mouseDownPosition = this.getPositionInCanvas(e);
        this._activeTool = {
            tool: drawSettings.tool,
            mouseDownPosition: mouseDownPosition,
            layerMovingShift: vecZero,
        };

        const maskCtx = activeLayer.maskCtx;
        maskCtx.fillStyle = 'black';
        maskCtx.strokeStyle = 'black';
        maskCtx.lineJoin = maskCtx.lineCap = 'round';
        maskCtx.lineWidth = drawSettings.strokeSize / activeLayer.scale.x;
        maskCtx.globalCompositeOperation = drawSettings.tool === DrawingToolType.Erase
            ? 'destination-out'
            : 'source-over';

        switch (drawSettings.tool) {
            case DrawingToolType.Brush:
            case DrawingToolType.Erase:
                {
                    const relativePosition = this.getPositionInLayer(mouseDownPosition, activeLayer, playback.zoom);
                    maskCtx.beginPath();
                    maskCtx.moveTo(relativePosition.x, relativePosition.y);
                    maskCtx.lineTo(relativePosition.x, relativePosition.y);
                    maskCtx.stroke();
                    this.onDidEditActiveLayer();
                    break;
                }
        }
    }

    private onMouseMove(e: EventWithPosition) {
        if (!this._activeTool) {
            return;
        }

        const { activeLayer } = this.props.editorState;
        if (!activeLayer) {
            return;
        }

        const maskCtx = activeLayer.maskCtx;
        const zoom = this.props.editorState.playback.zoom;

        switch (this._activeTool.tool) {
            case DrawingToolType.Brush:
            case DrawingToolType.Erase:
                {
                    const { x, y } = this.getPositionInLayer(this.getPositionInCanvas(e), activeLayer, zoom);
                    maskCtx.lineTo(x, y);
                    maskCtx.stroke();
                    this.onDidEditActiveLayer(/* skipTouch */ true);
                    break;
                }
            case DrawingToolType.Line:
                {
                    const mouseDownRelativePosition = this.getPositionInLayer(this._activeTool.mouseDownPosition, activeLayer, zoom);
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
                    this.onDidEditActiveLayer(/* skipTouch */ true);

                    break;
                }
            case DrawingToolType.Move:
                {
                    if (activeLayer !== this.props.editorState.doc.baseLayer) {
                        const { x, y } = this.getPositionInCanvas(e);
                        const dx = x - this._activeTool.mouseDownPosition.x;
                        const dy = y - this._activeTool.mouseDownPosition.y;
                        this._activeTool = {
                            ...this._activeTool,
                            layerMovingShift: {
                                x: Math.round(dx / zoom),
                                y: Math.round(dy / zoom),
                            }
                        };
                        this.requestCanvasRender();
                    }
                    break;
                }
        }
    }

    private readonly onMouseUp = ((e: EventWithPosition) => {
        if (!this._activeTool) {
            return;
        }

        const mouseDownPosition = this._activeTool.mouseDownPosition;
        this._activeTool = undefined;

        const { activeLayer } = this.props.editorState;
        if (!activeLayer) {
            return;
        }

        const zoom = this.props.editorState.playback.zoom;
        const mouseDownRelativePosition = this.getPositionInLayer(mouseDownPosition, activeLayer, zoom);
        const maskCtx = activeLayer.maskCtx;

        switch (this.props.editorState.drawSettings.tool) {
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
                    if (this.props.editorState.doc.baseLayer?.id.equals(activeLayer.id)) {
                        return;
                    }

                    const { x, y } = this.getPositionInCanvas(e);
                    const dx = (x - mouseDownPosition.x);
                    const dy = (y - mouseDownPosition.y);

                    return this.props.dispatch(new actions.UpdateDoc(this.props.editorState.doc.updateLayer(activeLayer.id, layer => layer.setPosition({
                        x: Math.round(layer.position.x + dx / zoom),
                        y: Math.round(layer.position.y + dy / zoom)
                    }))));
                }
        }

        this.onDidEditActiveLayer();
    }).bind(this);

    private readonly onTouchEnd = ((e: TouchEvent) => {
        if (e.touches.length === 1) {
            this.onMouseUp(e.touches[0]);
        }
    }).bind(this);

    private readonly onTouchStart = ((e: TouchEvent) => {
        if (e.touches.length === 1) {
            this.onMouseDown(e.touches[0]);
            e.preventDefault();
        }
    }).bind(this);

    private readonly onTouchMove = ((e: TouchEvent) => {
        if (e.touches.length === 1) {
            this.onMouseMove(e.touches[0]);
            e.preventDefault();
        }
    }).bind(this);

    private _renderCanvas() {
        if (!this._ctx || !this._scratchCanvas || !this._scratchCtx) {
            return;
        }

        const { activeLayer } = this.props.editorState;
        const zoom = this.props.editorState.playback.zoom;
        const shift = this._activeTool?.layerMovingShift ?? vecZero;

        this._ctx.clearRect(0, 0, 10000, 10000);

        if (this.props.editorState.playback.renderMode === RenderMode.ActiveMask) {
            if (activeLayer) {
                renderMask(activeLayer, shift, zoom, this._ctx);
            }
        } else {
            let docToRender = this.props.editorState.doc;
            if (activeLayer && activeLayer !== docToRender.baseLayer) {
                docToRender = docToRender.moveLayer(activeLayer.id, shift);
            }

            render(
                docToRender,
                this.props.editorState.playback.currentFrameIndex,
                zoom,
                this._ctx,
                {
                    showBordersFor: activeLayer && this._activeTool?.tool === DrawingToolType.Move ? [activeLayer.id] : []
                });
        }
    }

    public quickMask(mask: QuickMaskType) {
        const active = this.props.editorState.activeLayer;
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
        layer.maskCtx.clearRect(layer.width / 2, 0, layer.width, layer.height);
        this.onDidEditActiveLayer();
    }

    private showRight(layer: Layer): void {
        this.revealAll(layer);
        layer.maskCtx.clearRect(0, 0, layer.width / 2, layer.height);
        this.onDidEditActiveLayer();
    }

    private showTop(layer: Layer): void {
        this.revealAll(layer);
        layer.maskCtx.clearRect(0, layer.height / 2, layer.width, layer.height / 2);
        this.onDidEditActiveLayer();
    }

    private showBottom(layer: Layer): void {
        this.revealAll(layer);
        layer.maskCtx.clearRect(0, 0, layer.width, layer.height / 2);
        this.onDidEditActiveLayer();
    }

    private onDidEditActiveLayer(skipTouch?: boolean) {
        const { activeLayer } = this.props.editorState;
        if (activeLayer && !skipTouch) {
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

    private getPositionInCanvas(e: EventWithPosition): Vec {
        if (!this._canvas) {
            return vecZero;
        }

        const rect = this._canvas.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left),
            y: (e.clientY - rect.top),
        };
    }

    private getCursor(): string {
        switch (this.props.editorState.drawSettings.tool) {
            case DrawingToolType.Move: return 'move';

            default: return 'auto';
        }
    }
}

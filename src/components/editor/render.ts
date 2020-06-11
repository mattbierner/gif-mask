import { Document } from '../../model/document';
import { Layer, LayerId } from '../../model/layer';
import { Vec as Vec2 } from '../../model/vec';

const getScratchCanvas = (() => {
    let canvas: HTMLCanvasElement | undefined;
    let ctx: CanvasRenderingContext2D | undefined;
    return () => {
        if (!canvas) {
            canvas = document.createElement('canvas');
            ctx = canvas.getContext('2d')!;
        }
        return [canvas, ctx!] as const;
    };
})();

interface RenderOptions {
    readonly showBordersFor?: readonly LayerId[];
}

export function render(
    doc: Document,
    currentFrameIndex: number,
    zoom: number,
    outCtx: CanvasRenderingContext2D,
    options: RenderOptions = {},
) {
    let { width, height } = doc;
    width *= zoom;
    height *= zoom;

    const [scratchCanvas, scratchCtx] = getScratchCanvas();
    scratchCanvas.width = width;
    scratchCanvas.height = height;

    for (const layer of doc.layers) {
        if (!layer.gif) {
            continue;
        }

        if (layer.hidden) {
            continue;
        }

        const frameToDraw = layer.getFrame(currentFrameIndex, doc.frameCount);
        if (!frameToDraw) {
            continue;
        }

        const isBaseLayer = layer === doc.baseLayer;
        const drawX = isBaseLayer ? 0 : (layer.position.x * zoom);
        const drawY = isBaseLayer ? 0 : (layer.position.y * zoom);

        scratchCtx.clearRect(0, 0, 10000, 10000);

        scratchCtx.save();
        {
            const layerWidth = layer.gif.width * layer.scale.x * zoom;
            const layerHeight = layer.gif.height * layer.scale.y * zoom;

            if (!isBaseLayer) {
                scratchCtx.drawImage(layer.mask,
                    drawX,
                    drawY,
                    layerWidth,
                    layerHeight);
                scratchCtx.globalCompositeOperation = 'source-in';
            }

            scratchCtx.drawImage(frameToDraw.canvas,
                drawX,
                drawY,
                layerWidth,
                layerHeight);
        }
        scratchCtx.restore();

        outCtx.drawImage(scratchCanvas, 0, 0);
    }

    for (const layer of doc.layers) {
        if (options.showBordersFor?.some(id => id.equals(layer.id))) {
            const isBaseLayer = layer === doc.baseLayer;
            const drawX = isBaseLayer ? 0 : (layer.position.x * zoom);
            const drawY = isBaseLayer ? 0 : (layer.position.y * zoom);

            const layerWidth = layer.width * layer.scale.x * zoom;
            const layerHeight = layer.height * layer.scale.y * zoom;

            outCtx.strokeStyle = 'red';
            outCtx.beginPath();
            outCtx.rect(drawX - 1, drawY - 1, layerWidth + 2, layerHeight + 2);
            outCtx.stroke();
        }
    }
}

export function renderMask(
    activeLayer: Layer,
    shift: Vec2,
    zoom: number,
    outCtx: CanvasRenderingContext2D,
) {
    outCtx.save();
    {
        const x = (activeLayer.position.x + shift.x) * zoom;
        const y = (activeLayer.position.y + shift.y) * zoom;
        const layerWidth = activeLayer.width * activeLayer.scale.x * zoom;
        const layerHeight = activeLayer.height * activeLayer.scale.y * zoom;

        outCtx.drawImage(activeLayer.mask, x, y, layerWidth, layerHeight);
        outCtx.globalCompositeOperation = 'source-out';
        outCtx.fillStyle = 'black';
        outCtx.fillRect(0, 0, 10000, 10000);

        outCtx.globalCompositeOperation = 'source-over';
        outCtx.strokeStyle = 'red';
        outCtx.strokeRect(x - 1, y - 1, layerWidth + 2, layerHeight + 2);
    }
    outCtx.restore();
}
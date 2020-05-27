import throttle = require('lodash.throttle');
import * as React from 'react';
import useResizeObserver from "use-resize-observer";
import { Document } from '../../model/document';
import { Layer } from '../../model/layer';
import { getRelativeEventPosition } from '../../util/dom';
import * as actions from '../../views/main/actions';

export function TimelineFrames(props: {
    dispatch: React.Dispatch<actions.Actions>;
    model: Document,
    layer: Layer,
    currentFrame: number,
}) {
    const canvasRef = React.useRef<HTMLCanvasElement>();

    const { ref } = useResizeObserver<HTMLDivElement>({
        onResize: ({ width, height }) => redrawTimelineCanvas(width, height)
    });

    React.useEffect(
        () => redrawTimelineCanvas(),
        [props.layer]);

    function redrawTimelineCanvas(width?: number, height?: number) {
        const canvas = canvasRef.current;
        if (!canvas || !props.layer.gif) {
            return;
        }

        canvas.width = width ?? canvas.parentElement?.clientWidth ?? 0;
        canvas.height = height ?? canvas.parentElement?.clientHeight ?? 0;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
            return;
        }

        const canvasRect = canvas.getBoundingClientRect();
        let x = 0;
        const sampleDrawWidth = Math.ceil(props.layer.gif.width * (canvasRect.height / props.layer.gif.height));
        while (x < canvasRect.width) {
            const progress = x / canvasRect.width;
            const frame = props.model.getFrameRelativeToBaseLayer(props.layer.id, Math.floor(props.model.frameCount * progress));
            if (frame) {
                ctx.drawImage(frame.canvas, x, 0, sampleDrawWidth, canvasRect.height);
            }
            x += sampleDrawWidth;
        }
    }

    const setActiveFrame = React.useCallback(throttle((x: number) => {
        props.dispatch(new actions.SetActiveFrame(x));
    }, 30), []);

    const onMouseDown = React.useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        const { x } = getRelativeEventPosition(e, e.currentTarget);
        const { width } = e.currentTarget.getBoundingClientRect();

        const progress = x / width;

        setActiveFrame(Math.floor(progress * props.model.frameCount));
    }, [props.model]);

    const onMouseMove = React.useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (e.buttons) {
            onMouseDown(e);
        }
    }, [props.model]);

    return (
        <div ref={ref}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            style={{ flex: 1, position: 'relative', width: '100%', userSelect: 'none' }}>

            <Ticks model={props.model} />

            <div style={{
                position: 'absolute',
                height: '100%',
                left: ((props.currentFrame) / props.model.frameCount) * 100 + '%',
                bottom: '0',
                borderRight: '2px solid red',
            }} />

            <canvas
                ref={canvasRef as React.RefObject<HTMLCanvasElement>}
                height="1"
                style={{
                    display: 'block',
                    maxWidth: '100%',
                }} />
        </div>
    );
}

function Ticks(props: {
    model: Document;
}) {
    return (
        <>
            {props.model.baseLayer?.gif?.frames.map((_, i) => (
                <Tick key={i} index={i} frameCount={props.model.frameCount} />
            ))}
        </>
    );
}

function Tick(props: {
    index: number;
    frameCount: number;
}) {
    return <div style={{
        position: 'absolute',
        height: '10px',
        left: ((props.index + 1) / props.frameCount) * 100 + '%',
        bottom: '0',
        borderLeft: '1px solid black',
        borderRight: '1px solid white',
    }} />;
}

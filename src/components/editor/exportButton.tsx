import * as React from 'react';
import { EditorState } from '../../model/editorState';
import { render } from './render';

export function ExportButton(props: {
    editorState: EditorState,
    beginExport: () => void,
    endExport: () => void,
}) {
    const [state, setState] = React.useState({
        exporting: false
    });

    const exportGif = React.useCallback(() => {
        setState({ exporting: true });
        props.beginExport();
        const { width, height } = props.editorState.doc;
        const encoder = new GifEncoder({ width, height });

        encoder.once('finished', blob => {
            encoder.dispose();
            const url = URL.createObjectURL(blob);
            window.open(url);
            props.endExport();
            setState({ exporting: false });
            URL.revokeObjectURL(url);
        });

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d')!;

        const frameCount = props.editorState.doc.frameCount;
        for (let i = 0; i < frameCount; ++i) {
            render(props.editorState.doc, i, 1, ctx);
            const imageData = ctx.getImageData(0, 0, width, height);
            const delay = (props.editorState.doc.baseLayer!.getFrame(i, frameCount)?.info.delay ?? 3) * 10;
            encoder.addFrame(imageData, delay);
        }

        encoder.render();
    }, [
        props.editorState,
        props.beginExport,
        props.endExport,
    ]);

    return (
        <button onMouseDown={exportGif} disabled={state.exporting}>Export</button>
    );
}
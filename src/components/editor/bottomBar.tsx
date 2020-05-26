import * as React from 'react';
import styled from 'styled-components';
import { EditorState } from '../../model/editorState';
import * as actions from '../../views/actions';

const EditorStat = styled('span')`
    margin-right: 1em;
`;

export function EditorBottomBar(props: {
    dispatch: React.Dispatch<actions.Actions>,
    editorState: EditorState,
}) {
    return (
        <div style={{
            borderTop: '1px solid lightgrey',
            display: 'flex',
            backgroundColor: '#eee',
            padding: '0 4px',
        }}>
            <div style={{ fontFamily: 'var(--monospace-font-family)', fontSize: '12px' }}>
                <EditorStat>width={props.editorState.doc.width}px</EditorStat>
                <EditorStat>height={props.editorState.doc.height}px</EditorStat>
                <EditorStat>frames={props.editorState.doc.frameCount}</EditorStat>
            </div>

            <div className='spacer' />

            <ZoomControl
                value={props.editorState.playback.zoom}
                onChange={value => props.dispatch(new actions.ChangeZoom(value))} />
        </div>
    );
}

const zoomLevels = [0.25, 0.5, 1, 1.5, 2];

function ZoomControl(props: {
    value: number,
    onChange: (value: number) => void,
}) {

    const options = zoomLevels.map((value: number) =>
        <option key={value} value={value}>{value * 100}%</option>);

    return (
        <select value={props.value} onChange={e => props.onChange(+e.target.value)}>
            {options}
        </select>
    );
}
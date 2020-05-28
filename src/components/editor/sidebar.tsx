import { useMediaQuery } from '@material-ui/core';
import * as React from 'react';
import styled from 'styled-components';
import { DrawingTool, quickMasks, QuickMaskType, Tools } from '../../model/drawing';
import { EditorState } from '../../model/editorState';
import { Vec } from '../../model/vec';
import * as actions from '../../views/main/actions';
import { SiteLogo } from '../siteLogo';
import * as editorActions from './actions';
import { ExportButton } from './exportButton';


export function SideBar(props: {
    dispatch: React.Dispatch<actions.Actions>,
    dispatchEditor: React.Dispatch<editorActions.EditorAction>,
    editorState: EditorState,
}) {
    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            borderRight: '1px solid lightgray',
            paddingBottom: '1em',
        }}>
            <SiteLogo />

            <ToolsView
                dispatch={props.dispatchEditor}
                editorState={props.editorState} />

            <div className='spacer' />

            <ExportButton
                editorState={props.editorState}
                beginExport={() => { console.log('begin export'); }}
                endExport={() => { console.log('end export'); }} />
        </div>
    );
}

const ToolGroup = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    
    font-family: var(--monospace-font-family);
    font-size: 12px;

    margin-bottom: 2em;
`;

function ToolsView(props: {
    dispatch: React.Dispatch<editorActions.EditorAction>,
    editorState: EditorState,
}) {
    const createTool = (tool: DrawingTool): JSX.Element => {
        return <Tool key={tool.type} tool={tool}
            selected={props.editorState.drawSettings.tool === tool.type}
            onClick={() => props.dispatch(new editorActions.SetDrawTool(tool.type))} />;
    };

    const isMoveableLayerSelected = props.editorState.activeLayer && !props.editorState.doc.baseLayer?.id.equals(props.editorState.activeLayer.id);

    function updatePosition(pos: Vec) {
        if (props.editorState.activeLayer && isMoveableLayerSelected && !isNaN(pos.x) && !isNaN(pos.y)) {
            props.dispatch(new editorActions.SetLayerPosition(props.editorState.activeLayer.id, pos));
        }
    }

    function updateScale(scale: number) {
        if (props.editorState.activeLayer && isMoveableLayerSelected && !isNaN(scale)) {
            props.dispatch(new editorActions.SetLayerScale(props.editorState.activeLayer.id, { x: scale, y: scale }));
        }
    }

    const maxHeight700 = useMediaQuery('(max-height:700px)');

    return (
        <div className='tools' style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
        }}>
            <ToolGroup>
                <div style={{
                    display: 'flex',
                    flexDirection: maxHeight700 ? 'row' : 'column',
                }}>
                    {createTool(Tools.Brush)}
                    {createTool(Tools.Erase)}
                </div>
                <div style={{
                    fontFamily: 'var(--monospace-font-family)',
                    fontSize: '12px',
                }}>stoke={props.editorState.drawSettings.strokeSize}px</div>
            </ToolGroup>

            <ToolGroup>
                <div style={{
                    display: 'flex',
                    flexDirection: maxHeight700 ? 'row' : 'column',
                }}>
                    {createTool(Tools.Line)}
                    {createTool(Tools.Move)}
                </div>
            </ToolGroup>

            <ToolGroup>
                <QuickMaskTool dispatch={props.dispatch} />
            </ToolGroup>

            <ToolGroup>
                <div>
                    x=<input style={{ maxWidth: '40px' }}
                        type='text'
                        pattern="[0-9\.\-]*"
                        min={-1000}
                        max={1000}
                        disabled={!isMoveableLayerSelected}
                        value={props.editorState.activeLayer?.position.x ?? 0}
                        onChange={e => updatePosition({
                            x: +e.target.value,
                            y: props.editorState.activeLayer?.position.y ?? 0,
                        })} />
                </div>
                <div>
                    y=<input style={{ maxWidth: '40px' }}
                        type='text'
                        pattern="[0-9\.\-]*"
                        min={-1000}
                        max={1000}
                        disabled={!isMoveableLayerSelected}
                        value={props.editorState.activeLayer?.position.y ?? 0}
                        onChange={e => updatePosition({
                            x: props.editorState.activeLayer?.position.x ?? 0,
                            y: +e.target.value,
                        })} />
                </div>
                <div>
                    scale=<input style={{ maxWidth: '40px' }}
                        type='text'
                        pattern="[0-9]*"
                        min={1}
                        max={1000}
                        disabled={!isMoveableLayerSelected}
                        value={(props.editorState.activeLayer?.scale.x ?? 1) * 100}
                        onChange={e => updateScale(+e.target.value / 100)} />
                </div>
            </ToolGroup>
        </div>
    );
}

const ToolButton = styled.button<{
    tool: DrawingTool,
    selected?: boolean
}>`
    display: block;
    width: 40px;
    height: 40px;
    border: none;
    border-radius: 100px;
    margin: 0.4em;
    position: relative;
    background-color: ${props => props.selected ? `var(--brand-color)` : 'var(--lightest-gray)'};

    &:hover {
        background-color: var(--brand-color);
    }

    &:active {
        opacity: 0.8;
    }

    :after {
        display: block;
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: ${ props => props.selected ? `var(--background-color)` : 'var(--text-color)'};

        mask: ${ props => `url(${props.tool.icon})`};
        mask-repeat: no-repeat;
        mask-position: center;
        mask-size: 60%;
    }

    &:hover:after {
        background-color: var(--background-color);
    }
`;

function Tool(props: {
    tool: DrawingTool;
    selected?: boolean,
    onClick: () => void,
}) {
    return (
        <ToolButton
            onClick={props.onClick}
            title={`${props.tool.title} (${props.tool.key.toUpperCase()})`}
            tool={props.tool}
            selected={props.selected} />
    );
}

function QuickMaskTool(props: {
    dispatch: React.Dispatch<editorActions.EditorAction>,
    disabled?: boolean
}) {
    const options = Array.from(quickMasks.values()).map(mask =>
        <option key={mask.type} value={mask.type}>{mask.title}</option>);

    const onChange = React.useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
        const action = quickMasks.get(+e.target.value as QuickMaskType);
        if (action) {
            props.dispatch(new editorActions.QuickMask(action.type));
        }
    }, [props.dispatch]);

    return (
        <select
            disabled={props.disabled}
            value='none'
            onChange={onChange}
        >
            <option value=''>Quick Mask</option>
            <option disabled>-----</option>
            {options}
        </select>
    );
}
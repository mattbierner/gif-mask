import Icon from '@material-ui/core/Icon';
import useMediaQuery from '@material-ui/core/useMediaQuery';
import * as React from 'react';
import { DropTargetMonitor, useDrag, useDrop } from 'react-dnd';
import { useDropzone } from 'react-dropzone';
import styled from 'styled-components';
import { decodeGif } from '../../load_gif';
import { Document } from '../../model/document';
import { RenderMode } from '../../model/editorState';
import { Layer } from '../../model/layer';
import * as actions from '../../views/actions';
import { TimelineFrames } from './frames';


const TimelineControl = styled('button')`
    margin: 0 6px;
    padding: 4px;
    vertical-align: middle;
    text-align: center;

    border: none;
    border-radius: 100px;
    background: none;
    
    & .material-icons {
        font-size: 1.6em;
    }

    &:hover:not(:disabled),
    &.active {
        background-color: var(--brand-color);
    }
`;

const LayerHeader = styled('div')`
    padding: 0.4em 1em;
    padding-left: 0.2em;
    border-right: 1px solid black;
    
    display: flex;
    flex-direction: row;
    align-items: center;
    
    white-space: nowrap;

    & > * {
        display: block;
    }
`;

const LayerLabel = styled('span')`
    padding-right: 0.4em;
    font-family: var(--monospace-font-family);
    white-space: pre;
`;


export function LayerView(props: {
    dispatch: React.Dispatch<actions.Actions>;
    model: Document,
    layer: Layer,
    active: boolean,
    currentFrame: number,
    renderMode: RenderMode;
    onSelectGif: (layer: Layer) => void,
}) {
    const ref = React.useRef<HTMLDivElement>(null);

    const [, drop] = useDrop({
        accept: 'layer',
        hover(item: { type: 'layer', layer: Layer, index: number }, monitor: DropTargetMonitor) {
            if (!ref.current) {
                return;
            }
            const dragIndex = item.index;
            const hoverIndex = props.model.layers.indexOf(props.layer);

            // Don't replace items with themselves
            if (dragIndex === hoverIndex) {
                return;
            }

            // Determine rectangle on screen
            const hoverBoundingRect = ref.current!.getBoundingClientRect();

            // Get vertical middle
            const hoverMiddleY =
                (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;

            // Determine mouse position
            const clientOffset = monitor.getClientOffset();

            // Get pixels to the top
            const hoverClientY = clientOffset!.y - hoverBoundingRect.top;

            // Only perform the move when the mouse has crossed half of the items height
            // When dragging downwards, only move when the cursor is below 50%
            // When dragging upwards, only move when the cursor is above 50%

            // Dragging downwards
            if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
                return;
            }

            // Dragging upwards
            if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
                return;
            }

            // Time to actually perform the action
            props.dispatch(new actions.MoveLayer(item.layer.id, hoverIndex));

            item.index = hoverIndex;
        },
    });

    const [{ isDragging }, drag] = useDrag({
        item: { type: 'layer', layer: props.layer, index: props.model.layers.indexOf(props.layer) },
        collect: (monitor: any) => ({
            isDragging: monitor.isDragging(),
        }),
    });

    const isBaseLayer = props.model.baseLayer?.id.equals(props.layer.id);
    if (!isBaseLayer) {
        drag(drop(ref));
    }


    const onDrop = React.useCallback((acceptedFiles: readonly File[]) => {
        if (!acceptedFiles.length) {
            return;
        }

        const file = acceptedFiles[0];
        const fileReader = new FileReader();
        fileReader.onload = (event) => {
            const gif = decodeGif(new Uint8Array((event.target as any).result as ArrayBuffer));
            props.dispatch(new actions.SetLayerGif(props.layer.id, gif));
        };

        fileReader.onerror = (e) => {
            console.error(e);
        };

        fileReader.readAsArrayBuffer(file);
    }, []);

    const { getRootProps } = useDropzone({ onDrop, accept: 'image/gif' });

    const maxHeight800 = useMediaQuery('(max-height:800px)');

    return (
        <div {...getRootProps()}
            className='layer'
            style={{
                outline: 'none',
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'stretch',
                backgroundColor: props.active ? 'lightgrey' : '',
                borderTop: '1px solid black',
                height: maxHeight800 ? '40px' : '60px',
            }}>
            <LayerHeader onClick={() => props.dispatch(new actions.SelectLayer(props.layer.id))}>
                <div ref={isBaseLayer ? undefined : ref}
                    style={{
                        cursor: isDragging ? 'grabbing' : 'grab',
                        marginRight: '0.4em',
                        opacity: isBaseLayer ? 0.4 : 1,
                    }}>
                    <Icon style={{
                        verticalAlign: 'middle',
                    }}>drag_indicator</Icon>
                </div>

                <LayerLabel>Layer {props.layer.id.value.toString().padEnd(3, ' ')}</LayerLabel>

                <TimelineControl title="Load Gif" onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    props.onSelectGif(props.layer);
                }}>
                    <Icon>search</Icon>
                </TimelineControl>

                <TimelineControl title="Show mask"
                    className={props.active && props.renderMode === RenderMode.ActiveMask ? 'active' : ''}
                    onClick={(e: React.MouseEvent) => {
                        e.stopPropagation();
                        props.dispatch(new actions.ToggleMaskRendering(props.layer.id));
                    }}>
                    <Icon>adjust</Icon>
                </TimelineControl>

                <TimelineControl title="Delete layer" disabled={props.model.baseLayer?.id.equals(props.layer.id)} onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    props.dispatch(new actions.DeleteLayer(props.layer.id));
                }}>
                    <Icon>close</Icon>
                </TimelineControl>
            </LayerHeader>

            <TimelineFrames
                dispatch={props.dispatch}
                model={props.model}
                layer={props.layer}
                currentFrame={props.currentFrame} />
        </div>
    );
}

import * as React from 'react';
import { AppStage, AppState } from '../../model/appState';
import { LayerId } from '../../model/layer';
import { Gif } from '../../util/loadGif';
import * as actions from '../../views/main/actions';
import { PlaybackControls } from '../editor/playbackControls';
import { LoadingSpinner } from '../loading_spinner';
import { SearchOverlay } from '../searchOverlay';
import { LayerView } from './layer';

interface TimelineState {
    showGifPickerFor: undefined | LayerId;
}

export function Timeline(props: {
    dispatch: React.Dispatch<actions.Actions>;
    state: AppState,
}) {
    const [state, setState] = React.useState<TimelineState>({
        showGifPickerFor: undefined
    });

    function didSelectGif(gif: Gif | undefined): void {
        if (!state.showGifPickerFor) {
            return;
        }

        if (gif) {
            props.dispatch(new actions.SetLayerGif(state.showGifPickerFor, gif));
            props.dispatch(new actions.SelectLayer(state.showGifPickerFor));
        }

        setState({ showGifPickerFor: undefined });
    }

    let body: JSX.Element;
    if (props.state.type === AppStage.Loading) {
        body = (
            <LoadingSpinner active />
        );
    } else {
        const editorState = props.state.editorState;
        const layerEntries = [...editorState.doc.layers].reverse().map((layer) => (
            <LayerView key={layer.id.value}
                model={editorState.doc}
                layer={layer}
                active={!!editorState.activeLayerId?.equals(layer.id)}
                renderMode={editorState.playback.renderMode}
                dispatch={props.dispatch}
                currentFrame={editorState.playback.currentFrameIndex}
                onSelectGif={layer => {
                    setState({ showGifPickerFor: layer.id });
                }} />
        ));

        body = (
            <div>
                <div style={{
                    display: 'flex'
                }}>
                    <button
                        onMouseDown={() => props.dispatch(new actions.AddLayer(undefined))}
                        style={{
                            border: 'none',
                            display: 'block',
                            background: 'none',
                        }}
                    >Add Layer</button>

                    <PlaybackControls
                        playing={editorState.playback.playing}
                        dispatch={props.dispatch} />
                </div>

                {layerEntries}
            </div>
        );
    }

    return (
        <div style={{
            gridArea: 'timeline',
            borderTop: '1px solid lightgray',
            maxHeight: '50vh',
            minHeight: '100px',
            overflowY: 'scroll',
            overflowX: 'hidden',
        }}>
            {body}
            <SearchOverlay show={!!state.showGifPickerFor} onDidClose={didSelectGif} />
        </div>
    );
}

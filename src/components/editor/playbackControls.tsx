import { Icon } from '@material-ui/core';
import * as React from 'react';
import * as actions from '../../views/main/actions';

export function PlaybackControls(props: {
    playing: boolean,
    dispatch: React.Dispatch<actions.Actions>,
}) {
    return (
        <div style={{
            flex: 1,
            margin: '0.4em',
        }}>
            <button onMouseDown={() => props.dispatch(new actions.SetPlaying(!props.playing))}>
                <Icon>{props.playing ? 'stop' : 'play_arrow'}</Icon>
            </button>
        </div>
    );
}

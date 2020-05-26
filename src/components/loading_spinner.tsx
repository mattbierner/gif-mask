import * as React from 'react';

export function LoadingSpinner(props: {
    active: boolean;
    style?: React.CSSProperties;
}) {
    return (
        <span style={props.style} className={'material-icons loading-spinner ' + (props.active ? '' : 'hidden')}>autorenew</span>
    );
}
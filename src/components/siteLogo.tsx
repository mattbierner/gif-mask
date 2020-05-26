import useMediaQuery from '@material-ui/core/useMediaQuery';
import * as React from 'react';
import * as config from '../config';

export function SiteLogo() {
    const maxHeight800 = useMediaQuery('(max-height:800px)');

    return (
        <header className='site-header' style={{
            marginBottom: maxHeight800 ? '0.4em' : '1em',
        }}>
            <a href='.' title={config.siteTitle}>
                <img
                    id='site-title'
                    className='site-logo'
                    src='images/logo.svg'
                    alt={config.siteTitle}
                    style={{
                        width: '100%'
                    }} />
            </a>
        </header>
    );
}
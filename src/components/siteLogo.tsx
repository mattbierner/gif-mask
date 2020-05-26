import * as React from 'react';
import * as config from '../config';

export function SiteLogo() {
    return (
        <header className='site-header' style={{
            marginBottom: '1em',
        }}>
            <a href='/' title={config.siteTitle}>
                <img
                    id='site-title'
                    className='site-logo'
                    src='/images/logo.svg'
                    alt={config.siteTitle}
                    style={{
                        width: '100%'
                    }} />
            </a>
        </header>
    );
}
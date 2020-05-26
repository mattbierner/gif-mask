import * as React from 'react';
import styled from 'styled-components';
import * as config from '../config';


const Link = styled('a')`
    color: var(--background-color);
    padding-left: 1.5em;
    
    &:hover {
        color: var(--brand-color);
    }
`;

export function SiteFooter() {
    return (
        <footer className='site-footer' style={{
            fontFamily: 'var(--monospace-font-family)',
            color: 'var(--background-color)',
            fontSize: '0.9em',
            display: 'flex',
            flexDirection: 'row',
            backgroundColor: 'var(--brand-color2)',
            padding: '0.2em 0.4em',
        }}>
            <nav style={{
                display: 'flex',
            }}>
                <Link href={config.helpUrl} target='_blank' >Help</Link>
                <Link href={config.sourceUrl} target='_blank' >Source</Link>
                <Link href={config.issueUrl}>Report Issue</Link>
            </nav>

            <span className='copyright' style={{
                flex: 1
            }}>
                &copy; {config.year} <Link href='https://mattbierner.com'>Matt Bierner</Link>
            </span>
        </footer >
    );
}


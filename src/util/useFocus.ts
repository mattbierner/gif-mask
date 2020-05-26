import * as React from 'react';

export const useFocus = () => {
    const htmlElRef = React.useRef<HTMLElement>();
    const setFocus = () => {
        const currentEl = htmlElRef.current;
        currentEl && currentEl.focus();
    };
    return [setFocus, htmlElRef] as const;
};

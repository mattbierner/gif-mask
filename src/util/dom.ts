import * as React from 'react';

export function getRelativeEventPosition(e: React.MouseEvent, element: HTMLElement): { x: number, y: number } {
    const rect = element.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    return { x, y };

}
declare class GifEncoder {
    constructor(options: {
        width: number,
        height: number
    });

    dispose(): void;

    on(channel: 'progress', callback: (progress: number) => void): void;
    once(channel: 'finished', callback: (blob: Blob) => void): void;

    abort(): void;
    render(): void;

    addFrame(imageData: ImageData, delay: number): void;
}
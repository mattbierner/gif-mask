import omggif = require('omggif');
import createImageData from './createImageData';

export interface GifFrame {
    readonly info: { readonly delay: number }
    readonly canvas: HTMLCanvasElement;
}

export interface Gif {
    readonly width: number
    readonly height: number
    readonly frames: GifFrame[]
}

type GifReader = omggif.GifReader & { readonly width: number; readonly height: number; }

/**
 * Get a file as binary data.
 */
const loadBinaryData = (url: string): Promise<Uint8Array> => {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);
    xhr.responseType = "arraybuffer";

    const p = new Promise<Uint8Array>((resolve, reject) => {
        xhr.onload = () => {
            if (xhr.status !== 200)
                return reject(`Could not load: ${url}`);
            const arrayBuffer = xhr.response;
            resolve(new Uint8Array(arrayBuffer));
        };
    });
    xhr.send(null);
    return p;
};

/**
 * Extract metadata and frames from binary gif data.
 */
export const decodeGif = (byteArray: Uint8Array): Gif => {
    const gr = new omggif.GifReader(byteArray as Buffer) as GifReader;
    return {
        width: gr.width,
        height: gr.height,
        frames: extractGifFrameData(gr)
    };
};

/**
 * Extract each frame of metadata / frame data  from a gif.
 */
const extractGifFrameData = (reader: GifReader): GifFrame[] => {
    const frames: GifFrame[] = [];
    const { width, height } = reader;

    let previousImageData;
    for (let i = 0, len = reader.numFrames(); i < len; ++i) {
        const info = reader.frameInfo(i);
        const imageData = createImageData(width, height);
        if (previousImageData) {
            for (let i = 0, len = previousImageData.data.length; i < len; ++i) {
                imageData.data[i] = previousImageData.data[i];
            }
        }

        reader.decodeAndBlitFrameRGBA(i, imageData.data as any);
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d')!.putImageData(imageData, 0, 0);

        frames.push({ info, canvas });
        previousImageData = imageData;
    }
    return frames;
};

/**
 * Load and decode a gif from a url
 */
export const loadGifFromUrl = (url: string): Promise<Gif> =>
    loadBinaryData(url).then(decodeGif);

/**
 * Load and decode a gif from a file.
 */
export const loadGifFromFile = (file: File): Promise<Gif> => {
    const fileReader = new FileReader();

    return new Promise<Gif>((resolve, reject) => {
        fileReader.onload = (event) => {
            resolve(decodeGif(new Uint8Array((event.target as any).result as ArrayBuffer)));
        };

        fileReader.onerror = (e) => {
            console.error(e);
            reject(new Error('Could not read gif'));
        };

        fileReader.readAsArrayBuffer(file);
    });
};
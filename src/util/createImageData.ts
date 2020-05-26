/**
 * Handle IE not supporting new ImageData()
 */
export default (() => {
    try {
        new ImageData(1, 1);
        return (width: number, height: number) => new ImageData(width, height);
    } catch {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext('2d');
        return (width: number, height: number) => ctx!.createImageData(width, height);
    }
})();
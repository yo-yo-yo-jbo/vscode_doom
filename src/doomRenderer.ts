import { quantizePixel } from './palette';

const SRC_WIDTH = 640;
const SRC_HEIGHT = 400;
const DST_WIDTH = 160;
const DST_HEIGHT = 100;

const HEX_CHARS = '0123456789ABCDEF';

export function renderFrame(pixels: Buffer): string {
    const xStep = SRC_WIDTH / DST_WIDTH;
    const yStep = SRC_HEIGHT / DST_HEIGHT;
    const lines: string[] = [];

    for (let dy = 0; dy < DST_HEIGHT; dy++) {
        let line = '';
        const sy = Math.floor(dy * yStep);
        for (let dx = 0; dx < DST_WIDTH; dx++) {
            const sx = Math.floor(dx * xStep);
            const offset = (sy * SRC_WIDTH + sx) * 4;
            const b = pixels[offset];
            const g = pixels[offset + 1];
            const r = pixels[offset + 2];

            const idx = quantizePixel(r, g, b);
            line += HEX_CHARS[idx];
        }
        lines.push(line);
    }

    return lines.join('\n');
}

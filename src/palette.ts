// 16-color DOOM-optimized palette
// Index 0-F maps to hex characters in the rendered text
export const DOOM_PALETTE: [number, number, number][] = [
    [0x00, 0x00, 0x00],  // 0: Black
    [0x1A, 0x1A, 0x1A],  // 1: Dark gray
    [0x40, 0x40, 0x40],  // 2: Medium gray
    [0x73, 0x73, 0x73],  // 3: Light gray
    [0x50, 0x28, 0x10],  // 4: Dark brown
    [0x8B, 0x45, 0x13],  // 5: Brown
    [0xA0, 0x60, 0x20],  // 6: Tan/light brown
    [0x8B, 0x00, 0x00],  // 7: Dark red
    [0xCC, 0x22, 0x22],  // 8: Red
    [0xD0, 0x70, 0x20],  // 9: Orange
    [0xE8, 0xB8, 0x30],  // A: Yellow
    [0x20, 0x50, 0x10],  // B: Dark green
    [0x40, 0x90, 0x30],  // C: Green
    [0x18, 0x30, 0x58],  // D: Dark blue
    [0x30, 0x60, 0xA0],  // E: Blue
    [0xB0, 0xB0, 0xB0],  // F: White/bright gray
];

// 32K LUT for fast RGB->palette quantization (5 bits per channel)
let quantizationLUT: Uint8Array | null = null;

function colorDistanceSq(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number): number {
    const dr = r1 - r2;
    const dg = g1 - g2;
    const db = b1 - b2;
    // Weighted distance (human eye is more sensitive to green)
    return 2 * dr * dr + 4 * dg * dg + 3 * db * db;
}

export function buildQuantizationLUT(): void {
    quantizationLUT = new Uint8Array(32 * 32 * 32);
    for (let ri = 0; ri < 32; ri++) {
        for (let gi = 0; gi < 32; gi++) {
            for (let bi = 0; bi < 32; bi++) {
                const r = (ri << 3) | (ri >> 2);
                const g = (gi << 3) | (gi >> 2);
                const b = (bi << 3) | (bi >> 2);

                let bestIdx = 0;
                let bestDist = Infinity;
                for (let i = 0; i < 16; i++) {
                    const d = colorDistanceSq(r, g, b, DOOM_PALETTE[i][0], DOOM_PALETTE[i][1], DOOM_PALETTE[i][2]);
                    if (d < bestDist) {
                        bestDist = d;
                        bestIdx = i;
                    }
                }
                quantizationLUT[(ri << 10) | (gi << 5) | bi] = bestIdx;
            }
        }
    }
}

export function quantizePixel(r: number, g: number, b: number): number {
    if (!quantizationLUT) {
        buildQuantizationLUT();
    }
    const ri = r >> 3;
    const gi = g >> 3;
    const bi = b >> 3;
    return quantizationLUT![(ri << 10) | (gi << 5) | bi];
}

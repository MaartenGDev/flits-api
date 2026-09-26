/** Snaps a coordinate to 6 decimals (~0.1 m); the client sends float32 anyway. */
export function snap6(value: number): number {
    return Math.round(value * 1e6) / 1e6;
}

/** Normalises a bearing to an integer in [0, 360). */
export function normaliseBearing(bearing: number): number {
    return ((Math.round(bearing) % 360) + 360) % 360;
}

/** Smallest angle between two bearings, in [0, 180]. */
export function angleDiff(a: number, b: number): number {
    return Math.abs(((a - b + 540) % 360) - 180);
}

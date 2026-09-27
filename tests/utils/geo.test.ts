import { describe, expect, it } from "vitest";

import { angleDiff, normaliseBearing, snap6 } from "../../src/utils/geo";

describe("snap6", () => {
    it("rounds to six decimals", () => {
        expect(snap6(4.87359149999)).toBe(4.873591);
        expect(snap6(4.8735915)).toBe(4.873592);
    });

    it("keeps values that already have six decimals or fewer", () => {
        expect(snap6(52.3)).toBe(52.3);
        expect(snap6(-4.123456)).toBe(-4.123456);
    });
});

describe("normaliseBearing", () => {
    it("keeps bearings inside [0, 360)", () => {
        expect(normaliseBearing(0)).toBe(0);
        expect(normaliseBearing(359)).toBe(359);
    });

    it("wraps values of 360 and above", () => {
        expect(normaliseBearing(360)).toBe(0);
        expect(normaliseBearing(725)).toBe(5);
    });

    it("wraps negative values", () => {
        expect(normaliseBearing(-10)).toBe(350);
        expect(normaliseBearing(-360)).toBe(0);
    });

    it("rounds fractional bearings first", () => {
        expect(normaliseBearing(359.6)).toBe(0);
        expect(normaliseBearing(12.4)).toBe(12);
    });
});

describe("angleDiff", () => {
    it("is zero for equal bearings", () => {
        expect(angleDiff(90, 90)).toBe(0);
    });

    it("is symmetric", () => {
        expect(angleDiff(10, 50)).toBe(40);
        expect(angleDiff(50, 10)).toBe(40);
    });

    it("takes the short way around north", () => {
        expect(angleDiff(350, 10)).toBe(20);
        expect(angleDiff(10, 350)).toBe(20);
    });

    it("caps at 180 for opposite bearings", () => {
        expect(angleDiff(0, 180)).toBe(180);
        expect(angleDiff(45, 225)).toBe(180);
    });
});

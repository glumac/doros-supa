// @vitest-environment node
import { describe, it, expect, vi } from "vitest";
import { TOMATO_COLORS, buildSvg, createImageCache, renderPng, tomatoSize } from "../tomatoIcon";

/** Width and height from a PNG's IHDR chunk. */
function pngSize(png: Buffer): { width: number; height: number } {
  expect(png.subarray(1, 4).toString("ascii")).toBe("PNG");
  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
}

const textOf = (svg: string) => svg.match(/<text[^>]*>([^<]*)<\/text>/)?.[1];

describe("buildSvg", () => {
  it("focus: a round red tomato with the number in white", () => {
    const svg = buildSvg("25", "focus");
    expect(svg).toContain('width="22" height="22"');
    expect(textOf(svg)).toBe("25");
    expect(svg).toContain(`fill="${TOMATO_COLORS.body}"`);
    expect(svg).toContain(`fill="${TOMATO_COLORS.leaf}"`);
    expect(svg).toContain(`fill="${TOMATO_COLORS.text}"`);
    expect(svg).toContain(`stroke="${TOMATO_COLORS.textStroke}"`);
    expect(svg).toContain('font-weight="700"');
    expect(svg).not.toContain("opacity");
  });

  it("paused: the same tomato, dimmed, with no pause bars", () => {
    const svg = buildSvg("12", "paused");
    expect(svg).toContain('width="22" height="22"');
    expect(textOf(svg)).toBe("12");
    expect(svg).toMatch(/<g opacity="0\.\d+">/);
    expect(svg).not.toContain("pause");
    // Only the tomato is dimmed; the number stays fully opaque.
    expect(svg.indexOf("</g>")).toBeLessThan(svg.indexOf("<text"));
  });

  it("idle: the plain 18 pt tomato, no text", () => {
    const svg = buildSvg("", "idle");
    expect(svg).toContain('width="18" height="18"');
    expect(svg).not.toContain("<text");
    expect(svg).toContain(`fill="${TOMATO_COLORS.body}"`);
    expect(svg).toContain(`fill="${TOMATO_COLORS.leaf}"`);
  });

  it("idle ignores any text it's given", () => {
    expect(buildSvg("25", "idle")).toBe(buildSvg("", "idle"));
  });

  it("shrinks the font for three digits (100+ minutes)", () => {
    const size = (svg: string) => Number(svg.match(/font-size="([\d.]+)"/)?.[1]);
    expect(size(buildSvg("7", "focus"))).toBe(12);
    expect(size(buildSvg("25", "focus"))).toBe(12);
    expect(size(buildSvg("100", "focus"))).toBeLessThan(12);
  });

  it("escapes XML special characters", () => {
    expect(textOf(buildSvg("<&>", "focus"))).toBe("&lt;&amp;&gt;");
  });

  it.each([
    ["focus", "25"],
    ["paused", "25"],
    ["idle", ""],
  ] as const)("matches the snapshot: %s", (variant, text) => {
    expect(buildSvg(text, variant)).toMatchSnapshot();
  });
});

describe("tomatoSize", () => {
  it("is 22×22 pt with a number and 18×18 pt when idle", () => {
    expect(tomatoSize("focus")).toEqual({ width: 22, height: 22 });
    expect(tomatoSize("paused")).toEqual({ width: 22, height: 22 });
    expect(tomatoSize("idle")).toEqual({ width: 18, height: 18 });
  });
});

describe("renderPng", () => {
  it("rasterizes at 2× (44×44 px) for Retina and 1× (22×22 px)", () => {
    expect(pngSize(renderPng("25", "focus", 2))).toEqual({ width: 44, height: 44 });
    expect(pngSize(renderPng("25", "focus", 1))).toEqual({ width: 22, height: 22 });
    expect(pngSize(renderPng("", "idle", 2))).toEqual({ width: 36, height: 36 });
  });

  it("actually draws the digits (the font was found)", () => {
    const blank = renderPng("", "focus", 2);
    const a = renderPng("25", "focus", 2);
    const b = renderPng("11", "focus", 2);
    expect(a.equals(blank)).toBe(false);
    expect(a.equals(b)).toBe(false);
  });

  it("is fast enough to run every second", () => {
    renderPng("0", "focus", 2);
    const start = performance.now();
    for (let i = 0; i < 10; i++) renderPng(String(50 + i), "focus", 2);
    expect((performance.now() - start) / 10).toBeLessThan(50);
  });
});

describe("createImageCache", () => {
  it("builds each key once", () => {
    const make = vi.fn((key: string) => ({ key }));
    const cache = createImageCache(make, 10);
    const first = cache.get("focus:24:13");
    expect(cache.get("focus:24:13")).toBe(first);
    expect(make).toHaveBeenCalledTimes(1);
  });

  it("drops the least recently used entry when full", () => {
    const make = vi.fn((key: string) => ({ key }));
    const cache = createImageCache(make, 2);
    cache.get("a");
    cache.get("b");
    cache.get("a"); // a is now newer than b
    cache.get("c"); // evicts b
    expect(cache.size).toBe(2);
    cache.get("a");
    expect(make).toHaveBeenCalledTimes(3);
    cache.get("b");
    expect(make).toHaveBeenCalledTimes(4);
  });
});

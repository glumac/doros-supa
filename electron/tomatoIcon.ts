// Pure: draws the menu bar tomato with the minutes (or, in the last minute, seconds) left
// inside it. See trayLabel() in countdown.ts. No electron imports,
// so it's unit-tested under Node; tray.ts wraps the PNGs in a nativeImage.
//
// Not a template image: macOS template images are monochrome, and the tomato is red.
import { Resvg } from "@resvg/resvg-js";

export type TomatoVariant = "focus" | "paused" | "idle";

export const TOMATO_COLORS = {
  body: "#E53935",
  leaf: "#43A047",
  text: "#FFFFFF",
  textStroke: "#7A1512",
} as const;

// Loading every system font takes ~2 s per render, far too slow for a 1 s tick, so
// resvg only loads Helvetica Neue (ships with every macOS; its digits are tabular,
// so the text doesn't jiggle as it counts down). ~3 ms per render.
const FONT_FAMILY = "Helvetica Neue";
const FONT_FILES = ["/System/Library/Fonts/HelveticaNeue.ttc"];

const FONT_SIZE = 12;
/** Up to two digits fit at FONT_SIZE; three (100+ minutes) shrink to about the same width. */
const FIT_CHARS = 2;
const PAUSED_OPACITY = 0.55;

export function tomatoSize(variant: TomatoVariant): { width: number; height: number } {
  return variant === "idle" ? { width: 18, height: 18 } : { width: 22, height: 22 };
}

function escapeXml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// The same art as the Phase 1 icon (electron/assets/trayTomato.svg).
const IDLE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18">
  <ellipse cx="9" cy="10.5" rx="7.5" ry="6.5" fill="${TOMATO_COLORS.body}"/>
  <path d="M9 4.2 L6.2 2.6 L7.4 4.6 L4.6 4.4 L7 5.6 L9 5.2 L11 5.6 L13.4 4.4 L10.6 4.6 L11.8 2.6 Z" fill="${TOMATO_COLORS.leaf}"/>
  <rect x="8.4" y="1.2" width="1.2" height="3.4" rx="0.6" fill="${TOMATO_COLORS.leaf}"/>
  <ellipse cx="6" cy="8.6" rx="1.6" ry="1" fill="#FFFFFF" opacity="0.35"/>
</svg>`;

/** SVG for the menu bar: a round 22×22 pt tomato with `text` inside, or the plain 18×18 pt tomato when idle. */
export function buildSvg(text: string, variant: TomatoVariant): string {
  if (variant === "idle") return IDLE_SVG;

  const fontSize =
    text.length <= FIT_CHARS ? FONT_SIZE : Math.round(((FONT_SIZE * (FIT_CHARS + 0.4)) / text.length) * 10) / 10;

  const tomato = [
    `<ellipse cx="11" cy="12.4" rx="10.4" ry="9.3" fill="${TOMATO_COLORS.body}"/>`,
    `<path d="M11 4.3 L8.3 2.2 L9.2 4 L6.2 3.8 L8.7 5.2 L11 4.8 L13.3 5.2 L15.8 3.8 L12.8 4 L13.7 2.2 Z" fill="${TOMATO_COLORS.leaf}"/>`,
    `<rect x="10.4" y="0.3" width="1.2" height="3.2" rx="0.6" fill="${TOMATO_COLORS.leaf}"/>`,
  ];
  const label =
    `<text x="11" y="16.7" text-anchor="middle" font-family="${FONT_FAMILY}" font-weight="700" ` +
    `font-size="${fontSize}" fill="${TOMATO_COLORS.text}" stroke="${TOMATO_COLORS.textStroke}" ` +
    `stroke-width="0.7" stroke-linejoin="round" paint-order="stroke">${escapeXml(text)}</text>`;

  // Paused: only the tomato is dimmed, so the number stays readable.
  const lines =
    variant === "paused"
      ? [`<g opacity="${PAUSED_OPACITY}">`, ...tomato.map((l) => `  ${l}`), `</g>`, label]
      : [...tomato, label];
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 22 22">`,
    ...lines.map((l) => `  ${l}`),
    `</svg>`,
  ].join("\n");
}

/** PNG of buildSvg() at `scale` (2 → 44×44 px for Retina, 1 → 22×22 px). */
export function renderPng(text: string, variant: TomatoVariant, scale: 1 | 2): Buffer {
  const resvg = new Resvg(buildSvg(text, variant), {
    fitTo: { mode: "zoom", value: scale },
    font: { loadSystemFonts: false, fontFiles: FONT_FILES, defaultFontFamily: FONT_FAMILY },
  });
  return resvg.render().asPng();
}

export interface ImageCache<T> {
  get(key: string): T;
  readonly size: number;
}

/** Small LRU cache, so a redraw of an unchanged countdown (e.g. while paused) reuses the image. */
export function createImageCache<T>(make: (key: string) => T, limit: number): ImageCache<T> {
  const entries = new Map<string, T>();
  return {
    get(key) {
      if (entries.has(key)) {
        // Re-insert so it becomes the most recently used.
        const hit = entries.get(key) as T;
        entries.delete(key);
        entries.set(key, hit);
        return hit;
      }
      const value = make(key);
      entries.set(key, value);
      if (entries.size > limit) {
        const oldest = entries.keys().next().value;
        if (oldest !== undefined) entries.delete(oldest);
      }
      return value;
    },
    get size() {
      return entries.size;
    },
  };
}

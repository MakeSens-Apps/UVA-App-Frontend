/**
 * B11 — Areachart (entrada web).
 *
 * Metro resuelve este archivo en la plataforma web.  Reexporta exactamente la
 * MISMA implementación que la entrada nativa (`AreachartSvg.tsx`), de modo que
 * web y Android rendericen idéntico: sin CanvasKit/WebAssembly ni Skia.
 */

export { Areachart, hexToRgba, default } from './AreachartSvg';
export type { AreachartProps } from './AreachartSvg';

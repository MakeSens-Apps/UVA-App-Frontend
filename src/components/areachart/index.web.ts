/**
 * B11 — Areachart barrel export (WEB)
 *
 * This file is resolved by Metro on web platform instead of index.ts.
 * Points to the SVG-only web variant which has no Skia / victory-native
 * dependency — those require CanvasKit (WebAssembly) which is unavailable
 * during the Expo-web Metro bundle phase.
 */
export { Areachart, hexToRgba } from './Areachart.web';
export type { AreachartProps } from './Areachart.web';

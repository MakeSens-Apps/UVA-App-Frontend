/**
 * B04 — ColorsModel
 * Ported from: src/models/configuration/colors.model.ts
 * Classification: Reusable as-is
 * Changes: none (import path only)
 * Used by: ThemeProvider (B08) to hydrate RACIMO branding colors
 */

// Interface para valores en formato HEX
interface HexColor {
  value: string; // Hex color code como '#69AB3C'
  group: string;
  type: 'HEX';
}

// Interface para valores en formato RGB
interface RgbColor {
  value: [number, number, number]; // RGB values como [105, 171, 60]
  group: string;
  type: 'RGB';
}

// Unión de ambas interfaces para manejar ambos formatos de color
type ColorData = HexColor | RgbColor;

// Interface general para el objeto JSON
export type ColorsModel = Record<string, ColorData>;

/**
 * B04 — IMeasurement interface
 * Ported from: src/app/Interfaces/IMeasurement.ts
 * Classification: Reusable as-is
 * Changes: none (import path only)
 */

export interface IMeasurement {
  name: string;
  sortName?: string;
  unit: string;
  icon: {
    enable?: boolean;
    iconName?: string;
    colorName?: string;
    colorHex?: string;
    imagePath?: string;
  };
  backgroundColor: {
    colorHex: string;
  };
  borderColor: {
    colorHex: string;
  };
  value?: number;
  fields?: number;
  fieldsArray?: string[];
  range?: {
    min: number;
    max: number;
    optionalMessage?: string;
  };
}

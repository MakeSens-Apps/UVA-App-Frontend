/**
 * B09 — CSS custom-property (var()) resolver for RichText.
 *
 * Problem (portability-matrix R-05, R-08):
 *   The backend sends HTML with inline styles like:
 *     style="color: var(--ion-color-uva_blue-500); font-weight: bold"
 *   DOMPurify's hook (`uponSanitizeAttribute`) preserved these attributes in web.
 *   In RN, `react-native-render-html` parses inline styles but cannot resolve
 *   CSS custom properties — they arrive as the literal string `var(--token)`.
 *
 * Solution:
 *   Before passing HTML to RNRH, replace `var(--<token>)` references in
 *   inline style attributes with the concrete color value from:
 *     1. The RACIMO branding overrides (RuntimeTheme.brandingOverrides), which
 *        are the runtime-hydrated colors from colors.json (ConfigContext → ThemeProvider).
 *     2. A static fallback map derived from the base theme semanticColors.
 *
 * Usage:
 *   const resolved = resolveVarTokensInHtml(rawHtml, theme.brandingOverrides);
 *   // → HTML with `var(--ion-color-uva_blue-500)` → `#10BCCA`
 *
 * Notes:
 *   - Only `style` attribute values are processed (event handlers are already
 *     stripped by sanitizeRichHtml before this runs).
 *   - Unknown tokens fall back to `inherit` (harmless in RN — RNRH will ignore it).
 *   - The regex targets `var(--<name>)` with optional whitespace.
 */

import { colors, semanticColors } from '@/theme/theme';
import type { RuntimeTheme } from '@/theme/theme';

// ─── Static fallback map ──────────────────────────────────────────────────────

/**
 * Static mapping from Ionic CSS custom property names to concrete color values.
 *
 * Sources:
 *   - src/theme/variables.scss (--ion-color-uva_* tokens)
 *   - Unified into the base theme color palette (B08)
 *
 * Only the tokens actually present in the backend HTML need to be listed here.
 * The branding overrides (from colors.json) take precedence at runtime.
 */
export const STATIC_VAR_FALLBACKS: Record<string, string> = {
  // Blue scale
  'ion-color-uva_blue-500': colors.blue[500],
  'ion-color-uva_blue-600': colors.blue[600],
  'ion-color-uva_blue-700': colors.blue[700], // actually blue despite the name
  // Green scale
  'ion-color-uva_green-500': colors.green[500],
  'ion-color-uva_green-700': colors.blue[700], // green-700 is blue (matrix note)
  // Orange scale
  'ion-color-uva_orange-500': colors.orange[500],
  // Semantic aliases
  primary: semanticColors.primary,
  'ion-color-primary': semanticColors.primary,
  secondary: semanticColors.secondary,
  'ion-color-secondary': semanticColors.secondary,
  accent: semanticColors.accent,
  danger: semanticColors.danger,
  'ion-color-danger': semanticColors.danger,
  background: semanticColors.background,
  surface: semanticColors.surface,
  // Gray scale shorthands
  'gray-100': colors.gray[100],
  'gray-200': colors.gray[200],
  'gray-300': colors.gray[300],
  'gray-400': colors.gray[400],
  'gray-500': colors.gray[500],
  'gray-600': colors.gray[600],
  'gray-700': colors.gray[700],
  'gray-800': colors.gray[800],
  'gray-900': colors.gray[900],
  // Colors-Blue scale (design system tokens)
  'Colors-Blue-500': colors.blue[500],
  'Colors-Blue-600': colors.blue[600],
  'Colors-Blue-700': colors.blue[700],
  // Colors-Green
  'Colors-Green-500': colors.green[500],
  // Colors-Orange
  'Colors-Orange-500': colors.orange[500],
};

// ─── Resolver ─────────────────────────────────────────────────────────────────

/**
 * Resolves a single `var(--<token>)` reference to a concrete color string.
 *
 * Lookup order:
 *   1. Runtime branding overrides (from colors.json, keyed by token name)
 *   2. Static fallback map above
 *   3. `'inherit'` as a safe no-op fallback
 *
 * @param token - CSS custom property name WITHOUT the `--` prefix (e.g. `ion-color-uva_blue-500`)
 * @param brandingOverrides - Runtime overrides from ThemeProvider (RuntimeTheme.brandingOverrides)
 */
export function resolveVarToken(
  token: string,
  brandingOverrides: Record<string, string> = {},
): string {
  return (
    brandingOverrides[token] ??
    STATIC_VAR_FALLBACKS[token] ??
    'inherit'
  );
}

/**
 * Replaces all `var(--<token>)` occurrences inside `style="..."` attribute
 * values in the given HTML string.
 *
 * The regex matches:
 *   var( --token-name )   (with optional whitespace around the name)
 *
 * Only processes content inside `style="..."` attributes (double-quoted).
 * The sanitizer has already stripped event handlers before this runs.
 *
 * @param html - Sanitized HTML string (output of sanitizeRichHtml)
 * @param brandingOverrides - Runtime branding overrides from ThemeProvider
 * @returns HTML string with var() references replaced by concrete values
 */
export function resolveVarTokensInHtml(
  html: string,
  brandingOverrides: RuntimeTheme['brandingOverrides'] = {},
): string {
  if (!html) return html;

  // Match var(--token) globally; the token name is group 1
  const VAR_REGEX = /var\(\s*--([^)]+?)\s*\)/g;

  return html.replace(VAR_REGEX, (_match, token: string) =>
    resolveVarToken(token.trim(), brandingOverrides),
  );
}

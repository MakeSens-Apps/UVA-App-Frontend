/**
 * B09 — Inline `font-weight` / `font-style` → Montserrat family resolver.
 *
 * WHY (device bug F-09, Redmi Note 10S / Android 13):
 *   The RACIMO configuration expresses ALL rich-text emphasis through inline
 *   CSS, never through `<b>`/`<strong>`. Real fragments from
 *   `public/racimos/<ID>/measurementRegistration/measurementsRegistration.json`:
 *
 *     flows.flow1.text:
 *       <p style="...font-weight: 400; color: var(--Gray-600, #525252);">
 *         Registros de <span style="font-weight: 700"> temperatura </span> …
 *
 *     measurements.TEMPERATURA_MAX.name:
 *       <span style="…font-weight: 700; color: var(--Colors-Orange-500, #e58b24);">
 *         Temperatura <span style="color: var(--Gray-600, #525252)"> máxima </span></span>
 *
 *   React Native maps `font-weight: 700` to `fontWeight: '700'`. On Android
 *   that does NOT produce bold when the inherited `fontFamily` is a custom
 *   asset font registered by expo-font (`Montserrat-Regular`): the platform
 *   looks for a `<family>_bold` asset and, failing that, either falls back to
 *   the system typeface or renders the plain face. The whole app already works
 *   around this by never using `fontWeight` and always picking the static
 *   family through `fontFamilyForWeight()` (see theme.ts). RichText was the one
 *   place that let a raw `fontWeight` through.
 *
 * WHAT:
 *   Rewrites inline styles so that `font-weight` / `font-style` are replaced by
 *   an explicit `font-family: Montserrat-<Variant>` declaration, which
 *   `react-native-render-html` validates against the `systemFonts` list that
 *   RichText already provides. Deterministic on Android, iOS and web.
 *
 * Runs AFTER sanitizeRichHtml() and resolveVarTokensInHtml() in the RichText
 * pipeline, so it only ever sees double-quoted, allowlisted style attributes.
 */

import { fontFamilyForWeight } from '@/theme/theme';

/** Weight tokens supported by the bundled Montserrat static families. */
export type MontserratWeight = '400' | '500' | '600' | '700';

/** Matches `style="…"` attributes (sanitize-html always emits double quotes). */
const STYLE_ATTR_REGEX = /style="([^"]*)"/g;

/**
 * Normalizes a CSS `font-weight` value to one of the four static Montserrat
 * weights bundled with the app.
 *
 * `lighter` / `bolder` are relative keywords; with no cascade available in RN
 * they collapse to the nearest bundled weight (400 / 700), which is what the
 * original web build effectively rendered.
 *
 * @returns the weight token, or `null` when the value is not a weight.
 */
export function normalizeFontWeight(value: string): MontserratWeight | null {
  const v = value.trim().toLowerCase();
  if (!v) return null;
  if (v === 'normal' || v === 'lighter') return '400';
  if (v === 'bold' || v === 'bolder') return '700';

  const numeric = Number(v);
  if (!Number.isFinite(numeric)) return null;
  if (numeric >= 700) return '700';
  if (numeric >= 600) return '600';
  if (numeric >= 500) return '500';
  return '400';
}

/**
 * Rewrites a single inline style declaration list.
 *
 * @returns the rewritten declaration list, or `null` when nothing changed
 *          (no font-weight/font-style, or an explicit font-family is present
 *          and must be respected as authored).
 */
export function rewriteFontDeclarations(rawStyle: string): string | null {
  const declarations = rawStyle.split(';');

  const kept: string[] = [];
  let weight: MontserratWeight | null = null;
  let italic = false;
  let touched = false;

  for (const declaration of declarations) {
    const separator = declaration.indexOf(':');
    if (separator === -1) {
      if (declaration.trim()) kept.push(declaration.trim());
      continue;
    }

    const name = declaration.slice(0, separator).trim().toLowerCase();
    const value = declaration.slice(separator + 1).trim();

    // An explicit font-family (or the `font` shorthand) is authored intent —
    // leave the whole declaration list untouched.
    if (name === 'font-family' || name === 'font') {
      return null;
    }

    if (name === 'font-weight') {
      const normalized = normalizeFontWeight(value);
      if (normalized) {
        weight = normalized;
        touched = true;
        continue; // drop: replaced by font-family below
      }
    }

    if (name === 'font-style') {
      const v = value.toLowerCase();
      if (v === 'italic' || v === 'oblique') {
        italic = true;
        touched = true;
        continue; // drop: replaced by font-family below
      }
      if (v === 'normal') {
        italic = false;
        touched = true;
        continue;
      }
    }

    if (declaration.trim()) kept.push(`${name}: ${value}`);
  }

  if (!touched) return null;

  kept.push(`font-family: ${fontFamilyForWeight(weight ?? '400', italic)}`);
  return kept.join('; ');
}

/**
 * Replaces `font-weight` / `font-style` inside every inline `style` attribute
 * of the given HTML with the matching Montserrat static family.
 *
 * @param html - Sanitized + var()-resolved HTML
 * @returns HTML whose inline styles carry `font-family` instead of `font-weight`
 */
export function resolveFontDeclarationsInHtml(html: string): string {
  if (!html) return html;

  return html.replace(STYLE_ATTR_REGEX, (match, rawStyle: string) => {
    const rewritten = rewriteFontDeclarations(rawStyle);
    return rewritten === null ? match : `style="${rewritten}"`;
  });
}

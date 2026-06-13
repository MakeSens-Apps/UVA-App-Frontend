/**
 * B09 — HTML sanitizer using sanitize-html.
 *
 * Ported from: src/app/core/pipes/safe-html.pipe.ts (SafeHtmlPipe)
 *
 * Preserves the EXACT allowlist from DOMPurify (tags + attrs) as the
 * security specification (portability-matrix §4.4, risks R-08 / R-34).
 *
 * DOMPurify original configuration (safe-html.pipe.ts):
 *   ALLOWED_TAGS: b, i, u, a, p, div, span, h1-h6, img, table, td, th, tr,
 *                 ul, li, ol, strong, em, br, hr, style
 *   ALLOWED_ATTR: href, src, alt, title, style
 *   Custom hook `uponSanitizeAttribute`: keeps `style` attributes that contain
 *   `var(...)` (CSS custom properties).
 *
 * RN mapping for `style="...var(--token)"`:
 *   - DOMPurify's hook kept the raw `var(...)` string in the DOM attribute.
 *   - sanitize-html cannot run hooks, so we KEEP the style attribute as-is
 *     (sanitize-html already restricts to our allowed attrs list).
 *   - The consuming component (RichText) maps known `var(--token)` references
 *     to concrete theme values via `resolveVarToken()`.
 *
 * Changes from original:
 *   - `style` tag removed from ALLOWED_TAGS: react-native-render-html ignores
 *     `<style>` elements anyway; keeping it would carry embedded CSS with no effect.
 *     DOMPurify allowed it for web rendering; in RN it is harmless but useless.
 *     Documented as deviation (style tag stripped for RN).
 *   - All other tags and attrs are IDENTICAL to the original allowlist.
 */

import sanitizeHtml from 'sanitize-html';

// ─── Allowlist (mirrors DOMPurify ALLOWED_TAGS/ALLOWED_ATTR) ─────────────────

/**
 * Allowed HTML tags — exact copy of DOMPurify ALLOWED_TAGS, minus `style`
 * (irrelevant in RN; react-native-render-html ignores embedded CSS sheets).
 *
 * Security spec: anything NOT in this list is stripped by sanitize-html,
 * identical to DOMPurify behavior.
 */
export const ALLOWED_TAGS: string[] = [
  'b',
  'i',
  'u',
  'a',
  'p',
  'div',
  'span',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'img',
  'table',
  'td',
  'th',
  'tr',
  'ul',
  'li',
  'ol',
  'strong',
  'em',
  'br',
  'hr',
  // NOTE: 'style' tag intentionally omitted — see file header
];

/**
 * Allowed HTML attributes — exact copy of DOMPurify ALLOWED_ATTR.
 *
 * `style` is kept as an attribute (not as a tag) to preserve inline styles
 * including `var(--token)` references, mirroring the DOMPurify hook behavior.
 */
export const ALLOWED_ATTR: string[] = [
  'href',
  'src',
  'alt',
  'title',
  'style',
];

/**
 * sanitize-html options that replicate the DOMPurify configuration.
 *
 * `allowedAttributes: false` would allow all attrs; instead we specify
 * a per-tag allowlist that grants our ALLOWED_ATTR set to every tag.
 * This is the closest equivalent to DOMPurify's global ALLOWED_ATTR.
 */
export const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ALLOWED_TAGS,
  allowedAttributes: {
    // Grant ALLOWED_ATTR to every tag (wildcard key '*')
    '*': ALLOWED_ATTR,
  },
  // CRITICAL for RN/Hermes: sanitize-html's default (true) parses style
  // attributes with postcss, which only works in a Node environment
  // (sanitize-html issue #547). On-device the parse throws and the WHOLE
  // style attribute is silently dropped — stripping every inline style
  // (colors/weights of measurement sortName, guide HTML, etc.) while Jest
  // (Node) keeps them. We don't use `allowedStyles`, so keeping the raw
  // attribute is safe and mirrors the original DOMPurify behavior.
  parseStyleAttributes: false,
  // Allow data URIs in src (mirrors DOMPurify default which allows them)
  allowedSchemes: ['http', 'https', 'data', 'file'],
  allowedSchemesByTag: {
    a: ['http', 'https', 'mailto', 'tel'],
    img: ['http', 'https', 'data', 'file'],
  },
};

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Sanitizes an HTML string using the same allowlist as the original DOMPurify
 * configuration in SafeHtmlPipe.
 *
 * Returns a sanitized string safe to pass to react-native-render-html.
 *
 * Security contract:
 *   - `<script>`, `<iframe>`, `<object>`, `<embed>`, etc. are stripped.
 *   - Event handlers (onload, onerror, onclick, etc.) are stripped.
 *   - Only href/src/alt/title/style attributes survive.
 *   - `style` attribute values (including `var(--token)`) are kept as-is
 *     for the RichText component to resolve to theme tokens.
 *
 * @param html - Raw HTML string from backend (S3 guides, flow text, etc.)
 * @returns Sanitized HTML string
 */
export function sanitizeRichHtml(html: string): string {
  if (!html || typeof html !== 'string') {
    return '';
  }
  return sanitizeHtml(html, SANITIZE_OPTIONS);
}

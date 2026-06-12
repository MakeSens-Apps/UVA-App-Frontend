/**
 * B09 — rich-text barrel export
 */
export { RichText, default } from './RichText';
export { sanitizeRichHtml, ALLOWED_TAGS, ALLOWED_ATTR } from './sanitize';
export { resolveVarTokensInHtml, resolveVarToken } from './varTokenResolver';
export type { RichTextProps } from './RichText';

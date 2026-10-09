/**
 * B09 — rich-text barrel export
 */
export {
  RichText,
  default,
  RICH_TEXT_ENGINE_DEFAULTS,
  RICH_TEXT_SYSTEM_FONTS,
} from './RichText';
export { sanitizeRichHtml, ALLOWED_TAGS, ALLOWED_ATTR } from './sanitize';
export { resolveVarTokensInHtml, resolveVarToken } from './varTokenResolver';
export {
  resolveFontDeclarationsInHtml,
  rewriteFontDeclarations,
  normalizeFontWeight,
} from './fontDeclarationResolver';
export type { RichTextProps } from './RichText';

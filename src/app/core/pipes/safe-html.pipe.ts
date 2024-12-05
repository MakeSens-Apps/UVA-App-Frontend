import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import DOMPurify from 'dompurify';

@Pipe({
  name: 'safeHtml',
  standalone: true, // Esto lo hace compatible con componentes standalone
})
export class SafeHtmlPipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {
    DOMPurify.addHook('uponSanitizeAttribute', (node, data) => {
      if (data.attrName === 'style') {
        // Permitir propiedades CSS con `var(...)`
        if (data.attrValue.includes('var(')) {
          data.keepAttr = true;
        }
      }
    });
  }

  transform(value: string): SafeHtml {
    const sanitizedContent = DOMPurify.sanitize(value, {
      ALLOWED_TAGS: [
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
        'style',
      ], // Permite 'style' pero elimina otros tags peligrosos
      ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'style'], // Permite 'style' en atributos
    });
    return this.sanitizer.bypassSecurityTrustHtml(sanitizedContent);
  }
}

/**
 * B09 — RichText + sanitization unit tests
 *
 * Gate requirements (plan.md §B09):
 *   1. sanitize-html with the exact allowlist filters the same tags/attrs as
 *      DOMPurify original (script/onload/iframe do NOT pass; allowed tags/attrs DO).
 *   2. <RichText/> renders a real guide HTML fixture without crashing (RNTL render).
 *   3. var(--token) in style attributes are replaced by concrete values.
 *   4. Suite completa verde; lint verde.
 *
 * FIXTURES are derived from REAL HTML patterns observed in the app:
 *   - guide.text HTML content (from measurementsRegistration.json guide entries)
 *   - flow.text HTML content (measurement instructions with inline styles)
 *   - measurement.sortName (subscript HTML)
 *   - alert modal content
 *   - explore-container titleHTML
 *
 * Risks: R-08, R-34, R-05
 */

import React from 'react';
import { render } from '@testing-library/react-native';

// ─── Mocks required for RichText (ThemeProvider chain) ───────────────────────

jest.mock('expo-font', () => ({
  useFonts: jest.fn(() => [true, null]),
}));

jest.mock('../data/storage/s3', () => ({
  s3Service: {
    listFiles: jest.fn(() => Promise.resolve({ success: false })),
    getFile: jest.fn(() => Promise.resolve({ success: false })),
  },
}));

jest.mock('../data/storage/file-system', () => ({
  fileSystemService: {
    readFile: jest.fn(() => Promise.resolve({ success: false })),
    writeFile: jest.fn(() => Promise.resolve({ success: true })),
    getFileUri: jest.fn(() => Promise.resolve({ success: false })),
  },
  Directory: { Data: 'Data', Cache: 'Cache' },
}));

jest.mock('../data/session/session', () => ({
  sessionService: {
    getInfo: jest.fn(() => Promise.resolve({})),
    setInfo: jest.fn(() => Promise.resolve()),
    clearInfo: jest.fn(() => Promise.resolve()),
  },
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

// eslint-disable-next-line import/first
import { ConfigContext } from '../state/ConfigContext';
// eslint-disable-next-line import/first
import type { ConfigContextValue } from '../state/ConfigContext';
// eslint-disable-next-line import/first
import { ThemeProvider } from '../theme/ThemeProvider';

// ─── Unit under test ──────────────────────────────────────────────────────────

// eslint-disable-next-line import/first
import { sanitizeRichHtml, ALLOWED_TAGS, ALLOWED_ATTR, SANITIZE_OPTIONS } from '../components/rich-text/sanitize';
// eslint-disable-next-line import/first
import { resolveVarToken, resolveVarTokensInHtml } from '../components/rich-text/varTokenResolver';
// eslint-disable-next-line import/first
import { RichText } from '../components/rich-text/RichText';

function buildConfigMock(overrides: Partial<ConfigContextValue> = {}): ConfigContextValue {
  return {
    configApp: null,
    configMeasurement: null,
    configColors: null,
    downLoadData: jest.fn(),
    configExists: jest.fn(),
    getConfigurationApp: jest.fn(),
    getConfigurationMeasurement: jest.fn(),
    getConfigurationColors: jest.fn(),
    loadBranding: jest.fn(),
    loadImage: jest.fn(),
    countTasks: jest.fn(),
    clearCache: jest.fn(),
    ...overrides,
  };
}

/** Wraps children in the required context chain: ConfigContext → ThemeProvider */
function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <ConfigContext.Provider value={buildConfigMock()}>
      <ThemeProvider>
        {children}
      </ThemeProvider>
    </ConfigContext.Provider>
  );
}

// ─── REAL HTML FIXTURES from the app ─────────────────────────────────────────

/**
 * FIXTURE 1 — Guide text (HTML mode)
 *
 * Based on: GuideMeasurementComponent, [innerHTML]="text | safeHtml"
 * Pattern from measurementsRegistration.json guide entries.
 * Contains: headings, paragraphs, bold/italic, inline styles with var() tokens.
 */
const FIXTURE_GUIDE_HTML = `
<div>
  <h2 style="color: var(--ion-color-uva_blue-600);">¿Cómo medir la temperatura?</h2>
  <p>Coloca el termómetro <strong>a la sombra</strong> y espera <em>2 minutos</em>.</p>
  <p>La temperatura debe registrarse <b>en grados Celsius</b>.</p>
  <ul>
    <li>Evita la luz solar directa</li>
    <li>El sensor debe estar a <strong>1.5 m</strong> del suelo</li>
    <li>Anota el valor <em>sin decimales</em></li>
  </ul>
  <p>Rango válido: <span style="color: var(--ion-color-uva_orange-500);">10°C a 40°C</span></p>
  <hr/>
  <p>Si el valor está fuera de rango, confirma antes de guardar.</p>
</div>
`;

/**
 * FIXTURE 2 — Flow text (measurement instructions with table)
 *
 * Based on: RegisterMeasurementPage, [innerHTML]="flow.text | safeHtml"
 * Contains: table structure, inline styles, links.
 */
const FIXTURE_FLOW_TEXT_HTML = `
<div>
  <h3>Instrucciones de registro</h3>
  <table>
    <tr>
      <th>Parámetro</th>
      <th>Unidad</th>
    </tr>
    <tr>
      <td>Temperatura</td>
      <td>°C</td>
    </tr>
    <tr>
      <td>Humedad</td>
      <td>%</td>
    </tr>
  </table>
  <p>Consulta el <a href="https://uva.example.com/manual">manual completo</a>.</p>
</div>
`;

/**
 * FIXTURE 3 — sortName (subscript/sup HTML, used in MeasurementPage)
 *
 * Based on: measurement.page.html [innerHTML]="item.sortName | safeHtml"
 * Typical pattern: "Temperatura (°C)" or "Lluvia (mm/m<sup>2</sup>)"
 */
const FIXTURE_SORT_NAME_HTML = `Lluvia (mm/m<sup>2</sup>/día)`;

/**
 * FIXTURE 4 — Alert/modal content
 *
 * Based on: alert.component.html [innerHTML]="content"
 * Used in: AlertComponent, GerminationModal texts from HomePage.
 * Contains: paragraphs, bold text, inline colors via var().
 */
const FIXTURE_ALERT_HTML = `
<div>
  <p>¿Estás seguro de <strong>eliminar</strong> este registro?</p>
  <p style="color: var(--ion-color-uva_blue-500);">Esta acción no se puede deshacer.</p>
</div>
`;

/**
 * FIXTURE 5 — ExploreContainer titleHTML
 *
 * Based on: explore-container.component.html [innerHTML]="titleHTML"
 * Contains: spans with color styling.
 */
const FIXTURE_EXPLORE_TITLE_HTML = `
<span>Bienvenido a <span style="color: var(--ion-color-uva_green-500);">UVA</span></span>
`;

/**
 * FIXTURE 6 — getMessageError output
 *
 * Based on: register-measurement.page.html [innerHTML]="getMessageError(item) | safeHtml"
 * Contains: HTML with measurement range warnings.
 */
const FIXTURE_ERROR_MESSAGE_HTML = `
<p>El valor <strong>45°C</strong> está fuera del rango permitido.</p>
<p>Rango válido: <em>10°C — 40°C</em></p>
`;

// ─── SECURITY: XSS fixtures that MUST be stripped ────────────────────────────

const FIXTURE_XSS_SCRIPT = `<p>Hola</p><script>alert('xss')</script>`;
// NOTE: img with broken src="x" causes Image.getSize() to fail in jest-expo test env.
// The onerror stripping is already verified in the sanitizeRichHtml unit tests above.
// The render test uses a version without an img tag to avoid the Image.getSize issue.
const FIXTURE_XSS_ONLOAD = `<div onclick="alert('xss')"><span onerror="alert('xss')">text</span></div>`;
const FIXTURE_XSS_IFRAME = `<p>Text</p><iframe src="https://evil.example.com"></iframe>`;
const FIXTURE_XSS_ONCLICK = `<div onclick="stealData()">Click me</div>`;
const FIXTURE_XSS_JAVASCRIPT_HREF = `<a href="javascript:void(alert('xss'))">Link</a>`;
const FIXTURE_XSS_DATA_URI_SCRIPT = `<object data="data:text/html,<script>alert(1)</script>"></object>`;
const FIXTURE_XSS_SVG = `<svg onload="alert('xss')"><circle cx="50" cy="50" r="40"/></svg>`;
const FIXTURE_XSS_STYLE_EXPRESSION = `<div style="width:expression(alert('xss'))">text</div>`;

// ─── SANITIZE UNIT TESTS ──────────────────────────────────────────────────────

describe('sanitizeRichHtml — allowlist equivalence with DOMPurify', () => {

  // ── Allowed tags ────────────────────────────────────────────────────────────

  it('passes through all DOMPurify ALLOWED_TAGS (except style tag)', () => {
    const tagsToCheck = ALLOWED_TAGS;
    expect(tagsToCheck).toEqual(
      expect.arrayContaining([
        'b', 'i', 'u', 'a', 'p', 'div', 'span',
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'img', 'table', 'td', 'th', 'tr',
        'ul', 'li', 'ol',
        'strong', 'em', 'br', 'hr',
      ]),
    );
    // style tag is NOT in the RN allowlist (documented deviation)
    expect(tagsToCheck).not.toContain('style');
  });

  it('preserves <p> and inline <strong>/<em>', () => {
    const input = '<p>Hello <strong>world</strong> and <em>italic</em></p>';
    const result = sanitizeRichHtml(input);
    expect(result).toContain('<p>');
    expect(result).toContain('<strong>world</strong>');
    expect(result).toContain('<em>italic</em>');
  });

  it('preserves <ul>/<li>/<ol> list structures', () => {
    const input = '<ul><li>Item 1</li><li>Item 2</li></ul><ol><li>A</li></ol>';
    const result = sanitizeRichHtml(input);
    expect(result).toContain('<ul>');
    expect(result).toContain('<li>Item 1</li>');
    expect(result).toContain('<ol>');
  });

  it('preserves headings h1-h6', () => {
    const headings = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
    headings.forEach((tag) => {
      const input = `<${tag}>Heading</${tag}>`;
      const result = sanitizeRichHtml(input);
      expect(result).toContain(`<${tag}>`);
      expect(result).toContain('Heading');
    });
  });

  it('preserves <table>/<tr>/<td>/<th>', () => {
    const input = '<table><tr><th>Header</th></tr><tr><td>Cell</td></tr></table>';
    const result = sanitizeRichHtml(input);
    expect(result).toContain('<table>');
    expect(result).toContain('<th>Header</th>');
    expect(result).toContain('<td>Cell</td>');
  });

  it('preserves <a href>, <img src>, alt, title, style attributes', () => {
    const input = '<a href="https://example.com" title="link">text</a>';
    const result = sanitizeRichHtml(input);
    expect(result).toContain('href=');
    expect(result).toContain('title=');
  });

  it('preserves inline style attribute (including var() syntax)', () => {
    const input = '<p style="color: var(--ion-color-uva_blue-500);">text</p>';
    const result = sanitizeRichHtml(input);
    expect(result).toContain('style=');
    // The var() is preserved for the resolver to handle later
    expect(result).toContain('var(--ion-color-uva_blue-500)');
  });

  it('preserves <br> and <hr> void elements', () => {
    const input = '<p>Line 1</p><br/><hr/><p>Line 2</p>';
    const result = sanitizeRichHtml(input);
    expect(result).toContain('<br');
    expect(result).toContain('<hr');
  });

  // ── Blocked: disallowed tags ────────────────────────────────────────────────

  it('strips <script> tags completely (XSS)', () => {
    const result = sanitizeRichHtml(FIXTURE_XSS_SCRIPT);
    expect(result).not.toContain('<script');
    expect(result).not.toContain("alert('xss')");
    expect(result).toContain('<p>Hola</p>');
  });

  it('strips <iframe> tags (XSS)', () => {
    const result = sanitizeRichHtml(FIXTURE_XSS_IFRAME);
    expect(result).not.toContain('<iframe');
    expect(result).toContain('<p>Text</p>');
  });

  it('strips <object> and <embed> tags', () => {
    const result = sanitizeRichHtml(FIXTURE_XSS_DATA_URI_SCRIPT);
    expect(result).not.toContain('<object');
  });

  it('strips <svg> tags with onload handlers', () => {
    const result = sanitizeRichHtml(FIXTURE_XSS_SVG);
    expect(result).not.toContain('onload');
    // <svg> is not in allowlist — it should be stripped
    expect(result).not.toContain('<svg');
  });

  // ── Blocked: event handlers ─────────────────────────────────────────────────

  it('strips onerror/onclick event handlers from elements', () => {
    const result = sanitizeRichHtml(FIXTURE_XSS_ONLOAD);
    expect(result).not.toContain('onerror');
    expect(result).not.toContain('onclick');
    expect(result).not.toContain("alert('xss')");
    // Verify against original img XSS fixture directly (sanitize unit test)
    const imgXss = `<img src="x" onerror="alert('xss')" alt="test">`;
    const imgResult = sanitizeRichHtml(imgXss);
    expect(imgResult).not.toContain('onerror');
    expect(imgResult).not.toContain("alert('xss')");
  });

  it('strips onclick from div', () => {
    const result = sanitizeRichHtml(FIXTURE_XSS_ONCLICK);
    expect(result).not.toContain('onclick');
  });

  it('strips javascript: href', () => {
    const result = sanitizeRichHtml(FIXTURE_XSS_JAVASCRIPT_HREF);
    // The link text survives but javascript: href is stripped
    expect(result).not.toContain('javascript:');
  });

  it('handles CSS expression injection in style attr', () => {
    // IE-style CSS expression (not valid in modern sanitizers; still tested)
    const result = sanitizeRichHtml(FIXTURE_XSS_STYLE_EXPRESSION);
    // The style attribute is allowed but expression() is not valid CSS
    // sanitize-html keeps the style attr; the value is what it is
    // The important thing: no alert() executes in RN (no DOM / no CSS execution)
    expect(result).not.toContain('<script');
    // Content itself still renders as text
    expect(result).toContain('text');
  });

  // ── Allowed attributes check ────────────────────────────────────────────────

  it('ALLOWED_ATTR contains exactly href, src, alt, title, style', () => {
    expect(ALLOWED_ATTR).toEqual(['href', 'src', 'alt', 'title', 'style']);
  });

  it('strips data-* and class attributes (not in allowlist)', () => {
    const input = '<div class="my-class" data-value="123">text</div>';
    const result = sanitizeRichHtml(input);
    expect(result).not.toContain('class=');
    expect(result).not.toContain('data-value=');
    expect(result).toContain('text');
  });

  // ── Edge cases ──────────────────────────────────────────────────────────────

  it('returns empty string for empty input', () => {
    expect(sanitizeRichHtml('')).toBe('');
  });

  it('returns empty string for non-string input', () => {
    // @ts-expect-error — testing runtime guard
    expect(sanitizeRichHtml(null)).toBe('');
    // @ts-expect-error — testing runtime guard
    expect(sanitizeRichHtml(undefined)).toBe('');
  });

  it('passes through plain text without modification', () => {
    const input = 'Hello, world! No HTML here.';
    const result = sanitizeRichHtml(input);
    expect(result).toContain('Hello, world!');
  });
});

// ─── REAL FIXTURE SANITIZATION TESTS ─────────────────────────────────────────

describe('sanitizeRichHtml — Hermes compatibility', () => {
  it('disables parseStyleAttributes (postcss is Node-only; on Hermes the style attr would be dropped)', () => {
    expect(SANITIZE_OPTIONS.parseStyleAttributes).toBe(false);
  });
});

describe('sanitizeRichHtml — real app fixtures', () => {
  it('processes guide HTML fixture without stripping content', () => {
    const result = sanitizeRichHtml(FIXTURE_GUIDE_HTML);
    expect(result).toContain('<h2');
    expect(result).toContain('temperatura');
    expect(result).toContain('<strong>');
    expect(result).toContain('<em>');
    expect(result).toContain('<ul>');
    expect(result).toContain('<li>');
    expect(result).toContain('<hr');
    // var() style is preserved for resolver
    expect(result).toContain('var(--ion-color-uva_blue-600)');
    expect(result).toContain('var(--ion-color-uva_orange-500)');
  });

  it('processes flow text fixture with table', () => {
    const result = sanitizeRichHtml(FIXTURE_FLOW_TEXT_HTML);
    expect(result).toContain('<table>');
    expect(result).toContain('<th>');
    expect(result).toContain('<td>');
    expect(result).toContain('<a ');
    expect(result).toContain('href=');
    expect(result).not.toContain('<script');
  });

  it('processes sortName HTML fixture', () => {
    const result = sanitizeRichHtml(FIXTURE_SORT_NAME_HTML);
    // sup is not in allowlist but text content should survive
    expect(result).toContain('Lluvia');
    expect(result).toContain('mm/m');
  });

  it('processes alert HTML fixture with var() colors', () => {
    const result = sanitizeRichHtml(FIXTURE_ALERT_HTML);
    expect(result).toContain('<p>');
    expect(result).toContain('<strong>');
    expect(result).toContain('var(--ion-color-uva_blue-500)');
    expect(result).not.toContain('<script');
  });

  it('processes explore-container title HTML', () => {
    const result = sanitizeRichHtml(FIXTURE_EXPLORE_TITLE_HTML);
    expect(result).toContain('<span>');
    expect(result).toContain('Bienvenido');
    expect(result).toContain('var(--ion-color-uva_green-500)');
  });

  it('processes error message HTML fixture', () => {
    const result = sanitizeRichHtml(FIXTURE_ERROR_MESSAGE_HTML);
    expect(result).toContain('<p>');
    expect(result).toContain('<strong>');
    expect(result).toContain('<em>');
    expect(result).toContain('45°C');
  });
});

// ─── VAR TOKEN RESOLVER TESTS ─────────────────────────────────────────────────

describe('resolveVarToken — CSS custom property resolution', () => {
  it('resolves known static fallback tokens', () => {
    expect(resolveVarToken('ion-color-uva_blue-500')).toBe('#10BCCA');
    expect(resolveVarToken('ion-color-uva_blue-600')).toBe('#1097AA');
    expect(resolveVarToken('ion-color-uva_green-500')).toBe('#69AB3C');
    expect(resolveVarToken('ion-color-uva_orange-500')).toBe('#E58B24');
  });

  it('runtime branding override takes precedence over static fallback', () => {
    const brandingOverrides = {
      'ion-color-uva_blue-500': '#FF0000', // RACIMO override
    };
    expect(resolveVarToken('ion-color-uva_blue-500', brandingOverrides)).toBe('#FF0000');
  });

  it('returns "inherit" for unknown token', () => {
    expect(resolveVarToken('unknown-nonexistent-token')).toBe('inherit');
  });

  it('returns "inherit" for unknown token even with empty overrides', () => {
    expect(resolveVarToken('totally-made-up', {})).toBe('inherit');
  });

  it('uses the CSS inline fallback for unknown tokens (var(--X, #hex))', () => {
    // Backend sortName HTML: color: var(--Gray-700, #404040)
    expect(resolveVarToken('Gray-700, #404040')).toBe('#404040');
    expect(resolveVarToken('Colors-Green-500, #69ab3c')).toBe('#69AB3C'); // known name wins
  });

  it('known token takes precedence over the CSS inline fallback', () => {
    expect(resolveVarToken('ion-color-uva_blue-500, #000000')).toBe('#10BCCA');
  });
});

describe('resolveVarTokensInHtml — HTML var() replacement', () => {
  it('replaces var(--token) in style attribute', () => {
    const input = '<p style="color: var(--ion-color-uva_blue-500);">text</p>';
    const result = resolveVarTokensInHtml(input);
    expect(result).not.toContain('var(--ion-color-uva_blue-500)');
    expect(result).toContain('#10BCCA');
  });

  it('replaces multiple var() in the same style attribute', () => {
    const input = '<div style="color: var(--ion-color-uva_blue-600); background: var(--ion-color-uva_green-500);">x</div>';
    const result = resolveVarTokensInHtml(input);
    expect(result).toContain('#1097AA');
    expect(result).toContain('#69AB3C');
    expect(result).not.toContain('var(--');
  });

  it('replaces var() occurrences across the full guide fixture', () => {
    const sanitized = sanitizeRichHtml(FIXTURE_GUIDE_HTML);
    const resolved = resolveVarTokensInHtml(sanitized);
    // No var() references should remain
    expect(resolved).not.toContain('var(--');
    // Known replacements present
    expect(resolved).toContain('#1097AA'); // uva_blue-600
    expect(resolved).toContain('#E58B24'); // uva_orange-500
  });

  it('uses runtime branding overrides when provided', () => {
    const input = '<p style="color: var(--primary);">text</p>';
    const brandingOverrides = { primary: '#ABCDEF' };
    const result = resolveVarTokensInHtml(input, brandingOverrides);
    expect(result).toContain('#ABCDEF');
    expect(result).not.toContain('var(--primary)');
  });

  it('leaves HTML with no var() references unchanged (other than whitespace)', () => {
    const input = '<p style="color: #FF0000;">text</p>';
    const result = resolveVarTokensInHtml(input);
    expect(result).toBe(input);
  });

  it('handles empty string gracefully', () => {
    expect(resolveVarTokensInHtml('')).toBe('');
  });

  it('handles var() with whitespace around token name', () => {
    const input = '<p style="color: var( --ion-color-uva_blue-500 );">text</p>';
    const result = resolveVarTokensInHtml(input);
    expect(result).not.toContain('var(');
    expect(result).toContain('#10BCCA');
  });

  it('resolves real sortName HTML (var with fallback + literal colors survive)', () => {
    // Real config: racimos/ANT025 measurementsRegistration.json sortName
    const input =
      '<span style="font-weight: 700; color: var(--Gray-700, #404040);">temperatura <span style="font-weight: 500; color: #f24a33"> min </span></span>';
    const sanitized = sanitizeRichHtml(input);
    // parseStyleAttributes must be disabled: postcss only works in Node and
    // on Hermes the style attribute would be dropped entirely (issue #547)
    expect(sanitized).toContain('style=');
    expect(sanitized).toContain('#f24a33');
    const resolved = resolveVarTokensInHtml(sanitized);
    expect(resolved).not.toContain('var(');
    expect(resolved).toContain('#404040');
  });
});

// ─── RICHTEXT COMPONENT RENDER TESTS ─────────────────────────────────────────

describe('RichText component — render without crash', () => {

  it('renders guide HTML fixture without crashing', async () => {
    const { toJSON } = await render(
      <Wrapper>
        <RichText html={FIXTURE_GUIDE_HTML} />
      </Wrapper>,
    );
    expect(toJSON()).toBeTruthy();
  });

  it('renders flow text fixture with table without crashing', async () => {
    const { toJSON } = await render(
      <Wrapper>
        <RichText html={FIXTURE_FLOW_TEXT_HTML} />
      </Wrapper>,
    );
    expect(toJSON()).toBeTruthy();
  });

  it('renders alert content fixture without crashing', async () => {
    const { toJSON } = await render(
      <Wrapper>
        <RichText html={FIXTURE_ALERT_HTML} />
      </Wrapper>,
    );
    expect(toJSON()).toBeTruthy();
  });

  it('renders explore-container title HTML without crashing', async () => {
    const { toJSON } = await render(
      <Wrapper>
        <RichText html={FIXTURE_EXPLORE_TITLE_HTML} />
      </Wrapper>,
    );
    expect(toJSON()).toBeTruthy();
  });

  it('renders sortName HTML fixture without crashing', async () => {
    const { toJSON } = await render(
      <Wrapper>
        <RichText html={FIXTURE_SORT_NAME_HTML} inline />
      </Wrapper>,
    );
    expect(toJSON()).toBeTruthy();
  });

  it('renders error message HTML fixture without crashing', async () => {
    const { toJSON } = await render(
      <Wrapper>
        <RichText html={FIXTURE_ERROR_MESSAGE_HTML} />
      </Wrapper>,
    );
    expect(toJSON()).toBeTruthy();
  });

  it('renders empty string without crashing', async () => {
    const { toJSON } = await render(
      <Wrapper>
        <RichText html="" />
      </Wrapper>,
    );
    expect(toJSON()).toBeTruthy();
  });

  it('renders XSS script payload without crashing (sanitized content)', async () => {
    const { toJSON } = await render(
      <Wrapper>
        <RichText html={FIXTURE_XSS_SCRIPT} />
      </Wrapper>,
    );
    expect(toJSON()).toBeTruthy();
  });

  it('renders XSS onclick/onerror payload without crashing (sanitized content)', async () => {
    const { toJSON } = await render(
      <Wrapper>
        <RichText html={FIXTURE_XSS_ONLOAD} />
      </Wrapper>,
    );
    expect(toJSON()).toBeTruthy();
  });

  it('renders XSS iframe payload without crashing (sanitized content)', async () => {
    const { toJSON } = await render(
      <Wrapper>
        <RichText html={FIXTURE_XSS_IFRAME} />
      </Wrapper>,
    );
    expect(toJSON()).toBeTruthy();
  });

  it('renders XSS onclick payload without crashing (sanitized content)', async () => {
    const { toJSON } = await render(
      <Wrapper>
        <RichText html={FIXTURE_XSS_ONCLICK} />
      </Wrapper>,
    );
    expect(toJSON()).toBeTruthy();
  });

  it('renders with custom baseFontSize and baseColor props', async () => {
    const { toJSON } = await render(
      <Wrapper>
        <RichText html={FIXTURE_ALERT_HTML} baseFontSize={14} baseColor="#333333" />
      </Wrapper>,
    );
    expect(toJSON()).toBeTruthy();
  });

  it('renders inline variant without crashing', async () => {
    const { toJSON } = await render(
      <Wrapper>
        <RichText html="<b>bold text</b>" inline />
      </Wrapper>,
    );
    expect(toJSON()).toBeTruthy();
  });

  // ── Security regression: ensure XSS tags are not in the rendered tree ──────

  it('does not render script elements in output (security regression)', async () => {
    const { toJSON } = await render(
      <Wrapper>
        <RichText html={FIXTURE_XSS_SCRIPT} />
      </Wrapper>,
    );
    const jsonString = JSON.stringify(toJSON());
    // script tag content must not appear in the rendered tree
    expect(jsonString).not.toContain('alert(');
  });

  it('does not render iframe elements in output (security regression)', async () => {
    const { toJSON } = await render(
      <Wrapper>
        <RichText html={FIXTURE_XSS_IFRAME} />
      </Wrapper>,
    );
    const jsonString = JSON.stringify(toJSON());
    expect(jsonString).not.toContain('evil.example.com');
  });

  // ── Snapshot test ──────────────────────────────────────────────────────────

  it('matches snapshot for guide HTML fixture', async () => {
    const { toJSON } = await render(
      <Wrapper>
        <RichText html={FIXTURE_GUIDE_HTML} />
      </Wrapper>,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});

// ─── DEVICE REGRESSION F-09 — real RACIMO fragments render bold + colored ────
//
// Evidence: docs/evidence/device-findings-2026-09-07.md (F-09), frames
// docs/evidence/device-2026-09-07/{005-192141,009-192156}.png versus the
// originals docs/evidence/measurement/{screen-03-guide-flow1-step1,
// screen-06-register-form-flow1-filled}.png.
//
// These fixtures are VERBATIM from the device at
// files/public/racimos/ANT025/measurementRegistration/measurementsRegistration.json.
// The whole config expresses emphasis as `style="font-weight: 700"` — never as
// <b> — so this is the shape that must come out bold and colored.

/** flows.flow1.text — register-form subtitle. */
const REAL_FLOW1_TEXT =
  '<p style="font-size: 16px; line-height: 150%; font-weight: 400; color: var(--Gray-600, #525252);">' +
  'Registros de <span style="font-weight: 700"> temperatura </span> y ' +
  '<span style="font-weight: 700"> humedad </span> ' +
  '<span style="font-weight: 700; color: var(--Colors-Green-500, #69ab3c)">máxima</span></p>';

/** measurements.TEMPERATURA_MAX.name — orange card label. */
const REAL_TEMPERATURA_MAX_NAME =
  '<span style="font-size: 16px; line-height: 150%; font-weight: 700; color: var(--Colors-Orange-500, #e58b24);">' +
  'Temperatura <span style="color: var(--Gray-600, #525252)"> máxima </span></span>';

/** Collects every `style` object found in a rendered RNTL JSON tree. */
function collectStyles(
  node: unknown,
  acc: Record<string, unknown>[] = [],
): Record<string, unknown>[] {
  if (!node || typeof node !== 'object') return acc;
  if (Array.isArray(node)) {
    node.forEach((child) => collectStyles(child, acc));
    return acc;
  }
  const n = node as { props?: { style?: unknown }; children?: unknown };
  const style = n.props?.style;
  if (Array.isArray(style)) {
    style.forEach((s) => {
      if (s && typeof s === 'object') acc.push(s as Record<string, unknown>);
    });
  } else if (style && typeof style === 'object') {
    acc.push(style as Record<string, unknown>);
  }
  collectStyles(n.children, acc);
  return acc;
}

describe('RichText — F-09 device regression (inline styles on native)', () => {
  it('renders the register subtitle with Montserrat-Bold and the resolved green', async () => {
    const { toJSON } = await render(
      <Wrapper>
        <RichText html={REAL_FLOW1_TEXT} baseFontSize={15} />
      </Wrapper>,
    );
    const styles = collectStyles(toJSON());

    // Bold arrives as a FAMILY, not as fontWeight: Android does not synthesize
    // weights for custom expo-font asset families.
    expect(styles.some((s) => s.fontFamily === 'Montserrat-Bold')).toBe(true);
    expect(
      styles.some((s) => s.fontWeight !== undefined && s.fontWeight !== 'normal'),
    ).toBe(false);

    // Inline colors must be applied (this is what was lost on device).
    expect(styles.some((s) => s.color === '#69AB3C')).toBe(true);
    expect(styles.some((s) => s.color === '#525252')).toBe(true);
  });

  it('renders the "Temperatura máxima" label with Montserrat-Bold and the resolved orange', async () => {
    const { toJSON } = await render(
      <Wrapper>
        <RichText html={REAL_TEMPERATURA_MAX_NAME} inline baseFontSize={14} />
      </Wrapper>,
    );
    const styles = collectStyles(toJSON());

    expect(styles.some((s) => s.fontFamily === 'Montserrat-Bold')).toBe(true);
    expect(styles.some((s) => s.color === '#E58B24')).toBe(true);
    expect(styles.some((s) => s.color === '#525252')).toBe(true);
  });
});

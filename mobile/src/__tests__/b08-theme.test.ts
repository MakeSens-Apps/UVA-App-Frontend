/**
 * B08 — theme.ts unit tests
 *
 * Gate: snapshot of the theme object; utility function contracts verified.
 * No device required — pure TypeScript/Jest.
 */

import {
  colors,
  semanticColors,
  spacing,
  radius,
  typography,
  shadows,
  baseTheme,
  fontFamilyForWeight,
  lineHeightFor,
  MONTSERRAT_FONTS,
} from '../theme/theme';

// ─── Color tokens ─────────────────────────────────────────────────────────────

describe('colors', () => {
  it('blue palette has correct 500 value (--ion-color-uva_blue-500)', () => {
    expect(colors.blue[500]).toBe('#10BCCA');
  });

  it('green palette has correct 500 value (--ion-color-uva_green-500)', () => {
    expect(colors.green[500]).toBe('#69AB3C');
  });

  it('blue.700 is #14788A (documented: uva_green-700 name is misleading — it is BLUE)', () => {
    // R-42: uva_green-700 is actually blue; now correctly placed in blue palette.
    expect(colors.blue[700]).toBe('#14788A');
  });

  it('gray900Alt (#111928) is distinct from gray.900 (#171717)', () => {
    // Both existed in SCSS with different values — preserved to avoid breakage.
    expect(colors.gray900Alt).not.toBe(colors.gray[900]);
    expect(colors.gray900Alt).toBe('#111928');
    expect(colors.gray[900]).toBe('#171717');
  });

  it('danger is #E5245E (--Colors-Danger)', () => {
    expect(colors.danger).toBe('#E5245E');
  });

  it('orange.500 is #E58B24 (--ion-color-uva_orange-500)', () => {
    expect(colors.orange[500]).toBe('#E58B24');
  });

  it('white is #FFFFFF', () => {
    expect(colors.white).toBe('#FFFFFF');
  });
});

// ─── Semantic aliases ────────────────────────────────────────────────────────

describe('semanticColors', () => {
  it('primary maps to blue.500', () => {
    expect(semanticColors.primary).toBe(colors.blue[500]);
  });

  it('secondary maps to green.500', () => {
    expect(semanticColors.secondary).toBe(colors.green[500]);
  });

  it('danger maps to colors.danger', () => {
    expect(semanticColors.danger).toBe(colors.danger);
  });
});

// ─── Spacing ─────────────────────────────────────────────────────────────────

describe('spacing', () => {
  it('md is 10 (was --xl fallback of 10px)', () => {
    expect(spacing.md).toBe(10);
  });

  it('lg is 16 (was --4xl fallback of 16px)', () => {
    expect(spacing.lg).toBe(16);
  });

  it('has xs, sm, md, lg, xl, 2xl, 3xl keys', () => {
    expect(Object.keys(spacing)).toEqual(['xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl']);
  });
});

// ─── Radius ──────────────────────────────────────────────────────────────────

describe('radius', () => {
  it('xl is 10 (was --xl fallback 10px)', () => {
    expect(radius.xl).toBe(10);
  });

  it('3xl is 14 (was --3xl fallback 14px)', () => {
    expect(radius['3xl']).toBe(14);
  });

  it('4xl is 16 (was --4xl fallback 16px)', () => {
    expect(radius['4xl']).toBe(16);
  });

  it('round is 9999 (border-radius: 50% equivalent)', () => {
    expect(radius.round).toBe(9999);
  });
});

// ─── Typography ───────────────────────────────────────────────────────────────

describe('typography', () => {
  it('base size is 16', () => {
    expect(typography.sizes.base).toBe(16);
  });

  it('xs is 12, sm is 14, lg is 18, xl is 20, xxl is 22', () => {
    expect(typography.sizes.xs).toBe(12);
    expect(typography.sizes.sm).toBe(14);
    expect(typography.sizes.lg).toBe(18);
    expect(typography.sizes.xl).toBe(20);
    expect(typography.sizes.xxl).toBe(22);
  });

  it('brand is 28, modal is 30, title is 24', () => {
    expect(typography.sizes.brand).toBe(28);
    expect(typography.sizes.modal).toBe(30);
    expect(typography.sizes.title).toBe(24);
  });

  it('weights map to string values', () => {
    expect(typography.weights.regular).toBe('400');
    expect(typography.weights.medium).toBe('500');
    expect(typography.weights.semibold).toBe('600');
    expect(typography.weights.bold).toBe('700');
  });
});

// ─── Shadows ─────────────────────────────────────────────────────────────────

describe('shadows', () => {
  it('sm has elevation 2', () => {
    expect(shadows.sm.elevation).toBe(2);
  });

  it('md has elevation 4', () => {
    expect(shadows.md.elevation).toBe(4);
  });

  it('lg has elevation 8', () => {
    expect(shadows.lg.elevation).toBe(8);
  });

  it('none has elevation 0', () => {
    expect(shadows.none.elevation).toBe(0);
  });

  it('blueTint and greenTint are defined', () => {
    expect(shadows.blueTint).toBeDefined();
    expect(shadows.greenTint).toBeDefined();
  });
});

// ─── fontFamilyForWeight ─────────────────────────────────────────────────────

describe('fontFamilyForWeight', () => {
  it('400 normal → Montserrat-Regular', () => {
    expect(fontFamilyForWeight('400')).toBe('Montserrat-Regular');
  });

  it('500 normal → Montserrat-Medium', () => {
    expect(fontFamilyForWeight('500')).toBe('Montserrat-Medium');
  });

  it('600 normal → Montserrat-SemiBold', () => {
    expect(fontFamilyForWeight('600')).toBe('Montserrat-SemiBold');
  });

  it('700 normal → Montserrat-Bold', () => {
    expect(fontFamilyForWeight('700')).toBe('Montserrat-Bold');
  });

  it('400 italic → Montserrat-Italic', () => {
    expect(fontFamilyForWeight('400', true)).toBe('Montserrat-Italic');
  });

  it('500 italic → Montserrat-MediumItalic', () => {
    expect(fontFamilyForWeight('500', true)).toBe('Montserrat-MediumItalic');
  });

  it('600 italic → Montserrat-SemiBoldItalic', () => {
    expect(fontFamilyForWeight('600', true)).toBe('Montserrat-SemiBoldItalic');
  });

  it('700 italic → Montserrat-BoldItalic', () => {
    expect(fontFamilyForWeight('700', true)).toBe('Montserrat-BoldItalic');
  });
});

// ─── lineHeightFor ────────────────────────────────────────────────────────────

describe('lineHeightFor', () => {
  it('16px × 1.2 (normal) → 19', () => {
    expect(lineHeightFor(16)).toBe(19);
  });

  it('16px × 1.5 (150%) → 24', () => {
    expect(lineHeightFor(16, 1.5)).toBe(24);
  });

  it('18px × 1.2 → 22', () => {
    expect(lineHeightFor(18)).toBe(22);
  });
});

// ─── MONTSERRAT_FONTS keys ────────────────────────────────────────────────────

describe('MONTSERRAT_FONTS', () => {
  it('exposes all 8 font families (4 weights × normal+italic)', () => {
    const keys = Object.keys(MONTSERRAT_FONTS);
    expect(keys).toContain('Montserrat-Regular');
    expect(keys).toContain('Montserrat-Medium');
    expect(keys).toContain('Montserrat-SemiBold');
    expect(keys).toContain('Montserrat-Bold');
    expect(keys).toContain('Montserrat-Italic');
    expect(keys).toContain('Montserrat-MediumItalic');
    expect(keys).toContain('Montserrat-SemiBoldItalic');
    expect(keys).toContain('Montserrat-BoldItalic');
    expect(keys).toHaveLength(8);
  });
});

// ─── baseTheme snapshot ───────────────────────────────────────────────────────

describe('baseTheme snapshot', () => {
  it('matches snapshot (theme object structure)', () => {
    // Snapshot the whole baseTheme — any unintended structural change will fail here.
    expect(baseTheme).toMatchSnapshot();
  });

  it('has all required top-level keys', () => {
    expect(baseTheme).toHaveProperty('colors');
    expect(baseTheme).toHaveProperty('semanticColors');
    expect(baseTheme).toHaveProperty('spacing');
    expect(baseTheme).toHaveProperty('radius');
    expect(baseTheme).toHaveProperty('typography');
    expect(baseTheme).toHaveProperty('shadows');
  });
});

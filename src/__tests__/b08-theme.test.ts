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
  applyOverrideToColors,
  type MutableColors,
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
    expect(Object.keys(spacing)).toEqual([
      'xs',
      'sm',
      'md',
      'lg',
      'xl',
      '2xl',
      '3xl',
    ]);
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

// ─── applyOverrideToColors — R-05 branding merge ─────────────────────────────

/**
 * Helper: create a fresh mutable clone of the base colors for each test.
 * Avoids cross-test contamination.
 */
function freshColors(): MutableColors {
  return {
    blue: { ...colors.blue },
    orange: { ...colors.orange },
    green: { ...colors.green },
    gray: { ...colors.gray },
    danger: colors.danger,
    gray900Alt: colors.gray900Alt,
    white: colors.white,
    black: colors.black,
  };
}

describe('applyOverrideToColors (R-05 theming fix)', () => {
  // ── Colors-{Scale}-{N} ──────────────────────────────────────────────────

  it('merges Colors-Blue-500 (HEX) into blue[500]', () => {
    const target = freshColors();
    applyOverrideToColors('Colors-Blue-500', '#FF0000', target);
    expect(target.blue[500]).toBe('#FF0000');
  });

  it('merges Colors-Green-500 (RGB string) into green[500]', () => {
    const target = freshColors();
    applyOverrideToColors('Colors-Green-500', 'rgb(105, 171, 60)', target);
    expect(target.green[500]).toBe('rgb(105, 171, 60)');
  });

  it('merges Colors-Orange-500 into orange[500]', () => {
    const target = freshColors();
    applyOverrideToColors('Colors-Orange-500', '#FF8800', target);
    expect(target.orange[500]).toBe('#FF8800');
  });

  it('merges Colors-Gray-50 into gray[50]', () => {
    const target = freshColors();
    applyOverrideToColors('Colors-Gray-50', '#F0F0F0', target);
    expect(target.gray[50]).toBe('#F0F0F0');
  });

  it('merges Colors-Blue-200 (active pill color) into blue[200]', () => {
    const target = freshColors();
    applyOverrideToColors('Colors-Blue-200', '#AABBCC', target);
    expect(target.blue[200]).toBe('#AABBCC');
  });

  it('merges Colors-Blue-700 into blue[700]', () => {
    const target = freshColors();
    applyOverrideToColors('Colors-Blue-700', '#113344', target);
    expect(target.blue[700]).toBe('#113344');
  });

  it('merges Colors-Danger into danger', () => {
    const target = freshColors();
    applyOverrideToColors('Colors-Danger', '#CC0000', target);
    expect(target.danger).toBe('#CC0000');
  });

  // ── ion-color-uva_* ──────────────────────────────────────────────────────

  it('merges ion-color-uva_blue-500 into blue[500]', () => {
    const target = freshColors();
    applyOverrideToColors('ion-color-uva_blue-500', '#AABBCC', target);
    expect(target.blue[500]).toBe('#AABBCC');
  });

  it('merges ion-color-uva_blue-600 into blue[600]', () => {
    const target = freshColors();
    applyOverrideToColors('ion-color-uva_blue-600', '#112233', target);
    expect(target.blue[600]).toBe('#112233');
  });

  it('merges ion-color-uva_green-500 into green[500]', () => {
    const target = freshColors();
    applyOverrideToColors('ion-color-uva_green-500', '#44AA22', target);
    expect(target.green[500]).toBe('#44AA22');
  });

  it('merges ion-color-uva_green-700 into blue[700] (documented blue alias)', () => {
    // Special case: uva_green-700 is actually a blue color (R-42 / theme.ts note)
    const target = freshColors();
    applyOverrideToColors('ion-color-uva_green-700', '#224455', target);
    expect(target.blue[700]).toBe('#224455');
    // green[700] should NOT be affected
    expect(target.green[700]).toBe(colors.green[700]);
  });

  it('merges ion-color-uva_orange-500 into orange[500]', () => {
    const target = freshColors();
    applyOverrideToColors('ion-color-uva_orange-500', '#DDAA00', target);
    expect(target.orange[500]).toBe('#DDAA00');
  });

  // ── Unknown keys ─────────────────────────────────────────────────────────

  it('silently ignores unknown keys (does not throw, does not mutate)', () => {
    const target = freshColors();
    const before = { ...target.blue };
    expect(() => {
      applyOverrideToColors('ion-color-primary-contrast', '#FFFFFF', target);
      applyOverrideToColors('totally-unknown-key', '#123456', target);
      applyOverrideToColors('Colors-Purple-500', '#9900FF', target);
    }).not.toThrow();
    // blue scale should be unchanged
    expect(target.blue).toEqual(before);
  });

  // ── Non-mutation of base ──────────────────────────────────────────────────

  it('does NOT mutate baseTheme.colors (only the cloned target)', () => {
    const target = freshColors();
    applyOverrideToColors('Colors-Blue-500', '#DEADBEEF', target);
    // The baseTheme.colors.blue[500] must remain the original value
    expect(colors.blue[500]).toBe('#10BCCA');
    expect(baseTheme.colors.blue[500]).toBe('#10BCCA');
  });

  // ── Without overrides (base values) ──────────────────────────────────────

  it('cloned colors without any override equal the base palette', () => {
    const target = freshColors();
    expect(target.blue[500]).toBe(colors.blue[500]);
    expect(target.green[500]).toBe(colors.green[500]);
    expect(target.orange[500]).toBe(colors.orange[500]);
    expect(target.gray[50]).toBe(colors.gray[50]);
    expect(target.danger).toBe(colors.danger);
  });
});

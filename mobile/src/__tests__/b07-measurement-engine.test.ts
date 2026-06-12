/**
 * B07 Gate — Jest tests: Measurement engine
 *
 * Tests per plan.md B07 gate:
 *   - operators: all operator symbols (+, -, *, /, <, >, =)
 *   - applyOperator: applies correctly, returns undefined for unknown ops
 *   - validateRestriction: '0:>:1' fixed operator (R-35 documented)
 *   - getMessageError: range-based and restriction-based error messages
 *   - isInRange: range validation
 *
 * Uses REAL fixtures from the original register-measurement.page.ts logic.
 * No Angular / React / native imports.
 */

import {
  operators,
  applyOperator,
  validateRestriction,
  getMessageError,
  isInRange,
  RestrictionSpec,
  MeasurementValue,
} from '@/domain/measurement-engine/measurement-engine';

import { Measurement } from '@/data/models/configuration/measurements.model';

// ─── operators ───────────────────────────────────────────────────────────────

describe('operators', () => {
  describe('+', () => {
    it('sums two numbers', () => {
      expect(operators['+'](3, 4)).toBe(7);
    });
  });

  describe('-', () => {
    it('subtracts', () => {
      expect(operators['-'](10, 3)).toBe(7);
    });
  });

  describe('*', () => {
    it('multiplies', () => {
      expect(operators['*'](4, 5)).toBe(20);
    });
  });

  describe('/', () => {
    it('divides', () => {
      expect(operators['/'](10, 2)).toBe(5);
    });

    it('returns undefined for division by zero', () => {
      expect(operators['/'](10, 0)).toBeUndefined();
    });
  });

  describe('<', () => {
    it('returns 1 when a < b', () => {
      expect(operators['<'](2, 5)).toBe(1);
    });

    it('returns 0 when a >= b', () => {
      expect(operators['<'](5, 5)).toBe(0);
      expect(operators['<'](6, 5)).toBe(0);
    });
  });

  describe('>', () => {
    it('returns 1 when a > b (the operator used in validateRestriction)', () => {
      expect(operators['>'](5, 2)).toBe(1);
    });

    it('returns 0 when a <= b', () => {
      expect(operators['>'](2, 5)).toBe(0);
      expect(operators['>'](5, 5)).toBe(0);
    });
  });

  describe('=', () => {
    it('returns 1 when a === b', () => {
      expect(operators['='](5, 5)).toBe(1);
    });

    it('returns 0 when a !== b', () => {
      expect(operators['='](4, 5)).toBe(0);
    });
  });
});

// ─── applyOperator ────────────────────────────────────────────────────────────

describe('applyOperator', () => {
  it('applies known operator', () => {
    expect(applyOperator('>', 5, 2)).toBe(1);
    expect(applyOperator('<', 2, 5)).toBe(1);
    expect(applyOperator('+', 3, 4)).toBe(7);
  });

  it('returns undefined for unknown operator', () => {
    expect(applyOperator('??', 5, 2)).toBeUndefined();
    expect(applyOperator('', 5, 2)).toBeUndefined();
  });
});

// ─── validateRestriction ─────────────────────────────────────────────────────

describe('validateRestriction', () => {
  /*
   * R-35: Fixed operator '0:>:1' always used.
   * Validates that values[0] > values[1].
   *
   * Real-world context from app: temperatura > humedad restriction
   * (or similar pair validation).
   */

  const restrictionSpec: RestrictionSpec = {
    enabled: true,
    measurementIds: ['temperatura', 'humedad'],
    message: 'La temperatura no puede ser mayor a la humedad',
    validationFunction: '0:>:1', // preserved but ignored per R-35
  };

  it('returns valid=true when values[0] > values[1] (restriction PASSES)', () => {
    /*
     * The restriction spec says "temperatura no puede ser mayor a la humedad",
     * but the fixed operator '0:>:1' checks values[0] > values[1].
     * When the check result is truthy (1), the restriction is SATISFIED.
     * temperatura=90 > humedad=28 → result=1 (truthy) → restriction passes → valid=true
     */
    const values: MeasurementValue[] = [
      { id: 'temperatura', value: 90 },
      { id: 'humedad', value: 28 },
    ];

    const result = validateRestriction([restrictionSpec], values);
    expect(result.valid).toBe(true);
    expect(result.failureMessage).toBeUndefined();
  });

  it('returns valid=false when values[0] <= values[1] (restriction FAILS)', () => {
    /*
     * temperatura=28, humedad=65: 28 > 65 → false (0) → restriction fails → valid=false
     */
    const values: MeasurementValue[] = [
      { id: 'temperatura', value: 28 },
      { id: 'humedad', value: 65 },
    ];

    // 28 > 65 is false → restriction fails
    const result = validateRestriction([restrictionSpec], values);
    expect(result.valid).toBe(false);
    expect(result.failureMessage).toBe(
      'La temperatura no puede ser mayor a la humedad',
    );
  });

  it('returns valid=false when values are equal', () => {
    const values: MeasurementValue[] = [
      { id: 'temperatura', value: 50 },
      { id: 'humedad', value: 50 },
    ];

    // 50 > 50 is false → restriction fails
    const result = validateRestriction([restrictionSpec], values);
    expect(result.valid).toBe(false);
  });

  it('skips disabled restrictions', () => {
    const disabledRestriction: RestrictionSpec = {
      ...restrictionSpec,
      enabled: false,
    };

    const values: MeasurementValue[] = [
      { id: 'temperatura', value: 50 },
      { id: 'humedad', value: 90 },
    ];

    // Disabled restriction should be skipped → valid
    const result = validateRestriction([disabledRestriction], values);
    expect(result.valid).toBe(true);
  });

  it('returns valid=true when restriction list is empty', () => {
    const values: MeasurementValue[] = [
      { id: 'temperatura', value: 50 },
    ];

    const result = validateRestriction([], values);
    expect(result.valid).toBe(true);
  });

  it('skips restrictions where values cannot be found (defensive)', () => {
    const values: MeasurementValue[] = [
      { id: 'temperatura', value: 28 },
      // 'humedad' is missing
    ];

    // Cannot evaluate → skip restriction → valid
    const result = validateRestriction([restrictionSpec], values);
    expect(result.valid).toBe(true);
  });

  it('validates correctly with multiple restrictions (first failing wins)', () => {
    const restriction1: RestrictionSpec = {
      enabled: true,
      measurementIds: ['a', 'b'],
      message: 'a > b required',
    };
    const restriction2: RestrictionSpec = {
      enabled: true,
      measurementIds: ['c', 'd'],
      message: 'c > d required',
    };

    const values: MeasurementValue[] = [
      { id: 'a', value: 5 },
      { id: 'b', value: 10 }, // values[0]=5 > values[1]=10 → false → restriction1 fails
      { id: 'c', value: 20 },
      { id: 'd', value: 10 }, // values[0]=20 > values[1]=10 → true → restriction2 passes
    ];

    const result = validateRestriction([restriction1, restriction2], values);
    expect(result.valid).toBe(false);
    expect(result.failureMessage).toBe('a > b required');
  });
});

// ─── getMessageError ─────────────────────────────────────────────────────────

describe('getMessageError', () => {
  // Mock Measurement type (only relevant fields)
  function makeMeasurement(overrides: Partial<Measurement> = {}): Measurement {
    return {
      name: 'Temperatura',
      sortName: 'temperatura',
      icon: {
        enable: true,
        name: 'thermometer',
        colorName: 'red',
        colorHex: '#f00',
        imagePath: null,
      },
      fields: 1,
      unit: '°C',
      range: { min: 0, max: 50, optionalMessage: '' },
      style: {
        backgroundColor: { colorName: 'blue', colorHex: '#00f' },
        borderColor: { colorName: 'blue', colorHex: '#00f' },
      },
      ...overrides,
    };
  }

  it('returns restriction alert message when showRestrictionAlert is true', () => {
    const m = makeMeasurement({
      showRestrictionAlert: true,
      textRestrictionAlert: 'La temperatura no puede superar la humedad',
    });
    expect(getMessageError(m)).toBe('La temperatura no puede superar la humedad');
  });

  it('returns empty string when showRestrictionAlert is true but no message', () => {
    const m = makeMeasurement({
      showRestrictionAlert: true,
      textRestrictionAlert: undefined,
    });
    expect(getMessageError(m)).toBe('');
  });

  it('returns range error message when value < min (non-zero min)', () => {
    /*
     * NOTE: getMessageError uses `!item.range.min` which is truthy when min === 0.
     * This means it cannot generate a range error when min === 0 (falsy check).
     * This is the preserved original behavior (portability-matrix §4.4).
     * Use non-zero min in this test to exercise the actual code path.
     */
    const m = makeMeasurement({
      value: 5,
      range: { min: 10, max: 50, optionalMessage: '' },
      sortName: 'temperatura',
      unit: '°C',
    });
    expect(getMessageError(m)).toBe('La temperatura no puede ser menor a 10 °C');
  });

  it('returns range error message when value > max', () => {
    const m = makeMeasurement({
      value: 60,
      range: { min: 10, max: 50, optionalMessage: '' },
      sortName: 'temperatura',
      unit: '°C',
    });
    expect(getMessageError(m)).toBe('La temperatura no puede ser mayor a 50 °C');
  });

  it('returns empty string when range.min is 0 (original falsy check limitation)', () => {
    /*
     * Original code: !item.range.min — if min is 0, it evaluates as falsy.
     * This is preserved behavior (portability-matrix §4.4).
     */
    const m = makeMeasurement({
      value: -5,
      range: { min: 0, max: 50, optionalMessage: '' },
      sortName: 'temperatura',
      unit: '°C',
    });
    // Despite value < range.min, original code returns '' due to !0 === true
    expect(getMessageError(m)).toBe('');
  });

  it('returns empty string when value, range, or sortName is missing', () => {
    const noValue = makeMeasurement({ value: undefined });
    expect(getMessageError(noValue)).toBe('');

    const noSortName = makeMeasurement({ value: -5, range: { min: 10, max: 50, optionalMessage: '' }, sortName: undefined });
    expect(getMessageError(noSortName)).toBe('');
  });
});

// ─── isInRange ───────────────────────────────────────────────────────────────

describe('isInRange', () => {
  const range = { min: 0, max: 50 };

  it('returns true for value within range (inclusive)', () => {
    expect(isInRange(0, range)).toBe(true);
    expect(isInRange(25, range)).toBe(true);
    expect(isInRange(50, range)).toBe(true);
  });

  it('returns false for value below min', () => {
    expect(isInRange(-1, range)).toBe(false);
    expect(isInRange(-100, range)).toBe(false);
  });

  it('returns false for value above max', () => {
    expect(isInRange(51, range)).toBe(false);
    expect(isInRange(1000, range)).toBe(false);
  });
});

// ─── B07 purity gate ─────────────────────────────────────────────────────────

describe('B07 — measurement-engine module purity', () => {
  it('can be imported without React/DataStore errors', () => {
    const mod = require('@/domain/measurement-engine/measurement-engine');
    expect(mod.operators).toBeDefined();
    expect(mod.applyOperator).toBeDefined();
    expect(mod.validateRestriction).toBeDefined();
    expect(mod.getMessageError).toBeDefined();
    expect(mod.isInRange).toBeDefined();
  });

  it('R-35 documented: validationFunction field exists but is ignored', () => {
    // Verify the RestrictionSpec type allows validationFunction
    const spec: RestrictionSpec = {
      enabled: true,
      measurementIds: ['a', 'b'],
      message: 'test',
      validationFunction: '0:>:1', // preserved but ignored
    };
    expect(spec.validationFunction).toBe('0:>:1');

    // But validateRestriction always uses the fixed '0:>:1' regardless
    // values[0]=10 > values[1]=5 → result=1 (truthy) → restriction passes → valid=true
    const values: MeasurementValue[] = [
      { id: 'a', value: 10 },
      { id: 'b', value: 5 },
    ];
    const result = validateRestriction([spec], values);
    expect(result.valid).toBe(true); // 10 > 5 → truthy → restriction satisfied
  });
});

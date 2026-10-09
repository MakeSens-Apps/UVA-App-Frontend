/**
 * B07 — Measurement Engine (domain/measurement-engine)
 * Extracted from: src/app/pages/measurement/register-measurement/register-measurement.page.ts
 * Per plan.md B07: "motor de medición (validateRestriction operadores 0:>:1 +
 *   getMessageError + measurements.model) → domain/measurement-engine+tests,
 *   documentar FlowRestriction.validationFunction ignorada (R-35)"
 *
 * Functions extracted:
 *   - operators     — the operaciones dictionary (line 37-49 of original)
 *   - applyOperator — applies a string operator to two numbers
 *   - validateRestriction — validates flow restrictions against measurement values
 *   - getMessageError     — generates a human-readable error message for a Measurement
 *
 * R-35 documented: FlowRestriction.validationFunction is PRESERVED but IGNORED.
 * The UI always uses the fixed operator '0:>:1'. This is preserved as-is per
 * portability-matrix §4.4 until a product decision changes it.
 *
 * No Angular / React / UI imports. Pure domain functions.
 */

import { Measurement } from '@/data/models/configuration/measurements.model';

// ─── Operators (from original const operaciones) ─────────────────────────────

/**
 * Supported operator symbols for restriction validation.
 * Operators return a truthy number (1) for pass, falsy (0/undefined) for fail.
 *
 * R-35: The only operator used in production is '>' (via fixed function '0:>:1').
 * All others are provided for completeness and future extensibility.
 */
export type OperatorSymbol = '+' | '-' | '*' | '/' | '<' | '>' | '=';

export const operators: Record<
  string,
  (a: number, b: number) => number | undefined
> = {
  '+': (a, b) => a + b,
  '-': (a, b) => a - b,
  '*': (a, b) => a * b,
  '/': (a, b) => (b !== 0 ? a / b : undefined),
  '<': (a, b) => (a < b ? 1 : 0),
  '>': (a, b) => (a > b ? 1 : 0),
  '=': (a, b) => (a === b ? 1 : 0),
};

/**
 * Applies a string operator to two numeric values.
 * Returns undefined if the operator is unknown.
 *
 * @param {string} op - Operator symbol ('+', '-', '*', '/', '<', '>', '=')
 * @param {number} a  - Left operand
 * @param {number} b  - Right operand
 * @returns {number | undefined}
 */
export function applyOperator(
  op: string,
  a: number,
  b: number,
): number | undefined {
  const fn = operators[op];
  if (!fn) return undefined;
  return fn(a, b);
}

// ─── Restriction validation ───────────────────────────────────────────────────

/**
 * A restriction object from FlowRestriction (measurements.model.ts).
 * Represents a single enabled restriction to validate against.
 *
 * NOTE (R-35): validationFunction is preserved in the model but IGNORED here.
 * The system always uses the fixed operator '0:>:1'.
 */
export interface RestrictionSpec {
  /** Whether the restriction is active */
  enabled: boolean;
  /** IDs of the measurements involved in the restriction (length >= 2 for '0:>:1') */
  measurementIds: string[];
  /** Human-readable error message to display when the restriction fails */
  message: string;
  /**
   * validationFunction — PRESERVED but IGNORED (R-35).
   * The UI always uses the fixed function '0:>:1'.
   * A future product decision may replace this.
   */
  validationFunction?: string;
}

/**
 * A measurement value entry for restriction evaluation.
 */
export interface MeasurementValue {
  /** The measurement ID */
  id: string | number | symbol;
  /** The measurement numeric value */
  value?: number;
  /** The flow this measurement belongs to */
  flow?: string;
}

/**
 * Result of validating a set of restrictions.
 */
export interface RestrictionValidationResult {
  /** True if all restrictions pass */
  valid: boolean;
  /**
   * Index of the measurement (within the restriction's measurementIds) that failed,
   * or undefined if validation passed.
   */
  failedMeasurementIndex?: number;
  /** The message from the first failing restriction */
  failureMessage?: string;
}

/**
 * Validates flow restrictions against a set of measurement values.
 *
 * Algorithm (preserved from original):
 *   1. Filter to enabled restrictions only
 *   2. For each restriction, extract the values for its measurementIds
 *   3. Apply fixed operator '0:>:1': value[0] > value[1] must be truthy
 *   4. If the check fails, mark the measurement as having a restriction alert
 *      and return the failure info
 *
 * R-35: FlowRestriction.validationFunction is IGNORED. Fixed operator '0:>:1' always used.
 * This is intentional and documented. Do not silently change it without a product decision.
 *
 * @param {RestrictionSpec[]} flowRestrictions - All restriction specs for the flow
 * @param {MeasurementValue[]} allMeasurementValues - All current+previous measurement values
 * @returns {RestrictionValidationResult}
 */
export function validateRestriction(
  flowRestrictions: RestrictionSpec[],
  allMeasurementValues: MeasurementValue[],
): RestrictionValidationResult {
  const enabledRestrictions = flowRestrictions.filter((r) => r.enabled);

  for (const restriction of enabledRestrictions) {
    const valuesForRestriction = restriction.measurementIds.map(
      (measurementId) => {
        const entry = allMeasurementValues.find((m) => m.id === measurementId);
        return entry?.value;
      },
    );

    /*
     * NOTE (R-35): Fixed operator '0:>:1' is always used.
     * Function format: [index0]:[operator]:[index1]
     * e.g. '0:>:1' means: values[0] > values[1] must be truthy (1)
     * FlowRestriction.validationFunction is preserved in the model but not wired here.
     */
    const funcion = '0:>:1';
    const parts = funcion.split(':');
    const leftIndex = Number(parts[0]);
    const op = parts[1];
    const rightIndex = Number(parts[2]);

    const leftValue = valuesForRestriction[leftIndex];
    const rightValue = valuesForRestriction[rightIndex];

    if (leftValue === undefined || rightValue === undefined) {
      // Cannot evaluate — skip (defensive)
      continue;
    }

    const result = applyOperator(op, leftValue, rightValue);

    if (!result) {
      // Find which measurement in the current list is implicated
      const failedMeasurementIndex = restriction.measurementIds.findIndex(
        (id) => allMeasurementValues.find((m) => m.id === id) !== undefined,
      );

      return {
        valid: false,
        failedMeasurementIndex:
          failedMeasurementIndex !== -1 ? failedMeasurementIndex : 0,
        failureMessage: restriction.message,
      };
    }
  }

  return { valid: true };
}

// ─── Error message generation ─────────────────────────────────────────────────

/**
 * Generates a human-readable error message for a Measurement that failed validation.
 * If the measurement has a restriction alert, returns that specific message.
 * Otherwise, generates a range-based message based on the value vs. min/max.
 *
 * Preserved exactly from original getMessageError (line 559-570).
 *
 * @param {Measurement} item - The measurement model (with optional value, range, sortName, unit)
 * @returns {string} Human-readable error message, or empty string if no error.
 */
export function getMessageError(item: Measurement): string {
  if (item.showRestrictionAlert) {
    return item.textRestrictionAlert ?? '';
  } else {
    if (!item.value || !item.range || !item.sortName || !item.range.min) {
      return '';
    }
    const condition = item.value < item.range.min ? 'menor' : 'mayor';
    const rangeValue =
      item.value < item.range.min ? item.range.min : item.range.max;
    return `La ${item.sortName} no puede ser ${condition} a ${rangeValue} ${item.unit}`;
  }
}

/**
 * Checks whether a measurement value is within the configured range.
 *
 * @param {number} value - The measured value
 * @param {{ min: number; max: number }} range - The valid range
 * @returns {boolean} True if the value is within range (inclusive)
 */
export function isInRange(
  value: number,
  range: { min: number; max: number },
): boolean {
  return value >= range.min && value <= range.max;
}

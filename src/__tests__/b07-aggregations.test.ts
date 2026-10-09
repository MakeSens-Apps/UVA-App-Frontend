/**
 * B07 Gate — Jest tests: Historical aggregations
 *
 * Tests per plan.md B07 gate:
 *   - transformData: reshapes Measurement records to HistoricalMeasurement
 *   - sum: sums values in MeasurementEntry[]
 *   - mean: averages two MeasurementEntry[] lists
 *   - calculateMeasurement: groups by date, applies sum or mean
 *   - calculateDetailedMeasurement: groups by date, avg/min/max per day
 *   - calculateOverallStats: overall stats for 'line+mean' and 'bar+sum' graphs
 *
 * Uses REAL fixtures derived from original HistoricalPage logic.
 * No DataStore / React / UI imports in tested module.
 */

import {
  transformData,
  sum,
  mean,
  calculateMeasurement,
  calculateDetailedMeasurement,
  calculateOverallStats,
  HistoricalMeasurement,
  MeasurementEntry,
} from '@/domain/aggregations/historical-aggregations';

// ─── Fixtures ────────────────────────────────────────────────────────────────

// Fixture: represents Amplify DataStore Measurement records
const fixture_measurements: { ts: string; data: Record<string, number> }[] = [
  {
    ts: '2024-01-15T08:00:00.000Z',
    data: { temperatura: 22.5, humedad: 65 },
  },
  {
    ts: '2024-01-15T14:00:00.000Z',
    data: { temperatura: 28.0, humedad: 55 },
  },
  {
    ts: '2024-01-16T09:00:00.000Z',
    data: { temperatura: 20.0, humedad: 70 },
  },
  {
    ts: '2024-01-17T10:00:00.000Z',
    data: { lluvia: 5.2 },
  },
];

// ─── transformData ────────────────────────────────────────────────────────────

describe('transformData', () => {
  it('groups measurements by key (measurementId)', () => {
    const result = transformData(fixture_measurements);

    expect(result).toHaveProperty('temperatura');
    expect(result).toHaveProperty('humedad');
    expect(result).toHaveProperty('lluvia');
  });

  it('collects all entries per key (one per timestamp)', () => {
    const result = transformData(fixture_measurements);

    // temperatura appears in 3 records (2024-01-15T08, 2024-01-15T14, 2024-01-16T09)
    expect(result['temperatura']).toHaveLength(3);
    // humedad appears in 3 records (2024-01-15T08, 2024-01-15T14, 2024-01-16T09)
    expect(result['humedad']).toHaveLength(3);
    // lluvia appears in 1 record
    expect(result['lluvia']).toHaveLength(1);
  });

  it('each entry is a record with timestamp as key and value', () => {
    const result = transformData(fixture_measurements);

    // temperatura entries: { [ts]: value }
    const tempEntries = result['temperatura'];
    const tempValues = tempEntries.map((e) => Object.values(e)[0]);
    expect(tempValues).toContain(22.5);
    expect(tempValues).toContain(28.0);
  });

  it('sorts entries by leading integer parsed from timestamp key', () => {
    /*
     * NOTE (portability-matrix §4.4): The original sort uses parseInt(ts, 10)
     * which extracts the leading integer from an ISO string.
     * For "2024-01-16T09..." parseInt = 2024; for "2025-01-15..." parseInt = 2025.
     * Entries from different years are correctly sorted; same-year entries
     * keep their relative input order (stable sort, all diff = 0).
     *
     * This means within-year sorting is a no-op — documented behavior.
     */
    const crossYearFixture = [
      { ts: '2025-01-16T09:00:00.000Z', data: { temperatura: 20.0 } },
      { ts: '2023-01-15T08:00:00.000Z', data: { temperatura: 22.5 } },
    ];
    const result = transformData(crossYearFixture);
    const tempTs = result['temperatura'].map((e) => Object.keys(e)[0]);

    // 2023 < 2025 — cross-year sort works (parseInt(2023...) < parseInt(2025...))
    expect(tempTs[0]).toBe('2023-01-15T08:00:00.000Z');
    expect(tempTs[1]).toBe('2025-01-16T09:00:00.000Z');
  });

  it('returns empty object for empty input', () => {
    const result = transformData([]);
    expect(result).toEqual({});
  });

  it('handles records with null data', () => {
    const input = [
      { ts: '2024-01-15T08:00:00.000Z', data: null },
      { ts: '2024-01-16T09:00:00.000Z', data: { temperatura: 21.0 } },
    ];
    const result = transformData(input);
    expect(result['temperatura']).toHaveLength(1);
  });
});

// ─── sum ─────────────────────────────────────────────────────────────────────

describe('sum', () => {
  it('returns sum of all values', () => {
    const data: MeasurementEntry[] = [
      { '2024-01-15': 10 },
      { '2024-01-16': 20 },
      { '2024-01-17': 30 },
    ];
    expect(sum(data)).toBe(60);
  });

  it('rounds the result', () => {
    const data: MeasurementEntry[] = [
      { '2024-01-15': 10.3 },
      { '2024-01-16': 10.3 },
      { '2024-01-17': 10.3 },
    ];
    expect(sum(data)).toBe(31); // Math.round(30.9) = 31
  });

  it('returns undefined for falsy/empty input', () => {
    expect(sum(undefined as unknown as MeasurementEntry[])).toBeUndefined();
  });

  it('returns 0 for empty array', () => {
    expect(sum([])).toBe(0);
  });

  it('works with single entry', () => {
    expect(sum([{ '2024-01-01': 42 }])).toBe(42);
  });
});

// ─── mean ─────────────────────────────────────────────────────────────────────

describe('mean', () => {
  it('calculates the mean across two lists', () => {
    const list1: MeasurementEntry[] = [
      { '2024-01-15': 10 },
      { '2024-01-16': 20 },
    ];
    const list2: MeasurementEntry[] = [{ '2024-01-15': 30 }];
    // total = 60, count = 3, mean = 20
    expect(mean(list1, list2)).toBe(20);
  });

  it('returns undefined for null inputs', () => {
    expect(
      mean(undefined as unknown as MeasurementEntry[], [{ '2024-01-15': 10 }]),
    ).toBeUndefined();
  });

  it('returns undefined when combined count is 0 (both empty)', () => {
    expect(mean([], [])).toBeUndefined();
  });

  it('rounds the result', () => {
    const list1: MeasurementEntry[] = [
      { '2024-01-15': 1 },
      { '2024-01-16': 2 },
    ];
    const list2: MeasurementEntry[] = [{ '2024-01-15': 4 }];
    // total = 7, count = 3, mean = 2.33... → rounds to 2
    expect(mean(list1, list2)).toBe(2);
  });
});

// ─── calculateMeasurement ────────────────────────────────────────────────────

describe('calculateMeasurement', () => {
  const historicalData: HistoricalMeasurement = {
    temperatura: [
      { '2024-01-15T08:00:00Z': 22.0 },
      { '2024-01-15T14:00:00Z': 28.0 },
      { '2024-01-16T09:00:00Z': 20.0 },
    ],
    humedad: [{ '2024-01-15T08:00:00Z': 65 }, { '2024-01-16T09:00:00Z': 70 }],
  };

  describe('with sum', () => {
    it('sums all values for the same date', () => {
      const result = calculateMeasurement(
        historicalData,
        ['temperatura'],
        'sum',
      );
      // 2024-01-15: 22 + 28 = 50
      expect(result['2024-01-15']).toBe(50);
      // 2024-01-16: 20
      expect(result['2024-01-16']).toBe(20);
    });

    it('combines multiple keys', () => {
      const result = calculateMeasurement(
        historicalData,
        ['temperatura', 'humedad'],
        'sum',
      );
      // temperatura 2024-01-15: 50, humedad 2024-01-15: 65 (both written to same date key)
      // They override each other since result is a flat Record — last key wins per date
      // BUT: the original code merges both keys into result — later key writes to same date
      expect(result['2024-01-15']).toBeDefined();
      expect(result['2024-01-16']).toBeDefined();
    });

    it('returns empty object for unknown key', () => {
      const result = calculateMeasurement(historicalData, ['lluvia'], 'sum');
      expect(Object.keys(result)).toHaveLength(0);
    });
  });

  describe('with mean', () => {
    it('calculates the mean for multiple values on the same date', () => {
      const result = calculateMeasurement(
        historicalData,
        ['temperatura'],
        'mean',
      );
      // 2024-01-15: (22 + 28) / 2 = 25
      expect(result['2024-01-15']).toBe(25);
    });

    it('returns single value as-is when only one reading per day', () => {
      const result = calculateMeasurement(
        historicalData,
        ['temperatura'],
        'mean',
      );
      // 2024-01-16: 20 / 1 = 20
      expect(result['2024-01-16']).toBe(20);
    });
  });
});

// ─── calculateDetailedMeasurement ───────────────────────────────────────────

describe('calculateDetailedMeasurement', () => {
  const historicalData: HistoricalMeasurement = {
    temperatura: [
      { '2024-01-15T08:00:00Z': 22.0 },
      { '2024-01-15T14:00:00Z': 28.0 },
      { '2024-01-15T20:00:00Z': 18.0 },
      { '2024-01-16T09:00:00Z': 20.0 },
    ],
  };

  it('calculates avg, min, max per day', () => {
    const result = calculateDetailedMeasurement(historicalData, [
      'temperatura',
    ]);

    // 2024-01-15: values [22, 28, 18]
    expect(result['2024-01-15']).toBeDefined();
    expect(result['2024-01-15'].min).toBe(18);
    expect(result['2024-01-15'].max).toBe(28);
    // avg = (22 + 28 + 18) / 3 = 68 / 3 ≈ 22.67
    expect(result['2024-01-15'].avg).toBeCloseTo(22.67, 1);
  });

  it('handles single reading per day', () => {
    const result = calculateDetailedMeasurement(historicalData, [
      'temperatura',
    ]);

    // 2024-01-16: value [20]
    expect(result['2024-01-16']).toBeDefined();
    expect(result['2024-01-16'].min).toBe(20);
    expect(result['2024-01-16'].max).toBe(20);
    expect(result['2024-01-16'].avg).toBe(20);
  });

  it('returns empty for unknown key', () => {
    const result = calculateDetailedMeasurement(historicalData, ['unknown']);
    expect(Object.keys(result)).toHaveLength(0);
  });

  it('handles multiple keys (merges by date)', () => {
    const multi: HistoricalMeasurement = {
      temperatura: [
        { '2024-01-15T08:00:00Z': 22 },
        { '2024-01-15T14:00:00Z': 28 },
      ],
      humedad: [{ '2024-01-15T09:00:00Z': 65 }],
    };
    const result = calculateDetailedMeasurement(multi, [
      'temperatura',
      'humedad',
    ]);
    // Both keys contribute to '2024-01-15'
    expect(result['2024-01-15']).toBeDefined();
  });
});

// ─── calculateOverallStats ───────────────────────────────────────────────────

describe('calculateOverallStats', () => {
  const historicalData: HistoricalMeasurement = {
    temperatura: [
      { '2024-01-15T08:00:00Z': 22 },
      { '2024-01-15T14:00:00Z': 28 },
      { '2024-01-16T09:00:00Z': 20 },
    ],
    lluvia: [{ '2024-01-15T10:00:00Z': 3 }, { '2024-01-16T10:00:00Z': 7 }],
  };

  // For 'line' + 'mean' → uses calculateDetailedMeasurement
  const lineMeasurement = {
    name: 'Temperatura',
    symbol: 'T',
    unit: '°C',
    measurementIds: ['temperatura'],
    aggregationFunction: 'mean',
    style: {
      backgroundColor: { colorName: 'blue', colorHex: '#00f' },
      borderColor: { colorName: 'blue', colorHex: '#00f' },
    },
    graph: {
      type: 'line',
      measurementIds: ['temperatura'],
      aggregationFunction: 'mean',
      style: {
        backgroundColor: { colorName: 'blue', colorHex: '#00f' },
        borderColor: { colorName: 'blue', colorHex: '#00f' },
      },
    },
  };

  // For 'bar' + 'sum' → uses calculateMeasurement
  const barMeasurement = {
    name: 'Lluvia',
    symbol: 'R',
    unit: 'mm',
    measurementIds: ['lluvia'],
    aggregationFunction: 'sum',
    style: {
      backgroundColor: { colorName: 'blue', colorHex: '#00f' },
      borderColor: { colorName: 'blue', colorHex: '#00f' },
    },
    graph: {
      type: 'bar',
      measurementIds: ['lluvia'],
      aggregationFunction: 'sum',
      style: {
        backgroundColor: { colorName: 'blue', colorHex: '#00f' },
        borderColor: { colorName: 'blue', colorHex: '#00f' },
      },
    },
  };

  it('line+mean: calculates min/max/avg from daily stats', () => {
    const result = calculateOverallStats(lineMeasurement, historicalData);

    // Day1: avg=25, min=22, max=28 | Day2: avg=20, min=20, max=20
    expect(result.min).toBe(20); // min of mins
    expect(result.max).toBe(28); // max of maxes
    expect(result.avg).toBeCloseTo(22.5, 1); // avg of [25, 20]
  });

  it('bar+sum: calculates min/max and total as avg', () => {
    const result = calculateOverallStats(barMeasurement, historicalData);

    // lluvia: day15=3, day16=7
    expect(result.min).toBe(3);
    expect(result.max).toBe(7);
    expect(result.avg).toBe(10); // total sum for 'sum' aggregation
  });

  it('returns all undefined when no data exists for measurement', () => {
    const noData: HistoricalMeasurement = {};
    const result = calculateOverallStats(lineMeasurement, noData);

    expect(result.min).toBeUndefined();
    expect(result.max).toBeUndefined();
    expect(result.avg).toBeUndefined();
  });
});

// ─── B07 purity gate ─────────────────────────────────────────────────────────

describe('B07 — aggregations module purity', () => {
  it('can be imported without React/DataStore errors', () => {
    const mod = require('@/domain/aggregations/historical-aggregations');
    expect(mod.transformData).toBeDefined();
    expect(mod.sum).toBeDefined();
    expect(mod.mean).toBeDefined();
    expect(mod.calculateMeasurement).toBeDefined();
    expect(mod.calculateDetailedMeasurement).toBeDefined();
    expect(mod.calculateOverallStats).toBeDefined();
  });
});

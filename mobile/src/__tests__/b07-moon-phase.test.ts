/**
 * B07 Gate — Jest tests: Moon phase domain
 *
 * Tests per plan.md B07 gate:
 *   - PHASE_MAPPING: mapea nombres de fase de la API a LunarPhase enum
 *   - mapPhaseToEnum: fallback a NEW_MOON para fases desconocidas
 *   - mapPhaseToCalendarStatus: lowercase con guion
 *   - sanitizeAWSJSON: regex AWSJSON (5 .replace() — frágil, R-26)
 *   - getNextMonth: correctamente avanza año en diciembre
 *   - MoonPhaseService: no imports de React/UI
 */

// Mock file-system service (avoid expo-file-system native module)
jest.mock('@/data/storage/file-system', () => ({
  fileSystemService: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
  },
  Directory: {
    Data: 'Data',
    Cache: 'Cache',
  },
}));

// Mock moon-phase-api (avoid aws-amplify graphql calls)
jest.mock('@/data/api/moon-phase-api', () => ({
  moonPhaseAPIService: {
    getMoonPhase: jest.fn(),
  },
}));

import {
  PHASE_MAPPING,
  LunarPhase,
  mapPhaseToEnum,
  mapPhaseToCalendarStatus,
  sanitizeAWSJSON,
  getNextMonth,
  MoonPhaseService,
} from '@/domain/moon/moon-phase';

// ─── PHASE_MAPPING ───────────────────────────────────────────────────────────

describe('PHASE_MAPPING', () => {
  it('maps Luna nueva to NEW_MOON', () => {
    expect(PHASE_MAPPING['Luna nueva']).toBe(LunarPhase.NEW_MOON);
  });

  it('maps Luna llena to FULL_MOON', () => {
    expect(PHASE_MAPPING['Luna llena']).toBe(LunarPhase.FULL_MOON);
  });

  it('maps Creciente to FIRST_QUARTER', () => {
    expect(PHASE_MAPPING['Creciente']).toBe(LunarPhase.FIRST_QUARTER);
  });

  it('maps Menguante to LAST_QUARTER', () => {
    expect(PHASE_MAPPING['Menguante']).toBe(LunarPhase.LAST_QUARTER);
  });

  it('maps Cuarto creciente to FIRST_QUARTER', () => {
    expect(PHASE_MAPPING['Cuarto creciente']).toBe(LunarPhase.FIRST_QUARTER);
  });

  it('maps Cuarto menguante to LAST_QUARTER', () => {
    expect(PHASE_MAPPING['Cuarto menguante']).toBe(LunarPhase.LAST_QUARTER);
  });

  it('has exactly 6 entries', () => {
    expect(Object.keys(PHASE_MAPPING).length).toBe(6);
  });
});

// ─── mapPhaseToEnum ──────────────────────────────────────────────────────────

describe('mapPhaseToEnum', () => {
  it('returns the mapped LunarPhase for known phases', () => {
    expect(mapPhaseToEnum('Luna nueva')).toBe(LunarPhase.NEW_MOON);
    expect(mapPhaseToEnum('Luna llena')).toBe(LunarPhase.FULL_MOON);
    expect(mapPhaseToEnum('Creciente')).toBe(LunarPhase.FIRST_QUARTER);
    expect(mapPhaseToEnum('Menguante')).toBe(LunarPhase.LAST_QUARTER);
    expect(mapPhaseToEnum('Cuarto creciente')).toBe(LunarPhase.FIRST_QUARTER);
    expect(mapPhaseToEnum('Cuarto menguante')).toBe(LunarPhase.LAST_QUARTER);
  });

  it('falls back to NEW_MOON for unknown phase name', () => {
    expect(mapPhaseToEnum('Fase desconocida')).toBe(LunarPhase.NEW_MOON);
    expect(mapPhaseToEnum('')).toBe(LunarPhase.NEW_MOON);
    expect(mapPhaseToEnum('FULL_MOON')).toBe(LunarPhase.NEW_MOON);
  });

  it('is case-sensitive (API returns specific Spanish names)', () => {
    // API always sends capitalized Spanish names; lowercase should not match
    expect(mapPhaseToEnum('luna nueva')).toBe(LunarPhase.NEW_MOON); // fallback
  });
});

// ─── mapPhaseToCalendarStatus ─────────────────────────────────────────────────

describe('mapPhaseToCalendarStatus', () => {
  it('returns lowercase hyphenated status for Luna nueva', () => {
    expect(mapPhaseToCalendarStatus('Luna nueva')).toBe('new-moon');
  });

  it('returns lowercase hyphenated status for Luna llena', () => {
    expect(mapPhaseToCalendarStatus('Luna llena')).toBe('full-moon');
  });

  it('returns lowercase hyphenated status for Creciente', () => {
    expect(mapPhaseToCalendarStatus('Creciente')).toBe('first-quarter');
  });

  it('returns lowercase hyphenated status for Menguante', () => {
    expect(mapPhaseToCalendarStatus('Menguante')).toBe('last-quarter');
  });

  it('falls back to new-moon for unknown phase', () => {
    expect(mapPhaseToCalendarStatus('Fase X')).toBe('new-moon');
  });
});

// ─── sanitizeAWSJSON ─────────────────────────────────────────────────────────

describe('sanitizeAWSJSON — R-26 regex frágil (5 .replace())', () => {
  it('converts = to :', () => {
    const input = '{key = value}';
    const result = sanitizeAWSJSON(input);
    expect(result).toContain(':');
    expect(result).not.toContain(' = ');
  });

  it('wraps bare word keys in double quotes', () => {
    const input = 'phase: Luna nueva';
    const result = sanitizeAWSJSON(input);
    expect(result).toContain('"phase"');
  });

  it('converts single quotes to double quotes', () => {
    const input = "{'key':'value'}";
    const result = sanitizeAWSJSON(input);
    expect(result).toContain('"key"');
    expect(result).toContain('"value"');
    expect(result).not.toContain("'");
  });

  it('handles a representative AWSJSON fragment from API', () => {
    // Representative input as returned by getMoonPhase API
    const rawInput = "{year=2024, month=1, dailyLunarInfo={1={phase='Creciente', lighting=20}}}";
    const result = sanitizeAWSJSON(rawInput);
    // After sanitization, it should be closer to valid JSON
    expect(result).toContain('"year"');
    expect(result).toContain('"month"');
    expect(result).not.toContain("='");
  });

  it('applies all 5 transformations without throwing', () => {
    const testCases = [
      "field=value",
      "key='text value'",
      "{a=1, b='hello world'}",
      "phase='Luna nueva'",
      "data='{\"nested\":\"json\"}'",
    ];
    testCases.forEach((input) => {
      expect(() => sanitizeAWSJSON(input)).not.toThrow();
    });
  });
});

// ─── getNextMonth ────────────────────────────────────────────────────────────

describe('getNextMonth', () => {
  it('advances month within same year', () => {
    expect(getNextMonth(2024, 1)).toEqual([2024, 2]);
    expect(getNextMonth(2024, 6)).toEqual([2024, 7]);
    expect(getNextMonth(2024, 11)).toEqual([2024, 12]);
  });

  it('advances to January of next year when month is 12', () => {
    expect(getNextMonth(2024, 12)).toEqual([2025, 1]);
  });

  it('handles year boundary correctly for edge years', () => {
    expect(getNextMonth(1999, 12)).toEqual([2000, 1]);
    expect(getNextMonth(2099, 12)).toEqual([2100, 1]);
  });
});

// ─── MoonPhaseService — purity gate ─────────────────────────────────────────

describe('B07 — MoonPhaseService domain purity', () => {
  it('can be imported without React dependency errors', () => {
    expect(MoonPhaseService).toBeDefined();
    expect(typeof MoonPhaseService.getCurrentPhase).toBe('function');
    expect(typeof MoonPhaseService.getMonthPhases).toBe('function');
    expect(typeof MoonPhaseService.getNextMoonEvents).toBe('function');
    expect(typeof MoonPhaseService.downloadAndStoreMoonPhaseData).toBe('function');
  });

  it('getCurrentPhase returns error when file cannot be read', async () => {
    const { fileSystemService } = require('@/data/storage/file-system');
    fileSystemService.readFile.mockResolvedValueOnce({
      success: false,
      error: 'File not found',
    });

    const result = await MoonPhaseService.getCurrentPhase();
    expect(result.success).toBe(false);
  });

  it('getMonthPhases returns error when file cannot be read', async () => {
    const { fileSystemService } = require('@/data/storage/file-system');
    fileSystemService.readFile.mockResolvedValueOnce({
      success: false,
      error: 'File not found',
    });

    const result = await MoonPhaseService.getMonthPhases();
    expect(result.success).toBe(false);
  });

  it('getMonthPhases returns sorted daily phase calendar', async () => {
    const { fileSystemService } = require('@/data/storage/file-system');
    const mockData = {
      body: {
        dailyLunarInfo: {
          '15': { phase: 'Luna llena', lighting: 100 },
          '1': { phase: 'Luna nueva', lighting: 0 },
          '8': { phase: 'Creciente', lighting: 50 },
        },
      },
    };

    fileSystemService.readFile.mockResolvedValueOnce({
      success: true,
      data: { data: JSON.stringify(mockData) },
    });

    const result = await MoonPhaseService.getMonthPhases();
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(3);
      // Should be sorted by day
      expect(result.data[0].day).toBe(1);
      expect(result.data[1].day).toBe(8);
      expect(result.data[2].day).toBe(15);
      // Status should be mapped correctly
      expect(result.data[0].status).toBe('new-moon');
      expect(result.data[2].status).toBe('full-moon');
    }
  });

  it('downloadAndStoreMoonPhaseData returns error if API fails', async () => {
    const { moonPhaseAPIService } = require('@/data/api/moon-phase-api');
    moonPhaseAPIService.getMoonPhase.mockResolvedValueOnce({
      success: false,
      error: { name: 'NetworkError', mensage: 'No connection', type: 'network' },
    });

    const result = await MoonPhaseService.downloadAndStoreMoonPhaseData();
    expect(result.success).toBe(false);
  });
});

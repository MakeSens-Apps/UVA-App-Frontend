/**
 * Device review 2026-09-07 — Historial: gráfica vacía (D-01), agregados
 * divergentes (D-15), nombre del reporte compartido (D-19) y toast (D-08).
 *
 * 1. AGREGACIONES (D-15)
 *    Se transcribe LITERALMENTE la lógica privada del original
 *    (`src/app/pages/historical/historical.page.ts:584-871`) y se compara,
 *    sobre un dataset sintético de 3 días con máximos, mínimos y lluvia,
 *    contra las funciones puras de `domain/aggregations/historical-aggregations`.
 *    Cualquier divergencia futura en sum/mean/agrupación por día rompe aquí.
 *
 * 2. FORMA DE ENTRADA
 *    `Measurement.data` es `AWSJSON`: llega como objeto o como string JSON según
 *    el adaptador de DataStore.  El original sólo aceptaba objetos, y en RN la
 *    ruta de la gráfica parseaba el string mientras la de las tarjetas no —
 *    tarjetas y gráfica podían no coincidir.  Ahora ambas comparten
 *    `transformData`, que normaliza las dos formas.
 *
 * 3. GEOMETRÍA DE LA GRÁFICA (D-01)
 *    Los ejes/ticks se calculan con funciones puras verificables contra la
 *    captura del original (`docs/evidence/historical/screen-06`), y el
 *    componente debe emitir SVG real (no un contenedor vacío).
 */

import React from 'react';
import { render } from '@testing-library/react-native';

import {
  transformData,
  parseMeasurementData,
  sum as rnSum,
  mean as rnMean,
  calculateMeasurement,
  calculateDetailedMeasurement,
  calculateOverallStats,
  type HistoricalMeasurement,
  type MeasurementEntry,
} from '@/domain/aggregations/historical-aggregations';
import type { Historical } from '@/data/models/configuration/measurements.model';

import {
  Areachart,
  niceYTicks,
  xAxisDayTicks,
  smoothPath,
  formatDayMonth,
  hexToRgba,
} from '@/components/areachart/AreachartSvg';

import { buildReportFileName } from '@/domain/report/report-file';
import { toastConfig } from '@/components/ui/toastConfig';

// ─────────────────────────────────────────────────────────────────────────────
// ORIGINAL (transcripción literal de historical.page.ts)
// ─────────────────────────────────────────────────────────────────────────────

/** historical.page.ts:631-656 */
function originalTransformData(
  initialData: { data?: Record<string, number> | null; ts: string }[],
): HistoricalMeasurement {
  const result: HistoricalMeasurement = {};
  for (const record of initialData) {
    const { data, ts } = record;
    if (data && typeof data === 'object') {
      for (const [key] of Object.entries(data)) {
        if (!result[key]) {
          result[key] = [];
        }
        result[key].push({ [ts]: data[key] });
      }
    }
  }
  for (const key in result) {
    result[key] = result[key]
      .filter((entry) => entry !== undefined)
      .sort((a, b) => {
        const tsA = a ? parseInt(Object.keys(a)[0], 10) : 0;
        const tsB = b ? parseInt(Object.keys(b)[0], 10) : 0;
        return tsA - tsB;
      });
  }
  return result;
}

/** historical.page.ts:584-600 */
function originalSum(data: MeasurementEntry[]): number | undefined {
  if (!data) {
    return undefined;
  }
  const total = data.reduce((acc, item) => {
    if (item) {
      const value = Object.values(item)[0];
      return acc + value;
    }
    return acc;
  }, 0);
  return Math.round(total);
}

/** historical.page.ts:607-622 */
function originalMean(
  list1: MeasurementEntry[],
  list2: MeasurementEntry[],
): number | undefined {
  if (!list1 || !list2) {
    return undefined;
  }
  const sum1 = originalSum(list1) || 0;
  const sum2 = originalSum(list2) || 0;
  const totalSum = sum1 + sum2;
  const totalCount = list1.length + list2.length;
  if (totalCount === 0) {
    return undefined;
  }
  return Math.round(totalSum / totalCount);
}

/** historical.page.ts:708-756 */
function originalCalculateMeasurement(
  historicalData: HistoricalMeasurement,
  keys: string[],
  calculationType: 'sum' | 'mean',
): MeasurementEntry {
  const result: MeasurementEntry = {};
  keys.forEach((key) => {
    if (historicalData[key]) {
      const dailyValues: Record<string, number[]> = {};
      historicalData[key].forEach((entry) => {
        for (const timestamp in entry) {
          const date = timestamp.split('T')[0];
          if (!dailyValues[date]) {
            dailyValues[date] = [];
          }
          dailyValues[date].push(entry[timestamp]);
        }
      });
      for (const date in dailyValues) {
        const values = dailyValues[date];
        if (calculationType === 'sum') {
          result[date] = values.reduce((acc, val) => acc + val, 0);
        } else if (calculationType === 'mean') {
          result[date] =
            values.reduce((acc, val) => acc + val, 0) / values.length;
        }
      }
    }
  });
  return result;
}

/** historical.page.ts:762-806 */
function originalCalculateDetailedMeasurement(
  historicalData: HistoricalMeasurement,
  keys: string[],
): Record<string, { avg: number; min: number; max: number }> {
  const result: Record<string, { avg: number; min: number; max: number }> = {};
  keys.forEach((key) => {
    if (historicalData[key]) {
      const dailyValues: Record<string, number[]> = {};
      historicalData[key].forEach((entry) => {
        for (const timestamp in entry) {
          const date = timestamp.split('T')[0];
          if (!dailyValues[date]) {
            dailyValues[date] = [];
          }
          dailyValues[date].push(entry[timestamp]);
        }
      });
      for (const date in dailyValues) {
        const values = dailyValues[date];
        if (values.length > 0) {
          const avg = values.reduce((acc, val) => acc + val, 0) / values.length;
          const min = Math.min(...values);
          const max = Math.max(...values);
          result[date] = { avg, min, max };
        }
      }
    }
  });
  return result;
}

/** historical.page.ts:812-871 */
function originalCalculateOverallStats(
  measurement: Historical,
  transformedData: HistoricalMeasurement,
): { min?: number; max?: number; avg?: number } {
  if (
    measurement.aggregationFunction === 'mean' &&
    measurement.graph.type === 'line'
  ) {
    const detailedMeasures = originalCalculateDetailedMeasurement(
      transformedData,
      measurement.measurementIds,
    );
    if (detailedMeasures && Object.keys(detailedMeasures).length > 0) {
      const dailyStats = Object.values(detailedMeasures);
      const mins = dailyStats.map((stats) => stats.min);
      const maxs = dailyStats.map((stats) => stats.max);
      const avgs = dailyStats.map((stats) => stats.avg);
      return {
        min: mins.length > 0 ? Math.min(...mins) : undefined,
        max: maxs.length > 0 ? Math.max(...maxs) : undefined,
        avg:
          avgs.length > 0
            ? avgs.reduce((s, a) => s + a, 0) / avgs.length
            : undefined,
      };
    }
  } else {
    const measures = originalCalculateMeasurement(
      transformedData,
      measurement.measurementIds,
      measurement.aggregationFunction === 'sum' ? 'sum' : 'mean',
    );
    if (measures) {
      const values = Object.values(measures);
      const total =
        values.length > 0 ? values.reduce((s, val) => s + val, 0) : 0;
      return {
        min: values.length > 0 ? Math.min(...values) : undefined,
        max: values.length > 0 ? Math.max(...values) : undefined,
        avg:
          measurement.aggregationFunction === 'sum'
            ? total
            : values.length > 0
              ? total / values.length
              : undefined,
      };
    }
  }
  return { min: undefined, max: undefined, avg: undefined };
}

/** historical.page.ts:558-577 */
function originalCalculateValue(
  measurement: Historical,
  values: HistoricalMeasurement,
): number | undefined {
  switch (measurement.aggregationFunction) {
    case 'sum':
      return measurement.measurementIds.length > 0
        ? originalSum(values[measurement.measurementIds[0]])
        : undefined;
    case 'mean':
      return measurement.measurementIds.length > 1
        ? originalMean(
            values[measurement.measurementIds[0]],
            values[measurement.measurementIds[1]],
          )
        : undefined;
    default:
      return undefined;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Fixture: 3 días, dos registros por día (máximos y mínimos) + lluvia
// Claves reales del RACIMO (environmental-report.service.ts:257-331).
// ─────────────────────────────────────────────────────────────────────────────

const RAW_MEASUREMENTS: { ts: string; data: Record<string, number> }[] = [
  // Día 1 — máximos por la tarde, mínimos por la mañana, 2 lluvias
  {
    ts: '2026-05-01T06:00:00.000Z',
    data: { TEMPERATURA_MIN: 21, HUMEDAD_MIN: 60 },
  },
  {
    ts: '2026-05-01T18:00:00.000Z',
    data: { TEMPERATURA_MAX: 31, HUMEDAD_MAX: 86 },
  },
  { ts: '2026-05-01T18:05:00.000Z', data: { PRECIPITACION: 10 } },
  { ts: '2026-05-01T22:00:00.000Z', data: { PRECIPITACION: 5 } },
  // Día 2
  {
    ts: '2026-05-02T06:00:00.000Z',
    data: { TEMPERATURA_MIN: 22, HUMEDAD_MIN: 56 },
  },
  {
    ts: '2026-05-02T18:00:00.000Z',
    data: { TEMPERATURA_MAX: 28, HUMEDAD_MAX: 80 },
  },
  { ts: '2026-05-02T19:00:00.000Z', data: { PRECIPITACION: 30 } },
  // Día 3 — sólo máximos (día incompleto) y sin lluvia registrada
  {
    ts: '2026-05-03T18:00:00.000Z',
    data: { TEMPERATURA_MAX: 26, HUMEDAD_MAX: 74 },
  },
  { ts: '2026-05-03T18:30:00.000Z', data: { PRECIPITACION: 0 } },
];

/** Minimal `Historical` shaped like the RACIMO config. */
function historical(
  name: string,
  measurementIds: string[],
  aggregationFunction: 'sum' | 'mean',
  graphType: 'line' | 'bar',
): Historical {
  return {
    name,
    symbol: '🌡',
    unit: '°C',
    measurementIds,
    aggregationFunction,
    style: {
      backgroundColor: { colorName: 'x', colorHex: '#FBA641' },
      borderColor: { colorName: 'x', colorHex: '#FBA641' },
    },
    graph: {
      type: graphType,
      measurementIds,
      aggregationFunction,
    },
  } as unknown as Historical;
}

const TEM = historical(
  'Temperatura',
  ['TEMPERATURA_MAX', 'TEMPERATURA_MIN'],
  'mean',
  'line',
);
const HUM = historical(
  'Humedad',
  ['HUMEDAD_MAX', 'HUMEDAD_MIN'],
  'mean',
  'line',
);
const ACU = historical('Acumulado', ['PRECIPITACION'], 'sum', 'bar');

// ─────────────────────────────────────────────────────────────────────────────

describe('D-15 — agregaciones idénticas al original (dataset sintético 3 días)', () => {
  const rnData = transformData(RAW_MEASUREMENTS);
  const originalData = originalTransformData(RAW_MEASUREMENTS);

  it('transformData produce exactamente la misma estructura', () => {
    expect(rnData).toEqual(originalData);
    // Sanidad del fixture: las dos series de temperatura existen por separado.
    expect(Object.keys(rnData).sort()).toEqual([
      'HUMEDAD_MAX',
      'HUMEDAD_MIN',
      'PRECIPITACION',
      'TEMPERATURA_MAX',
      'TEMPERATURA_MIN',
    ]);
  });

  it('sum / mean coinciden con el original', () => {
    expect(rnSum(rnData.PRECIPITACION)).toBe(
      originalSum(originalData.PRECIPITACION),
    );
    expect(rnMean(rnData.TEMPERATURA_MAX, rnData.TEMPERATURA_MIN)).toBe(
      originalMean(originalData.TEMPERATURA_MAX, originalData.TEMPERATURA_MIN),
    );
  });

  it('calculateMeasurement("sum") suma la lluvia POR DÍA (no promedia)', () => {
    const rn = calculateMeasurement(rnData, ACU.measurementIds, 'sum');
    expect(rn).toEqual(
      originalCalculateMeasurement(originalData, ACU.measurementIds, 'sum'),
    );
    // día 1 = 10 + 5 = 15 (promediar daría 7.5 → total del mes a la mitad)
    expect(rn['2026-05-01']).toBe(15);
    expect(rn['2026-05-02']).toBe(30);
    expect(rn['2026-05-03']).toBe(0);
  });

  it('calculateDetailedMeasurement coincide con el original (última clave gana)', () => {
    expect(calculateDetailedMeasurement(rnData, TEM.measurementIds)).toEqual(
      originalCalculateDetailedMeasurement(originalData, TEM.measurementIds),
    );
  });

  it('calculateOverallStats — Tem/Hum/Acu idénticos al original', () => {
    for (const measurement of [TEM, HUM, ACU]) {
      expect(calculateOverallStats(measurement, rnData)).toEqual(
        originalCalculateOverallStats(measurement, originalData),
      );
    }
  });

  it('Acu: avg = total acumulado, max = máximo diario (paridad con "81mm / Max 30mm")', () => {
    const stats = calculateOverallStats(ACU, rnData);
    expect(stats.avg).toBe(45); // 15 + 30 + 0
    expect(stats.max).toBe(30);
    expect(stats.min).toBe(0);
  });

  it('calculateValue (sum/mean) coincide con el original', () => {
    // Transcripción del wrapper que usa la pantalla (HistoricalScreen.calculateValue)
    const rnCalculateValue = (m: Historical, v: HistoricalMeasurement) => {
      switch (m.aggregationFunction) {
        case 'sum':
          return m.measurementIds.length > 0
            ? rnSum(v[m.measurementIds[0]])
            : undefined;
        case 'mean':
          return m.measurementIds.length > 1
            ? rnMean(v[m.measurementIds[0]], v[m.measurementIds[1]])
            : undefined;
        default:
          return undefined;
      }
    };
    for (const measurement of [TEM, HUM, ACU]) {
      expect(rnCalculateValue(measurement, rnData)).toBe(
        originalCalculateValue(measurement, originalData),
      );
    }
  });
});

describe('Measurement.data (AWSJSON) — objeto y string dan el MISMO resultado', () => {
  it('parseMeasurementData acepta objeto, string JSON y nulos', () => {
    expect(parseMeasurementData({ A: 1 })).toEqual({ A: 1 });
    expect(parseMeasurementData('{"A":1}')).toEqual({ A: 1 });
    expect(parseMeasurementData(null)).toBeNull();
    expect(parseMeasurementData(undefined)).toBeNull();
    expect(parseMeasurementData('no-json')).toBeNull();
  });

  it('transformData normaliza registros con data serializada', () => {
    const asStrings = RAW_MEASUREMENTS.map((m) => ({
      ts: m.ts,
      data: JSON.stringify(m.data),
    }));
    expect(transformData(asStrings)).toEqual(transformData(RAW_MEASUREMENTS));
    // …y por tanto las tarjetas Tem/Hum/Acu no pueden divergir de la gráfica.
    expect(calculateOverallStats(ACU, transformData(asStrings))).toEqual(
      calculateOverallStats(ACU, transformData(RAW_MEASUREMENTS)),
    );
  });
});

describe('D-01 — geometría de la gráfica (paridad con screen-06)', () => {
  it('eje Y respeta ymin/ymax duros: Tem 16–38 → 16,20,25,30,35,38', () => {
    expect(niceYTicks(16, 38, 16, 38)).toEqual([16, 20, 25, 30, 35, 38]);
  });

  it('eje Y de humedad 40–100 y de lluvia 0–210 se mantienen dentro de los límites', () => {
    const hum = niceYTicks(40, 100, 40, 100);
    expect(hum[0]).toBe(40);
    expect(hum[hum.length - 1]).toBe(100);
    const acu = niceYTicks(0, 210, 0, 210);
    expect(acu[0]).toBe(0);
    expect(acu[acu.length - 1]).toBe(210);
  });

  it('eje X: mes completo → 11 etiquetas cada 3 días (01/05 … 31/05)', () => {
    const xmin = new Date('2026/05/01 00:00:00').getTime();
    const xmax = new Date('2026/05/31 23:59:59').getTime();
    const ticks = xAxisDayTicks(xmin, xmax);
    expect(ticks).toHaveLength(11);
    expect(formatDayMonth(ticks[0])).toBe('01/05');
    expect(formatDayMonth(ticks[1])).toBe('04/05');
    expect(formatDayMonth(ticks[ticks.length - 1])).toBe('31/05');
  });

  it('smoothPath aplica la curva (tension 0.5) del original', () => {
    const d = smoothPath([
      { x: 0, y: 10 },
      { x: 10, y: 0 },
      { x: 20, y: 10 },
    ]);
    expect(d.startsWith('M 0 10')).toBe(true);
    expect(d).toContain(' C '); // curva cúbica, no segmentos rectos
  });

  it('hexToRgba se conserva del original', () => {
    expect(hexToRgba('#FBA641', 0.6)).toBe('rgba(251, 166, 65, 0.6)');
  });
});

describe('D-01 — el componente dibuja SVG real (no un contenedor vacío)', () => {
  const labels = ['2026-05-01', '2026-05-02', '2026-05-03'];

  /**
   * Counts rendered nodes of a given react-native-svg element type.
   *
   * @param {any} node - JSON tree from RNTL `toJSON()`.
   * @param {string[]} types - element type names to count.
   * @returns {number} number of matching nodes.
   */
  function countNodes(node: any, types: string[]): number {
    if (!node) return 0;
    if (Array.isArray(node)) {
      return node.reduce((acc, n) => acc + countNodes(n, types), 0);
    }
    const self = types.includes(String(node.type)) ? 1 : 0;
    return self + countNodes(node.children, types);
  }

  it('modo normal: emite área + línea + ejes/grid', async () => {
    const { toJSON, queryByTestId } = await render(
      <Areachart
        chartLabels={labels}
        chartData={[24, 25, 23]}
        background="#FBA641"
        borderColor="#FBA641"
        ymin={16}
        ymax={38}
        xmin="2026-05-01"
        xmax="2026-05-31"
        height={220}
      />,
    );
    expect(queryByTestId('areachart')).not.toBeNull();
    expect(queryByTestId('areachart-empty')).toBeNull();
    const tree = toJSON();
    expect(countNodes(tree, ['RNSVGPath', 'Path'])).toBeGreaterThan(0);
    expect(countNodes(tree, ['RNSVGLine', 'Line'])).toBeGreaterThan(0);
    expect(countNodes(tree, ['RNSVGText', 'Text'])).toBeGreaterThan(0);
  });

  it('detailedMode: emite la banda max/min además de la línea', async () => {
    const { toJSON } = await render(
      <Areachart
        chartLabels={labels}
        chartData={[24, 25, 23]}
        chartMinData={[21, 22, 20]}
        chartMaxData={[28, 30, 27]}
        detailedMode
        background="#10BCCA"
        borderColor="#10BCCA"
        ymin={16}
        ymax={38}
        height={220}
      />,
    );
    // banda + línea promedio
    expect(countNodes(toJSON(), ['RNSVGPath', 'Path'])).toBeGreaterThanOrEqual(
      2,
    );
  });

  it('chartType="bar" (lluvia): emite una barra por día', async () => {
    const { toJSON } = await render(
      <Areachart
        chartLabels={labels}
        chartData={[15, 30, 0]}
        chartType="bar"
        background="#10BCCA"
        borderColor="#10BCCA"
        ymin={0}
        ymax={210}
        height={220}
      />,
    );
    expect(countNodes(toJSON(), ['RNSVGRect', 'Rect'])).toBe(3);
  });

  it('sin datos: contenedor vacío explícito (estado Junio del original)', async () => {
    const { queryByTestId } = await render(
      <Areachart chartLabels={[]} chartData={[]} />,
    );
    expect(queryByTestId('areachart-empty')).not.toBeNull();
  });
});

describe('D-19 — nombre del archivo compartido', () => {
  it('reporte-<mes>-<año>.png', () => {
    expect(buildReportFileName(4, 2026)).toBe('reporte-mayo-2026.png');
    expect(buildReportFileName(3, 2026)).toBe('reporte-abril-2026.png');
    expect(buildReportFileName(11, 2025)).toBe('reporte-diciembre-2025.png');
  });
});

describe('D-08 — toast con aspecto de ion-toast', () => {
  it('éxito: barra verde sólida a todo el ancho con texto blanco normal', async () => {
    const node = toastConfig.success!({
      text1: 'Reporte compartido exitosamente',
    } as any);
    const { getByTestId, getByText } = await render(<>{node}</>);
    const bar = getByTestId('ion-toast');
    const style = Array.isArray(bar.props.style)
      ? Object.assign({}, ...bar.props.style.filter(Boolean))
      : bar.props.style;
    expect(style.backgroundColor).toBe('#2DD55B');
    expect(style.width).toBe('100%');

    const label = getByText('Reporte compartido exitosamente');
    const labelStyle = Array.isArray(label.props.style)
      ? Object.assign({}, ...label.props.style.filter(Boolean))
      : label.props.style;
    expect(labelStyle.color).toBe('#FFFFFF');
    // peso normal: la familia usada es la regular, no la bold
    expect(String(labelStyle.fontFamily)).not.toMatch(/Bold|SemiBold/);
  });
});

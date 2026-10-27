/**
 * Historial → Mes → gráfica de lluvia (Acu) con un solo registro (versión 2.3.1).
 *
 * Reporte del teléfono: Febrero 2025, un registro de lluvia de 5 mm.  La gráfica
 * mostraba una franja plana pegada al 0 desde el 01/02 hasta ~12/02, que tapaba
 * el eje Y, y el eje Y decía "210" encima de "200".
 *
 * Causas (AreachartSvg.tsx):
 *   1. El ancho de la barra era `plotW / (n * 1.5)`: con UN registro la barra
 *      medía 2/3 del área de la gráfica (~18 días), centrada en el día del
 *      registro, y se salía por la izquierda sobre las etiquetas del eje Y.
 *      Chart.js (el original, `type: 'bar'` sobre eje `time`) toma el ancho de
 *      la menor distancia entre datos y entre marcas del eje X, por
 *      `barPercentage` 0.9 × `categoryPercentage` 0.8.
 *   2. `niceYTicks` agregaba el máximo duro (210) aunque la marca anterior (200)
 *      estuviera a 10 unidades.  Chart.js (`generateTicks`) reemplaza la marca
 *      que queda demasiado cerca del límite por el límite mismo.
 */

import React from 'react';
import { render } from '@testing-library/react-native';

import {
  Areachart,
  barWidthPx,
  niceYTicks,
  parseDateSafe,
  xAxisDayTicks,
} from '@/components/areachart/AreachartSvg';

// Must match the layout constants of AreachartSvg.tsx.
const PAD_LEFT = 32;
const PAD_RIGHT = 10;

/**
 * Collects the rendered nodes of the given types from an RNTL JSON tree.
 *
 * @param {any} node - JSON tree from `toJSON()`.
 * @param {string[]} types - element type names.
 * @param {any[]} acc - accumulator.
 * @returns {any[]} matching nodes.
 */
function collect(node: any, types: string[], acc: any[] = []): any[] {
  if (!node) return acc;
  if (Array.isArray(node)) {
    node.forEach((n) => collect(n, types, acc));
    return acc;
  }
  if (types.includes(String(node.type))) acc.push(node);
  collect(node.children, types, acc);
  return acc;
}

/** Text content of every SVG text node (y-axis and x-axis labels). */
function svgTexts(tree: any): string[] {
  return collect(tree, ['RNSVGText', 'Text']).map((n) =>
    collect(n.children, ['RNSVGTSpan'])
      .map((s) => s.props.content)
      .concat((n.children ?? []).filter((c: any) => typeof c === 'string'))
      .join(''),
  );
}

/** Numeric geometry of every bar (`Rect`) of the chart. */
function bars(tree: any): { x: number; width: number; height: number }[] {
  return collect(tree, ['RNSVGRect', 'Rect']).map((n) => ({
    x: Number(n.props.x),
    width: Number(n.props.width),
    height: Number(n.props.height),
  }));
}

/** Rendered chart width (the container reports it in its style). */
function chartWidth(tree: any): number {
  const root = collect(tree, ['View']).find(
    (n) => n.props.testID === 'areachart',
  );
  const style = Array.isArray(root.props.style)
    ? Object.assign({}, ...root.props.style.filter(Boolean))
    : root.props.style;
  return Number(style.width);
}

const FEB_2025 = { xmin: '2025-02-01', xmax: '2025-02-28' };
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Renders the rain chart exactly as HistoricalScreen does for Acu.
 *
 * @param {string[]} labels - daily labels (yyyy-MM-dd).
 * @param {number[]} data - daily rain sums.
 * @returns {any} RNTL JSON tree.
 */
async function renderRain(labels: string[], data: number[]): Promise<any> {
  const { toJSON } = await render(
    <Areachart
      chartLabels={labels}
      chartData={data}
      chartType="bar"
      background="#10BCCA"
      borderColor="#10BCCA"
      ymin={0}
      ymax={210}
      xmin={FEB_2025.xmin}
      xmax={FEB_2025.xmax}
      height={220}
    />,
  );
  return toJSON();
}

/**
 * Screen geometry of the month (Feb 2025) for a chart of the given width.
 *
 * @param {number} width - chart width.
 * @returns {{plotW:number; dayPx:number; xOf:(label:string)=>number}} geometry.
 */
function febGeometry(width: number) {
  const plotW = width - PAD_LEFT - PAD_RIGHT;
  const xMin = parseDateSafe(FEB_2025.xmin).getTime();
  const xMax = parseDateSafe(FEB_2025.xmax).getTime();
  const dayPx = (DAY_MS / (xMax - xMin)) * plotW;
  const xOf = (label: string) =>
    PAD_LEFT +
    ((parseDateSafe(label).getTime() - xMin) / (xMax - xMin)) * plotW;
  return { plotW, dayPx, xOf };
}

describe('Gráfica de lluvia — un solo registro en el mes', () => {
  it('dibuja UNA barra angosta centrada en su día, dentro del área de la gráfica', async () => {
    const tree = await renderRain(['2025-02-03'], [5]);
    const width = chartWidth(tree);
    const { plotW, dayPx, xOf } = febGeometry(width);

    const rects = bars(tree);
    expect(rects).toHaveLength(1);
    const [bar] = rects;

    // Never painted over the y-axis labels nor past the right edge.
    expect(bar.x).toBeGreaterThanOrEqual(PAD_LEFT);
    expect(bar.x + bar.width).toBeLessThanOrEqual(PAD_LEFT + plotW + 0.01);

    // Chart.js: 0.72 × the 3-day spacing of the x ticks → ~2 days, never 2/3
    // of the plot (the reported ~18-day slab).
    expect(bar.width).toBeCloseTo(0.72 * 3 * dayPx, 1);
    expect(bar.width).toBeLessThan(plotW / 4);

    // Centred on 03/02.
    expect(bar.x + bar.width / 2).toBeCloseTo(xOf('2025-02-03'), 1);

    // 5 mm on a 0–210 axis is a short bar, but a bar (Chart.js parity).
    expect(bar.height).toBeGreaterThan(1);
  });

  it('el eje Y de lluvia no encima "210" sobre "200"', async () => {
    const tree = await renderRain(['2025-02-03'], [5]);
    const labels = svgTexts(tree);
    expect(labels).toContain('0');
    expect(labels).toContain('210');
    expect(labels).not.toContain('200');
  });

  it('un registro de 0 mm no pinta una franja ancha', async () => {
    const tree = await renderRain(['2025-02-10'], [0]);
    const width = chartWidth(tree);
    const { plotW } = febGeometry(width);
    const [bar] = bars(tree);
    expect(bar.width).toBeLessThan(plotW / 4);
    expect(bar.height).toBeLessThanOrEqual(1);
  });

  it('registros el primer y el último día del mes no se salen del área', async () => {
    const tree = await renderRain(['2025-02-01', '2025-02-28'], [12, 40]);
    const width = chartWidth(tree);
    const { plotW } = febGeometry(width);
    for (const bar of bars(tree)) {
      expect(bar.x).toBeGreaterThanOrEqual(PAD_LEFT);
      expect(bar.x + bar.width).toBeLessThanOrEqual(PAD_LEFT + plotW + 0.01);
    }
  });
});

describe('Gráfica de lluvia — varios registros en el mes', () => {
  it('días consecutivos: barras de 0.72 día que no se tocan', async () => {
    const labels = ['2025-02-03', '2025-02-04', '2025-02-05', '2025-02-20'];
    const tree = await renderRain(labels, [5, 30, 12, 80]);
    const width = chartWidth(tree);
    const { dayPx, xOf } = febGeometry(width);

    const rects = bars(tree);
    expect(rects).toHaveLength(4);
    rects.forEach((bar, i) => {
      expect(bar.width).toBeCloseTo(0.72 * dayPx, 1);
      expect(bar.x + bar.width / 2).toBeCloseTo(xOf(labels[i]), 1);
    });
    for (let i = 1; i < rects.length; i++) {
      expect(rects[i].x).toBeGreaterThan(rects[i - 1].x + rects[i - 1].width);
    }
    // Taller bar for more rain.
    expect(rects[3].height).toBeGreaterThan(rects[0].height);
  });
});

describe('barWidthPx — regla de Chart.js (computeMinSampleSize × 0.9 × 0.8)', () => {
  it('usa la menor distancia entre datos y entre marcas del eje X', () => {
    expect(barWidthPx([100], [0, 30, 60, 90], 300)).toBeCloseTo(0.72 * 30);
    expect(barWidthPx([100, 110], [0, 30, 60], 300)).toBeCloseTo(0.72 * 10);
    // Sin marcas ni vecinos: el ancho del área (como `scale._length`).
    expect(barWidthPx([100], [], 300)).toBeCloseTo(0.72 * 300);
  });
});

describe('niceYTicks — la marca demasiado cerca del límite se reemplaza (Chart.js)', () => {
  it('lluvia 0–210 → 0, 50, 100, 150, 210', () => {
    expect(niceYTicks(0, 210, 0, 210)).toEqual([0, 50, 100, 150, 210]);
  });

  it('temperatura 16–38 conserva 35 y 38 (no están encimadas)', () => {
    expect(niceYTicks(16, 38, 16, 38)).toEqual([16, 20, 25, 30, 35, 38]);
  });

  it('humedad 40–100 sin cambios', () => {
    expect(niceYTicks(40, 100, 40, 100)).toEqual([40, 60, 80, 100]);
  });

  it('mínimo duro demasiado cerca de la primera marca: se descarta la marca', () => {
    // 45–250, paso 50: la marca 50 queda a 5 del mínimo duro 45.
    expect(niceYTicks(45, 250, 45, 250)).toEqual([45, 100, 150, 200, 250]);
  });

  it('sin límites duros no cambia nada', () => {
    expect(niceYTicks(0, 205)).toEqual([0, 50, 100, 150, 200, 250]);
  });
});

describe('Temperatura / humedad con un solo registro', () => {
  it('se ve el punto del día (pointRadius 1 del original)', async () => {
    const { toJSON } = await render(
      <Areachart
        chartLabels={['2025-02-03']}
        chartData={[18.5]}
        chartMinData={[18]}
        chartMaxData={[19]}
        detailedMode
        background="#FBA641"
        borderColor="#FBA641"
        ymin={16}
        ymax={38}
        xmin={FEB_2025.xmin}
        xmax={FEB_2025.xmax}
        height={220}
      />,
    );
    const tree = toJSON();
    const width = chartWidth(tree);
    const { xOf } = febGeometry(width);
    const dots = collect(tree, ['RNSVGCircle', 'Circle']);
    expect(dots).toHaveLength(1);
    expect(Number(dots[0].props.cx)).toBeCloseTo(xOf('2025-02-03'), 1);
  });

  it('el eje X sigue mostrando el mes completo (01/02 … 28/02)', () => {
    const ticks = xAxisDayTicks(
      parseDateSafe(FEB_2025.xmin).getTime(),
      parseDateSafe(FEB_2025.xmax).getTime(),
    );
    expect(ticks).toHaveLength(10);
  });
});

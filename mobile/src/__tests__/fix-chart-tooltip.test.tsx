/**
 * Device bug (2026-09-10): tocar la gráfica del histórico no mostraba nada.
 *
 * En el original (Chart.js, `src/app/components/areachart/areachart.component.ts:220-290`)
 * `interaction: { mode:'index', intersect:false, axis:'x' }` selecciona el dato
 * cuya x está más cerca del toque y `plugins.tooltip` pinta un recuadro blanco
 * con borde `#ccc`, título `dd/MM/yyyy` (14px) y cuerpo (12px):
 *
 *   - `detailedMode` (Tem/Hum): `Máximo` / `Mínimo` / `Promedio`, o una sola
 *     línea `Promedio` cuando los tres valores coinciden. La línea `Promedio:`
 *     lleva el color de la serie; el resto, negro.
 *   - modo normal (lluvia/barras): una sola línea `Promedio: valor`, negra.
 *
 * No hay desviación estándar en el original.
 */

import React from 'react';
import { StyleSheet } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';

import {
  Areachart,
  buildTooltipContent,
  estimateTooltipSize,
  formatTooltipDate,
  nearestIndexFromX,
  placeTooltip,
  TOOLTIP_TEXT_COLOR,
  type ChartDatum,
} from '@/components/areachart/AreachartSvg';

// Layout constants of the component (privadas): sólo se usan para calcular en
// qué x cae cada dato dentro del test de integración.
const PAD_LEFT = 32;
const PAD_RIGHT = 10;
const SERIES_COLOR = '#10BCCA';

/**
 * Monotonic clock for the synthetic events: PanResponder drops an
 * `onResponderMove` whose `mostRecentTimeStamp` it has already accounted for.
 */
let touchClock = 0;

/**
 * Builds a synthetic responder event with the touch history PanResponder needs.
 *
 * @param {number} x - locationX of the touch.
 * @param {number} y - locationY of the touch.
 * @returns {any} event payload accepted by `fireEvent`.
 */
function touchEvent(x: number, y: number): any {
  touchClock += 16;
  const ts = touchClock;
  const touch = {
    touchActive: true,
    startPageX: x,
    startPageY: y,
    startTimeStamp: ts,
    currentPageX: x,
    currentPageY: y,
    currentTimeStamp: ts,
    previousPageX: x,
    previousPageY: y,
    previousTimeStamp: ts,
  };
  return {
    nativeEvent: {
      locationX: x,
      locationY: y,
      pageX: x,
      pageY: y,
      identifier: 0,
      target: 1,
      timestamp: ts,
      touches: [],
      changedTouches: [],
    },
    touchHistory: {
      touchBank: [touch],
      numberActiveTouches: 1,
      indexOfSingleActiveTouch: 0,
      mostRecentTimeStamp: ts,
    },
  };
}

// ─── x → índice (Chart.js mode:'index', axis:'x') ─────────────────────────────

describe('nearestIndexFromX — mapeo x → índice', () => {
  const xs = [32, 100, 168, 236];

  it('devuelve el dato cuya x está más cerca del toque', () => {
    expect(nearestIndexFromX(xs, 30)).toBe(0);
    expect(nearestIndexFromX(xs, 95)).toBe(1);
    expect(nearestIndexFromX(xs, 170)).toBe(2);
    expect(nearestIndexFromX(xs, 1000)).toBe(3);
  });

  it('no exige acertar el punto (intersect:false): en el empate gana el índice menor', () => {
    expect(nearestIndexFromX(xs, 66)).toBe(0); // empate 32/100
    expect(nearestIndexFromX(xs, 67)).toBe(1);
  });

  it('devuelve -1 sin datos', () => {
    expect(nearestIndexFromX([], 10)).toBe(-1);
  });
});

// ─── Formato de fecha del título ──────────────────────────────────────────────

describe('formatTooltipDate — dd/MM/yyyy', () => {
  it('rellena día y mes a dos dígitos', () => {
    expect(formatTooltipDate(new Date(2026, 4, 1).getTime())).toBe('01/05/2026');
    expect(formatTooltipDate(new Date(2026, 11, 9).getTime())).toBe('09/12/2026');
    expect(formatTooltipDate(new Date(2026, 9, 31).getTime())).toBe('31/10/2026');
  });

  it('coincide con toLocaleDateString("es-ES") del original', () => {
    const ts = new Date(2026, 4, 7).getTime();
    expect(formatTooltipDate(ts)).toBe(
      new Date(ts).toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }),
    );
  });
});

// ─── Contenido del tooltip ────────────────────────────────────────────────────

describe('buildTooltipContent', () => {
  const ts = new Date(2026, 4, 12).getTime();

  it('detailedMode: Máximo / Mínimo / Promedio, con Promedio en el color de la serie', () => {
    const datum: ChartDatum = { x: ts, y: 24, yMin: 21, yMax: 28 };
    const { title, lines } = buildTooltipContent(datum, true, SERIES_COLOR);

    expect(title).toBe('12/05/2026');
    expect(lines.map((l) => l.text)).toEqual([
      'Máximo: 28',
      'Mínimo: 21',
      'Promedio: 24',
    ]);
    expect(lines[0].color).toBe(TOOLTIP_TEXT_COLOR);
    expect(lines[1].color).toBe(TOOLTIP_TEXT_COLOR);
    expect(lines[2].color).toBe(SERIES_COLOR);
  });

  it('detailedMode con los tres valores iguales: sólo Promedio', () => {
    const datum: ChartDatum = { x: ts, y: 22, yMin: 22, yMax: 22 };
    const { lines } = buildTooltipContent(datum, true, SERIES_COLOR);

    expect(lines).toHaveLength(1);
    expect(lines[0].text).toBe('Promedio: 22');
    expect(lines[0].color).toBe(SERIES_COLOR);
  });

  it('modo normal (lluvia/barras): una sola línea Promedio en negro', () => {
    const datum: ChartDatum = { x: ts, y: 15 };
    const { title, lines } = buildTooltipContent(datum, false, SERIES_COLOR);

    expect(title).toBe('12/05/2026');
    expect(lines).toHaveLength(1);
    expect(lines[0].text).toBe('Promedio: 15');
    expect(lines[0].color).toBe(TOOLTIP_TEXT_COLOR);
  });

  it('no inventa desviación estándar (el original no la tiene)', () => {
    const detailed = buildTooltipContent(
      { x: ts, y: 24, yMin: 21, yMax: 28 },
      true,
      SERIES_COLOR,
    );
    const plain = buildTooltipContent({ x: ts, y: 15 }, false, SERIES_COLOR);
    const all = [...detailed.lines, ...plain.lines].map((l) => l.text).join(' ');
    expect(all).not.toMatch(/desviaci|σ|std/i);
  });

  it('sin min/max cae al modo simple aunque detailedMode esté activo', () => {
    const { lines } = buildTooltipContent({ x: ts, y: 15 }, true, SERIES_COLOR);
    expect(lines).toHaveLength(1);
    expect(lines[0].text).toBe('Promedio: 15');
  });
});

// ─── Posicionamiento (no se sale del ancho) ───────────────────────────────────

describe('placeTooltip', () => {
  const size = { w: 120, h: 70 };

  it('centra el recuadro sobre el punto cuando cabe', () => {
    const p = placeTooltip({
      pointX: 200,
      pointY: 150,
      size,
      chartWidth: 400,
      chartHeight: 220,
    });
    expect(p.left).toBeCloseTo(140);
    expect(p.above).toBe(true);
    expect(p.top).toBeLessThan(150);
  });

  it('recorta a la izquierda y a la derecha sin salirse del chart', () => {
    const left = placeTooltip({
      pointX: 4,
      pointY: 150,
      size,
      chartWidth: 400,
      chartHeight: 220,
    });
    expect(left.left).toBeGreaterThanOrEqual(0);

    const right = placeTooltip({
      pointX: 396,
      pointY: 150,
      size,
      chartWidth: 400,
      chartHeight: 220,
    });
    expect(right.left + size.w).toBeLessThanOrEqual(400);
  });

  it('lo baja cuando no hay espacio arriba', () => {
    const p = placeTooltip({
      pointX: 200,
      pointY: 12,
      size,
      chartWidth: 400,
      chartHeight: 220,
    });
    expect(p.above).toBe(false);
    expect(p.top).toBeGreaterThan(12);
  });

  it('mantiene el caret dentro del recuadro', () => {
    const p = placeTooltip({
      pointX: 4,
      pointY: 150,
      size,
      chartWidth: 400,
      chartHeight: 220,
    });
    expect(p.caretX).toBeGreaterThanOrEqual(p.left);
    expect(p.caretX).toBeLessThanOrEqual(p.left + size.w);
  });

  it('estimateTooltipSize da una caja no vacía para el primer frame', () => {
    const content = buildTooltipContent(
      { x: Date.now(), y: 24, yMin: 21, yMax: 28 },
      true,
      SERIES_COLOR,
    );
    const s = estimateTooltipSize(content);
    expect(s.w).toBeGreaterThan(0);
    expect(s.h).toBeGreaterThan(0);
  });
});

// ─── Integración: tocar la gráfica muestra el tooltip ─────────────────────────

describe('Areachart — tooltip al tocar la gráfica', () => {
  const labels = ['2026-05-01', '2026-05-02', '2026-05-03'];

  /**
   * Renders the chart in detailed mode (Tem/Hum) and exposes the x of each datum.
   *
   * @param {number[]} data - average series.
   * @returns {any} RNTL utils plus `xOf(index)`.
   */
  async function renderChart(data: number[] = [24, 25, 23]): Promise<any> {
    const utils = await render(
      <Areachart
        chartLabels={labels}
        chartData={data}
        chartMinData={[21, 22, 20]}
        chartMaxData={[28, 30, 27]}
        detailedMode
        background={SERIES_COLOR}
        borderColor={SERIES_COLOR}
        ymin={16}
        ymax={38}
        xmin="2026-05-01"
        xmax="2026-05-03"
        height={220}
      />,
    );
    const flat: any = StyleSheet.flatten(
      utils.getByTestId('areachart').props.style,
    );
    const plotW: number = flat.width - PAD_LEFT - PAD_RIGHT;
    // xmin/xmax abarcan exactamente los 3 días → los datos caen en 0, ½ y 1.
    const xOf = (i: number) => PAD_LEFT + (i / 2) * plotW;
    return { ...utils, xOf };
  }

  /**
   * Fires a touch on the chart's touch layer.
   *
   * @param {any} utils - RNTL render result.
   * @param {number} x - locationX.
   * @param {number} y - locationY.
   * @returns {void}
   */
  async function touch(utils: any, x: number, y: number): Promise<void> {
    await fireEvent(
      utils.getByTestId('areachart-touch-layer'),
      'responderGrant',
      touchEvent(x, y),
    );
  }

  it('no muestra nada hasta que se toca', async () => {
    const utils = await renderChart();
    expect(utils.queryByTestId('areachart-tooltip')).toBeNull();
  });

  it('tocar sobre el primer dato abre el tooltip con sus tres líneas', async () => {
    const utils = await renderChart();
    await touch(utils, utils.xOf(0), 60);

    expect(utils.getByTestId('areachart-tooltip')).toBeTruthy();
    expect(utils.getByTestId('areachart-tooltip-title').props.children).toBe(
      '01/05/2026',
    );
    expect(utils.getByText('Máximo: 28')).toBeTruthy();
    expect(utils.getByText('Mínimo: 21')).toBeTruthy();
    expect(utils.getByText('Promedio: 24')).toBeTruthy();
  });

  it('arrastrar a otro punto cambia el dato seleccionado', async () => {
    const utils = await renderChart();
    await touch(utils, utils.xOf(0), 60);
    expect(utils.getByTestId('areachart-tooltip-title').props.children).toBe(
      '01/05/2026',
    );

    await fireEvent(
      utils.getByTestId('areachart-touch-layer'),
      'responderMove',
      touchEvent(utils.xOf(2), 60),
    );
    expect(utils.getByTestId('areachart-tooltip-title').props.children).toBe(
      '03/05/2026',
    );
    expect(utils.getByText('Promedio: 23')).toBeTruthy();
  });

  it('tocar fuera del área de dibujo lo cierra', async () => {
    const utils = await renderChart();
    await touch(utils, utils.xOf(1), 60);
    expect(utils.queryByTestId('areachart-tooltip')).not.toBeNull();

    // y = 210 cae en el hueco de las etiquetas del eje X (height 220, PAD_BOTTOM 42)
    await touch(utils, utils.xOf(1), 210);
    expect(utils.queryByTestId('areachart-tooltip')).toBeNull();
  });

  it('cambiar los datos cierra el tooltip', async () => {
    const utils = await renderChart();
    await touch(utils, utils.xOf(1), 60);
    expect(utils.queryByTestId('areachart-tooltip')).not.toBeNull();

    await utils.rerender(
      <Areachart
        chartLabels={labels}
        chartData={[30, 31, 32]}
        chartMinData={[21, 22, 20]}
        chartMaxData={[28, 30, 27]}
        detailedMode
        background={SERIES_COLOR}
        borderColor={SERIES_COLOR}
        ymin={16}
        ymax={38}
        xmin="2026-05-01"
        xmax="2026-05-03"
        height={220}
      />,
    );
    expect(utils.queryByTestId('areachart-tooltip')).toBeNull();
  });

  it('modo barras (lluvia): una sola línea Promedio', async () => {
    const utils = await render(
      <Areachart
        chartLabels={labels}
        chartData={[15, 30, 0]}
        chartType="bar"
        background={SERIES_COLOR}
        borderColor={SERIES_COLOR}
        ymin={0}
        ymax={210}
        xmin="2026-05-01"
        xmax="2026-05-03"
        height={220}
      />,
    );
    await fireEvent(
      utils.getByTestId('areachart-touch-layer'),
      'responderGrant',
      touchEvent(PAD_LEFT, 60),
    );

    expect(utils.getByTestId('areachart-tooltip-title').props.children).toBe(
      '01/05/2026',
    );
    expect(utils.getByText('Promedio: 15')).toBeTruthy();
    expect(utils.queryByText(/Máximo/)).toBeNull();
    expect(utils.queryByText(/Mínimo/)).toBeNull();
  });
});

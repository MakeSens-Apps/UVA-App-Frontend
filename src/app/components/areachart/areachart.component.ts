import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  ViewChild,
} from '@angular/core';
// import Chart from 'chart.js/auto';
import {
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  ChartConfiguration,
  ChartData,
  ChartOptions,
  Filler,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  TimeScale,
  Title,
  Tooltip,
} from 'chart.js';
import 'chartjs-adapter-date-fns';

// Registra los elementos y controladores necesarios
Chart.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  LineController,
  BarController,
  Filler,
  Title,
  Tooltip,
  Legend,
  TimeScale,
);

@Component({
  selector: 'app-areachart',
  templateUrl: './areachart.component.html',
  styleUrls: ['./areachart.component.scss'],
  standalone: true,
  imports: [],
})
export class AreachartComponent implements AfterViewInit {
  /**
   * Reference to the canvas element for rendering the chart.
   * @type {ElementRef<HTMLCanvasElement>}
   */
  @ViewChild('chartCanvas', { static: true })
  chartCanvas!: ElementRef<HTMLCanvasElement>;

  /**
   * Data points for the chart.
   * @type {number[]}
   */
  @Input() chartData: number[] = [];

  /**
   * Labels for the chart's X-axis.
   * @type {string[]}
   */
  @Input() chartLabels: string[] = [];

  /**
   * Background color for the area under the chart line in hex format.
   * @type {string}
   * @default '#FBA641'
   */
  @Input() background = '#FBA641';

  /**
   * Border color for the chart line in hex format.
   * @type {string}
   * @default '#FBA641'
   */
  @Input() borderColor = '#FBA641';

  /**
   * Holds the instance of the chart for updating and management.
   * @type {Chart}
   */
  private chart!: Chart;

  /**
   * Type of the chart (e.g., 'line', 'bar').
   * @type {string}
   * @default 'line'
   */
  @Input() chartType: ChartConfiguration['type'] = 'line';

  @Input() ymax: number | undefined;
  @Input() ymin: number | undefined;

  @Input() xmin: string | undefined;
  @Input() xmax: string | undefined;

  /**
   * Enable detailed mode with min/max area visualization.
   * @type {boolean}
   * @default false
   */
  @Input() detailedMode = false;

  /**
   * Minimum values for detailed visualization.
   * @type {number[]}
   */
  @Input() chartMinData: number[] = [];

  /**
   * Maximum values for detailed visualization.
   * @type {number[]}
   */
  @Input() chartMaxData: number[] = [];
  /**
   * Creates an instance of AreachartComponent.
   * @memberof AreachartComponent
   */
  constructor() {}

  /**
   * Lifecycle hook that initializes the chart after the view has been initialized.
   * @returns {void}
   */
  ngAfterViewInit(): void {
    this.createChart();
  }

  /**
   * Creates the area chart with gradient fill and specified options.
   * Initializes `this.chart` with the created chart instance.
   * @returns {void}
   */
  createChart(): void {
    const ctx = this.chartCanvas.nativeElement.getContext('2d');
    const canvas = this.chartCanvas.nativeElement;
    const container = canvas.parentElement;

    if (container) {
      // Ajusta las dimensiones del canvas al contenedor
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    }
    if (!ctx) {
      console.error('No se pudo obtener el contexto del canvas.');
      return;
    }

    let gradient;
    if (this.chartType === 'bar') {
      gradient = this.borderColor;
    } else {
      gradient = ctx.createLinearGradient(0, 0, 0, 300);
      gradient.addColorStop(0, this.hexToRgba(this.background, 0.8));
      gradient.addColorStop(1, this.hexToRgba(this.background, 0.2));
    }

    const datasets: any[] = [];

    if (this.detailedMode && this.chartType === 'line') {
      // Dataset para área min-max (debe ir primero para que quede detrás)
      if (this.chartMinData.length > 0 && this.chartMaxData.length > 0) {
        datasets.push({
          label: 'Rango Máximo',
          data: this.chartMaxData,
          fill: '+1',
          backgroundColor: this.hexToRgba(this.background, 0.6),
          borderColor: 'transparent',
          pointRadius: 0,
          tension: 0.5,
        });
        datasets.push({
          label: 'Rango Mínimo',
          data: this.chartMinData,
          fill: false,
          backgroundColor: 'transparent',
          borderColor: 'transparent',
          pointRadius: 0,
          tension: 0.5,
        });
      }

      // Dataset para línea promedio (va encima)
      datasets.push({
        label: 'Promedio',
        data: this.chartData,
        fill: false,
        backgroundColor: 'transparent',
        borderColor: this.borderColor,
        borderWidth: 2,
        pointRadius: 1,
        pointBackgroundColor: this.borderColor,
        tension: 0.5,
      });
    } else {
      // Modo normal (gráfica simple)
      datasets.push({
        label: 'Medicion',
        data: this.chartData,
        fill: true,
        backgroundColor: gradient,
        borderColor: this.borderColor,
        pointRadius: 1,
        tension: 0.5,
      });
    }

    const data: ChartData<'line'> = {
      labels: this.chartLabels,
      datasets: datasets,
    };
    const options: ChartOptions = {
      responsive: true,
      interaction: {
        mode: 'index',
        intersect: false,
        axis: 'x',
      },
      plugins: {
        legend: {
          display: false, // Oculta la leyenda
        },
        tooltip: {
          backgroundColor: 'white',
          titleColor: 'black',
          bodyColor: 'black',
          borderColor: '#ccc',
          borderWidth: 1,
          displayColors: false,
          bodyFont: {
            size: 12,
          },
          titleFont: {
            size: 14,
          },
          callbacks: {
            title: (context: any) => {
              const date = new Date(context[0].parsed.x);
              return date.toLocaleDateString('es-ES', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
              });
            },
            labelTextColor: (context: any) => {
              if (this.detailedMode && context.dataset.label === 'Promedio') {
                const labelText = context.label || '';
                // Si la línea contiene "Promedio", usar el color de la gráfica
                if (labelText.includes('Promedio:')) {
                  return this.borderColor;
                }
              }
              // Para el resto de texto, usar negro
              return 'black';
            },
            label: (context: any) => {
              // Solo mostrar información para el dataset principal (Promedio)
              if (this.detailedMode && context.dataset.label === 'Promedio') {
                const index = context.dataIndex;
                const promValue = this.chartData[index];
                const maxValue = this.chartMaxData[index];
                const minValue = this.chartMinData[index];

                // Si todos los valores son iguales, mostrar solo uno
                if (promValue === maxValue && maxValue === minValue) {
                  return `Promedio: ${promValue}`;
                }

                // Caso normal: todos diferentes
                return [
                  `Máximo: ${maxValue}`,
                  `Mínimo: ${minValue}`,
                  `Promedio: ${promValue}`,
                ];
              } else if (!this.detailedMode) {
                return `Promedio: ${context.parsed.y}`;
              }
              // No mostrar nada para los otros datasets en modo detallado
              return '';
            },
          },
        },
      },
      scales: {
        x: {
          min: this.xmin,
          max: this.xmax,
          type: 'time',
          time: {
            unit: 'day',
            displayFormats: {
              day: 'dd/MM',
            },
          },
        },
        y: {
          min: this.ymin,
          max: this.ymax,
        },
      },
    };

    const config: ChartConfiguration = {
      type: this.chartType,
      data: data,
      options: options,
    };

    this.chart = new Chart(ctx, config);
  }

  /**
   * Updates the chart with new data, labels, background color, or border color.
   * Adjusts the chart's dataset and refreshes it.
   * @param {string[]} [labels] - Optional new labels for the X-axis.
   * @param {number[]} [data] - Optional new data points.
   * @param {string} [background] - Optional new background color in hex format.
   * @param {string} [borderColor] - Optional new border color in hex format.
   * @param {ChartConfiguration['type']} [newType] - Optional new chart type.
   * @param {number|undefined} [ymin] - Range Min in Graph
   * @param {number|undefined} [ymax] - Range Max in Graph
   * @param {string|undefined} [xmin] - Range Min in Graph
   * @param {string|undefined} [xmax] - Range Max in Graph
   * @param {boolean} [detailedMode] - Enable detailed mode with min/max area
   * @param {number[]} [minData] - Minimum values for detailed visualization
   * @param {number[]} [maxData] - Maximum values for detailed visualization
   * @returns {void}
   */
  UpdateChart(
    labels?: string[],
    data?: number[],
    background?: string,
    borderColor?: string,
    newType: ChartConfiguration['type'] = 'line',
    ymin?: number | undefined,
    ymax?: number | undefined,
    xmin?: string | undefined,
    xmax?: string | undefined,
    detailedMode?: boolean,
    minData?: number[],
    maxData?: number[],
  ): void {
    this.chartType = newType; // Actualiza el tipo
    this.background = background || this.background;
    this.borderColor = borderColor || this.borderColor;
    this.chartData = data || this.chartData;
    this.chartLabels = labels || this.chartLabels;
    this.ymax = ymax;
    this.ymin = ymin;
    this.xmax = xmax;
    this.xmin = xmin;
    this.detailedMode = detailedMode || false;
    this.chartMinData = minData || [];
    this.chartMaxData = maxData || [];
    if (this.chart) {
      this.chart.destroy();
    }
    this.createChart();
  }

  /**
   * Converts a hex color code to RGBA format.
   * @param {string} hex - Hexadecimal color code (e.g., `#FFFFFF`).
   * @param {number} alpha - Alpha value for transparency (0 to 1).
   * @returns {string} RGBA color string.
   */
  hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  /**
   * Get month of datestring
   * @param {string } dateString alguna fecha de datos
   * @returns {Record<string, string>} Retorna starOfMonth y endOfMonth limits
   */
  private getMonthStartAndEnd(dateString: string): {
    startOfMonth: string;
    endOfMonth: string;
  } {
    const formattedDate = dateString.replace(/-/g, '/');
    const date = new Date(formattedDate);

    if (isNaN(date.getTime())) {
      throw new Error(
        'Fecha inválida. Asegúrate de usar un formato válido (YYYY-MM-DD o similar).',
      );
    }

    // Obtener el año y el mes de la fecha
    const year = date.getFullYear();
    const month = date.getMonth();

    // Crear las fechas de inicio y fin del mes
    const startOfMonth = new Date(
      year,
      month,
      1,
      0,
      0,
      0,
      0,
    ).toLocaleDateString('en-CA');
    const endOfMonth = new Date(
      year,
      month + 1,
      0,
      23,
      59,
      59,
      999,
    ).toLocaleDateString('en-CA');

    return { startOfMonth, endOfMonth };
  }
}

import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  ViewChild,
} from '@angular/core';
// import Chart from 'chart.js/auto';
import {
  Chart,
  ChartConfiguration,
  ChartData,
  ChartOptions,
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
} from 'chart.js';

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
   * @default [10, 30, 25, 60, 60, 75, 100, 80]
   */
  @Input() chartData: number[] = [10, 30, 25, 60, 60, 75, 100, 80];

  /**
   * Labels for the chart's X-axis.
   * @type {string[]}
   * @default ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Ago']
   */
  @Input() chartLabels: string[] = [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'julio',
    'Ago',
  ];

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
    if (!ctx) {
      console.error('No se pudo obtener el contexto del canvas.');
      return;
    }

    // Crear el gradiente
    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, this.hexToRgba(this.background, 1));
    gradient.addColorStop(1, this.hexToRgba(this.background, 0));

    const data: ChartData<'line'> = {
      labels: this.chartLabels,
      datasets: [
        {
          label: 'Mi Dataset',
          data: this.chartData,
          fill: true,
          backgroundColor: gradient,
          borderColor: this.borderColor, // Color de la línea
          tension: 0.5, // Suavidad de la curva
        },
      ],
    };

    const options: ChartOptions = {
      responsive: true,
      plugins: {
        legend: {
          display: false, // Oculta la leyenda
        },
      },
      scales: {
        x: {
          beginAtZero: true,
        },
        y: {
          beginAtZero: true,
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
   * @returns {void}
   */
  UpdateChart(
    labels?: string[],
    data?: number[],
    background?: string,
    borderColor?: string,
    newType: ChartConfiguration['type'] = 'line',
  ): void {
    this.chartType = newType; // Actualiza el tipo
    this.background = background || this.background;
    this.borderColor = borderColor || this.borderColor;
    this.chartData = data || this.chartData;
    this.chartLabels = labels || this.chartLabels;

    this.chart.destroy(); // Destruye el gráfico actual
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
}

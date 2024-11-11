import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
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
  LineController,
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
  LineController,
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
export class AreachartComponent {
  @ViewChild('chartCanvas', { static: true })
  chartCanvas!: ElementRef<HTMLCanvasElement>;
  @Input() chartData: number[] = [10, 30, 25, 60, 60, 75, 100, 80];
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

  @Input() background = '#FBA641';
  @Input() borderColor = '#FBA641';
  private chart!: Chart;

  constructor() {}

  ngAfterViewInit(): void {
    this.createChart();
  }

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

    const options: ChartOptions<'line'> = {
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

    const config: ChartConfiguration<'line'> = {
      type: 'line',
      data: data,
      options: options,
    };

    this.chart = new Chart(ctx, config);
  }

  UpdateChart(
    labels?: string[],
    data?: number[],
    background?: string,
    borderColor?: string,
  ): void {
    const ctx = this.chartCanvas.nativeElement.getContext('2d');
    if (!ctx) {
      console.error('No se pudo obtener el contexto del canvas.');
      return;
    }
    if (background) {
      let nuevoGradient = ctx.createLinearGradient(0, 0, 0, 300);
      nuevoGradient.addColorStop(0, this.hexToRgba(background, 1));
      nuevoGradient.addColorStop(1, this.hexToRgba(background, 0));

      this.chart.data.datasets[0].backgroundColor = nuevoGradient;
    }
    this.chart.data.datasets[0].borderColor = borderColor
      ? borderColor
      : this.borderColor;

    if (labels) {
      this.chart.data.labels = labels;
    }
    if (data) {
      this.chart.data.datasets[0].data = data;
    }

    this.chart.update(); // Refresca el gráfico con los nuevos datos
  }

  // Función para convertir Hex a RGBA
  hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
}

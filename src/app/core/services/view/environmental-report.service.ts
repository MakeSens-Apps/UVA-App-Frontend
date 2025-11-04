import { Injectable, ComponentRef, ApplicationRef, createComponent, EnvironmentInjector } from '@angular/core';
import { MeasurementDSService } from '../storage/datastore/measurement-ds.service';
import { UserDSService } from '../storage/datastore/user-ds.service';
import { Measurement } from 'src/models';
import { EnvironmentalReportComponent, ReportData, DayData } from '@app/components/environmental-report/environmental-report.component';
import * as htmlToImage from 'html-to-image';

@Injectable({
  providedIn: 'root'
})
export class EnvironmentalReportService {
  private monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  constructor(
    private appRef: ApplicationRef,
    private injector: EnvironmentInjector
  ) {}

  /**
   * Generates report data for a specific month and year
   * @param {number} year - The year
   * @param {number} month - The month (0-based)
   * @returns {Promise<ReportData>} The generated report data
   */
  async generateReportData(year: number, month: number): Promise<ReportData> {
    // Obtener datos de usuario
    const user = await UserDSService.getUser();
    const userName = user ? `${user.Name} ${user.LastName}` : 'Usuario';

    // Obtener mediciones del mes
    const measurements = await MeasurementDSService.getMeasurementsByMont(year, month);

    // Procesar datos por día
    const days = this.processDailyData(measurements, year, month);

    // Calcular estadísticas
    const summary = this.calculateSummary(days);

    return {
      month: `${this.monthNames[month]} ${year}`,
      farmName: 'Finca Registrada', // Placeholder - se puede obtener de UVA model si está disponible
      monitorName: userName,
      days,
      summary
    };
  }

  /**
   * Generates a report image for a specific month and year
   * @param {number} year - The year
   * @param {number} month - The month (0-based)
   * @returns {Promise<string>} Base64 data URL of the generated image
   */
  async generateReportImage(year: number, month: number): Promise<string> {
    const reportData = await this.generateReportData(year, month);
    return this.createImageFromReportComponent(reportData);
  }

  /**
   * Processes measurement data into daily statistics
   * @param {Measurement[]} measurements - Array of measurements
   * @param {number} year - The year
   * @param {number} month - The month (0-based)
   * @returns {DayData[]} Array of processed daily data
   */
  private processDailyData(measurements: Measurement[], year: number, month: number): DayData[] {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: DayData[] = [];

    // Agrupar mediciones por día
    const measurementsByDay = this.groupMeasurementsByDay(measurements);

    for (let day = 1; day <= daysInMonth; day++) {
      const dayKey = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      const dayMeasurements = measurementsByDay[dayKey] || [];

      const processedDay = this.processDayMeasurements(dayMeasurements);
      days.push(processedDay);
    }

    return days;
  }

  /**
   * Groups measurements by day
   * @param {Measurement[]} measurements - Array of measurements to group
   * @returns {Record<string, Measurement[]>} Measurements grouped by date key
   */
  private groupMeasurementsByDay(measurements: Measurement[]): Record<string, Measurement[]> {
    const grouped: Record<string, Measurement[]> = {};

    measurements.forEach(measurement => {
      const date = new Date(measurement.ts);
      const dayKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;

      if (!grouped[dayKey]) {
        grouped[dayKey] = [];
      }
      grouped[dayKey].push(measurement);
    });

    return grouped;
  }

  /**
   * Processes measurements for a single day
   * @param {Measurement[]} measurements - Measurements for the day
   * @returns {DayData} Processed day data
   */
  private processDayMeasurements(measurements: Measurement[]): DayData {
    const dayMeasurements = measurements.filter(m => {
      const hour = new Date(m.ts).getHours();
      return hour >= 6 && hour < 18; // 6 AM a 6 PM
    });

    const nightMeasurements = measurements.filter(m => {
      const hour = new Date(m.ts).getHours();
      return hour < 6 || hour >= 18; // 6 PM a 6 AM
    });

    const dayStats = this.calculatePeriodStats(dayMeasurements);
    const nightStats = this.calculatePeriodStats(nightMeasurements);
    const rainfall = this.calculateTotalRainfall(measurements);

    return {
      day: dayStats,
      night: nightStats,
      rainfall
    };
  }

  /**
   * Calculates statistics for a period (day or night)
   * @param {Measurement[]} measurements - Measurements for the period
   * @returns {object} Temperature and humidity statistics
   */
  private calculatePeriodStats(measurements: Measurement[]): { tempMax: number; tempMin: number; humMax: number; humMin: number } {
    if (measurements.length === 0) {
      return { tempMax: 0, tempMin: 0, humMax: 0, humMin: 0 };
    }

    const temperatures: number[] = [];
    const humidities: number[] = [];

    measurements.forEach(measurement => {
      try {
        const data = typeof measurement.data === 'string' ? JSON.parse(measurement.data) : measurement.data;
        if (data) {
          // Buscar campos de temperatura
          if (data.temperature !== undefined) {
            temperatures.push(data.temperature);
          }
          if (data.temp !== undefined) {
            temperatures.push(data.temp);
          }
          if (data.Temperature !== undefined) {
            temperatures.push(data.Temperature);
          }

          // Buscar campos de humedad
          if (data.humidity !== undefined) {
            humidities.push(data.humidity);
          }
          if (data.hum !== undefined) {
            humidities.push(data.hum);
          }
          if (data.Humidity !== undefined) {
            humidities.push(data.Humidity);
          }
        }
      } catch (e) {
        // Ignorar errores de parsing
      }
    });

    return {
      tempMax: temperatures.length > 0 ? Math.max(...temperatures) : 0,
      tempMin: temperatures.length > 0 ? Math.min(...temperatures) : 0,
      humMax: humidities.length > 0 ? Math.max(...humidities) : 0,
      humMin: humidities.length > 0 ? Math.min(...humidities) : 0
    };
  }

  /**
   * Calculates total rainfall from measurements
   * @param {Measurement[]} measurements - Array of measurements
   * @returns {number} Total rainfall amount
   */
  private calculateTotalRainfall(measurements: Measurement[]): number {
    let totalRainfall = 0;

    measurements.forEach(measurement => {
      try {
        const data = typeof measurement.data === 'string' ? JSON.parse(measurement.data) : measurement.data;
        if (data) {
          // Buscar campos de lluvia
          if (data.rain !== undefined) {
            totalRainfall += data.rain;
          }
          if (data.rainfall !== undefined) {
            totalRainfall += data.rainfall;
          }
          if (data.Rain !== undefined) {
            totalRainfall += data.Rain;
          }
        }
      } catch (e) {
        // Ignorar errores de parsing
      }
    });

    return Math.round(totalRainfall * 10) / 10; // Redondear a 1 decimal
  }

  /**
   * Calculates summary statistics for the month
   * @param {DayData[]} days - Array of daily data
   * @returns {ReportData['summary']} Summary statistics
   */
  private calculateSummary(days: DayData[]): ReportData['summary'] {
    const allTemperatures: number[] = [];
    const allHumidities: number[] = [];
    let totalRainfall = 0;
    let rainyDays = 0;

    days.forEach(day => {
      // Recopilar todas las temperaturas
      if (day.day.tempMax > 0) {
        allTemperatures.push(day.day.tempMax);
      }
      if (day.day.tempMin > 0) {
        allTemperatures.push(day.day.tempMin);
      }
      if (day.night.tempMax > 0) {
        allTemperatures.push(day.night.tempMax);
      }
      if (day.night.tempMin > 0) {
        allTemperatures.push(day.night.tempMin);
      }

      // Recopilar todas las humedades
      if (day.day.humMax > 0) {
        allHumidities.push(day.day.humMax);
      }
      if (day.day.humMin > 0) {
        allHumidities.push(day.day.humMin);
      }
      if (day.night.humMax > 0) {
        allHumidities.push(day.night.humMax);
      }
      if (day.night.humMin > 0) {
        allHumidities.push(day.night.humMin);
      }

      // Sumar lluvia
      totalRainfall += day.rainfall;
      if (day.rainfall > 0) {
        rainyDays++;
      }
    });

    return {
      totalRainfall: Math.round(totalRainfall * 10) / 10,
      rainyDays,
      temperature: {
        max: allTemperatures.length > 0 ? Math.max(...allTemperatures) : 0,
        min: allTemperatures.length > 0 ? Math.min(...allTemperatures) : 0,
        avg: allTemperatures.length > 0 ? Math.round((allTemperatures.reduce((a, b) => a + b, 0) / allTemperatures.length) * 10) / 10 : 0
      },
      humidity: {
        max: allHumidities.length > 0 ? Math.max(...allHumidities) : 0,
        min: allHumidities.length > 0 ? Math.min(...allHumidities) : 0,
        avg: allHumidities.length > 0 ? Math.round((allHumidities.reduce((a, b) => a + b, 0) / allHumidities.length) * 10) / 10 : 0
      }
    };
  }

  /**
   * Creates an image from report data using html-to-image
   * @param {ReportData} reportData - The report data to render
   * @returns {Promise<string>} Base64 data URL of the generated image
   */
  private async createImageFromReportComponent(reportData: ReportData): Promise<string> {
    let componentRef: ComponentRef<EnvironmentalReportComponent> | null = null;

    try {
      // Create component dynamically
      componentRef = createComponent(EnvironmentalReportComponent, {
        environmentInjector: this.injector
      });

      // Set the input data
      componentRef.instance.reportData = reportData;

      // Attach to application and trigger change detection
      this.appRef.attachView(componentRef.hostView);
      componentRef.changeDetectorRef.detectChanges();

      // Add to DOM temporarily (hidden)
      const hostElement = componentRef.location.nativeElement;
      hostElement.style.position = 'fixed';
      hostElement.style.top = '-9999px';
      hostElement.style.left = '-9999px';
      hostElement.style.zIndex = '-9999';
      document.body.appendChild(hostElement);

      // Wait for rendering
      await new Promise(resolve => setTimeout(resolve, 100));

      // Generate image
      const dataUrl = await htmlToImage.toPng(hostElement, {
        quality: 1.0,
        pixelRatio: 2,
        width: 816, // 8.5 inches * 96 DPI
        height: 1056, // 11 inches * 96 DPI
        backgroundColor: '#ffffff'
      });

      return dataUrl;

    } catch (error) {
      console.error('Error generating report image:', error);
      throw new Error('Failed to generate report image');
    } finally {
      // Clean up
      if (componentRef) {
        const hostElement = componentRef.location.nativeElement;
        if (hostElement.parentNode) {
          hostElement.parentNode.removeChild(hostElement);
        }
        this.appRef.detachView(componentRef.hostView);
        componentRef.destroy();
      }
    }
  }

}
import {
  ApplicationRef,
  ComponentRef,
  createComponent,
  EnvironmentInjector,
  Injectable,
} from '@angular/core';
import {
  DayData,
  EnvironmentalReportComponent,
  ReportData,
} from '@app/components/environmental-report/environmental-report.component';
import * as htmlToImage from 'html-to-image';
import { Measurement } from 'src/models';
import { MeasurementDSService } from '../storage/datastore/measurement-ds.service';
import { UserDSService } from '../storage/datastore/user-ds.service';

@Injectable({
  providedIn: 'root',
})
export class EnvironmentalReportService {
  private monthNames = [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre',
  ];

  /**
   * Constructor for EnvironmentalReportService
   * @param {ApplicationRef} appRef - Angular application reference
   * @param {EnvironmentInjector} injector - Angular environment injector
   */
  constructor(
    private appRef: ApplicationRef,
    private injector: EnvironmentInjector,
  ) {}

  /**
   * Generates report data for a specific month and year
   * @param {number} year - The year
   * @param {number} month - The month (0-based)
   * @returns {Promise<ReportData>} The generated report data
   */
  async generateReportData(year: number, month: number): Promise<ReportData> {
    try {
      // Obtener datos de usuario
      const user = await UserDSService.getUser();
      const userName = user ? `${user.Name} ${user.LastName}` : 'Usuario';
      const measurements = await MeasurementDSService.getMeasurementsByMont(
        year,
        month,
      );
      const days = this.processDailyData(measurements, year, month);

      const summary = this.calculateSummary(days);

      const result = {
        month: `${this.monthNames[month]} ${year}`,
        farmName: 'Finca Registrada', // Placeholder - se puede obtener de UVA model si está disponible
        monitorName: userName,
        days,
        summary,
      };

      return result;
    } catch (error) {
      console.error(
        '[EnvReportService] generateReportData - Error during data generation:',
        error,
      );
      throw error;
    }
  }

  /**
   * Generates a report image for a specific month and year
   * @param {number} year - The year
   * @param {number} month - The month (0-based)
   * @returns {Promise<string>} Base64 data URL of the generated image
   */
  async generateReportImage(year: number, month: number): Promise<string> {
    try {
      const reportData = await this.generateReportData(year, month);

      const imageResult = await this.createImageFromReportComponent(reportData);

      return imageResult;
    } catch (error) {
      console.error(
        '[EnvReportService] generateReportImage - Error occurred:',
        error,
      );
      throw error;
    }
  }

  /**
   * Debug method to test component rendering in browser
   * @param {number} year - The year
   * @param {number} month - The month (0-based)
   * @returns {Promise<string>} Base64 data URL of the generated image
   */
  async debugReportImage(year: number, month: number): Promise<string> {
    const reportData = await this.generateReportData(year, month);
    return this.createImageFromReportComponent(reportData, true);
  }

  /**
   * Processes measurement data into daily statistics
   * @param {Measurement[]} measurements - Array of measurements
   * @param {number} year - The year
   * @param {number} month - The month (0-based)
   * @returns {DayData[]} Array of processed daily data
   */
  private processDailyData(
    measurements: Measurement[],
    year: number,
    month: number,
  ): DayData[] {
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
  private groupMeasurementsByDay(
    measurements: Measurement[],
  ): Record<string, Measurement[]> {
    const grouped: Record<string, Measurement[]> = {};

    measurements.forEach((measurement) => {
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
    const dayMeasurements = measurements.filter((m) => {
      const hour = new Date(m.ts).getHours();
      return hour >= 6 && hour < 18; // 6 AM a 6 PM
    });

    const nightMeasurements = measurements.filter((m) => {
      const hour = new Date(m.ts).getHours();
      return hour < 6 || hour >= 18; // 6 PM a 6 AM
    });

    const dayStats = this.calculatePeriodStats(dayMeasurements);
    const nightStats = this.calculatePeriodStats(nightMeasurements);
    const rainfall = this.calculateTotalRainfall(measurements);

    return {
      day: dayStats,
      night: nightStats,
      rainfall,
    };
  }

  /**
   * Calculates statistics for a period (day or night)
   * @param {Measurement[]} measurements - Measurements for the period
   * @returns {object} Temperature and humidity statistics
   */
  private calculatePeriodStats(measurements: Measurement[]): {
    tempMax: number;
    tempMin: number;
    humMax: number;
    humMin: number;
  } {
    if (measurements.length === 0) {
      return { tempMax: 0, tempMin: 0, humMax: 0, humMin: 0 };
    }

    const temperatures: number[] = [];
    const humidities: number[] = [];

    measurements.forEach((measurement) => {
      try {
        const data =
          typeof measurement.data === 'string'
            ? JSON.parse(measurement.data)
            : measurement.data;
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
      humMin: humidities.length > 0 ? Math.min(...humidities) : 0,
    };
  }

  /**
   * Calculates total rainfall from measurements
   * @param {Measurement[]} measurements - Array of measurements
   * @returns {number} Total rainfall amount
   */
  private calculateTotalRainfall(measurements: Measurement[]): number {
    let totalRainfall = 0;

    measurements.forEach((measurement) => {
      try {
        const data =
          typeof measurement.data === 'string'
            ? JSON.parse(measurement.data)
            : measurement.data;
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

    days.forEach((day) => {
      // Recopilar todas las temperaturas
      if (day.day.tempMax !== null && day.day.tempMax !== undefined && day.day.tempMax > 0) {
        allTemperatures.push(day.day.tempMax);
      }
      if (day.day.tempMin !== null && day.day.tempMin !== undefined && day.day.tempMin > 0) {
        allTemperatures.push(day.day.tempMin);
      }
      if (day.night.tempMax !== null && day.night.tempMax !== undefined && day.night.tempMax > 0) {
        allTemperatures.push(day.night.tempMax);
      }
      if (day.night.tempMin !== null && day.night.tempMin !== undefined && day.night.tempMin > 0) {
        allTemperatures.push(day.night.tempMin);
      }

      // Recopilar todas las humedades
      if (day.day.humMax !== null && day.day.humMax !== undefined && day.day.humMax > 0) {
        allHumidities.push(day.day.humMax);
      }
      if (day.day.humMin !== null && day.day.humMin !== undefined && day.day.humMin > 0) {
        allHumidities.push(day.day.humMin);
      }
      if (day.night.humMax !== null && day.night.humMax !== undefined && day.night.humMax > 0) {
        allHumidities.push(day.night.humMax);
      }
      if (day.night.humMin !== null && day.night.humMin !== undefined && day.night.humMin > 0) {
        allHumidities.push(day.night.humMin);
      }

      // Sumar lluvia
      if (day.rainfall !== null && day.rainfall !== undefined) {
        totalRainfall += day.rainfall;
        if (day.rainfall > 0) {
          rainyDays++;
        }
      }
    });

    return {
      totalRainfall: totalRainfall > 0 ? Math.round(totalRainfall * 10) / 10 : null,
      rainyDays,
      temperature: {
        max: allTemperatures.length > 0 ? Math.max(...allTemperatures) : null,
        min: allTemperatures.length > 0 ? Math.min(...allTemperatures) : null,
        avg:
          allTemperatures.length > 0
            ? Math.round(
                (allTemperatures.reduce((a, b) => a + b, 0) /
                  allTemperatures.length) *
                  10,
              ) / 10
            : null,
      },
      humidity: {
        max: allHumidities.length > 0 ? Math.max(...allHumidities) : null,
        min: allHumidities.length > 0 ? Math.min(...allHumidities) : null,
        avg:
          allHumidities.length > 0
            ? Math.round(
                (allHumidities.reduce((a, b) => a + b, 0) /
                  allHumidities.length) *
                  10,
              ) / 10
            : null,
      },
    };
  }

  /**
   * Creates an image from report data using html-to-image
   * @param {ReportData} reportData - The report data to render
   * @param {boolean} debugMode - Optional debug mode to make component visible
   * @returns {Promise<string>} Base64 data URL of the generated image
   */
  private async createImageFromReportComponent(
    reportData: ReportData,
    debugMode = false,
  ): Promise<string> {
    let componentRef: ComponentRef<EnvironmentalReportComponent> | null = null;

    try {
      // Create component dynamically
      componentRef = createComponent(EnvironmentalReportComponent, {
        environmentInjector: this.injector,
      });

      // Set the input data
      componentRef.instance.reportData = reportData;
      componentRef.instance.forcePrintLayout = true; // Always force print layout for image generation

      // Attach to application and trigger change detection
      this.appRef.attachView(componentRef.hostView);
      componentRef.changeDetectorRef.detectChanges();

      // Add to DOM temporarily but make it visible for rendering
      const hostElement = componentRef.location.nativeElement;

      if (debugMode) {
        // Debug mode - component visible with border for debugging
        hostElement.style.position = 'fixed';
        hostElement.style.top = '50px';
        hostElement.style.left = '50px';
        hostElement.style.zIndex = '9999';
        hostElement.style.backgroundColor = 'white';
        hostElement.style.border = '2px solid red';
      } else {
        // Production mode - component visible in viewport but behind a backdrop
        hostElement.style.position = 'fixed';
        hostElement.style.top = '0px'; // Position at exact top
        hostElement.style.left = '0px'; // Position at exact left
        hostElement.style.zIndex = '-1000';
        hostElement.style.backgroundColor = 'white';

        // Create a temporary backdrop to cover the component from user view
        const backdrop = document.createElement('div');
        backdrop.id = 'report-generation-backdrop';
        backdrop.style.position = 'fixed';
        backdrop.style.top = '0';
        backdrop.style.left = '0';
        backdrop.style.width = '100vw';
        backdrop.style.height = '100vh';
        backdrop.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        backdrop.style.zIndex = '9998';
        backdrop.style.display = 'flex';
        backdrop.style.alignItems = 'center';
        backdrop.style.justifyContent = 'center';
        backdrop.style.color = 'white';
        backdrop.style.fontSize = '18px';
        backdrop.innerHTML = '<div>Generando reporte...</div>';
        document.body.appendChild(backdrop);

        // Store backdrop reference for cleanup
        (hostElement as HTMLElement & { __backdrop?: HTMLElement }).__backdrop =
          backdrop;
      }

      // Ensure proper rendering properties
      hostElement.style.opacity = '1';
      hostElement.style.pointerEvents = 'none';
      hostElement.style.overflow = 'visible';
      hostElement.style.width = '816px'; // Fixed width for consistency
      hostElement.style.height = 'auto';

      document.body.appendChild(hostElement);

      // Trigger another change detection to ensure everything is rendered
      componentRef.changeDetectorRef.detectChanges();

      // Wait for rendering with progressive delays for Android and image loading
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Wait for fonts to load (with timeout for Android)
      try {
        const fontTimeout = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Font loading timeout')), 3000),
        );
        await Promise.race([document.fonts.ready, fontTimeout]);
      } catch (fontError) {
        console.warn(
          '[ImageGen] Font loading timed out, proceeding anyway:',
          fontError,
        );
      }

      // Wait for all images to load
      await this.waitForImagesToLoad(hostElement);

      // Additional wait for Android WebView and image loading
      await new Promise((resolve) => setTimeout(resolve, 2000));

      let dataUrl: string;

      // Get actual element dimensions for better rendering
      const rect = hostElement.getBoundingClientRect();

      // Detect platform for optimal settings
      const isWeb = !(window as any).Capacitor;
      const isMobile = (window as any).Capacitor;

      try {
        // Platform-optimized settings
        let qualitySettings;

        if (isWeb) {
          // PC/Web: Ultra-high quality settings
          qualitySettings = {
            quality: 1.0, // Maximum quality
            pixelRatio: 5.0, // Ultra-high resolution for PC
            backgroundColor: '#ffffff',
            width: Math.min(rect.width || 816, 816),
            height: Math.max(rect.height || 1200, 1200),
            style: {
              fontFamily: '"Arial", "Helvetica", sans-serif',
              transform: 'none',
              margin: '0',
              padding: '0',
              boxSizing: 'border-box',
            },
            cacheBust: true,
            skipAutoScale: false, // PC can handle auto-scaling
            fetchRequestInit: {
              mode: 'cors' as RequestMode,
            },
            skipFonts: false,
            includeQueryParams: false,
          };
        } else {
          qualitySettings = {
            quality: 1.0, // Maximum quality
            pixelRatio: 4.0, // Double the previous resolution (was 2.0)
            backgroundColor: '#ffffff',
            width: Math.min(rect.width || 816, 816),
            height: Math.max(rect.height || 1200, 1200),
            style: {
              fontFamily: '"Arial", "Helvetica", sans-serif',
              transform: 'none',
              margin: '0',
              padding: '0',
              boxSizing: 'border-box',
            },
            cacheBust: true,
            skipAutoScale: true, // Mobile needs this
            fetchRequestInit: {
              mode: 'cors' as RequestMode,
            },
          };
        }

        dataUrl = await htmlToImage.toPng(hostElement, qualitySettings);
      } catch (htmlToImageError) {
        console.warn(
          '[ImageGen] High-quality attempt failed, trying medium quality:',
          htmlToImageError,
        );

        try {
          // High-quality fallback (still better than original)
          const fallbackSettings = isWeb
            ? { pixelRatio: 3.0, width: 816, height: 1200 } // PC fallback
            : { pixelRatio: 3.0, width: 816, height: 1200 }; // Mobile fallback

          dataUrl = await htmlToImage.toPng(hostElement, {
            quality: 1.0, // Keep maximum quality
            pixelRatio: fallbackSettings.pixelRatio,
            backgroundColor: '#ffffff',
            width: Math.min(rect.width || 816, 816),
            height: Math.max(rect.height || 1200, 1200),
            style: {
              fontFamily: '"Arial", "Helvetica", sans-serif',
              transform: 'none',
              margin: '0',
              padding: '0',
              boxSizing: 'border-box',
            },
            cacheBust: true,
            skipAutoScale: true,
          });
        } catch (fallbackError) {
          console.warn(
            '[ImageGen] Medium-quality failed, trying conservative settings:',
            fallbackError,
          );

          try {
            dataUrl = await htmlToImage.toPng(hostElement, {
              quality: 1.0, // Keep maximum quality
              pixelRatio: 2.0, // Still double resolution
              backgroundColor: '#ffffff',
              width: 816, // Keep larger dimensions
              height: 1200,
              cacheBust: true,
              skipAutoScale: true,
            });
          } catch (conservativeError) {
            console.error(
              '[ImageGen] Even conservative settings failed, trying JPEG:',
              conservativeError,
            );

            // Last resort: JPEG with high quality and resolution
            try {
              dataUrl = await htmlToImage.toJpeg(hostElement, {
                quality: 0.98, // Very high JPEG quality
                pixelRatio: 3.0, // High resolution even for JPEG
                backgroundColor: '#ffffff',
                width: 816,
                height: 1200,
                cacheBust: true,
              });
            } catch (jpegError) {
              console.error(
                '[ImageGen] All image generation attempts failed:',
                jpegError,
              );
              throw new Error(
                `Image generation failed: ${jpegError instanceof Error ? jpegError.message : 'Unknown error'}`,
              );
            }
          }
        }
      }

      // Validate the generated image
      if (!dataUrl || dataUrl.length < 100) {
        throw new Error('Generated image appears to be invalid or empty');
      }

      return dataUrl;
    } catch (error) {
      console.error('[ImageGen] Error generating report image:', error);
      throw new Error(
        `Failed to generate report image: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    } finally {
      // Clean up
      if (componentRef) {
        const hostElement = componentRef.location.nativeElement;

        // Remove backdrop if it exists
        const elementWithBackdrop = hostElement as HTMLElement & {
          __backdrop?: HTMLElement;
        };
        if (elementWithBackdrop.__backdrop) {
          const backdrop = elementWithBackdrop.__backdrop;
          if (backdrop.parentNode) {
            backdrop.parentNode.removeChild(backdrop);
          }
        }

        // Remove component
        if (hostElement?.parentNode) {
          hostElement.parentNode.removeChild(hostElement);
        }
        this.appRef.detachView(componentRef.hostView);
        componentRef.destroy();
      }
    }
  }

  /**
   * Waits for all images in the element to load
   * @param {HTMLElement} element - The element containing images
   * @returns {Promise<void>}
   */
  private async waitForImagesToLoad(element: HTMLElement): Promise<void> {
    const images = element.querySelectorAll('img');
    const imagePromises: Promise<void>[] = [];

    images.forEach((img) => {
      if (!img.complete) {
        imagePromises.push(
          new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
              console.warn('Image load timeout:', img.src);
              resolve(); // Resolve anyway to not block the process
            }, 5000);

            img.onload = () => {
              clearTimeout(timeout);
              resolve();
            };
            img.onerror = () => {
              clearTimeout(timeout);
              console.warn('Image load error:', img.src);
              resolve(); // Resolve anyway to not block the process
            };
          })
        );
      }
    });

    if (imagePromises.length > 0) {
      await Promise.all(imagePromises);
      console.log(`Waited for ${imagePromises.length} images to load`);
    }
  }
}

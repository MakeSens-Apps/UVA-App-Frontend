import { Injectable } from '@angular/core';
import { Directory } from '@capacitor/filesystem';
import { MoonPhaseAPIService } from '../../api/moon-phase-api.service';
import { FileSystemService } from '../../storage/file-system/file-system.service';

// Interfaces para datos de la API
export interface DailyLunarInfo {
  phase: string;
  lighting: number;
}

export interface MoonPhaseData {
  year: number;
  month: number;
  dailyLunarInfo: Record<string, DailyLunarInfo>;
  moonPhases: {
    lunaLlena: number;
    lunaNueva: number;
    cuartoCreciente: number;
    cuartoMenguante: number;
  };
}

export interface MoonPhaseAPIResponse {
  statusCode: number;
  body: MoonPhaseData;
}

// Enums para fases lunares
export enum LunarPhase {
  NEW_MOON = 'NEW_MOON',
  FIRST_QUARTER = 'FIRST_QUARTER',
  WANING_GIBBOUS = 'WANING_GIBBOUS',
  FULL_MOON = 'FULL_MOON',
  LAST_QUARTER = 'LAST_QUARTER',
  WANING_CRESCENT = 'WANING_CRESCENT',
}

// Interfaces para las respuestas del servicio
export interface DailyPhaseCalendar {
  day: number;
  status: string;
}

export interface MoonPhaseDay {
  phase: LunarPhase;
  lighting: number;
}

export interface MoonEvent {
  type: 'Luna Nueva' | 'Luna Llena';
  date: Date | string;
}

// Interface para el mapeo de fases
export type PhaseMapping = Record<string, LunarPhase>;

interface MoonPhaseServiceSuccessResponse<T> {
  success: true;
  data: T;
}
// Tipo para la respuesta de error
export interface MoonPhaseServiceErrorResponse {
  success: false;
  error: string;
}

// Unión de ambos tipos en la interfaz principal
export type MoonPhaseServiceResponse<T> =
  | MoonPhaseServiceSuccessResponse<T>
  | MoonPhaseServiceErrorResponse;

// Interface para las respuestas específicas
export type MonthPhasesResponse = MoonPhaseServiceResponse<
  DailyPhaseCalendar[]
>;
export type CurrentPhaseResponse = MoonPhaseServiceResponse<LunarPhase>;

// Interface para opciones de configuración
export interface MoonPhaseServiceConfig {
  storageDirectory: Directory;
  filePrefix: string;
  monthsToDownload: number;
}

/**
 * @class MoonPhaseService
 * @description Service that handles moon phase data, including downloading, storing, and fetching moon phase information.
 */
@Injectable({
  providedIn: 'root',
})
export class MoonPhaseService extends MoonPhaseAPIService {
  private readonly PHASE_MAPPING: PhaseMapping = {
    'Luna nueva': LunarPhase.NEW_MOON,
    'Luna llena': LunarPhase.FULL_MOON,
    Creciente: LunarPhase.FIRST_QUARTER,
    Menguante: LunarPhase.LAST_QUARTER,
    'Cuarto creciente': LunarPhase.FIRST_QUARTER,
    'Cuarto menguante': LunarPhase.LAST_QUARTER,
  };

  private readonly config: MoonPhaseServiceConfig = {
    storageDirectory: Directory.Data,
    filePrefix: 'lunar-phases',
    monthsToDownload: 24,
  };

  /**
   * @param {FileSystemService} fileSystemService - The service used to handle file operations.
   * Initializes the component or class by injecting the FileSystemService for managing file-related tasks.
   */
  constructor(private fileSystemService: FileSystemService) {
    super();
  }

  /**
   * Downloads and stores moon phase data for the next 24 months.
   * @returns {Promise<MoonPhaseServiceResponse<boolean>>} Response indicating success or failure.
   */
  async downloadAndStoreMoonPhaseData(): Promise<
    MoonPhaseServiceResponse<boolean>
  > {
    try {
      const currentDate = new Date();

      for (let i = 0; i < this.config.monthsToDownload; i++) {
        const targetDate = new Date(
          currentDate.getFullYear(),
          currentDate.getMonth() + i,
          1,
        );
        const year = targetDate.getFullYear();
        const month = targetDate.getMonth() + 1;

        const response = await this.getMoonPhase({
          year: year,
          month: month,
        });

        if (!response.success) {
          return {
            success: false,
            error: `Failed to fetch moon phase data for ${year}-${month}`,
          };
        }
        const dataResponse = response.data.getMoonPhase
          ? response.data.getMoonPhase
              .toString()
              .replace(/=/g, ':') // Cambiar "=" por ":"
              .replace(/(\w+):/g, '"$1":') // Agregar comillas a las claves
              .replace(/'/g, '"') // Cambiar comillas simples por dobles
              .replace(/:([a-zA-Z\s]+)/g, ':"$1"') // Agregar comillas a valores de texto
              .replace(/"\s+"/g, '" "') // Limpiar comillas extra en valores.
          : ''; // Usar cadena vacía como valor por defecto
        const fileName = `${this.config.filePrefix}-${year}-${month.toString().padStart(2, '0')}.json`;
        const writeResult = await this.fileSystemService.writeFile(
          fileName,
          dataResponse,
          Directory.Data,
          false,
        );

        if (!writeResult.success) {
          return {
            success: false,
            error: `Failed to store moon phase data for ${year}-${month}`,
          };
        }
      }

      return { success: true, data: true };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Gets the current day's moon phase.
   * @returns {Promise<CurrentPhaseResponse>} The current moon phase as a response.
   */
  async getCurrentPhase(): Promise<MoonPhaseServiceResponse<LunarPhase>> {
    try {
      const currentDate = new Date();
      const currentDay = currentDate.getDate();

      const monthData = await this.getCurrentMonthData();
      if (!monthData?.dailyLunarInfo?.[currentDay]) {
        return {
          success: false,
          error: 'Current day moon phase data not found',
        };
      }

      const phaseInfo = monthData.dailyLunarInfo[currentDay];
      return {
        success: true,
        data: this.mapPhaseToEnum(phaseInfo.phase),
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Gets the moon phases for all days in the current month.
   * @returns {Promise<MonthPhasesResponse>} The moon phases for the current month.
   */
  async getMonthPhases(): Promise<MonthPhasesResponse> {
    try {
      const monthData = await this.getCurrentMonthData();
      if (!monthData?.dailyLunarInfo) {
        return {
          success: false,
          error: 'Month phase data not found',
        };
      }

      const result: DailyPhaseCalendar[] = Object.entries(
        monthData.dailyLunarInfo,
      )
        .map(([day, info]) => ({
          day: parseInt(day),
          status: this.mapPhaseToCalendarStatus(info.phase),
        }))
        .sort((a, b) => a.day - b.day);

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Gets the next full moon and new moon events by analyzing daily lunar information.
   * @param {number} count - Optional parameter to specify how many next events to return.
   * @returns {Promise<MoonPhaseServiceResponse<MoonEvent[]>>} A list of moon events.
   */
  async getNextMoonEvents(
    count = 2,
  ): Promise<MoonPhaseServiceResponse<MoonEvent[]>> {
    try {
      const currentDate = new Date();
      const events: MoonEvent[] = [];
      let currentYear = currentDate.getFullYear();
      let currentMonth = currentDate.getMonth() + 1;
      let currentDay = currentDate.getDate();

      // We'll look through the next few months until we find enough events
      while (events.length < count) {
        try {
          const fileName = `${this.config.filePrefix}-${currentYear}-${currentMonth.toString().padStart(2, '0')}.json`;
          const readResult = await this.fileSystemService.readFile(
            fileName,
            this.config.storageDirectory,
            false,
          );

          if (!readResult.success) {
            // Skip to next month if we can't read this one
            [currentYear, currentMonth] = this.getNextMonth(
              currentYear,
              currentMonth,
            );
            continue;
          }

          const data = JSON.parse(readResult.data.data.toString());
          const monthData = data.body as MoonPhaseData;

          // Analizar dailyLunarInfo
          if (monthData.dailyLunarInfo) {
            Object.entries(monthData.dailyLunarInfo).forEach(([day, info]) => {
              const dayNum = parseInt(day, 10);
              if (
                currentMonth === currentDate.getMonth() + 1 &&
                dayNum < currentDay
              ) {
                return;
              }

              // Verificar fases lunares
              if (info.phase === 'Luna nueva') {
                events.push({
                  type: 'Luna Nueva',
                  date: new Date(currentYear, currentMonth - 1, dayNum),
                });
              } else if (info.phase === 'Luna llena') {
                events.push({
                  type: 'Luna Llena',
                  date: new Date(currentYear, currentMonth - 1, dayNum),
                });
              }
            });
          }

          // Si ya tenemos suficientes eventos, romper el bucle
          if (events.length >= count * 2) {
            break;
          }

          // Avanzar al siguiente mes
          [currentYear, currentMonth] = this.getNextMonth(
            currentYear,
            currentMonth,
          );
          currentDay = 1;
        } catch (error) {
          [currentYear, currentMonth] = this.getNextMonth(
            currentYear,
            currentMonth,
          );
        }
      }

      // Filtrar y ordenar eventos
      const sortedEvents = events
        .filter((event) => new Date(event.date) >= currentDate)
        .slice(0, count);

      if (sortedEvents.length === 0) {
        return {
          success: false,
          error: 'No se encontraron próximos eventos lunares.',
        };
      }

      return {
        success: true,
        data: sortedEvents,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to get next moon events',
      };
    }
  }

  /**
   * Helper method to get the next month and year.
   * @private
   * @param {number} year - The current year.
   * @param {number} month - The current month.
   * @returns {number[]} The next month and year.
   */
  private getNextMonth(year: number, month: number): [number, number] {
    if (month === 12) {
      return [year + 1, 1];
    }
    return [year, month + 1];
  }

  /**
   * Reads the current month's data from filesystem.
   * @private
   * @returns {Promise<MoonPhaseData>} The moon phase data for the current month.
   */
  private async getCurrentMonthData(): Promise<MoonPhaseData> {
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    const fileName = `${this.config.filePrefix}-${year}-${month.toString().padStart(2, '0')}.json`;

    const readResult = await this.fileSystemService.readFile(
      fileName,
      this.config.storageDirectory,
      false,
    );

    if (!readResult.success) {
      throw new Error('Failed to read moon phase data from storage');
    }

    try {
      const data = JSON.parse(readResult.data.data.toString());
      return data.body as MoonPhaseData;
    } catch (error) {
      throw new Error('Invalid moon phase data format');
    }
  }

  /**
   * Maps API phase names to enum values.
   * @private
   * @param {string} phase - The phase name to map.
   * @returns {LunarPhase} The corresponding lunar phase enum value.
   */
  private mapPhaseToEnum(phase: string): LunarPhase {
    const mapped = this.PHASE_MAPPING[phase];
    if (Array.isArray(mapped)) {
      return mapped[0];
    }
    return mapped || LunarPhase.NEW_MOON; // Default fallback
  }

  /**
   * Maps API phase names to calendar status strings.
   * @private
   * @param {string} phase - The phase name to map.
   * @returns {string} The corresponding calendar status.
   */
  private mapPhaseToCalendarStatus(phase: string): string {
    return this.mapPhaseToEnum(phase).toLowerCase().replace('_', '-');
  }
}

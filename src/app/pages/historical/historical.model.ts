export type TimeFrame = 'month' | 'year';

export type TypeView = 'calendar' | 'chart';

export interface CompleteTaskHistorical {
  mes: number;
  date: Date;
  name: string;
  daysComplete: number[];
  daysIncomplete: number[];
  daysSaveStreak: number[];
}
export type MeasurementEntry = Record<string, number> | undefined; // Mapea timestamps a valores numéricos

export interface DailyStats {
  avg: number;
  min: number;
  max: number;
}

export type DetailedMeasurementEntry = Record<string, DailyStats> | undefined; // Mapea fechas a estadísticas diarias

export type HistoricalMeasurement = Record<string, MeasurementEntry[]>;

export const monthsNames = [
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

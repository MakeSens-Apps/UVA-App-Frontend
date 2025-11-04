import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

export interface DayData {
  day: {
    tempMax: number | null;
    tempMin: number | null;
    humMax: number | null;
    humMin: number | null;
  };
  night: {
    tempMax: number | null;
    tempMin: number | null;
    humMax: number | null;
    humMin: number | null;
  };
  rainfall: number | null;
}

export interface ReportData {
  month: string;
  farmName: string;
  monitorName: string;
  days: DayData[];
  summary: {
    totalRainfall: number | null;
    rainyDays: number;
    temperature: {
      max: number | null;
      min: number | null;
      avg: number | null;
    };
    humidity: {
      max: number | null;
      min: number | null;
      avg: number | null;
    };
  };
}

@Component({
  selector: 'app-environmental-report',
  templateUrl: './environmental-report.component.html',
  styleUrls: ['./environmental-report.component.scss'],
  standalone: true,
  imports: [CommonModule],
})
export class EnvironmentalReportComponent {
  @Input() reportData!: ReportData;
  @Input() forcePrintLayout = false;

  /**
   * Gets the first 15 days of the month
   * @returns {DayData[]} First half of month data
   */
  getFirstHalfDays(): DayData[] {
    return this.reportData?.days?.slice(0, 15) || [];
  }

  /**
   * Gets the remaining days of the month (16-31)
   * @returns {DayData[]} Second half of month data
   */
  getSecondHalfDays(): DayData[] {
    return this.reportData?.days?.slice(15) || [];
  }

  /**
   * Gets the day number for a given index and starting position
   * @param {number} index - Array index
   * @param {number} startDay - Starting day number
   * @returns {number} The day number
   */
  getDayNumber(index: number, startDay: number): number {
    return startDay + index;
  }

  /**
   * Formats rainfall value for display
   * @param {number | null} rainfall - Rainfall amount
   * @returns {string} Formatted rainfall string
   */
  formatRainfall(rainfall: number | null): string {
    if (rainfall === null || rainfall === undefined) {
      return '-';
    }
    return rainfall > 0 ? rainfall.toString() : '-';
  }

  /**
   * Formats numeric value to one decimal place
   * @param {number | null} value - Value to format
   * @returns {string} Formatted value
   */
  formatValue(value: number | null): string {
    if (value === null || value === undefined || value === 0) {
      return '-';
    }
    return value.toFixed(1);
  }
}

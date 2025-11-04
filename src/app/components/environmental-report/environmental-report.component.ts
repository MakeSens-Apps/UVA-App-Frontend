import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface DayData {
  day: {
    tempMax: number;
    tempMin: number;
    humMax: number;
    humMin: number;
  };
  night: {
    tempMax: number;
    tempMin: number;
    humMax: number;
    humMin: number;
  };
  rainfall: number;
}

export interface ReportData {
  month: string;
  farmName: string;
  monitorName: string;
  days: DayData[];
  summary: {
    totalRainfall: number;
    rainyDays: number;
    temperature: {
      max: number;
      min: number;
      avg: number;
    };
    humidity: {
      max: number;
      min: number;
      avg: number;
    };
  };
}

@Component({
  selector: 'app-environmental-report',
  templateUrl: './environmental-report.component.html',
  styleUrls: ['./environmental-report.component.scss'],
  standalone: true,
  imports: [CommonModule]
})
export class EnvironmentalReportComponent {
  @Input() reportData!: ReportData;
  @Input() forcePrintLayout: boolean = false;

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
   * @param {number} rainfall - Rainfall amount
   * @returns {string} Formatted rainfall string
   */
  formatRainfall(rainfall: number): string {
    return rainfall > 0 ? rainfall.toString() : '-';
  }

  /**
   * Formats numeric value to one decimal place
   * @param {number} value - Value to format
   * @returns {string} Formatted value
   */
  formatValue(value: number): string {
    return value.toFixed(1);
  }
}
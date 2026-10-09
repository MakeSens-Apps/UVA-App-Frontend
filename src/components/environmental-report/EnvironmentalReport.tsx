/**
 * B15-cierre — EnvironmentalReport component (React Native)
 *
 * Ported from:
 *   - src/app/components/environmental-report/environmental-report.component.html
 *   - src/app/components/environmental-report/environmental-report.component.scss
 *
 * This component is the capturable view. It is rendered off-screen
 * (absolute positioned far below the viewport, or inside a hidden modal)
 * and captured with react-native-view-shot captureRef() → PNG file URI.
 *
 * Visual spec (RULE SUPREMA DE FIDELIDAD VISUAL — Ionic original wins):
 *   - Fixed width 816px equivalent → rendered at 340px (device width) with
 *     scale ratio maintained by the capture pixelRatio option.
 *   - Two data tables: days 1-15 (left) and 16-31 (right).
 *   - LinearGradient headers (expo-linear-gradient): Blue-500→Blue-600.
 *   - Brand header: UVA APP left, org logo right, gradient bg Blue-50→Blue-100.
 *   - Report header: title + 3 info items with green left border.
 *   - Summary: rainfall card (Blue) + temp/humidity table (Green).
 *   - Footer: "Powered by" + Makesens logo.
 *
 * Colors (exact hex from variables.scss / theme.ts):
 *   Blue-50: #EDFEFE, Blue-100: #D1FBFC, Blue-200: #A9F5F8
 *   Blue-500: #10BCCA, Blue-600: #1097AA, Blue-700: #14788A
 *   Green-50: #F2F9EC, Green-100: #E3F2D5, Green-200: #C8E6B0
 *   Green-500: #69AB3C, Green-600: #4E852B, Green-700: #3D6625
 *   Orange-100: #FBF0D9, Orange-700: #B25A1C
 *   Gray-600: #525252, Gray-700: #404040
 *
 * Risks: R-01 (resolved here), R-42 (pixel rendering on Android)
 */

import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { ReportData, DayData } from '@/domain/report/environmental-report';
import { EnvironmentalReportService } from '@/domain/report/environmental-report';

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  reportData: ReportData;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/**
 * Single day row (day + night sub-row) for the data table.
 * Renders exactly like the original: rowspan=2 for day number and rainfall column.
 */
function DayRow({
  day,
  dayNumber,
  isEven,
}: {
  day: DayData;
  dayNumber: number;
  isEven: boolean;
}): React.JSX.Element {
  const { formatValue, formatRainfall } = EnvironmentalReportService;
  const bgDay = isEven ? '#F2F9EC' : '#FFFFFF'; // Green-50 : white

  return (
    <View>
      {/* Day measurement row */}
      <View style={[styles.dataRow, { backgroundColor: bgDay }]}>
        {/* Day number spans 2 sub-rows — we handle via flex + absolute */}
        <View style={[styles.dayNumberCell, styles.cell]}>
          <Text style={styles.dayNumberText}>{dayNumber}</Text>
        </View>
        <View style={[styles.dataCell, styles.cell]}>
          <Text style={styles.dataCellText}>
            {formatValue(day.day.tempMax)}
          </Text>
        </View>
        <View style={[styles.dataCell, styles.cell]}>
          <Text style={styles.dataCellText}>
            {formatValue(day.day.tempMin)}
          </Text>
        </View>
        <View style={[styles.dataCell, styles.cell]}>
          <Text style={styles.dataCellText}>{formatValue(day.day.humMax)}</Text>
        </View>
        <View style={[styles.dataCell, styles.cell]}>
          <Text style={styles.dataCellText}>{formatValue(day.day.humMin)}</Text>
        </View>
        <View style={[styles.rainfallCell, styles.cell]}>
          <Text style={styles.rainfallText}>
            {formatRainfall(day.rainfall)}
          </Text>
        </View>
      </View>
      {/* Night measurement row */}
      <View style={[styles.dataRow, { backgroundColor: '#EDFEFE' }]}>
        {/* Empty day-number placeholder to maintain column alignment */}
        <View style={[styles.dayNumberCell, styles.cell, { opacity: 0 }]}>
          <Text style={styles.dayNumberText}>{dayNumber}</Text>
        </View>
        <View style={[styles.dataCell, styles.cell]}>
          <Text style={styles.dataCellText}>
            {formatValue(day.night.tempMax)}
          </Text>
        </View>
        <View style={[styles.dataCell, styles.cell]}>
          <Text style={styles.dataCellText}>
            {formatValue(day.night.tempMin)}
          </Text>
        </View>
        <View style={[styles.dataCell, styles.cell]}>
          <Text style={styles.dataCellText}>
            {formatValue(day.night.humMax)}
          </Text>
        </View>
        <View style={[styles.dataCell, styles.cell]}>
          <Text style={styles.dataCellText}>
            {formatValue(day.night.humMin)}
          </Text>
        </View>
        {/* Rainfall spans both rows — empty placeholder */}
        <View style={[styles.rainfallCell, styles.cell, { opacity: 0 }]}>
          <Text style={styles.rainfallText}>-</Text>
        </View>
      </View>
    </View>
  );
}

/**
 * Data table for a half of the month (days 1-15 or 16-31).
 */
function DataTable({
  days,
  startDay,
}: {
  days: DayData[];
  startDay: number;
}): React.JSX.Element {
  return (
    <View style={styles.dataTable}>
      {/* Table header */}
      <LinearGradient
        colors={['#10BCCA', '#1097AA']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.mainHeader}
      >
        <View style={styles.headerRow}>
          <View style={[styles.dayHeaderCell, styles.headerCell]}>
            <Text style={styles.headerText}>{'\n'}Día</Text>
          </View>
          <View style={[styles.tempHumHeader, styles.headerCellGroup]}>
            <Text style={styles.headerText}>Temperatura (°C)</Text>
            <View style={styles.subHeaderRow}>
              <View style={[styles.subHeaderCell, styles.cell]}>
                <Text style={styles.subHeaderText}>Max</Text>
              </View>
              <View style={[styles.subHeaderCell, styles.cell]}>
                <Text style={styles.subHeaderText}>Min</Text>
              </View>
            </View>
          </View>
          <View style={[styles.tempHumHeader, styles.headerCellGroup]}>
            <Text style={styles.headerText}>Humedad (%)</Text>
            <View style={styles.subHeaderRow}>
              <View style={[styles.subHeaderCell, styles.cell]}>
                <Text style={styles.subHeaderText}>Max</Text>
              </View>
              <View style={[styles.subHeaderCell, styles.cell]}>
                <Text style={styles.subHeaderText}>Min</Text>
              </View>
            </View>
          </View>
          <View style={[styles.rainHeaderCell, styles.headerCell]}>
            <Text style={styles.headerText}>Lluvia{'\n'}(mm)</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Table rows */}
      {days.map((day, i) => (
        <DayRow
          key={startDay + i}
          day={day}
          dayNumber={startDay + i}
          isEven={i % 2 === 0}
        />
      ))}
    </View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

/**
 * EnvironmentalReport
 *
 * Off-screen capturable view. Render inside a hidden container, then call
 * captureRef() on the wrapping ref to get a PNG file URI.
 *
 * Usage:
 *   const ref = useRef<View>(null);
 *   <View ref={ref} collapsable={false}><EnvironmentalReport reportData={data} /></View>
 *   const uri = await captureRef(ref, { format: 'png', quality: 1 });
 */
export function EnvironmentalReport({ reportData }: Props): React.JSX.Element {
  const firstHalf = EnvironmentalReportService.getFirstHalfDays(
    reportData.days,
  );
  const secondHalf = EnvironmentalReportService.getSecondHalfDays(
    reportData.days,
  );
  const { formatValue } = EnvironmentalReportService;

  return (
    <View style={styles.container} testID="environmental-report">
      {/* Brand header */}
      <LinearGradient
        colors={['#EDFEFE', '#D1FBFC']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.brandHeader}
      >
        <View style={styles.brandLeft}>
          <Image
            source={require('@/assets/png/icon-only.png')}
            style={styles.appLogo}
            resizeMode="contain"
          />
          <Text style={styles.appName}>UVA APP</Text>
        </View>
        <View style={styles.brandRight}>
          <Image
            source={require('@/assets/png/logo_Natura_Isagen.png')}
            style={styles.orgLogo}
            resizeMode="contain"
          />
        </View>
      </LinearGradient>

      {/* Report header */}
      <LinearGradient
        colors={['#F2F9EC', '#EDFEFE']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.reportHeader}
      >
        <Text style={styles.reportTitle}>
          Reporte de Datos Ambientales - App UVA
        </Text>
        <View style={styles.reportInfoRow}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Mes:</Text>
            <Text style={styles.infoValue}>{reportData.month}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Nombre de la Finca:</Text>
            <Text style={styles.infoValue}>{reportData.farmName}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Nombre del Monitor:</Text>
            <Text style={styles.infoValue}>{reportData.monitorName}</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Data tables (two columns) */}
      <View style={styles.tablesContainer}>
        <View style={styles.tableWrapper}>
          <DataTable days={firstHalf} startDay={1} />
        </View>
        <View style={styles.tableWrapper}>
          <DataTable days={secondHalf} startDay={16} />
        </View>
      </View>

      {/* Summary section */}
      <LinearGradient
        colors={['#F2F9EC', '#FDF9EF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.summarySection}
      >
        <Text style={styles.summaryTitle}>Resumen del Mes</Text>
        <View style={styles.summaryContent}>
          {/* Rainfall summary card */}
          <View style={styles.rainfallCard}>
            <LinearGradient
              colors={['#10BCCA', '#1097AA']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.cardHeader}
            >
              <Text style={styles.cardTitle}>Lluvia</Text>
            </LinearGradient>
            <View style={styles.cardContent}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Total acumulado:</Text>
                <Text style={styles.summaryValue}>
                  {formatValue(reportData.summary.totalRainfall)} mm
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Días con lluvia:</Text>
                <Text style={styles.summaryValue}>
                  {reportData.summary.rainyDays} días
                </Text>
              </View>
            </View>
          </View>

          {/* Temperature & humidity table */}
          <View style={styles.tempHumCard}>
            {/* Header */}
            <LinearGradient
              colors={['#69AB3C', '#4E852B']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.summaryTableHeader}
            >
              <View style={styles.summaryHeaderRow}>
                <View style={styles.summaryLabelCol} />
                <View style={styles.summaryValueCol}>
                  <Text style={styles.summaryHeaderText}>Temperatura (°C)</Text>
                </View>
                <View style={styles.summaryValueCol}>
                  <Text style={styles.summaryHeaderText}>Humedad (%)</Text>
                </View>
              </View>
            </LinearGradient>
            {/* Máximo */}
            <View style={styles.summaryTableRow}>
              <View style={[styles.summaryLabelCol, styles.summaryLabelBg]}>
                <Text style={styles.summaryRowLabel}>Máximo</Text>
              </View>
              <View style={styles.summaryValueCol}>
                <Text style={styles.summaryRowValue}>
                  {formatValue(reportData.summary.temperature.max)}
                </Text>
              </View>
              <View style={styles.summaryValueCol}>
                <Text style={styles.summaryRowValue}>
                  {formatValue(reportData.summary.humidity.max)}
                </Text>
              </View>
            </View>
            {/* Mínimo */}
            <View style={[styles.summaryTableRow, styles.summaryEvenRow]}>
              <View style={[styles.summaryLabelCol, styles.summaryLabelBg]}>
                <Text style={styles.summaryRowLabel}>Mínimo</Text>
              </View>
              <View style={styles.summaryValueCol}>
                <Text style={styles.summaryRowValue}>
                  {formatValue(reportData.summary.temperature.min)}
                </Text>
              </View>
              <View style={styles.summaryValueCol}>
                <Text style={styles.summaryRowValue}>
                  {formatValue(reportData.summary.humidity.min)}
                </Text>
              </View>
            </View>
            {/* Promedio */}
            <View style={styles.summaryTableRow}>
              <View style={[styles.summaryLabelCol, styles.summaryLabelBg]}>
                <Text style={styles.summaryRowLabel}>Promedio</Text>
              </View>
              <View style={styles.summaryValueCol}>
                <Text style={styles.summaryRowValue}>
                  {formatValue(reportData.summary.temperature.avg)}
                </Text>
              </View>
              <View style={styles.summaryValueCol}>
                <Text style={styles.summaryRowValue}>
                  {formatValue(reportData.summary.humidity.avg)}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </LinearGradient>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.poweredText}>Powered by</Text>
        <Image
          source={require('@/assets/png/logo_Makesens_Fondo_oscuro.png')}
          style={styles.makesensLogo}
          resizeMode="contain"
        />
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
// Width is set to 340 (typical phone width) at the component level.
// captureRef pixelRatio=3 → effective resolution ~1020px (approaching the 816px target).

const COL_WIDTHS = {
  day: 22, // day number column
  tempHumCol: 28, // each of the 4 temp/hum sub-columns
  rain: 30, // rainfall column
};

const FONT_SM = 8; // data cell font (table interior)
const FONT_XS = 7; // sub-header font
const FONT_HEADER = 9; // table header font

const styles = StyleSheet.create({
  container: {
    width: 340,
    backgroundColor: '#FFFFFF',
    padding: 10,
  },

  // ── Brand header ──────────────────────────────────────────────────────────
  brandHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderBottomWidth: 2,
    borderBottomColor: '#10BCCA',
    marginBottom: 8,
    borderRadius: 4,
  },
  brandLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  appLogo: {
    width: 24,
    height: 24,
  },
  appName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1097AA', // Blue-600
    letterSpacing: 1,
  },
  brandRight: {},
  orgLogo: {
    width: 60,
    height: 24,
  },

  // ── Report header ─────────────────────────────────────────────────────────
  reportHeader: {
    padding: 8,
    borderRadius: 6,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1097AA',
  },
  reportTitle: {
    fontSize: 9,
    fontWeight: '700',
    color: '#14788A', // Blue-700
    textAlign: 'center',
    marginBottom: 6,
  },
  reportInfoRow: {
    flexDirection: 'row',
    gap: 4,
  },
  infoItem: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 4,
    borderRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: '#69AB3C', // Green-500
  },
  infoLabel: {
    fontSize: 7,
    fontWeight: '600',
    color: '#525252', // Gray-600
  },
  infoValue: {
    fontSize: 8,
    fontWeight: '700',
    color: '#14788A',
  },

  // ── Data tables ───────────────────────────────────────────────────────────
  tablesContainer: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 8,
  },
  tableWrapper: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#A9F5F8', // Blue-200
    borderRadius: 4,
    overflow: 'hidden',
  },
  dataTable: {
    width: '100%',
  },
  mainHeader: {
    // gradient applied by LinearGradient wrapper
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  headerCell: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
    borderRightWidth: 0.5,
    borderRightColor: '#2CD9E4', // Blue-400
  },
  headerCellGroup: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 0.5,
    borderRightColor: '#2CD9E4',
  },
  tempHumHeader: {
    flex: 1,
  },
  dayHeaderCell: {
    width: COL_WIDTHS.day,
  },
  rainHeaderCell: {
    width: COL_WIDTHS.rain,
  },
  headerText: {
    fontSize: FONT_HEADER,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    paddingHorizontal: 1,
  },
  subHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#D1FBFC', // Blue-100
    width: '100%',
  },
  subHeaderCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 1,
  },
  subHeaderText: {
    fontSize: FONT_XS,
    fontWeight: '600',
    color: '#14788A',
  },

  // ── Data rows ─────────────────────────────────────────────────────────────
  dataRow: {
    flexDirection: 'row',
    borderTopWidth: 0.5,
    borderTopColor: '#A9F5F8',
  },
  cell: {
    borderRightWidth: 0.5,
    borderRightColor: '#A9F5F8',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 1,
  },
  dayNumberCell: {
    width: COL_WIDTHS.day,
    backgroundColor: '#FBF0D9', // Orange-100
  },
  dayNumberText: {
    fontSize: FONT_SM,
    fontWeight: '700',
    color: '#B25A1C', // Orange-700
    textAlign: 'center',
  },
  dataCell: {
    flex: 1,
  },
  dataCellText: {
    fontSize: FONT_SM,
    color: '#404040', // Gray-700
    fontWeight: '500',
    textAlign: 'center',
  },
  rainfallCell: {
    width: COL_WIDTHS.rain,
    backgroundColor: '#D1FBFC', // Blue-100
  },
  rainfallText: {
    fontSize: FONT_SM,
    fontWeight: '600',
    color: '#14788A',
    textAlign: 'center',
  },

  // ── Summary ───────────────────────────────────────────────────────────────
  summarySection: {
    padding: 8,
    borderRadius: 8,
    borderTopWidth: 2,
    borderTopColor: '#69AB3C',
    marginBottom: 6,
  },
  summaryTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#3D6625', // Green-700
    marginBottom: 6,
  },
  summaryContent: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'flex-start',
  },
  rainfallCard: {
    width: 100,
    borderWidth: 1,
    borderColor: '#A9F5F8',
    borderRadius: 6,
    overflow: 'hidden',
  },
  cardHeader: {
    padding: 6,
  },
  cardTitle: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cardContent: {
    padding: 6,
    backgroundColor: '#FFFFFF',
    gap: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 2,
  },
  summaryLabel: {
    fontSize: 7,
    color: '#525252',
    fontWeight: '500',
    flexShrink: 1,
  },
  summaryValue: {
    fontSize: 8,
    fontWeight: '700',
    color: '#14788A',
  },
  tempHumCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#C8E6B0', // Green-200
    borderRadius: 6,
    overflow: 'hidden',
  },
  summaryTableHeader: {
    // gradient applied by LinearGradient wrapper
  },
  summaryHeaderRow: {
    flexDirection: 'row',
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  summaryLabelCol: {
    width: 50,
    paddingHorizontal: 2,
    justifyContent: 'center',
  },
  summaryValueCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  summaryHeaderText: {
    fontSize: 7,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  summaryTableRow: {
    flexDirection: 'row',
    borderTopWidth: 0.5,
    borderTopColor: '#C8E6B0',
  },
  summaryEvenRow: {
    backgroundColor: '#F2F9EC',
  },
  summaryLabelBg: {
    backgroundColor: '#E3F2D5', // Green-100
    borderRightWidth: 0.5,
    borderRightColor: '#C8E6B0',
  },
  summaryRowLabel: {
    fontSize: 7,
    fontWeight: '600',
    color: '#3D6625',
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  summaryRowValue: {
    fontSize: 8,
    fontWeight: '600',
    color: '#3D6625',
    textAlign: 'center',
    paddingVertical: 4,
  },

  // ── Footer ────────────────────────────────────────────────────────────────
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: 0.5,
    borderTopColor: '#E5E5E5',
  },
  poweredText: {
    fontSize: 7,
    color: '#525252',
    fontWeight: '500',
  },
  makesensLogo: {
    width: 60,
    height: 18,
  },
});

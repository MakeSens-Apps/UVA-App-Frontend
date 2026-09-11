/**
 * Nombre y ubicación del archivo del reporte ambiental compartido.
 *
 * D-19: `react-native-view-shot` escribe la captura como
 * `ReactNative-snapshot-image<hash>.png` en el directorio temporal y la hoja de
 * compartir de Android muestra ese nombre crudo.  El original comparte el
 * reporte como `reporte-<mes>-<año>.png`, así que la captura se copia al
 * directorio de caché con ese nombre antes de invocar `expo-sharing`.
 */

import * as ExpoFileSystem from 'expo-file-system/legacy';

/** Nombres de mes en español (historical.model.ts del original). */
const MONTH_NAMES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

/**
 * Builds the file name the share sheet must show: `reporte-<mes>-<año>.png`
 * (e.g. `reporte-mayo-2026.png`).
 *
 * @param {number} monthIndex - 0-based month.
 * @param {number} year - full year.
 * @returns {string} file name including the `.png` extension.
 */
export function buildReportFileName(monthIndex: number, year: number): string {
  const month = MONTH_NAMES[monthIndex] ?? 'reporte';
  return `reporte-${month}-${year}.png`;
}

/**
 * Copies a `react-native-view-shot` capture to the cache directory under a
 * readable name.
 *
 * Falls back to the original URI when the filesystem is unavailable (web, Jest)
 * so sharing never breaks because of the rename.
 *
 * @param {string} uri - URI returned by captureRef.
 * @param {string} fileName - desired file name.
 * @returns {Promise<string>} URI to share.
 */
export async function renameCaptureForShare(
  uri: string,
  fileName: string,
): Promise<string> {
  try {
    const cacheDir = ExpoFileSystem.cacheDirectory;
    if (!cacheDir) return uri;
    const target = `${cacheDir}${fileName}`;
    if (target === uri) return uri;
    // Overwrite any previous report saved under the same name.
    await ExpoFileSystem.deleteAsync(target, { idempotent: true });
    await ExpoFileSystem.copyAsync({ from: uri, to: target });
    return target;
  } catch (err) {
    console.warn('[report-file] rename failed, sharing the raw capture:', err);
    return uri;
  }
}

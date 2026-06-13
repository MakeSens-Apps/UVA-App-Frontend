/**
 * B06 — ConfigContext
 *
 * Ported from: src/app/core/services/storage/configuration-app.service.ts (Part 1 of 2)
 * Classification: Major adaptation
 *
 * This context covers the I/O + cache portion of ConfigurationAppService.
 * Part 2 (applyColors / ThemeProvider) belongs to B08.
 *
 * Changes from original:
 *  - @Injectable removed → React Context + hook (portability-matrix §4.2)
 *  - applyColors() and DOM CSS var setProperty removed — goes to ThemeProvider (B08)
 *  - loadImage() web branch (Blob/URL.createObjectURL) removed — RN uses file:// directly
 *  - loadImage() now returns file:// URI directly via FileSystemService.getFileUri()
 *  - Directory.Data used from our FileSystemService (not @capacitor/filesystem)
 *  - configColors data exposed raw for ThemeProvider consumption in B08
 *  - Caches configApp, configMeasurement, configColors in memory (load once, §4.2)
 *
 * Portability matrix: "storage/configuration-app.service.ts" Part 1 → ConfigContext (B06)
 * Risks: R-05 (theming source), R-21, R-27, R-09, R-20
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
} from 'react';
import type { ConfigModel } from '@/data/models/configuration/config.model';
import type { ColorsModel } from '@/data/models/configuration/colors.model';
import type { MeasurementModel } from '@/data/models/configuration/measurements.model';
import { fileSystemService, Directory } from '@/data/storage/file-system';
import { s3Service } from '@/data/storage/s3';
import { sessionService } from '@/data/session/session';

// ─── Platform detection ──────────────────────────────────────────────────────
// On web (Expo web / react-native-web) the file-system shim uses localStorage.
// For returning users who bypass the registration flow, localStorage never gets
// populated because downLoadData() is only called in ValidateProjectScreen.
// Evaluated at call-time so that tests can control globalThis.document.
function isWebPlatform(): boolean {
  return typeof document !== 'undefined';
}

// ─── Constants (preserved from original) ────────────────────────────────────

const BASE_PATH = 'public/racimos';

// ─── Context shape ────────────────────────────────────────────────────────────

export interface ConfigContextValue {
  /** App configuration (config.json). Null if not loaded yet. */
  configApp: ConfigModel | null;
  /** Measurement configuration (measurementsRegistration.json). Null if not loaded yet. */
  configMeasurement: MeasurementModel | null;
  /**
   * Raw branding colors (colors.json).
   * Exposed for ThemeProvider (B08) consumption.
   * Null if not loaded yet.
   */
  configColors: ColorsModel | null;
  /**
   * Downloads all configuration files for the RACIMO from S3 to the local filesystem.
   * Preserves original downLoadData() logic.
   * @returns true if all files downloaded successfully
   */
  downLoadData: () => Promise<boolean>;
  /**
   * Checks if config.json exists in the local filesystem for the current RACIMO.
   * Preserves original configExists() logic.
   */
  configExists: () => Promise<boolean>;
  /**
   * Loads app configuration from the local filesystem (cached in memory).
   * Preserves original getConfigurationApp() signature.
   */
  getConfigurationApp: () => Promise<ConfigModel | null>;
  /**
   * Loads measurement configuration from the local filesystem (cached in memory).
   * Preserves original getConfigurationMeasurement() signature.
   */
  getConfigurationMeasurement: () => Promise<MeasurementModel | null>;
  /**
   * Loads branding colors from the local filesystem (cached in memory).
   * NOTE: Does NOT call applyColors — that's ThemeProvider's job (B08).
   * Preserves original getConfigurationColors() signature.
   */
  getConfigurationColors: () => Promise<ColorsModel | null>;
  /**
   * Loads branding colors and updates configColors state.
   * Does NOT apply CSS vars (removed — ThemeProvider B08 handles that).
   * Preserves original loadBranding() signature for callers.
   */
  loadBranding: () => Promise<void>;
  /**
   * Returns a file:// URI for an image relative to the RACIMO path.
   * Removes the web/Blob branch (RN uses file:// directly, no Capacitor.convertFileSrc).
   * Preserves original loadImage() signature.
   */
  loadImage: (pathFile: string) => Promise<string | null>;
  /**
   * Returns the number of tasks in a MeasurementModel.
   * Preserves original countTasks() method.
   */
  countTasks: (model: MeasurementModel) => number;
  /**
   * Clears in-memory caches (useful after logout or RACIMO change).
   */
  clearCache: () => void;
}

// ─── Context ─────────────────────────────────────────────────────────────────

export const ConfigContext = createContext<ConfigContextValue | null>(null);

// ─── Helper: get RACIMO path from session ────────────────────────────────────

async function resolveRacimoPath(): Promise<string | null> {
  const session = await sessionService.getInfo();
  if (!session.racimoLinkCode) return null;
  return `${BASE_PATH}/${session.racimoLinkCode}`;
}

// ─── Provider ────────────────────────────────────────────────────────────────

interface ConfigProviderProps {
  children: React.ReactNode;
}

export function ConfigProvider({ children }: ConfigProviderProps): React.JSX.Element {
  const [configApp, setConfigApp] = useState<ConfigModel | null>(null);
  const [configMeasurement, setConfigMeasurement] = useState<MeasurementModel | null>(null);
  const [configColors, setConfigColors] = useState<ColorsModel | null>(null);

  // Internal refs for in-memory cache (mirrors original service instance vars)
  const configAppCache = useRef<ConfigModel | null>(null);
  const configMeasurementCache = useRef<MeasurementModel | null>(null);
  const configColorsCache = useRef<ColorsModel | null>(null);

  // Web-only: tracks whether a lazy S3 download has been attempted in this session.
  // Prevents repeated download attempts (once per mount is enough).
  const downloadAttemptedRef = useRef(false);

  // ─── downLoadData ─────────────────────────────────────────────────────────

  const downLoadData = useCallback(async (): Promise<boolean> => {
    const pathRacimo = await resolveRacimoPath();
    if (!pathRacimo) return false;

    const listFiles = await s3Service.listFiles(pathRacimo);
    if (!listFiles.success) return false;

    for (const item of listFiles.data) {
      const file = await s3Service.getFile(item.path);

      if (!file.success) {
        console.error(`${item.path} Not found`);
        return false;
      }

      // JSON / TXT branch (same as original)
      if (file.data.type === 'JSON' || file.data.type === 'TXT') {
        let content = '';
        if (typeof file.data.content === 'object') {
          content = JSON.stringify(file.data.content);
        } else {
          content = file.data.content as string;
        }
        await fileSystemService.writeFile(item.path, content, Directory.Data, false);
      }
      // Binary branch (BASE64 from S3Service — no Blob/btoa in RN)
      else if (file.data.type === 'BASE64') {
        await fileSystemService.writeFile(
          item.path,
          file.data.content,
          Directory.Data,
          true,
        );
      }
    }

    return true;
  }, []);

  // ─── configExists ─────────────────────────────────────────────────────────

  const configExists = useCallback(async (): Promise<boolean> => {
    const pathRacimo = await resolveRacimoPath();
    if (!pathRacimo) return false;
    const path = `${pathRacimo}/config.json`;
    const response = await fileSystemService.readFile(path, Directory.Data);
    return response.success;
  }, []);

  // ─── getConfigurationApp ──────────────────────────────────────────────────

  const getConfigurationApp = useCallback(async (): Promise<ConfigModel | null> => {
    // Return cached value if available (load-once, §4.2)
    if (configAppCache.current !== null) {
      return configAppCache.current;
    }

    const pathRacimo = await resolveRacimoPath();
    if (!pathRacimo) return null;

    const path = `${pathRacimo}/config.json`;
    let response = await fileSystemService.readFile(path, Directory.Data);

    // Web lazy-download fallback: on web the file-system shim uses localStorage.
    // Returning users skip ValidateProjectScreen (which calls downLoadData), so
    // localStorage has no config. Attempt a one-time S3 download if the file is missing.
    if (!response.success && isWebPlatform() && !downloadAttemptedRef.current) {
      downloadAttemptedRef.current = true;
      const listFiles = await s3Service.listFiles(pathRacimo);
      if (listFiles.success) {
        for (const item of listFiles.data) {
          const file = await s3Service.getFile(item.path);
          if (file.success) {
            const content =
              file.data.type === 'JSON' || file.data.type === 'TXT'
                ? typeof file.data.content === 'object'
                  ? JSON.stringify(file.data.content)
                  : (file.data.content as string)
                : (file.data.content as string);
            const isBase64 = file.data.type === 'BASE64';
            await fileSystemService.writeFile(item.path, content, Directory.Data, isBase64);
          }
        }
        // Retry after download
        response = await fileSystemService.readFile(path, Directory.Data);
      }
    }

    if (response.success) {
      try {
        const parsed = JSON.parse(response.data.data.toString()) as ConfigModel;
        configAppCache.current = parsed;
        setConfigApp(parsed);
        return parsed;
      } catch {
        configAppCache.current = null;
        return null;
      }
    }

    configAppCache.current = null;
    return null;
  }, []);

  // ─── getConfigurationMeasurement ──────────────────────────────────────────

  const getConfigurationMeasurement = useCallback(
    async (): Promise<MeasurementModel | null> => {
      if (configMeasurementCache.current !== null) {
        return configMeasurementCache.current;
      }

      const pathRacimo = await resolveRacimoPath();
      if (!pathRacimo) return null;

      const path = `${pathRacimo}/measurementRegistration/measurementsRegistration.json`;
      let response = await fileSystemService.readFile(path, Directory.Data);

      // Web lazy-download fallback: if the measurement config is not in localStorage,
      // and we haven't attempted a download yet in this session, trigger downLoadData.
      // This handles returning users who bypass ValidateProjectScreen.
      if (!response.success && isWebPlatform() && !downloadAttemptedRef.current) {
        downloadAttemptedRef.current = true;
        const listFiles = await s3Service.listFiles(pathRacimo);
        if (listFiles.success) {
          for (const item of listFiles.data) {
            const file = await s3Service.getFile(item.path);
            if (file.success) {
              const content =
                file.data.type === 'JSON' || file.data.type === 'TXT'
                  ? typeof file.data.content === 'object'
                    ? JSON.stringify(file.data.content)
                    : (file.data.content as string)
                  : (file.data.content as string);
              const isBase64 = file.data.type === 'BASE64';
              await fileSystemService.writeFile(item.path, content, Directory.Data, isBase64);
            }
          }
          // Retry after download
          response = await fileSystemService.readFile(path, Directory.Data);
        }
      }

      if (response.success) {
        try {
          const parsed = JSON.parse(
            response.data.data.toString(),
          ) as MeasurementModel;
          configMeasurementCache.current = parsed;
          setConfigMeasurement(parsed);
          return parsed;
        } catch {
          configMeasurementCache.current = null;
          return null;
        }
      }

      configMeasurementCache.current = null;
      return null;
    },
    [],
  );

  // ─── getConfigurationColors ───────────────────────────────────────────────

  const getConfigurationColors = useCallback(
    async (): Promise<ColorsModel | null> => {
      if (configColorsCache.current !== null) {
        return configColorsCache.current;
      }

      const pathRacimo = await resolveRacimoPath();
      if (!pathRacimo) return null;

      const path = `${pathRacimo}/branding/colors.json`;
      const response = await fileSystemService.readFile(path, Directory.Data);

      if (response.success) {
        try {
          const parsed = JSON.parse(
            response.data.data.toString(),
          ) as ColorsModel;
          configColorsCache.current = parsed;
          setConfigColors(parsed);
          return parsed;
        } catch {
          configColorsCache.current = null;
          return null;
        }
      }

      configColorsCache.current = null;
      return null;
    },
    [],
  );

  // ─── loadBranding ─────────────────────────────────────────────────────────

  const loadBranding = useCallback(async (): Promise<void> => {
    const colors = await getConfigurationColors();
    if (colors !== null) {
      // NOTE: applyColors (CSS vars) removed — ThemeProvider (B08) consumes configColors
      // and applies tokens in a React-native way.
      setConfigColors(colors);
    } else {
      console.error('No BrandingColors');
    }
  }, [getConfigurationColors]);

  // ─── loadImage ────────────────────────────────────────────────────────────

  const loadImage = useCallback(
    async (pathFile: string): Promise<string | null> => {
      const pathRacimo = await resolveRacimoPath();
      if (!pathRacimo) return null;

      const path = `${pathRacimo}/${pathFile}`;

      // RN: always return file:// URI directly (no Blob/URL.createObjectURL needed)
      // convertFileSrc is no longer needed (R-22: Capacitor bridge removed)
      const fileUri = await fileSystemService.getFileUri(path, Directory.Data);
      if (fileUri.success) {
        return fileUri.data.uri;
      }

      console.error('Error obteniendo la URI de la imagen:', path);
      return null;
    },
    [],
  );

  // ─── countTasks ───────────────────────────────────────────────────────────

  const countTasks = useCallback((model: MeasurementModel): number => {
    return Object.keys(model.tasks).length;
  }, []);

  // ─── clearCache ───────────────────────────────────────────────────────────

  const clearCache = useCallback((): void => {
    configAppCache.current = null;
    configMeasurementCache.current = null;
    configColorsCache.current = null;
    // Reset the web lazy-download flag so a fresh download is attempted after
    // logout / RACIMO change.
    downloadAttemptedRef.current = false;
    setConfigApp(null);
    setConfigMeasurement(null);
    setConfigColors(null);
  }, []);

  // ─── Context value ────────────────────────────────────────────────────────

  const value: ConfigContextValue = {
    configApp,
    configMeasurement,
    configColors,
    downLoadData,
    configExists,
    getConfigurationApp,
    getConfigurationMeasurement,
    getConfigurationColors,
    loadBranding,
    loadImage,
    countTasks,
    clearCache,
  };

  return (
    <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Hook to consume ConfigContext.
 * Must be used within a <ConfigProvider>.
 */
export function useConfigContext(): ConfigContextValue {
  const ctx = useContext(ConfigContext);
  if (!ctx) {
    throw new Error('useConfigContext must be used within a <ConfigProvider>');
  }
  return ctx;
}

export default ConfigContext;

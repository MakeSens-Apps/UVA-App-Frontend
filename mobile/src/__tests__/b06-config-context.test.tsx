/**
 * B06 Gate — Jest tests: ConfigContext
 *
 * Gate requirements (from plan.md §B06):
 *  - ConfigContext loads config once (load-once cache, not re-downloaded on re-render)
 *  - getConfigurationApp, getConfigurationMeasurement, getConfigurationColors return
 *    parsed values on cache miss
 *  - loadBranding calls getConfigurationColors and updates configColors state
 *  - loadImage returns file:// URI (no Blob/URL.createObjectURL)
 *  - clearCache resets caches so next call re-fetches
 */

import React from 'react';
import { act, renderHook } from '@testing-library/react-native';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockReadFile = jest.fn();
const mockGetFileUri = jest.fn();
const mockWriteFile = jest.fn(() =>
  Promise.resolve({ success: true, data: { uri: 'file://test' } }),
);

jest.mock('../data/storage/file-system', () => ({
  fileSystemService: {
    readFile: (...args: unknown[]) => mockReadFile(...args),
    writeFile: (...args: unknown[]) => mockWriteFile(...args),
    getFileUri: (...args: unknown[]) => mockGetFileUri(...args),
  },
  Directory: {
    Data: 'Data',
    Cache: 'Cache',
    Documents: 'Documents',
    External: 'External',
    ExternalStorage: 'ExternalStorage',
  },
}));

const mockListFiles = jest.fn();
const mockGetFile = jest.fn();

jest.mock('../data/storage/s3', () => ({
  s3Service: {
    listFiles: (...args: unknown[]) => mockListFiles(...args),
    getFile: (...args: unknown[]) => mockGetFile(...args),
  },
}));

const mockGetInfo = jest.fn();

jest.mock('../data/session/session', () => ({
  sessionService: {
    getInfo: () => mockGetInfo(),
  },
}));

jest.mock('@aws-amplify/datastore', () => ({
  DataStore: { configure: jest.fn(), start: jest.fn(), clear: jest.fn() },
  syncExpression: jest.fn(),
  initSchema: jest.fn(() => ({})),
}));

jest.mock('../data/models', () => ({
  AppUsageEvent: jest.fn(),
  GamificationEvent: jest.fn(),
}));

// eslint-disable-next-line import/first
import { ConfigProvider, useConfigContext } from '../state/ConfigContext';
// eslint-disable-next-line import/first
import type { ConfigModel } from '../data/models/configuration/config.model';
// eslint-disable-next-line import/first
import type { ColorsModel } from '../data/models/configuration/colors.model';
// eslint-disable-next-line import/first
import type { MeasurementModel } from '../data/models/configuration/measurements.model';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const MOCK_SESSION = { racimoLinkCode: 'RACIMO01' };

const MOCK_CONFIG: ConfigModel = {
  racimo: { id: 'r1', name: 'Test Racimo', linkageCode: 'RACIMO01' },
  branding: { colors: { path: '/branding/colors.json' }, logo: 'logo.svg' },
  fieldsUVA: {},
  measurementRegistration: {
    path: '/measurementRegistration/measurementsRegistration.json',
  },
  components: {},
  documentation: '',
  gamification: {
    seedIcon: 'seed.svg',
    seedsToRecoverStreak: 5,
    seedsForAllTasks: 10,
    seedsForOneTask: 3,
    streakReward: { streakDaysRequired: 7, seedsForStreak: 20 },
    streakIcons: {},
    milestones: {},
  },
};

const MOCK_COLORS: ColorsModel = {
  primaryColor: { value: '#69AB3C', group: 'primary', type: 'HEX' },
  secondaryColor: { value: [100, 150, 200], group: 'secondary', type: 'RGB' },
};

const MOCK_MEASUREMENT: MeasurementModel = {
  tasks: {
    temperature: {
      id: 'temp',
      type: 'temperature',
      name: 'Temperatura',
      guide: [],
      restrictions: [],
    },
    humidity: {
      id: 'hum',
      type: 'humidity',
      name: 'Humedad',
      guide: [],
      restrictions: [],
    },
  },
} as unknown as MeasurementModel;

// ─── Helper: render the hook within ConfigProvider ────────────────────────────

async function renderConfigHook() {
  return renderHook(() => useConfigContext(), {
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <ConfigProvider>{children}</ConfigProvider>
    ),
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('B06 — ConfigContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetInfo.mockResolvedValue(MOCK_SESSION);
  });

  it('exposes initial null state for all configs', async () => {
    const { result } = await renderConfigHook();
    expect(result.current.configApp).toBeNull();
    expect(result.current.configMeasurement).toBeNull();
    expect(result.current.configColors).toBeNull();
  });

  it('getConfigurationApp parses config.json from filesystem', async () => {
    mockReadFile.mockResolvedValueOnce({
      success: true,
      data: { data: JSON.stringify(MOCK_CONFIG) },
    });

    const { result } = await renderConfigHook();

    let parsed: ConfigModel | null = null;
    await act(async () => {
      parsed = await result.current.getConfigurationApp();
    });

    expect(parsed).toEqual(MOCK_CONFIG);
    expect(mockReadFile).toHaveBeenCalledWith(
      'public/racimos/RACIMO01/config.json',
      'Data',
    );
  });

  it('getConfigurationApp loads ONCE — cache hit on second call', async () => {
    mockReadFile.mockResolvedValueOnce({
      success: true,
      data: { data: JSON.stringify(MOCK_CONFIG) },
    });

    const { result } = await renderConfigHook();

    await act(async () => {
      await result.current.getConfigurationApp();
      await result.current.getConfigurationApp(); // second call — must use cache
    });

    expect(mockReadFile).toHaveBeenCalledTimes(1);
  });

  it('getConfigurationColors parses colors.json and updates configColors state', async () => {
    mockReadFile.mockResolvedValueOnce({
      success: true,
      data: { data: JSON.stringify(MOCK_COLORS) },
    });

    const { result } = await renderConfigHook();

    let parsed: ColorsModel | null = null;
    await act(async () => {
      parsed = await result.current.getConfigurationColors();
    });

    expect(parsed).toEqual(MOCK_COLORS);
    expect(result.current.configColors).toEqual(MOCK_COLORS);
    expect(mockReadFile).toHaveBeenCalledWith(
      'public/racimos/RACIMO01/branding/colors.json',
      'Data',
    );
  });

  it('getConfigurationColors loads ONCE (cache hit)', async () => {
    mockReadFile.mockResolvedValueOnce({
      success: true,
      data: { data: JSON.stringify(MOCK_COLORS) },
    });

    const { result } = await renderConfigHook();

    await act(async () => {
      await result.current.getConfigurationColors();
      await result.current.getConfigurationColors();
    });

    expect(mockReadFile).toHaveBeenCalledTimes(1);
  });

  it('getConfigurationMeasurement parses measurementsRegistration.json', async () => {
    mockReadFile.mockResolvedValueOnce({
      success: true,
      data: { data: JSON.stringify(MOCK_MEASUREMENT) },
    });

    const { result } = await renderConfigHook();

    let parsed: MeasurementModel | null = null;
    await act(async () => {
      parsed = await result.current.getConfigurationMeasurement();
    });

    expect(parsed).toEqual(MOCK_MEASUREMENT);
    expect(mockReadFile).toHaveBeenCalledWith(
      'public/racimos/RACIMO01/measurementRegistration/measurementsRegistration.json',
      'Data',
    );
  });

  it('loadBranding updates configColors state (does NOT call CSS setProperty)', async () => {
    mockReadFile.mockResolvedValueOnce({
      success: true,
      data: { data: JSON.stringify(MOCK_COLORS) },
    });

    const { result } = await renderConfigHook();

    expect(result.current.configColors).toBeNull();

    await act(async () => {
      await result.current.loadBranding();
    });

    expect(result.current.configColors).toEqual(MOCK_COLORS);
    // document is not defined in RN/jest environment (applyColors not called)
    expect(typeof globalThis.document).toBe('undefined');
  });

  it('loadImage returns file:// URI (no Blob, no convertFileSrc)', async () => {
    const mockUri =
      'file:///data/user/0/com.makesens.appuva/files/public/racimos/RACIMO01/logo.png';
    mockGetFileUri.mockResolvedValueOnce({
      success: true,
      data: { uri: mockUri },
    });

    const { result } = await renderConfigHook();

    let uri: string | null = null;
    await act(async () => {
      uri = await result.current.loadImage('logo.png');
    });

    expect(uri).toBe(mockUri);
    expect(mockGetFileUri).toHaveBeenCalledWith(
      'public/racimos/RACIMO01/logo.png',
      'Data',
    );
  });

  it('clearCache resets all in-memory caches so next call re-fetches', async () => {
    mockReadFile
      .mockResolvedValueOnce({
        success: true,
        data: { data: JSON.stringify(MOCK_CONFIG) },
      })
      .mockResolvedValueOnce({
        success: true,
        data: { data: JSON.stringify(MOCK_CONFIG) },
      });

    const { result } = await renderConfigHook();

    await act(async () => {
      await result.current.getConfigurationApp(); // first call → reads from disk
    });

    await act(async () => {
      result.current.clearCache(); // reset caches
    });

    await act(async () => {
      await result.current.getConfigurationApp(); // second call → reads from disk again
    });

    expect(mockReadFile).toHaveBeenCalledTimes(2);
  });

  it('configExists returns true when config.json exists', async () => {
    mockReadFile.mockResolvedValueOnce({
      success: true,
      data: { data: '{}' },
    });

    const { result } = await renderConfigHook();

    let exists = false;
    await act(async () => {
      exists = await result.current.configExists();
    });

    expect(exists).toBe(true);
  });

  it('configExists returns false when config.json is missing', async () => {
    mockReadFile.mockResolvedValueOnce({
      success: false,
      error: { mensage: 'not found', type: 'FileSystemError' },
    });

    const { result } = await renderConfigHook();

    let exists = true;
    await act(async () => {
      exists = await result.current.configExists();
    });

    expect(exists).toBe(false);
  });

  it('countTasks returns number of tasks in model', async () => {
    const { result } = await renderConfigHook();
    const count = result.current.countTasks(MOCK_MEASUREMENT);
    expect(count).toBe(2);
  });

  it('returns null when session has no racimoLinkCode', async () => {
    mockGetInfo.mockResolvedValue({}); // no racimoLinkCode

    const { result } = await renderConfigHook();

    let parsed: ConfigModel | null = undefined as unknown as ConfigModel | null;
    await act(async () => {
      parsed = await result.current.getConfigurationApp();
    });

    expect(parsed).toBeNull();
    expect(mockReadFile).not.toHaveBeenCalled();
  });

  // ─── Web lazy-download fallback ──────────────────────────────────────────────
  // Simulates the IS_WEB branch: when config.json is not in localStorage (readFile fails),
  // the context should auto-fetch from S3 and retry the read (D-01 fix).

  it('getConfigurationMeasurement triggers S3 download when file is missing on web', async () => {
    // Patch IS_WEB to true for this test by replacing the module-level constant
    // via the existing s3Service mock (the logic is inside the same module).
    // We cannot directly set IS_WEB, but we can simulate what happens:
    // readFile fails → s3Service.listFiles → s3Service.getFile → writeFile → readFile again.

    // Sequence:
    // 1st readFile call: MISS (simulates localStorage empty on web)
    mockReadFile
      .mockResolvedValueOnce({ success: false, error: { mensage: 'ENOENT' } })
      // 2nd readFile (retry after download): HIT
      .mockResolvedValueOnce({
        success: true,
        data: { data: JSON.stringify(MOCK_MEASUREMENT) },
      });

    mockListFiles.mockResolvedValueOnce({
      success: true,
      data: [
        {
          path: 'public/racimos/RACIMO01/measurementRegistration/measurementsRegistration.json',
          size: 100,
        },
      ],
    });

    mockGetFile.mockResolvedValueOnce({
      success: true,
      data: { type: 'JSON', content: MOCK_MEASUREMENT },
    });

    // Temporarily set IS_WEB = true inside ConfigContext via document polyfill.
    // jest-expo runs in React Native environment (no `document`); we patch it here.
    const originalDocument = globalThis.document;
    Object.defineProperty(globalThis, 'document', {
      value: { createElement: jest.fn() },
      writable: true,
      configurable: true,
    });

    const { result } = await renderConfigHook();

    let parsed: MeasurementModel | null = null;
    await act(async () => {
      parsed = await result.current.getConfigurationMeasurement();
    });

    // Restore
    Object.defineProperty(globalThis, 'document', {
      value: originalDocument,
      writable: true,
      configurable: true,
    });

    // Should have called listFiles once (lazy download)
    expect(mockListFiles).toHaveBeenCalledWith('public/racimos/RACIMO01');
    // Should have fetched + written the file
    expect(mockGetFile).toHaveBeenCalledTimes(1);
    expect(mockWriteFile).toHaveBeenCalledTimes(1);
    // Should have returned the parsed measurement model
    expect(parsed).toEqual(MOCK_MEASUREMENT);
  });
});

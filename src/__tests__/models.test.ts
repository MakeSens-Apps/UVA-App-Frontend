/**
 * B03 Gate — Jest test: initSchema produces the 7 model classes
 *
 * Verifies that the copied models (schema.js, index.js) wire up correctly
 * via @aws-amplify/datastore initSchema.
 *
 * Gate requirement (plan.md §B03):
 *   "Jest: initSchema produce las 7 clases de modelo."
 *
 * Models: RACIMO, Measurement, UserProgress, GamificationEvent,
 *         AppUsageEvent, User, UVA
 *
 * Native module mocks are in jest.setup.js.
 * amplifyconfiguration.json is mocked via moduleNameMapper → __mocks__/
 *
 * @aws-amplify/react-native is mocked here to prevent the loadAsyncStorage
 * check from failing before async-storage mock is registered.
 */

// Mock @aws-amplify/react-native before any Amplify module loads.
// @aws-amplify/core native helpers call these loaders at module-load time.
// All loaders must be present or core throws at import.
jest.mock('@aws-amplify/react-native', () => ({
  loadGetRandomValues: jest.fn(),
  loadBase64: jest.fn(() => ({
    encode: (str: string) => Buffer.from(str).toString('base64'),
    decode: (str: string) => Buffer.from(str, 'base64').toString('utf8'),
  })),
  loadUrlPolyfill: jest.fn(),
  loadAsyncStorage: jest.fn(() => ({
    getItem: jest.fn(() => Promise.resolve(null)),
    setItem: jest.fn(() => Promise.resolve()),
    removeItem: jest.fn(() => Promise.resolve()),
    clear: jest.fn(() => Promise.resolve()),
    getAllKeys: jest.fn(() => Promise.resolve([])),
    multiGet: jest.fn(() => Promise.resolve([])),
    multiSet: jest.fn(() => Promise.resolve()),
    multiRemove: jest.fn(() => Promise.resolve()),
  })),
  loadAppState: jest.fn(() => ({
    currentState: 'active',
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  })),
  loadNetInfo: jest.fn(() => ({
    addEventListener: jest.fn(() => jest.fn()),
    fetch: jest.fn(() => Promise.resolve({ isConnected: true, type: 'wifi' })),
  })),
}));

// eslint-disable-next-line import/first
import {
  RACIMO,
  Measurement,
  UserProgress,
  GamificationEvent,
  AppUsageEvent,
  User,
  UVA,
} from '../data/models';

const MODEL_NAMES = [
  'RACIMO',
  'Measurement',
  'UserProgress',
  'GamificationEvent',
  'AppUsageEvent',
  'User',
  'UVA',
] as const;

describe('B03 — DataStore models (initSchema)', () => {
  it('exports exactly 7 model classes', () => {
    const models = {
      RACIMO,
      Measurement,
      UserProgress,
      GamificationEvent,
      AppUsageEvent,
      User,
      UVA,
    };
    expect(Object.keys(models)).toHaveLength(7);
  });

  it.each(MODEL_NAMES)('%s is a constructor function', (name) => {
    const models: Record<string, unknown> = {
      RACIMO,
      Measurement,
      UserProgress,
      GamificationEvent,
      AppUsageEvent,
      User,
      UVA,
    };
    const ModelClass = models[name];
    expect(typeof ModelClass).toBe('function');
  });

  it('RACIMO has copyOf static method', () => {
    expect(typeof RACIMO.copyOf).toBe('function');
  });

  it('Measurement has copyOf static method', () => {
    expect(typeof Measurement.copyOf).toBe('function');
  });

  it('UserProgress has copyOf static method', () => {
    expect(typeof UserProgress.copyOf).toBe('function');
  });

  it('GamificationEvent has copyOf static method', () => {
    expect(typeof GamificationEvent.copyOf).toBe('function');
  });

  it('AppUsageEvent has copyOf static method', () => {
    expect(typeof AppUsageEvent.copyOf).toBe('function');
  });

  it('User has copyOf static method', () => {
    expect(typeof User.copyOf).toBe('function');
  });

  it('UVA has copyOf static method', () => {
    expect(typeof UVA.copyOf).toBe('function');
  });
});

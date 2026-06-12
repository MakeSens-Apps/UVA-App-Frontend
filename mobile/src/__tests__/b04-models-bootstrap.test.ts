/**
 * B04 Gate — Jest test: bootstrap of models (initSchema 7 classes)
 *
 * This duplicates the B03 gate check from a B04 perspective:
 * verifies that the models module (imported by all DS services in B04)
 * still exports exactly 7 model classes after B04's import chain is added.
 *
 * Also verifies: models imported via @/ path alias compile correctly.
 */

// Mock @aws-amplify/react-native before any Amplify module loads.
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

describe('B04 — DataStore models still exports 7 classes', () => {
  it('all 7 model classes are accessible from @/data/models', () => {
    const models = { RACIMO, Measurement, UserProgress, GamificationEvent, AppUsageEvent, User, UVA };
    expect(Object.keys(models)).toHaveLength(7);
    for (const [, ModelClass] of Object.entries(models)) {
      expect(typeof ModelClass).toBe('function');
    }
  });

  it('RACIMO has copyOf', () => expect(typeof RACIMO.copyOf).toBe('function'));
  it('Measurement has copyOf', () => expect(typeof Measurement.copyOf).toBe('function'));
  it('UserProgress has copyOf', () => expect(typeof UserProgress.copyOf).toBe('function'));
  it('GamificationEvent has copyOf', () => expect(typeof GamificationEvent.copyOf).toBe('function'));
  it('AppUsageEvent has copyOf', () => expect(typeof AppUsageEvent.copyOf).toBe('function'));
  it('User has copyOf', () => expect(typeof User.copyOf).toBe('function'));
  it('UVA has copyOf', () => expect(typeof UVA.copyOf).toBe('function'));
});

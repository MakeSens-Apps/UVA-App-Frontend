/**
 * B01/B03/B06 Smoke test — verifies that App renders without crashing.
 *
 * Note: RNTL 14 + React 19 uses async render.
 *
 * jest.mock calls are babel-hoisted before any imports at runtime,
 * so the eslint/import-order warning is a false positive here.
 *
 * B03 additions: mock Amplify modules so the test doesn't require real credentials.
 * B06 additions: mock auth + app-usage singletons to prevent AsyncStorage load error.
 * Native module mocks (get-random-values, netinfo, async-storage) are in jest.setup.js.
 * amplifyconfiguration.json is mocked via moduleNameMapper → __mocks__/
 */
/* eslint-disable import/first */
import React from 'react';
import { render } from '@testing-library/react-native';

// B03: mock Amplify core
jest.mock('aws-amplify', () => ({
  Amplify: { configure: jest.fn() },
}));
jest.mock('@aws-amplify/datastore', () => ({
  DataStore: {
    configure: jest.fn(),
    start: jest.fn(() => Promise.resolve()),
    clear: jest.fn(() => Promise.resolve()),
    query: jest.fn(() => Promise.resolve(null)),
    delete: jest.fn(() => Promise.resolve()),
  },
  syncExpression: jest.fn((_model: unknown, fn: unknown) => ({ model: _model, fn })),
  initSchema: jest.fn(() => ({
    RACIMO: jest.fn(),
    Measurement: jest.fn(),
    UserProgress: jest.fn(),
    GamificationEvent: class GamificationEvent {},
    AppUsageEvent: class AppUsageEvent {},
    User: jest.fn(),
    UVA: jest.fn(),
  })),
}));
jest.mock('aws-amplify/utils', () => ({
  Hub: { listen: jest.fn(() => () => {}) },
}));
// Mock models to avoid initSchema loading real Amplify internals
jest.mock('../data/models', () => ({
  RACIMO: jest.fn(),
  Measurement: jest.fn(),
  UserProgress: jest.fn(),
  GamificationEvent: class GamificationEvent {},
  AppUsageEvent: class AppUsageEvent {},
  User: jest.fn(),
  UVA: jest.fn(),
}));

// B06: mock auth + app-usage to prevent AsyncStorage loading error
jest.mock('../data/auth/auth', () => ({
  authService: {
    CurrentAuthenticatedUser: jest.fn(() =>
      Promise.resolve({ success: false }),
    ),
    signIn: jest.fn(),
    signOut: jest.fn(),
    signUp: jest.fn(),
    confirmSignUp: jest.fn(),
  },
}));
jest.mock('../data/view/app-usage', () => ({
  initAppUsage: jest.fn(),
  cleanupSyncedRecord: jest.fn(() => Promise.resolve()),
  appUsageSyncExpression: { model: jest.fn(), fn: jest.fn() },
  trackNavigation: jest.fn(() => Promise.resolve()),
  trackAction: jest.fn(() => Promise.resolve()),
}));
jest.mock('../data/session/session', () => ({
  sessionService: {
    getInfo: jest.fn(() => Promise.resolve({})),
    setInfo: jest.fn(() => Promise.resolve()),
    clearInfo: jest.fn(() => Promise.resolve()),
  },
}));
jest.mock('../data/storage/file-system', () => ({
  fileSystemService: {
    readFile: jest.fn(() => Promise.resolve({ success: false })),
    writeFile: jest.fn(() => Promise.resolve({ success: true })),
    getFileUri: jest.fn(() => Promise.resolve({ success: false })),
  },
  Directory: { Data: 'Data', Cache: 'Cache' },
}));
jest.mock('../data/storage/s3', () => ({
  s3Service: {
    listFiles: jest.fn(() => Promise.resolve({ success: false })),
    getFile: jest.fn(() => Promise.resolve({ success: false })),
  },
}));

import App from '../../App';
/* eslint-enable import/first */

describe('App (B01/B03/B06 smoke)', () => {
  it('renders without crashing and shows UVA App title', async () => {
    const { getByText } = await render(<App />);
    expect(getByText('UVA App')).toBeTruthy();
  });

  it('shows B06 subtitle', async () => {
    const { getByText } = await render(<App />);
    expect(getByText('React Native — B06 Contexts')).toBeTruthy();
  });
});

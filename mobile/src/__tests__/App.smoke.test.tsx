/**
 * B01/B03 Smoke test — verifies that App renders without crashing.
 *
 * Note: RNTL 14 + React 19 uses async render.
 *
 * jest.mock calls are babel-hoisted before any imports at runtime,
 * so the eslint/import-order warning is a false positive here.
 *
 * B03 additions: mock Amplify modules so the test doesn't require real credentials.
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

import App from '../../App';
/* eslint-enable import/first */

describe('App (B01/B03 smoke)', () => {
  it('renders without crashing and shows UVA App title', async () => {
    const { getByText } = await render(<App />);
    expect(getByText('UVA App')).toBeTruthy();
  });

  it('shows B03 subtitle', async () => {
    const { getByText } = await render(<App />);
    expect(getByText('React Native — B03 Amplify+DataStore')).toBeTruthy();
  });
});

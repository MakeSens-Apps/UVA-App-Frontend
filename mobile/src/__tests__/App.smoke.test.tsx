/**
 * B01 Smoke test — verifies that App renders without crashing
 * and contains the expected placeholder text.
 *
 * Note: RNTL 14 + React 19 uses async render.
 *
 * jest.mock calls are babel-hoisted before any imports at runtime,
 * so the eslint/import-order warning is a false positive here.
 */
/* eslint-disable import/first */
import React from 'react';
import { render } from '@testing-library/react-native';

// Polyfills mocked so native modules don't blow up in Jest
jest.mock('react-native-get-random-values', () => ({}));
jest.mock('react-native-url-polyfill/auto', () => ({}));

import App from '../../App';
/* eslint-enable import/first */

describe('App (B01 smoke)', () => {
  it('renders without crashing and shows UVA App title', async () => {
    const { getByText } = await render(<App />);
    expect(getByText('UVA App')).toBeTruthy();
  });

  it('shows B01 scaffold subtitle', async () => {
    const { getByText } = await render(<App />);
    expect(getByText('React Native — B01 scaffold')).toBeTruthy();
  });
});

/**
 * B03 Jest setup file — global mocks for native modules required by Amplify
 */

// react-native-get-random-values: crypto polyfill for DataStore UUIDs
jest.mock('react-native-get-random-values', () => ({}));

// react-native-url-polyfill: URL API for Amplify
jest.mock('react-native-url-polyfill/auto', () => ({}));

// @react-native-async-storage/async-storage: Amplify token persistence
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
  getAllKeys: jest.fn(() => Promise.resolve([])),
  multiGet: jest.fn(() => Promise.resolve([])),
  multiSet: jest.fn(() => Promise.resolve()),
  multiRemove: jest.fn(() => Promise.resolve()),
}));

// @react-native-community/netinfo: NetInfo required by DataStore Hub (R-04)
jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(() => () => {}),
  fetch: jest.fn(() => Promise.resolve({ isConnected: true, type: 'wifi' })),
}));

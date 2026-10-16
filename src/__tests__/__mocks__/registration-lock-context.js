/**
 * F4-05 (#60) and F4-06 (#61) — global mock of '@/state/RegistrationLockContext' (registered in jest.setup.js).
 *
 * Screen tests that predate the registration lock render Home, Measurement, Register and
 * MeasurementDetail without the provider (and often with partial Amplify mocks). This mock
 * keeps them unlocked. Tests of the lock itself call `jest.unmock('@/state/RegistrationLockContext')`
 * or drive `mockRegistrationLockState` / `mockRegistrationLockRefresh` below.
 */

const UNLOCKED = {
  uvaId: null,
  uvaStatus: 'unknown',
  racimoId: null,
  racimoStatus: 'unknown',
  racimoName: null,
  stationStatus: 'unknown',
  reason: null,
  reactivationPending: false,
};

const mockRegistrationLockState = { current: { ...UNLOCKED } };
const mockRegistrationLockRefresh = jest.fn(() =>
  Promise.resolve(mockRegistrationLockState.current),
);
const mockConsumeReactivationNotice = jest.fn(() => Promise.resolve());
const mockReactivatedShown = { current: false };

module.exports = {
  __esModule: true,
  UNLOCKED,
  mockRegistrationLockState,
  mockRegistrationLockRefresh,
  mockConsumeReactivationNotice,
  mockReactivatedShown,
  RegistrationLockProvider: ({ children }) => children,
  useRegistrationLock: () => ({
    state: mockRegistrationLockState.current,
    refresh: mockRegistrationLockRefresh,
    consumeReactivationNotice: mockConsumeReactivationNotice,
  }),
  useRegistrationLockNotice: () => ({
    reason: mockRegistrationLockState.current.reason,
    racimoName: mockRegistrationLockState.current.racimoName ?? null,
    showReactivated:
      mockReactivatedShown.current &&
      mockRegistrationLockState.current.reason === null,
  }),
};

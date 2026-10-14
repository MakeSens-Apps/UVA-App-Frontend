/**
 * F4-05 (#60) — RegistrationLockContext: re-evaluation on sync, sign-out cleanup and the
 * one-time reactivation notice. The service is mocked; its rules are covered in
 * f4-05-registration-lock.test.ts.
 */

import React from 'react';
import { Text } from 'react-native';
import { act, render, waitFor } from '@testing-library/react-native';

jest.unmock('@/state/RegistrationLockContext');

const mockHubListeners: Record<string, (data: unknown) => void> = {};
jest.mock('aws-amplify/utils', () => ({
  Hub: {
    listen: jest.fn((channel: string, cb: (data: unknown) => void) => {
      mockHubListeners[channel] = cb;
      return () => {
        delete mockHubListeners[channel];
      };
    }),
  },
}));

const mockObserveNext: { current?: (msg: unknown) => void } = {};
jest.mock('@aws-amplify/datastore', () => ({
  DataStore: {
    observe: jest.fn(() => ({
      subscribe: (observer: { next: (msg: unknown) => void }) => {
        mockObserveNext.current = observer.next;
        return { unsubscribe: jest.fn() };
      },
    })),
  },
}));
jest.mock('@/data/models', () => ({ UVA: function UVA() {} }));

jest.mock('@react-navigation/native', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { useEffect } = require('react');
  return { useFocusEffect: (cb: () => void) => useEffect(cb, [cb]) };
});

const UNLOCKED = {
  uvaId: null,
  uvaStatus: 'unknown',
  reason: null,
  reactivationPending: false,
};
const mockEvaluate = jest.fn();
const mockRefreshVersionPolicy = jest.fn(() => Promise.resolve());
const mockConsume = jest.fn(() => Promise.resolve());
const mockClearForSignOut = jest.fn(() => Promise.resolve());
jest.mock('@/data/registration-lock/registration-lock-service', () => ({
  UNLOCKED_STATE: {
    uvaId: null,
    uvaStatus: 'unknown',
    reason: null,
    reactivationPending: false,
  },
  registrationLockService: {
    evaluate: (...a: unknown[]) => mockEvaluate(...a),
    refreshVersionPolicy: () => mockRefreshVersionPolicy(),
    consumeReactivationNotice: (...a: unknown[]) =>
      (mockConsume as jest.Mock)(...a),
    clearForSignOut: () => mockClearForSignOut(),
  },
}));

// eslint-disable-next-line import/first
import {
  RegistrationLockProvider,
  useRegistrationLock,
  useRegistrationLockNotice,
} from '@/state/RegistrationLockContext';

function NoticeProbe(): React.JSX.Element {
  const { reason, showReactivated } = useRegistrationLockNotice();
  return (
    <Text testID="probe">{`${reason ?? 'none'}|${showReactivated ? 'reactivated' : 'quiet'}`}</Text>
  );
}

function StateProbe(): React.JSX.Element {
  const { state } = useRegistrationLock();
  return (
    <Text testID="state">{`${state.uvaId ?? 'none'}|${state.reason ?? 'none'}`}</Text>
  );
}

describe('RegistrationLockContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEvaluate.mockResolvedValue(UNLOCKED);
  });

  it('evaluates on mount after reading the minimum-version policy', async () => {
    await render(
      <RegistrationLockProvider>
        <StateProbe />
      </RegistrationLockProvider>,
    );
    await waitFor(() => expect(mockEvaluate).toHaveBeenCalled());
    expect(mockRefreshVersionPolicy).toHaveBeenCalled();
  });

  it('re-evaluates after a sync (ready, UVA modelSynced) and on a local UVA change', async () => {
    const disabled = {
      uvaId: 'uva-0001',
      uvaStatus: 'disabled',
      reason: 'uva-disabled',
      reactivationPending: false,
    };
    const { getByTestId } = await render(
      <RegistrationLockProvider>
        <StateProbe />
      </RegistrationLockProvider>,
    );
    await waitFor(() => expect(mockEvaluate).toHaveBeenCalled());
    mockEvaluate.mockClear();

    mockEvaluate.mockResolvedValue(disabled);
    await act(async () => {
      mockHubListeners.datastore({ payload: { event: 'ready' } });
    });
    await waitFor(() =>
      expect(getByTestId('state').props.children).toBe('uva-0001|uva-disabled'),
    );

    await act(async () => {
      mockHubListeners.datastore({
        payload: { event: 'modelSynced', data: { model: { name: 'UVA' } } },
      });
    });
    await act(async () => {
      mockHubListeners.datastore({
        payload: {
          event: 'modelSynced',
          data: { model: { name: 'Measurement' } },
        },
      });
    });
    await act(async () => {
      mockObserveNext.current?.({ element: { id: 'uva-0001' } });
    });
    await act(async () => {
      mockObserveNext.current?.({ element: { id: 'uva-other' } });
    });
    // ready + UVA modelSynced + own UVA observed = 3 (Measurement and another UVA ignored).
    expect(mockEvaluate).toHaveBeenCalledTimes(3);
  });

  it('sign-out forgets the per-UVA memory and unlocks the state', async () => {
    mockEvaluate.mockResolvedValue({
      uvaId: 'uva-0001',
      uvaStatus: 'disabled',
      reason: 'uva-disabled',
      reactivationPending: false,
    });
    const { getByTestId } = await render(
      <RegistrationLockProvider>
        <StateProbe />
      </RegistrationLockProvider>,
    );
    await waitFor(() =>
      expect(getByTestId('state').props.children).toBe('uva-0001|uva-disabled'),
    );
    await act(async () => {
      mockHubListeners.auth({ payload: { event: 'signedOut' } });
    });
    expect(mockClearForSignOut).toHaveBeenCalledTimes(1);
    expect(getByTestId('state').props.children).toBe('none|none');
  });

  it('reactivation notice: shown on the first visit and consumed, never again', async () => {
    mockEvaluate.mockResolvedValue({
      uvaId: 'uva-0001',
      uvaStatus: 'enabled',
      reason: null,
      reactivationPending: true,
    });
    const first = await render(
      <RegistrationLockProvider>
        <NoticeProbe />
      </RegistrationLockProvider>,
    );
    await waitFor(() =>
      expect(first.getByTestId('probe').props.children).toBe(
        'none|reactivated',
      ),
    );
    expect(mockConsume).toHaveBeenCalledTimes(1);
    expect(mockConsume).toHaveBeenCalledWith('uva-0001');
    first.unmount();

    // Already consumed in storage: the service reports it as no longer pending.
    mockEvaluate.mockResolvedValue({
      uvaId: 'uva-0001',
      uvaStatus: 'enabled',
      reason: null,
      reactivationPending: false,
    });
    const second = await render(
      <RegistrationLockProvider>
        <NoticeProbe />
      </RegistrationLockProvider>,
    );
    await waitFor(() => expect(mockEvaluate).toHaveBeenCalled());
    expect(second.getByTestId('probe').props.children).toBe('none|quiet');
    expect(mockConsume).toHaveBeenCalledTimes(1);
    second.unmount();
  });

  it('a lock hides the reactivation notice and does not consume it', async () => {
    mockEvaluate.mockResolvedValue({
      uvaId: 'uva-0001',
      uvaStatus: 'enabled',
      reason: 'update-required',
      reactivationPending: true,
    });
    const { getByTestId } = await render(
      <RegistrationLockProvider>
        <NoticeProbe />
      </RegistrationLockProvider>,
    );
    await waitFor(() =>
      expect(getByTestId('probe').props.children).toBe('update-required|quiet'),
    );
    expect(mockConsume).not.toHaveBeenCalled();
  });
});

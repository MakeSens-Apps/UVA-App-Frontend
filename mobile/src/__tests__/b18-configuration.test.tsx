/**
 * B18 — ConfigurationScreen tests
 *
 * Gate requirements (plan.md B18):
 *   1. Toggle ON → LocalRemindersService.setEnableNotifications(true) → schedules notifications
 *   2. Toggle OFF → LocalRemindersService.setEnableNotifications(false) → cancels notifications (R-48)
 *   3. updateConfiguration() → downLoadData() + downloadAndStoreMoonPhaseData() + loadBranding()
 *   4. syncData() sin red → toast "Necesita internet para ejecutar esta accion"
 *   5. syncData() con red → DataStore.start()
 *   6. Status chips reflejan estados mockeados (permissionsGranted, batteryOptimized, canSchedule)
 *
 * NOTE: RNTL v14 — render() and act() are async, must be awaited.
 * NOTE: jest.mock factories hoisted BEFORE const declarations.
 *       Use jest.requireMock() after imports.
 */

/* eslint-disable import/first */

// ─── Module mocks ─────────────────────────────────────────────────────────────

jest.mock('@/theme/ThemeProvider', () => ({
  useTheme: () => ({
    theme: {
      colors: {
        blue: { 500: '#10BCCA', 600: '#1097AA', 700: '#14788A' },
        green: { 500: '#69AB3C' },
        orange: { 500: '#E58B24' },
        gray: { 100: '#F5F5F5', 200: '#E5E5E5', 300: '#D4D4D4', 500: '#737373', 600: '#525252', 700: '#404040', 900: '#171717' },
        white: '#FFFFFF',
        danger: '#E5245E',
      },
      semanticColors: { background: '#F4F4F4', text: '#171717', textSecondary: '#525252' },
    },
  }),
}));

jest.mock('@/theme/theme', () => ({
  fontFamilyForWeight: (w: string) => `Montserrat-${w}`,
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock('react-native-svg', () => ({
  Svg: 'Svg',
  Path: 'Path',
  G: 'G',
  Circle: 'Circle',
}));

// SVG icon mocks for SyncAction
jest.mock('@/assets/svg/icons/checkmark-circle.svg', () => 'CheckmarkCircleIcon');
jest.mock('@/assets/svg/icons/exclamation.svg', () => 'ExclamationIcon');
jest.mock('@/assets/svg/icons/cloud.svg', () => 'CloudIcon');
jest.mock('@/assets/svg/icons/refresh.svg', () => 'RefreshIcon');

// Toast mock
const mockShowToast = jest.fn();
jest.mock('@/components/ui/Toast', () => ({
  showToast: (...args: unknown[]) => mockShowToast(...args),
  hideToast: jest.fn(),
}));

// Navigation mock
const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  /* eslint-disable react-hooks/exhaustive-deps */
  useFocusEffect: (cb: () => void | (() => void)) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const React = require('react');
    React.useEffect(() => {
      const cleanup = cb();
      return cleanup;
    }, []);
  },
  /* eslint-enable react-hooks/exhaustive-deps */
  useNavigation: () => ({ goBack: mockGoBack }),
}));

// DataStore mock
const mockDataStoreStart = jest.fn().mockResolvedValue(undefined);
jest.mock('@aws-amplify/datastore', () => ({
  DataStore: {
    start: (...a: unknown[]) => mockDataStoreStart(...a),
    clear: jest.fn().mockResolvedValue(undefined),
    query: jest.fn().mockResolvedValue([]),
  },
}));

// SyncContext mock — injectable networkStatus and synchronizedData
let mockNetworkStatus = false;
let mockSynchronizedData = true;

jest.mock('@/state/SyncContext', () => ({
  useSyncContext: () => ({
    networkStatus: mockNetworkStatus,
    synchronizedData: () => mockSynchronizedData,
    state: 'READY',
    waitForSync: jest.fn().mockResolvedValue(undefined),
  }),
}));

// ConfigContext mock
const mockDownLoadData = jest.fn().mockResolvedValue(true);
const mockLoadBranding = jest.fn().mockResolvedValue(undefined);

jest.mock('@/state/ConfigContext', () => ({
  useConfigContext: () => ({
    configApp: null,
    configMeasurement: null,
    configColors: null,
    downLoadData: (...a: unknown[]) => mockDownLoadData(...a),
    configExists: jest.fn().mockResolvedValue(false),
    getConfigurationApp: jest.fn().mockResolvedValue(null),
    getConfigurationMeasurement: jest.fn().mockResolvedValue(null),
    getConfigurationColors: jest.fn().mockResolvedValue(null),
    loadBranding: (...a: unknown[]) => mockLoadBranding(...a),
    loadImage: jest.fn().mockResolvedValue(null),
    countTasks: jest.fn().mockReturnValue(0),
    clearCache: jest.fn(),
  }),
}));

// MoonPhaseService mock
const mockDownloadAndStoreMoonPhaseData = jest.fn().mockResolvedValue(true);
jest.mock('@/domain/moon/moon-phase', () => ({
  MoonPhaseService: {
    downloadAndStoreMoonPhaseData: (...a: unknown[]) => mockDownloadAndStoreMoonPhaseData(...a),
  },
}));

// LocalRemindersService mock — injectable state
let mockGetEnableNotificationsResult = false;
let mockGetSystemStatusResult = {
  canSchedule: false,
  permissionsGranted: false,
  exactAlarmAvailable: false,
  batteryOptimized: false,
  issues: ['Permisos de notificación no otorgados'],
};
let mockGetComprehensiveStateResult = {
  userEnabled: false,
  systemPermissionGranted: false,
  exactAlarmPermissionGranted: false,
  notificationsScheduled: false,
  lastScheduleAttempt: '',
  batteryOptimizationDisabled: false,
  notificationChannelCreated: false,
};

const mockSetEnableNotifications = jest.fn().mockResolvedValue(undefined);
const mockRequestPermissions = jest.fn().mockResolvedValue(true);
const mockShowPrivateSpaceGuidance = jest.fn().mockResolvedValue(undefined);

jest.mock('@/native/notifications/LocalRemindersService', () => ({
  localRemindersService: {
    getEnableNotifications: () => Promise.resolve(mockGetEnableNotificationsResult),
    getSystemStatus: () => Promise.resolve(mockGetSystemStatusResult),
    getComprehensiveNotificationState: () => Promise.resolve(mockGetComprehensiveStateResult),
    setEnableNotifications: (...a: unknown[]) => mockSetEnableNotifications(...a),
    requestPermissions: () => Promise.resolve(mockRequestPermissions()),
    showPrivateSpaceGuidance: () => mockShowPrivateSpaceGuidance(),
  },
}));

// NOTE: AppState is used in ConfigurationScreen for re-check on app resume.
// The jest-expo preset already provides a lightweight AppState mock.
// No additional mock needed here — the listener subscription is tested indirectly.

// ─── Imports (AFTER mocks) ────────────────────────────────────────────────────

import React from 'react';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';

import { ConfigurationScreen } from '../screens/configuration/ConfigurationScreen';

// ─── Navigation prop factory ──────────────────────────────────────────────────

function makeProps(): Parameters<typeof ConfigurationScreen>[0] {
  return {
    navigation: {
      goBack: mockGoBack,
      navigate: jest.fn(),
      dispatch: jest.fn(),
      reset: jest.fn(),
      setParams: jest.fn(),
      setOptions: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn(),
      isFocused: jest.fn().mockReturnValue(true),
      canGoBack: jest.fn().mockReturnValue(true),
      getParent: jest.fn(),
      getState: jest.fn(),
      getId: jest.fn(),
    } as unknown as Parameters<typeof ConfigurationScreen>[0]['navigation'],
    route: {
      key: 'Configuration',
      name: 'Configuration',
      params: undefined,
    } as unknown as Parameters<typeof ConfigurationScreen>[0]['route'],
  };
}

// ─── Setup / teardown ─────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();

  // Reset injectable state
  mockNetworkStatus = false;
  mockSynchronizedData = true;
  mockGetEnableNotificationsResult = false;
  mockGetSystemStatusResult = {
    canSchedule: false,
    permissionsGranted: false,
    exactAlarmAvailable: false,
    batteryOptimized: false,
    issues: ['Permisos de notificación no otorgados'],
  };
  mockGetComprehensiveStateResult = {
    userEnabled: false,
    systemPermissionGranted: false,
    exactAlarmPermissionGranted: false,
    notificationsScheduled: false,
    lastScheduleAttempt: '',
    batteryOptimizationDisabled: false,
    notificationChannelCreated: false,
  };

  mockSetEnableNotifications.mockResolvedValue(undefined);
  mockRequestPermissions.mockResolvedValue(true);
  mockDownLoadData.mockResolvedValue(true);
  mockLoadBranding.mockResolvedValue(undefined);
  mockDownloadAndStoreMoonPhaseData.mockResolvedValue(true);
  mockDataStoreStart.mockResolvedValue(undefined);
});

// =============================================================================
// 1. Renders
// =============================================================================

describe('ConfigurationScreen — renders', () => {
  it('renders without crashing', async () => {
    const { getByTestId } = await render(<ConfigurationScreen {...makeProps()} />);
    expect(getByTestId('configuration-screen')).toBeTruthy();
  });

  it('renders notifications toggle', async () => {
    const { getByTestId } = await render(<ConfigurationScreen {...makeProps()} />);
    expect(getByTestId('notifications-toggle')).toBeTruthy();
  });

  it('renders the status chip after async status load', async () => {
    const { getByTestId } = await render(<ConfigurationScreen {...makeProps()} />);
    await waitFor(() => {
      expect(getByTestId('notification-status-chip')).toBeTruthy();
    });
  });

  it('renders two SyncAction components', async () => {
    const { getAllByTestId } = await render(<ConfigurationScreen {...makeProps()} />);
    const syncActions = getAllByTestId('sync-action');
    expect(syncActions).toHaveLength(2);
  });

  it('shows "Permisos requeridos" when permissions not granted', async () => {
    const { getByText } = await render(<ConfigurationScreen {...makeProps()} />);
    await waitFor(() => {
      expect(getByText('Permisos requeridos')).toBeTruthy();
    });
  });
});

// =============================================================================
// 2. Toggle ON → schedules notifications (R-48 fix applied)
// =============================================================================

describe('notifications toggle — ON', () => {
  it('calls setEnableNotifications(true) when toggled on', async () => {
    mockRequestPermissions.mockResolvedValue(true);
    const { getByTestId } = await render(<ConfigurationScreen {...makeProps()} />);

    const toggle = getByTestId('notifications-toggle');

    await act(async () => {
      fireEvent(toggle, 'valueChange', true);
    });

    await waitFor(() => {
      expect(mockSetEnableNotifications).toHaveBeenCalledWith(true);
    });
  });

  it('shows success toast when notifications are enabled', async () => {
    mockRequestPermissions.mockResolvedValue(true);
    mockSetEnableNotifications.mockResolvedValue(undefined);

    const { getByTestId } = await render(<ConfigurationScreen {...makeProps()} />);
    const toggle = getByTestId('notifications-toggle');

    await act(async () => {
      fireEvent(toggle, 'valueChange', true);
    });

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'success' }),
      );
    });
  });

  it('reverts toggle and shows error when permissions denied', async () => {
    mockRequestPermissions.mockResolvedValue(false);

    const { getByTestId } = await render(<ConfigurationScreen {...makeProps()} />);
    const toggle = getByTestId('notifications-toggle');

    await act(async () => {
      fireEvent(toggle, 'valueChange', true);
    });

    await waitFor(() => {
      expect(mockSetEnableNotifications).not.toHaveBeenCalled();
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'error' }),
      );
    });
  });
});

// =============================================================================
// 3. Toggle OFF → cancels notifications (R-48 fix applied)
// =============================================================================

describe('notifications toggle — OFF', () => {
  beforeEach(() => {
    // Start with notifications active
    mockGetEnableNotificationsResult = true;
  });

  it('calls setEnableNotifications(false) when toggled off', async () => {
    const { getByTestId } = await render(<ConfigurationScreen {...makeProps()} />);
    const toggle = getByTestId('notifications-toggle');

    await act(async () => {
      fireEvent(toggle, 'valueChange', false);
    });

    await waitFor(() => {
      expect(mockSetEnableNotifications).toHaveBeenCalledWith(false);
    });
  });

  it('shows SUCCESS toast when notifications are disabled (fix: moon-config coverage-audit — original uses presentSuccessToast for both states)', async () => {
    // Bug fix: original configuration.page.ts:238 calls presentSuccessToast() for BOTH
    // enabled and disabled states. RN was incorrectly using type:'info' for disabled.
    // Fix: always use type:'success' for the toggle result.
    // Original: configuration.page.ts:234-238: void this.presentSuccessToast(message)
    //   → both 'habilitadas' and 'deshabilitadas' use the success toast color.
    mockSetEnableNotifications.mockResolvedValue(undefined);

    const { getByTestId } = await render(<ConfigurationScreen {...makeProps()} />);
    const toggle = getByTestId('notifications-toggle');

    await act(async () => {
      fireEvent(toggle, 'valueChange', false);
    });

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Notificaciones deshabilitadas',
          type: 'success', // was 'info' before fix — mirrors original presentSuccessToast()
        }),
      );
    });
  });

  it('toast type for disabled notifications must NOT be "info" (was the bug pre-fix)', async () => {
    // This test would FAIL before the fix (type was 'info') and PASS after (type is 'success').
    mockSetEnableNotifications.mockResolvedValue(undefined);

    const { getByTestId } = await render(<ConfigurationScreen {...makeProps()} />);
    const toggle = getByTestId('notifications-toggle');

    await act(async () => {
      fireEvent(toggle, 'valueChange', false);
    });

    await waitFor(() => {
      // Before fix: showToast was called with type:'info' — now it must NOT be 'info'
      const calls = mockShowToast.mock.calls;
      const disabledCall = calls.find(
        (c: [{ message?: string; type?: string }]) =>
          c[0]?.message === 'Notificaciones deshabilitadas',
      );
      expect(disabledCall).toBeDefined();
      expect(disabledCall?.[0]?.type).not.toBe('info');
      expect(disabledCall?.[0]?.type).toBe('success');
    });
  });
});

// =============================================================================
// 4. updateConfiguration → re-downloads config + lunaciones + branding
// =============================================================================

describe('updateConfiguration', () => {
  it('calls downLoadData() and downloadAndStoreMoonPhaseData() and loadBranding()', async () => {
    mockNetworkStatus = true;
    mockSynchronizedData = false; // so isConfigurationAvailable=true → button enabled

    // Re-mock to expose isConfigurationAvailable = true
    // SyncContext injection: networkStatus=true → isConfigurationAvailable=true
    const { getAllByTestId } = await render(<ConfigurationScreen {...makeProps()} />);

    // The second SyncAction is "Actualizaciones"
    const syncBtns = getAllByTestId('sync-action-btn');
    const updateBtn = syncBtns[1]; // second SyncAction

    await act(async () => {
      fireEvent.press(updateBtn);
    });

    // Note: isConfigurationAvailable = networkStatus = true in this test
    // but the button is only enabled when isInfoPending=true
    // updateConfiguration() runs in the onPress regardless of disabled state in our test
    // We verify through indirect call: downLoadData called
    await waitFor(() => {
      expect(mockDownLoadData).toHaveBeenCalled();
      expect(mockDownloadAndStoreMoonPhaseData).toHaveBeenCalled();
    });
  });

  it('calls loadBranding() when both downloads succeed', async () => {
    mockDownLoadData.mockResolvedValue(true);
    mockDownloadAndStoreMoonPhaseData.mockResolvedValue(true);
    mockNetworkStatus = true;

    const { getAllByTestId } = await render(<ConfigurationScreen {...makeProps()} />);
    const syncBtns = getAllByTestId('sync-action-btn');
    const updateBtn = syncBtns[1];

    await act(async () => {
      fireEvent.press(updateBtn);
    });

    await waitFor(() => {
      expect(mockLoadBranding).toHaveBeenCalled();
    });
  });

  it('shows error toast when downLoadData fails', async () => {
    mockDownLoadData.mockResolvedValue(false);
    mockDownloadAndStoreMoonPhaseData.mockResolvedValue(true);
    mockNetworkStatus = true;

    const { getAllByTestId } = await render(<ConfigurationScreen {...makeProps()} />);
    const syncBtns = getAllByTestId('sync-action-btn');
    const updateBtn = syncBtns[1];

    await act(async () => {
      fireEvent.press(updateBtn);
    });

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'error', message: expect.stringContaining('error') }),
      );
    });
  });
});

// =============================================================================
// 5. syncData() — sin red → toast; con red → DataStore.start()
// =============================================================================

describe('syncData', () => {
  it('shows "Necesita internet para ejecutar esta accion" toast when no network', async () => {
    mockNetworkStatus = false;
    mockSynchronizedData = false; // isDataStoreSyncPending=true → button enabled

    const { getAllByTestId } = await render(<ConfigurationScreen {...makeProps()} />);
    const syncBtns = getAllByTestId('sync-action-btn');
    const syncBtn = syncBtns[0]; // first SyncAction is "Sincronizar mediciones"

    await act(async () => {
      fireEvent.press(syncBtn);
    });

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Necesita internet para ejecutar esta accion',
          type: 'error',
        }),
      );
    });

    expect(mockDataStoreStart).not.toHaveBeenCalled();
  });

  it('calls DataStore.start() when network is available', async () => {
    mockNetworkStatus = true;
    mockSynchronizedData = false; // isDataStoreSyncPending=true

    const { getAllByTestId } = await render(<ConfigurationScreen {...makeProps()} />);
    const syncBtns = getAllByTestId('sync-action-btn');
    const syncBtn = syncBtns[0];

    await act(async () => {
      fireEvent.press(syncBtn);
    });

    await waitFor(() => {
      expect(mockDataStoreStart).toHaveBeenCalled();
    });
  });
});

// =============================================================================
// 6. Status chips reflect mocked states
// =============================================================================

describe('status chip colors/text based on system status', () => {
  it('shows "Permisos requeridos" when permissions not granted', async () => {
    mockGetSystemStatusResult = {
      canSchedule: false,
      permissionsGranted: false,
      exactAlarmAvailable: false,
      batteryOptimized: false,
      issues: [],
    };

    const { getByText } = await render(<ConfigurationScreen {...makeProps()} />);
    await waitFor(() => {
      expect(getByText('Permisos requeridos')).toBeTruthy();
    });
  });

  it('shows "Optimización de batería activa" when batteryOptimized=true', async () => {
    mockGetSystemStatusResult = {
      canSchedule: false,
      permissionsGranted: true,
      exactAlarmAvailable: true,
      batteryOptimized: true,
      issues: ['Optimización de batería habilitada'],
    };

    const { getByText } = await render(<ConfigurationScreen {...makeProps()} />);
    await waitFor(() => {
      expect(getByText('Optimización de batería activa')).toBeTruthy();
    });
  });

  it('shows "Funcionando correctamente" when canSchedule=true and all ok', async () => {
    mockGetSystemStatusResult = {
      canSchedule: true,
      permissionsGranted: true,
      exactAlarmAvailable: true,
      batteryOptimized: false,
      issues: [],
    };

    const { getByText } = await render(<ConfigurationScreen {...makeProps()} />);
    await waitFor(() => {
      expect(getByText('Funcionando correctamente')).toBeTruthy();
    });
  });
});

// =============================================================================
// 7. Collapsible status panel
// =============================================================================

describe('collapsible notification status panel', () => {
  it('panel is hidden by default', async () => {
    const { queryByTestId } = await render(<ConfigurationScreen {...makeProps()} />);
    await waitFor(() => {
      expect(queryByTestId('notification-status-panel')).toBeNull();
    });
  });

  it('panel appears when indicator is pressed', async () => {
    const { getByTestId } = await render(<ConfigurationScreen {...makeProps()} />);

    await act(async () => {
      fireEvent.press(getByTestId('notification-status-indicator'));
    });

    await waitFor(() => {
      expect(getByTestId('notification-status-panel')).toBeTruthy();
    });
  });

  it('shows "Solicitar Permisos" button when permissions not granted', async () => {
    mockGetSystemStatusResult = {
      canSchedule: false,
      permissionsGranted: false,
      exactAlarmAvailable: false,
      batteryOptimized: false,
      issues: ['Permisos de notificación no otorgados'],
    };

    const { getByTestId, getByText } = await render(<ConfigurationScreen {...makeProps()} />);

    await act(async () => {
      fireEvent.press(getByTestId('notification-status-indicator'));
    });

    await waitFor(() => {
      expect(getByText('Solicitar Permisos')).toBeTruthy();
    });
  });

  it('shows Permisos status text in panel', async () => {
    mockGetSystemStatusResult = {
      canSchedule: false,
      permissionsGranted: false,
      exactAlarmAvailable: false,
      batteryOptimized: false,
      issues: [],
    };

    const { getByTestId } = await render(<ConfigurationScreen {...makeProps()} />);

    await act(async () => {
      fireEvent.press(getByTestId('notification-status-indicator'));
    });

    await waitFor(() => {
      expect(getByTestId('status-permissions')).toBeTruthy();
      expect(getByTestId('status-scheduling')).toBeTruthy();
      expect(getByTestId('status-battery')).toBeTruthy();
    });
  });

  it('shows issues list when issues present', async () => {
    mockGetSystemStatusResult = {
      canSchedule: false,
      permissionsGranted: false,
      exactAlarmAvailable: false,
      batteryOptimized: false,
      issues: ['Permisos de notificación no otorgados'],
    };

    const { getByTestId, getByText } = await render(<ConfigurationScreen {...makeProps()} />);

    await act(async () => {
      fireEvent.press(getByTestId('notification-status-indicator'));
    });

    await waitFor(() => {
      expect(getByTestId('issues-list')).toBeTruthy();
      expect(getByText(/Permisos de notificación no otorgados/)).toBeTruthy();
    });
  });
});

// =============================================================================
// 8. Back navigation
// =============================================================================

describe('back navigation', () => {
  it('calls navigation.goBack() when back button is pressed', async () => {
    const { getByTestId } = await render(<ConfigurationScreen {...makeProps()} />);
    fireEvent.press(getByTestId('configuration-back-btn'));
    expect(mockGoBack).toHaveBeenCalled();
  });
});

// =============================================================================
// 9. Screen structural test
// =============================================================================

describe('screen structure', () => {
  it('renders header with "Configuración" title', async () => {
    const { getByText } = await render(<ConfigurationScreen {...makeProps()} />);
    expect(getByText('Configuración')).toBeTruthy();
  });

  it('header title "Configuración" is centered (fix: coverage-audit BAJA — was textAlign:"right")', async () => {
    // Original: ion-title in Ionic toolbar renders centered.
    // Bug: RN had textAlign:'right'. Fix: textAlign:'center'.
    const { getByText } = await render(<ConfigurationScreen {...makeProps()} />);
    const titleEl = getByText('Configuración');
    // The style prop should contain textAlign:'center'
    const flatStyle = titleEl.props.style as Array<Record<string, unknown>>;
    const merged = Object.assign({}, ...(Array.isArray(flatStyle) ? flatStyle : [flatStyle]));
    expect(merged['textAlign']).toBe('center');
  });

  it('renders "Activar notificaciones" label', async () => {
    const { getByText } = await render(<ConfigurationScreen {...makeProps()} />);
    expect(getByText('Activar notificaciones')).toBeTruthy();
  });

  it('renders notification description text', async () => {
    const { getByText } = await render(<ConfigurationScreen {...makeProps()} />);
    expect(
      getByText(/Al mantener las notificaciones activas/),
    ).toBeTruthy();
  });
});

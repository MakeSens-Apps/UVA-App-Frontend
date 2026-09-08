/**
 * B18 — ConfigurationScreen (full implementation)
 *
 * Ported from: src/app/pages/profile/configuration/configuration.page.ts + .html + .scss
 * Classification: Rewrite (UI layer)
 *
 * Preserved logic (exact text literals from original):
 *   - Toggle "Activar notificaciones" → LocalRemindersService.setEnableNotifications
 *   - Description text: "Al mantener las notificaciones activas..."
 *   - Status chip: "Permisos requeridos" / "Optimización de batería activa" / "Funcionando correctamente"
 *   - Collapsible status panel: "Estado del Sistema" with Permisos / Programación / Batería rows
 *   - Action buttons: "Solicitar Permisos" (when !permissionsGranted) / "Guía de Batería" (when batteryOptimized)
 *   - 2 SyncAction instances:
 *       #1: title="Sincronizar mediciones" / infoPendingText="Con sincronizaciones pendientes"
 *           noInfoPendingText="Sin sincronizaciones pendientes"
 *           buttonText="Sincronizacion con la nube" → syncData()
 *       #2: title="Actualizaciones" / infoPendingText="Con actualizaciones pendientes"
 *           noInfoPendingText="Sin actualizaciones pendientes"
 *           buttonText="Actualizar configuraciones" → updateConfiguration()
 *   - syncData(): con red → DataStore.start(); sin red → toast error
 *     "Necesita internet para ejecutar esta accion"
 *   - updateConfiguration(): descarga config + lunaciones + loadBranding (re-aplica branding)
 *
 * Changes from original:
 *   - ionViewWillEnter + ionViewWillLeave → useFocusEffect + AppState listener + cleanup
 *   - App.addListener('appStateChange') → AppState.addEventListener('change')
 *   - @capacitor/app → React Native AppState (no extra dep)
 *   - Router.navigate → navigation.goBack()
 *   - IonContent/IonCard/IonToggle → ScrollView + View + Switch
 *   - ToastController → showToast()
 *   - LoadingController → LoadingOverlay
 *   - ion-chip → View+Text styled chip
 *
 * Visual parity (docs/evidence/profile/screen-14/15/16/17/18):
 *   - Content background: #F5F5F5
 *   - profile-card gap 14, padding 20/10, border-radius 16
 *   - content-items: padding 10, border #E5E5E5, bg #F5F5F5, border-radius 8
 *   - toggle section: row justify-between, toggle color blue[600]
 *   - ion-item-w: border #fff, bg #fff
 *   - status chip colors mapped from UVA design system tokens
 *
 * Risks: R-13, R-48, R-25, R-19, R-22, R-44, R-05
 *
 * DEVIATIONS (for verificador):
 *   DEV-1: batteryOptimized native check requires a config plugin (native module).
 *          LocalRemindersService.isBatteryOptimized() returns false (conservative default).
 *          The chip will not show "Optimización de batería activa" on real device unless
 *          the native module is built. Document in B19 hardening.
 *   DEV-2: exactAlarmAvailable: LocalRemindersService.getSystemStatus() marks it as true
 *          (conservative — the actual OS dialog is surfaced by settings navigation).
 *          Full exact-alarm permission check via native module deferred to B19.
 *   DEV-3: AppState.addEventListener on RN uses 'change' event (value: 'active'|'background'|
 *          'inactive'). The original Capacitor App.addListener('appStateChange', {isActive})
 *          is equivalent. Cleanup uses subscription.remove() — same contract.
 */

import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Switch,
  TouchableOpacity,
  StyleSheet,
  AppState,
  AppStateStatus,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { DataStore } from '@aws-amplify/datastore';

import { useTheme } from '@/theme/ThemeProvider';
import { fontFamilyForWeight } from '@/theme/theme';

import { SyncAction } from '@/components/sync-action/SyncAction';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay';
import { showToast } from '@/components/ui/Toast';

import { useSyncContext } from '@/state/SyncContext';
import { useConfigContext } from '@/state/ConfigContext';

import { localRemindersService } from '@/native/notifications/LocalRemindersService';
import type { SystemStatus, NotificationState } from '@/native/notifications/LocalRemindersService';

import { MoonPhaseService } from '@/domain/moon/moon-phase';
import { Header } from '@/components/header';
import ChevronDownIcon from '@/assets/svg/icons/chevron-down.svg';

import type { AppStackParamList } from '@/navigation/types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ─── Props ─────────────────────────────────────────────────────────────────────

type Props = NativeStackScreenProps<AppStackParamList, 'Configuration'>;

// ─── Default state shapes (mirrors Ionic original) ────────────────────────────

const DEFAULT_SYSTEM_STATUS: SystemStatus = {
  canSchedule: false,
  permissionsGranted: false,
  exactAlarmAvailable: false,
  batteryOptimized: false,
  issues: [],
};

const DEFAULT_NOTIFICATION_STATE: NotificationState = {
  userEnabled: false,
  systemPermissionGranted: false,
  exactAlarmPermissionGranted: false,
  notificationsScheduled: false,
  lastScheduleAttempt: '',
  batteryOptimizationDisabled: false,
  notificationChannelCreated: false,
};

// ─── Component ─────────────────────────────────────────────────────────────────

/**
 * ConfigurationScreen
 *
 * Allows users to configure notification reminders and trigger manual data sync.
 *
 * Integrates:
 *   - LocalRemindersService (B17) for notification scheduling/cancellation
 *   - SyncContext (B06) for network status + DataStore.start()
 *   - ConfigContext (B06) for updateConfiguration (re-downloads + branding)
 *   - MoonPhaseService (B07) for downloadAndStoreMoonPhaseData()
 *   - SyncAction (B11) × 2 for the two sync cards
 */
export function ConfigurationScreen({ navigation }: Props): React.JSX.Element {
  const { theme } = useTheme();
  // Edge-to-edge (targetSdk 36 / RN 0.85): this screen is a full-screen stack route
  // with no tab bar underneath, so its scroll content ends flush with the window
  // bottom — i.e. UNDER the Android system navigation bar. Pad by the bottom inset.
  const insets = useSafeAreaInsets();
  const { networkStatus, synchronizedData } = useSyncContext();
  const { downLoadData, loadBranding } = useConfigContext();

  // ─── State ──────────────────────────────────────────────────────────────────

  const [isNotificationsActive, setIsNotificationsActive] = useState(false);
  const [isDataStoreSyncPending, setIsDataStoreSyncPending] = useState(false);
  const [isConfigurationAvailable, setIsConfigurationAvailable] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showNotificationDetails, setShowNotificationDetails] = useState(false);

  const [notificationSystemStatus, setNotificationSystemStatus] =
    useState<SystemStatus>(DEFAULT_SYSTEM_STATUS);
  const [notificationState, setNotificationState] =
    useState<NotificationState>(DEFAULT_NOTIFICATION_STATE);

  // ─── AppState listener ref ────────────────────────────────────────────────

  const appStateSubscription = useRef<ReturnType<typeof AppState.addEventListener> | null>(null);

  // ─── loadNotificationStatus ───────────────────────────────────────────────

  const loadNotificationStatus = useCallback(async (): Promise<void> => {
    try {
      const isEnabled = await localRemindersService.getEnableNotifications();
      setIsNotificationsActive(isEnabled);

      const systemStatus = await localRemindersService.getSystemStatus();
      setNotificationSystemStatus(systemStatus);

      const comprehensiveState =
        await localRemindersService.getComprehensiveNotificationState();
      setNotificationState(comprehensiveState);

      // Show Private Space guidance for Android 15+
      await localRemindersService.showPrivateSpaceGuidance();
    } catch (err) {
      console.error('Error al obtener el estado de notificaciones:', err);
      showToast({ message: 'Error al verificar estado de notificaciones', type: 'error' });
    }
  }, []);

  // ─── setupAppStateListener ────────────────────────────────────────────────

  const setupAppStateListener = useCallback((): void => {
    // Remove existing listener if any
    if (appStateSubscription.current) {
      appStateSubscription.current.remove();
      appStateSubscription.current = null;
    }

    appStateSubscription.current = AppState.addEventListener(
      'change',
      (nextState: AppStateStatus) => {
        if (nextState === 'active') {
          // App became active again → refresh notification status (R-25 / B17)
          setTimeout(() => {
            void loadNotificationStatus();
          }, 500);
        }
      },
    );
  }, [loadNotificationStatus]);

  // ─── useFocusEffect: replaces ionViewWillEnter + ionViewWillLeave ─────────

  useFocusEffect(
    useCallback(() => {
      // ionViewWillEnter equivalent
      setIsDataStoreSyncPending(!synchronizedData());
      setIsConfigurationAvailable(networkStatus);

      void loadNotificationStatus();
      setupAppStateListener();

      return () => {
        // ionViewWillLeave equivalent
        if (appStateSubscription.current) {
          appStateSubscription.current.remove();
          appStateSubscription.current = null;
        }
      };
    }, [synchronizedData, networkStatus, loadNotificationStatus, setupAppStateListener]),
  );

  // ─── activeNoti ───────────────────────────────────────────────────────────

  const activeNoti = useCallback(
    async (value: boolean): Promise<void> => {
      if (value) {
        // Check if system permissions are available before enabling
        const hasPermissions = await localRemindersService.requestPermissions();

        if (!hasPermissions) {
          // Revert toggle state if permissions denied
          setIsNotificationsActive(false);
          showToast({
            message:
              'Permisos de notificación requeridos. Ve a Configuración de la app para habilitarlos.',
            type: 'error',
            duration: 3000,
          });
          return;
        }
      }

      setIsNotificationsActive(value);

      try {
        await localRemindersService.setEnableNotifications(value);

        // Reload status after change
        await loadNotificationStatus();

        const message = value
          ? 'Notificaciones habilitadas correctamente'
          : 'Notificaciones deshabilitadas';

        // Original uses presentSuccessToast() for BOTH enabled and disabled states.
        // (configuration.page.ts:238: void this.presentSuccessToast(message))
        // Using 'success' for both mirrors that behavior.
        showToast({ message, type: 'success', duration: 2000 });
      } catch (err) {
        console.error('Error al cambiar notificaciones:', err);
        // Revert toggle state on error
        setIsNotificationsActive((prev) => !prev);
        showToast({
          message: 'Error al cambiar configuración de notificaciones',
          type: 'error',
          duration: 3000,
        });
      }
    },
    [loadNotificationStatus],
  );

  // ─── syncData (Sincronizar mediciones) ────────────────────────────────────

  const syncData = useCallback((): void => {
    if (networkStatus) {
      void DataStore.start();
    } else {
      showToast({
        message: 'Necesita internet para ejecutar esta accion',
        type: 'error',
        duration: 3000,
      });
    }
  }, [networkStatus]);

  // ─── updateConfiguration (Actualizaciones) ────────────────────────────────

  const updateConfiguration = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      const [downloadSuccess, downloadMoonPhases] = await Promise.all([
        downLoadData(),
        MoonPhaseService.downloadAndStoreMoonPhaseData(),
      ]);

      if (downloadSuccess && downloadMoonPhases) {
        await loadBranding();
      } else {
        showToast({
          message: 'Hubo un error al descargar los datos los datos.',
          type: 'error',
          duration: 3000,
        });
      }
    } catch {
      showToast({
        message: 'Hubo un error al descargar los datos.',
        type: 'error',
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  }, [downLoadData, loadBranding]);

  // ─── requestNotificationPermissions ──────────────────────────────────────

  const requestNotificationPermissions = useCallback(async (): Promise<void> => {
    try {
      const granted = await localRemindersService.requestPermissions();

      if (granted) {
        showToast({ message: 'Permisos de notificación otorgados', type: 'success' });
        await loadNotificationStatus();
      } else {
        showToast({
          message:
            'Permisos de notificación requeridos. Si no aparece el diálogo, ve a Configuración del sistema.',
          type: 'error',
          duration: 3000,
        });
        // Refresh status after delay in case settings were opened
        setTimeout(() => {
          void loadNotificationStatus();
        }, 2000);
      }
    } catch {
      showToast({ message: 'Error al solicitar permisos de notificación', type: 'error' });
    }
  }, [loadNotificationStatus]);

  // ─── showBatteryOptimizationGuidance ──────────────────────────────────────

  const showBatteryOptimizationGuidance = useCallback((): void => {
    // TODO(B19): open Android battery optimization settings via Linking
    showToast({
      message:
        'Ve a Configuración → Batería → Optimización de batería y excluye esta app.',
      type: 'info',
      duration: 5000,
    });
  }, []);

  // ─── Status chip helpers (mirrors original getNotificationStatusColor/Text) ─

  const getStatusChipColor = (): string => {
    if (!notificationSystemStatus.permissionsGranted) return theme.colors.danger;
    if (notificationSystemStatus.batteryOptimized) return theme.colors.orange[500];
    if (notificationSystemStatus.canSchedule) return theme.colors.green[500];
    return theme.colors.gray[500];
  };

  const getStatusChipBg = (): string => {
    if (!notificationSystemStatus.permissionsGranted) return '#fef2f2';
    if (notificationSystemStatus.batteryOptimized) return '#FDF9EF'; // --Colors-Orange-50
    if (notificationSystemStatus.canSchedule) return '#F2F9EC'; // --Colors-Green-50
    return theme.colors.gray[100];
  };

  const getNotificationStatusText = (): string => {
    if (!notificationSystemStatus.permissionsGranted) return 'Permisos requeridos';
    if (notificationSystemStatus.batteryOptimized) return 'Optimización de batería activa';
    if (notificationSystemStatus.canSchedule) return 'Funcionando correctamente';
    return 'Estado desconocido';
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.white }]} testID="configuration-screen">
      {/* Header — shared Header. Replaces a local toolbar that hard-coded
          paddingTop:44 and drew a "‹" chevron; configuration.page.html:6 uses
          `arrow-back-outline` like every other page (device D9), and back + title
          alone right-aligns the title (docs/evidence/profile/screen-14). */}
      <Header
        title="Configuración"
        hasBackButton
        hasProfileButton={false}
        onBackPress={() => navigation.goBack()}
      />

      <ScrollView
        style={[styles.content, { backgroundColor: theme.colors.white }]}
        contentContainerStyle={[
          styles.contentContainer,
          { paddingBottom: styles.contentContainer.paddingBottom + insets.bottom },
        ]}
        testID="configuration-scroll"
      >
        <View style={styles.profileCard}>
          {/* ── Notifications section ── */}
          <View
            style={[
              styles.contentItems,
              {
                backgroundColor: theme.colors.gray[100],
                borderColor: theme.colors.gray[200],
              },
            ]}
          >
            <View style={styles.menuList}>
              <View style={styles.divItems}>
                {/* Toggle row */}
                <View style={styles.itemsTitles}>
                  <Text
                    style={[
                      styles.labelStrong,
                      {
                        fontFamily: fontFamilyForWeight('600'),
                        color: theme.colors.gray[700],
                      },
                    ]}
                  >
                    Activar notificaciones
                  </Text>
                  <Switch
                    testID="notifications-toggle"
                    value={isNotificationsActive}
                    onValueChange={(value) => {
                      void activeNoti(value);
                    }}
                    thumbColor={theme.colors.white}
                    trackColor={{
                      false: theme.colors.gray[300],
                      true: theme.colors.blue[600],
                    }}
                    ios_backgroundColor={theme.colors.gray[300]}
                  />
                </View>

                {/* Description + status chip */}
                <View
                  style={[
                    styles.ionItemW,
                    {
                      borderColor: theme.colors.white,
                      backgroundColor: theme.colors.white,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.descriptionText,
                      {
                        fontFamily: fontFamilyForWeight('400'),
                        color: theme.colors.gray[700],
                      },
                    ]}
                  >
                    Al mantener las notificaciones activas, recibirás recordatorios diarios para
                    registrar tus mediciones ambientales.
                  </Text>

                  {/* Status indicator (chip + chevron) */}
                  <TouchableOpacity
                    style={styles.notificationStatusIndicator}
                    onPress={() => setShowNotificationDetails((p) => !p)}
                    testID="notification-status-indicator"
                  >
                    <View
                      style={[
                        styles.statusChip,
                        { backgroundColor: getStatusChipBg() },
                      ]}
                      testID="notification-status-chip"
                    >
                      <Text
                        style={[
                          styles.statusChipText,
                          {
                            fontFamily: fontFamilyForWeight('500'),
                            color: getStatusChipColor(),
                          },
                        ]}
                      >
                        {getNotificationStatusText()}
                      </Text>
                    </View>
                    <ChevronDownIcon
                      width={16}
                      height={16}
                      color={theme.colors.gray[500]}
                      style={showNotificationDetails ? styles.chevronUp : undefined}
                    />
                  </TouchableOpacity>

                  {/* Collapsible status panel */}
                  {showNotificationDetails && (
                    <View
                      style={[
                        styles.notificationStatusPanel,
                        { borderLeftColor: theme.colors.blue[500] },
                      ]}
                      testID="notification-status-panel"
                    >
                      <Text
                        style={[
                          styles.statusTitle,
                          {
                            fontFamily: fontFamilyForWeight('600'),
                            color: theme.colors.gray[700],
                          },
                        ]}
                      >
                        Estado del Sistema:
                      </Text>

                      {/* Permisos */}
                      <Text
                        style={[
                          styles.statusItem,
                          {
                            fontFamily: fontFamilyForWeight('400'),
                            color: notificationSystemStatus.permissionsGranted
                              ? theme.colors.green[500]
                              : theme.colors.danger,
                          },
                        ]}
                        testID="status-permissions"
                      >
                        {'• Permisos: '}
                        {notificationSystemStatus.permissionsGranted
                          ? 'Otorgados'
                          : 'No otorgados'}
                      </Text>

                      {/* Programación */}
                      <Text
                        style={[
                          styles.statusItem,
                          {
                            fontFamily: fontFamilyForWeight('400'),
                            color: notificationState.notificationsScheduled
                              ? theme.colors.green[500]
                              : theme.colors.orange[500],
                          },
                        ]}
                        testID="status-scheduling"
                      >
                        {'• Programación: '}
                        {notificationState.notificationsScheduled ? 'Activa' : 'No programadas'}
                      </Text>

                      {/* Batería */}
                      <Text
                        style={[
                          styles.statusItem,
                          {
                            fontFamily: fontFamilyForWeight('400'),
                            color: !notificationSystemStatus.batteryOptimized
                              ? theme.colors.green[500]
                              : theme.colors.orange[500],
                          },
                        ]}
                        testID="status-battery"
                      >
                        {'• Batería: '}
                        {!notificationSystemStatus.batteryOptimized
                          ? 'Optimizada'
                          : 'Puede interferir'}
                      </Text>

                      {/* Action buttons */}
                      {(!notificationSystemStatus.permissionsGranted ||
                        notificationSystemStatus.batteryOptimized) && (
                        <View style={styles.actionButtons}>
                          {!notificationSystemStatus.permissionsGranted && (
                            <TouchableOpacity
                              style={[
                                styles.actionBtn,
                                { backgroundColor: theme.colors.blue[500] },
                              ]}
                              onPress={() => {
                                void requestNotificationPermissions();
                              }}
                              testID="request-permissions-btn"
                            >
                              <Text
                                style={[
                                  styles.actionBtnText,
                                  {
                                    fontFamily: fontFamilyForWeight('500'),
                                    color: theme.colors.white,
                                  },
                                ]}
                              >
                                Solicitar Permisos
                              </Text>
                            </TouchableOpacity>
                          )}

                          {notificationSystemStatus.batteryOptimized && (
                            <TouchableOpacity
                              style={[
                                styles.actionBtnOutline,
                                { borderColor: theme.colors.orange[500] },
                              ]}
                              onPress={showBatteryOptimizationGuidance}
                              testID="battery-guidance-btn"
                            >
                              <Text
                                style={[
                                  styles.actionBtnText,
                                  {
                                    fontFamily: fontFamilyForWeight('500'),
                                    color: theme.colors.orange[500],
                                  },
                                ]}
                              >
                                Guía de Batería
                              </Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      )}

                      {/* Issues list */}
                      {notificationSystemStatus.issues.length > 0 && (
                        <View style={styles.issuesList} testID="issues-list">
                          <Text
                            style={[
                              styles.issuesTitle,
                              {
                                fontFamily: fontFamilyForWeight('400'),
                                color: theme.colors.gray[600],
                              },
                            ]}
                          >
                            Problemas detectados:
                          </Text>
                          {notificationSystemStatus.issues.map((issue, idx) => (
                            <Text
                              key={idx}
                              style={[
                                styles.issueItem,
                                {
                                  fontFamily: fontFamilyForWeight('400'),
                                  color: theme.colors.danger,
                                },
                              ]}
                            >
                              {'• '}
                              {issue}
                            </Text>
                          ))}
                        </View>
                      )}
                    </View>
                  )}
                </View>
              </View>
            </View>
          </View>

          {/* ── SyncAction #1: Sincronizar mediciones ── */}
          <SyncAction
            title="Sincronizar mediciones"
            infoPendingText="Con sincronizaciones pendientes"
            noInfoPendingText="Sin sincronizaciones pendientes"
            buttonText="Sincronizacion con la nube"
            isInfoPending={isDataStoreSyncPending}
            onClickSync={syncData}
          />

          {/* ── SyncAction #2: Actualizaciones ── */}
          <SyncAction
            title="Actualizaciones"
            infoPendingText="Con actualizaciones pendientes"
            noInfoPendingText="Sin actualizaciones pendientes"
            buttonText="Actualizar configuraciones"
            isInfoPending={isConfigurationAvailable}
            onClickSync={() => {
              void updateConfiguration();
            }}
          />
        </View>
      </ScrollView>

      {/* Loading overlay */}
      <LoadingOverlay visible={isLoading} message="Cargando..." />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  // Content (mirrors .profile-content)
  content: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  contentContainer: {
    paddingHorizontal: 10,
    paddingBottom: 24,
  },
  // profile-card (gap 14, padding 20/10)
  profileCard: {
    gap: 14,
    paddingTop: 20,
    paddingBottom: 10,
    paddingHorizontal: 10,
  },
  // content-items (border #F5F5F5, bg #F5F5F5, border-radius 8, padding 10)
  contentItems: {
    padding: 10,
    borderWidth: 1,
    borderRadius: 8,
  },
  // menu-list
  menuList: {
    gap: 16,
  },
  divItems: {
    width: '100%',
  },
  // items-titles (row, justify-between)
  itemsTitles: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 1,
    marginBottom: '5%',
  },
  labelStrong: {
    fontSize: 16,
  },
  // ion-item-w (bg white, border white)
  ionItemW: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 8,
  },
  descriptionText: {
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 8,
  },
  // notification-status-indicator (row, justify-between, elevation)
  notificationStatusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#FAFAFA',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  // Status chip
  // ion-chip: filled pill, no border (docs/evidence/profile/screen-14 — device D7)
  statusChip: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  statusChipText: {
    fontSize: 14,
  },
  chevronIcon: {
    marginLeft: 8,
  },
  chevronUp: {
    marginLeft: 8,
    transform: [{ scaleY: -1 }],
  },
  // Collapsible status panel (border-left 4px blue)
  notificationStatusPanel: {
    backgroundColor: '#FAFAFA',
    borderRadius: 8,
    borderLeftWidth: 4,
    padding: 12,
    marginTop: 12,
  },
  statusTitle: {
    fontSize: 14,
    marginBottom: 8,
  },
  statusItem: {
    fontSize: 14,
    marginBottom: 6,
  },
  // Action buttons
  actionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  actionBtn: {
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  actionBtnOutline: {
    borderRadius: 6,
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  actionBtnText: {
    fontSize: 12,
  },
  // Issues list
  issuesList: {
    marginTop: 8,
  },
  issuesTitle: {
    fontSize: 12,
    marginBottom: 4,
  },
  issueItem: {
    marginLeft: 8,
    fontSize: 12,
  },
});

export default ConfigurationScreen;

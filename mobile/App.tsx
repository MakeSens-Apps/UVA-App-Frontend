/**
 * UVA App — React Native (Expo)
 * Entry point — B03: Amplify + DataStore + NetInfo bootstrap
 *               B06: SyncContext + SessionContext + ConfigContext
 *               B12: RootNavigator condicional + NotificationContext
 *
 * Import ORDER is critical (portability matrix §3.2, R-04):
 *  1. react-native-get-random-values  — must be FIRST (UUIDs for DataStore models)
 *  2. react-native-url-polyfill/auto  — URL API used by Amplify internally
 *  3. Amplify.configure(amplifyconfiguration) — before any generateClient/DataStore call
 *  4. DataStore.configure({ syncExpressions }) — selective sync identical to original
 *  5. subscribeToSync() — Hub listener for networkStatus + sync state
 *  6. initAppUsage() — initializes AppUsage session tracking
 *
 * References:
 *  - src/main.ts (Amplify.configure)
 *  - src/app/app.component.ts (DataStore.configure + subscribeToSync)
 *  - portability-matrix.md §3.2 "Amplify bootstrap" → Major
 *  - R-04: NetInfo required for Hub networkStatus emission
 */

/* eslint-disable import/first */

// ─── Step 1 & 2: Polyfills (MUST be before everything else) ─────────────────
import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';

// ─── Step 3 & 4: Amplify + DataStore configure ───────────────────────────────
import { bootstrapAmplify } from '@/data/amplify-bootstrap/amplify-config';
bootstrapAmplify();

// ─── Step 5: Hub subscription ────────────────────────────────────────────────
import { subscribeToSync } from '@/data/amplify-bootstrap/sync-monitor';
subscribeToSync();

// ─── Step 6: AppUsage session tracking ───────────────────────────────────────
import { initAppUsage } from '@/data/view/app-usage';
initAppUsage();

/* eslint-enable import/first */

// ─── React / RN ──────────────────────────────────────────────────────────────
// eslint-disable-next-line import/first
import React from 'react';
// eslint-disable-next-line import/first
import { LogBox } from 'react-native';

// Suppress all warnings in DEV to prevent the Expo Dev Client warning banner
// from intercepting touches during gate testing.
if (__DEV__) {
  LogBox.ignoreAllLogs(true);
}
// eslint-disable-next-line import/first
import { StatusBar } from 'expo-status-bar';
// eslint-disable-next-line import/first
import { GestureHandlerRootView } from 'react-native-gesture-handler';
// eslint-disable-next-line import/first
import { SafeAreaProvider } from 'react-native-safe-area-context';
// eslint-disable-next-line import/first
import Toast from 'react-native-toast-message';

// ─── B06 Context providers ───────────────────────────────────────────────────
// eslint-disable-next-line import/first
import { SyncProvider } from '@/state/SyncContext';
// eslint-disable-next-line import/first
import { SessionProvider } from '@/state/SessionContext';
// eslint-disable-next-line import/first
import { ConfigProvider } from '@/state/ConfigContext';

// ─── B08 ThemeProvider ───────────────────────────────────────────────────────
// eslint-disable-next-line import/first
import { ThemeProvider } from '@/theme/ThemeProvider';

// ─── B12 NotificationContext + RootNavigator ─────────────────────────────────
// eslint-disable-next-line import/first
import { NotificationProvider } from '@/state/notification/NotificationContext';
// eslint-disable-next-line import/first
import { RootNavigator } from '@/navigation/RootNavigator';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <SyncProvider>
          <SessionProvider>
            <ConfigProvider>
              <ThemeProvider>
                <NotificationProvider>
                  <RootNavigator />
                  <Toast />
                  <StatusBar style="auto" />
                </NotificationProvider>
              </ThemeProvider>
            </ConfigProvider>
          </SessionProvider>
        </SyncProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

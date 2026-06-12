/**
 * UVA App — React Native (Expo)
 * Entry point — B03: Amplify + DataStore + NetInfo bootstrap
 *               B06: SyncContext + SessionContext + ConfigContext
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
import { StatusBar } from 'expo-status-bar';
// eslint-disable-next-line import/first
import { StyleSheet, Text, View } from 'react-native';

// ─── B06 Context providers ───────────────────────────────────────────────────
// eslint-disable-next-line import/first
import { SyncProvider, useSyncContext } from '@/state/SyncContext';
// eslint-disable-next-line import/first
import { SessionProvider } from '@/state/SessionContext';
// eslint-disable-next-line import/first
import { ConfigProvider } from '@/state/ConfigContext';

// ─── B08 ThemeProvider ───────────────────────────────────────────────────────
// eslint-disable-next-line import/first
import { ThemeProvider } from '@/theme/ThemeProvider';

// ─── Demo component: shows networkStatus from SyncContext (B06 gate) ──────────

function NetworkStatusBadge() {
  const { networkStatus, state } = useSyncContext();
  return (
    <Text style={styles.badge}>
      {networkStatus ? '🟢 Online' : '🔴 Offline'} · {state}
    </Text>
  );
}

export default function App() {
  return (
    <SyncProvider>
      <SessionProvider>
        <ConfigProvider>
          <ThemeProvider>
            <View style={styles.container}>
              <Text style={styles.title}>UVA App</Text>
              <Text style={styles.subtitle}>React Native — B06 Contexts</Text>
              <NetworkStatusBadge />
              <StatusBar style="auto" />
            </View>
          </ThemeProvider>
        </ConfigProvider>
      </SessionProvider>
    </SyncProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E6F4FE',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a4a7a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#4a7aaa',
  },
  badge: {
    fontSize: 14,
    color: '#2a5a8a',
    backgroundColor: '#C8E8FC',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
});

/**
 * B11 — SyncActionComponent
 *
 * Ported from: src/app/pages/profile/configuration/sync-action/sync-action.component.ts + .html
 * Classification: Minor adaptation (S effort)
 *
 * Preserved contracts:
 *   - isInfoPending: shows warning when true, checkmark when false
 *   - infoPendingText: text shown when pending
 *   - noInfoPendingText: text shown when not pending
 *   - title: section title
 *   - buttonText: sync button text
 *   - Button disabled when !isInfoPending
 *   - onClick → onClickSync callback
 *
 * Changes from original:
 *   - Angular @Component / IonButton / IonIcon → React functional component
 *   - ion-icon → SVG components
 *
 * Integration note (B18):
 *   ConfigurationPage will call onClickSync → syncData() from SyncContext.
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { fontFamilyForWeight } from '@/theme/theme';

// ─── Icon imports ──────────────────────────────────────────────────────────────

import CheckmarkCircleIcon from '@/assets/svg/icons/checkmark-circle.svg';
import ExclamationIcon from '@/assets/svg/icons/exclamation.svg';
import CloudIcon from '@/assets/svg/icons/cloud.svg';
import RefreshIcon from '@/assets/svg/icons/refresh.svg';

// ─── Props ─────────────────────────────────────────────────────────────────────

export interface SyncActionProps {
  /** Whether there is pending information to sync */
  isInfoPending?: boolean;
  /** Text shown when there is pending info */
  infoPendingText?: string;
  /** Text shown when there is no pending info */
  noInfoPendingText?: string;
  /** Section title */
  title?: string;
  /** Sync button label */
  buttonText?: string;
  /** Called when the sync button is pressed */
  onClickSync?: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * SyncAction
 *
 * Displays sync status and a sync button.
 * Button is disabled when no pending data.
 *
 * @example
 *   <SyncAction
 *     isInfoPending={hasPendingData}
 *     infoPendingText="Hay mediciones sin sincronizar"
 *     noInfoPendingText="Todo sincronizado"
 *     title="Sincronización de datos"
 *     buttonText="Sincronizar ahora"
 *     onClickSync={handleSync}
 *   />
 */
export function SyncAction({
  isInfoPending = false,
  infoPendingText = '',
  noInfoPendingText = '',
  title = '',
  buttonText = '',
  onClickSync,
}: SyncActionProps): React.JSX.Element {
  const { theme } = useTheme();

  return (
    <View style={styles.container} testID="sync-action">
      {/* Title */}
      <Text
        style={[
          styles.title,
          {
            fontFamily: fontFamilyForWeight('700'),
            color: theme.semanticColors.text,
          },
        ]}
      >
        {title}
      </Text>

      {/* Status text */}
      {!isInfoPending ? (
        <View style={styles.statusRow} testID="sync-action-no-pending">
          <CheckmarkCircleIcon
            width={18}
            height={18}
            color={theme.colors.green[500]}
          />
          <Text
            style={[
              styles.statusText,
              {
                fontFamily: fontFamilyForWeight('400'),
                color: theme.semanticColors.textSecondary,
                fontStyle: 'italic',
              },
            ]}
          >
            {noInfoPendingText}
          </Text>
        </View>
      ) : (
        <View style={styles.statusRow} testID="sync-action-pending">
          <ExclamationIcon
            width={18}
            height={18}
            color={theme.colors.orange[500]}
          />
          <Text
            style={[
              styles.statusText,
              {
                fontFamily: fontFamilyForWeight('400'),
                color: theme.colors.orange[500],
                fontStyle: 'italic',
              },
            ]}
          >
            {infoPendingText}
          </Text>
        </View>
      )}

      {/* Spacer */}
      <View style={styles.spacer} />

      {/* Sync button */}
      <TouchableOpacity
        style={[
          styles.button,
          {
            backgroundColor: isInfoPending
              ? theme.colors.blue[600]
              : theme.colors.gray[200],
          },
        ]}
        onPress={onClickSync}
        disabled={!isInfoPending}
        testID="sync-action-btn"
      >
        <CloudIcon
          width={18}
          height={18}
          color={isInfoPending ? theme.colors.white : theme.colors.gray[400]}
        />
        <Text
          style={[
            styles.buttonText,
            {
              fontFamily: fontFamilyForWeight('600'),
              color: isInfoPending ? theme.colors.white : theme.colors.gray[400],
            },
          ]}
        >
          {buttonText}
        </Text>
        <RefreshIcon
          width={18}
          height={18}
          color={isInfoPending ? theme.colors.white : theme.colors.gray[400]}
        />
      </TouchableOpacity>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 8,
  },
  title: {
    fontSize: 16,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusText: {
    fontSize: 14,
    flex: 1,
  },
  spacer: {
    height: 8,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
  },
  buttonText: {
    fontSize: 14,
  },
});

export default SyncAction;

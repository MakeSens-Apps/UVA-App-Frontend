/**
 * B16 — AlertsScreen (real implementation)
 *
 * Ported from: src/app/pages/profile/alerts/alerts.page.ts + .html + .scss
 * Classification: Rewrite (UI layer)
 *
 * Preserved logic (portability-matrix §4.4):
 *   - ionViewWillEnter → useFocusEffect: carga notifications
 *   - markAsRead: GamificationService.markNotificationAsRead + notification.data.isUnread=false
 *     + updateUnreadCount (decrementa el badge)
 *   - deleteAllNotifications: GamificationService.deleteAllNotifications + limpiar array
 *   - getNotificationIcon / getNotificationIconBg: switch sobre type + subtype
 *   - FlatList + empty state (campana tachada + "No hay notificaciones")
 *   - Botón flotante de papelera roja (FAB) cuando hay notificaciones
 *   - Header con botón settings (navega a Configuration)
 *
 * Changes from original:
 *   - ionViewWillEnter → useFocusEffect
 *   - *ngFor → FlatList
 *   - ng-template #noNotifications → renderListEmpty
 *   - ion-icon → Ionicons equivalents vía Text (unicode) o SVG
 *   - position: fixed → position: 'absolute' (RN)
 *
 * Visual parity (docs/evidence/profile/README.md screen-13 y gamification-alerts/):
 *   - Fondo blanco (#FFFFFF)
 *   - notification-item: white card, radius 12, padding 16, shadow ligero, border
 *   - unread-dot: 8×8, radius 4, azul #3880ff
 *   - notification-icon: 48×48, radius 24 (circle), colores según tipo
 *   - Texto: title (16/600), description (14/400), timestamp (12/400)
 *   - Delete FAB: círculo blanco 56×56, sombra, ícono papelera roja
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Pressable,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AppStackParamList } from '@/navigation/types';

import { Header } from '@/components/header';

import { useNotificationContext } from '@/state/notification/NotificationContext';
import { GamificationService } from '@/domain/gamification/gamification';
import type { GamificationNotification } from '@/domain/gamification/gamification-alerts-types';

import { Ionicons } from '@expo/vector-icons';
import { fontFamilyForWeight } from '@/theme/theme';

import SettingsOutlineIcon from '@/assets/svg/icons/settings-outline.svg';

// ─── Props ─────────────────────────────────────────────────────────────────────

type Props = NativeStackScreenProps<AppStackParamList, 'Alerts'>;

// ─── Icon helpers (portado de getNotificationIcon/Bg) ─────────────────────────

/**
 * Returns the Ionicons icon name for the notification type.
 * Mirrors the original alerts.page.ts getNotificationIcon() switch exactly.
 */
function getNotificationIcon(
  notification: GamificationNotification,
): React.ComponentProps<typeof Ionicons>['name'] {
  switch (notification.type) {
    case 'seeds':
      return 'sparkles';
    case 'streak':
      if (notification.subtype === 'streak_recovered') return 'checkmark-circle';
      if (notification.subtype === 'streak_recovery') return 'warning';
      if (notification.subtype === 'streak_lost') return 'close-circle';
      return 'flame';
    case 'achievement':
      return 'trophy';
    case 'bonus':
      return 'flash';
    default:
      return 'notifications-outline';
  }
}

/**
 * Returns the background color for the icon circle.
 * Preserves the original getNotificationIconBg switch exactly.
 */
function getNotificationIconBg(notification: GamificationNotification): string {
  switch (notification.type) {
    case 'seeds':
      return '#e58b2433'; // icon-bg-accent
    case 'streak':
      if (notification.subtype === 'streak_recovered') return '#10bcca33'; // icon-bg-primary
      if (notification.subtype === 'streak_recovery') return '#10bcca33';  // icon-bg-yellow
      if (notification.subtype === 'streak_lost') return '#f5f5f5e6';      // icon-bg-muted
      return '#e58b2433'; // icon-bg-orange
    case 'achievement':
      return '#10bcca33'; // icon-bg-primary
    case 'bonus':
      return '#10bcca33'; // icon-bg-yellow
    default:
      return '#f5f5f5e6'; // icon-bg-muted
  }
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function AlertsScreen({ navigation }: Props): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const { updateUnreadCount } = useNotificationContext();

  const [notifications, setNotifications] = React.useState<GamificationNotification[]>([]);

  // ─── Focus: load notifications ────────────────────────────────────────────

  useFocusEffect(
    useCallback(() => {
      void (async () => {
        try {
          const loaded = await GamificationService.getNotifications();
          setNotifications(loaded);
          const unread = loaded.filter((n) => n.data.isUnread).length;
          updateUnreadCount(unread);
        } catch (err) {
          console.error('AlertsScreen load error:', err);
        }
      })();
    }, [updateUnreadCount]),
  );

  // ─── updateUnreadCount helper ──────────────────────────────────────────────

  const syncUnreadCount = useCallback(
    (list: GamificationNotification[]) => {
      const unread = list.filter((n) => n.data.isUnread).length;
      updateUnreadCount(unread);
    },
    [updateUnreadCount],
  );

  // ─── markAsRead ────────────────────────────────────────────────────────────

  const markAsRead = useCallback(
    async (notification: GamificationNotification) => {
      try {
        await GamificationService.markNotificationAsRead(notification.id);
        // Mutate local copy — preserves original pattern
        const updated = notifications.map((n) =>
          n.id === notification.id
            ? { ...n, data: { ...n.data, isUnread: false } }
            : n,
        );
        setNotifications(updated);
        syncUnreadCount(updated);
      } catch (err) {
        console.error('markAsRead error:', err);
      }
    },
    [notifications, syncUnreadCount],
  );

  // ─── deleteAllNotifications ───────────────────────────────────────────────

  const deleteAll = useCallback(async () => {
    try {
      await GamificationService.deleteAllNotifications();
      setNotifications([]);
      updateUnreadCount(0);
    } catch (err) {
      console.error('deleteAll error:', err);
    }
  }, [updateUnreadCount]);

  // ─── Empty state ──────────────────────────────────────────────────────────

  const renderEmpty = () => (
    <View style={styles.emptyContainer} testID="no-notifications">
      {/* Original: ion-icon name="notifications-off-outline" */}
      <View style={styles.emptyIconCircle}>
        <Ionicons name="notifications-off-outline" size={40} color="#737373" />
      </View>
      <Text
        style={[
          styles.emptyTitle,
          { fontFamily: fontFamilyForWeight('600') },
        ]}
      >
        No hay notificaciones
      </Text>
      <Text
        style={[
          styles.emptySubtitle,
          { fontFamily: fontFamilyForWeight('400') },
        ]}
      >
        Cuando completes tareas y ganes logros, aparecerán aquí
      </Text>
    </View>
  );

  // ─── Notification item ────────────────────────────────────────────────────

  const renderItem = ({ item }: { item: GamificationNotification }) => {
    const iconBg = getNotificationIconBg(item);
    const iconName = getNotificationIcon(item);
    // Icon color mirrors the original SCSS: each icon-bg class defines a paired color
    const iconColor = (() => {
      switch (item.type) {
        case 'seeds': return '#c9680e';        // icon-bg-accent / uva_orange-500-shade
        case 'streak':
          // Fix: alerts.page.scss maps subtypes to different SCSS classes with different colors.
          // streak_recovered → icon-bg-primary → color: var(--ion-color-uva_green-700) = #14788A
          // streak_recovery  → icon-bg-yellow  → color: var(--Colors-Blue-900) = #164551
          // streak_lost      → icon-bg-muted   → color: var(--Colors-Gray-700) = #737373
          if (item.subtype === 'streak_recovered') return '#14788A'; // uva_green-700
          if (item.subtype === 'streak_recovery') return '#164551';  // Colors-Blue-900
          if (item.subtype === 'streak_lost') return '#737373';      // Colors-Gray-700
          return '#14788A';                    // default streak → uva_green-700
        case 'achievement': return '#14788A';  // icon-bg-primary / uva_green-700
        case 'bonus': return '#164551';        // icon-bg-yellow / Colors-Blue-900
        default: return '#737373';             // icon-bg-muted / Colors-Gray-700
      }
    })();

    return (
      <Pressable
        style={styles.notificationItem}
        onPress={() => void markAsRead(item)}
        testID={`notification-item-${item.id}`}
      >
        {/* Unread indicator dot — alerts.page.html:31 wraps it in *ngIf, so the whole
            12 px slot disappears once read and the content shifts left (device D-20). */}
        {item.data.isUnread && (
          <View style={styles.unreadIndicator}>
            <View style={styles.unreadDot} testID="unread-dot" />
          </View>
        )}

        {/* Icon circle — Ionicons SVG (matches original ion-icon) */}
        <View style={[styles.notifIconCircle, { backgroundColor: iconBg }]}>
          <Ionicons name={iconName} size={20} color={iconColor} />
        </View>

        {/* Content */}
        <View style={styles.notifContent}>
          <Text
            style={[
              styles.notifTitle,
              { fontFamily: fontFamilyForWeight('600') },
            ]}
            numberOfLines={2}
          >
            {item.data.title}
          </Text>
          <Text
            style={[
              styles.notifDescription,
              { fontFamily: fontFamilyForWeight('400') },
            ]}
            numberOfLines={3}
          >
            {item.data.description}
          </Text>
          <Text
            style={[
              styles.notifTimestamp,
              { fontFamily: fontFamilyForWeight('400') },
            ]}
          >
            {item.timestamp}
          </Text>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={styles.root}>
      {/* Header — shared Header (status-bar inset + arrow-back-outline, device D-02). */}
      <Header
        title="Notificaciones"
        hasBackButton
        hasProfileButton={false}
        onBackPress={() => navigation.goBack()}
        rightAction={
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => navigation.navigate('Configuration')}
            testID="alerts-settings-btn"
          >
            <SettingsOutlineIcon width={24} height={24} color="#FFFFFF" />
          </TouchableOpacity>
        }
      />

      {/* Notifications list */}
      <View style={styles.listWrapper}>
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: styles.listContent.paddingBottom + insets.bottom },
            notifications.length === 0 && styles.listContentEmpty,
          ]}
          showsVerticalScrollIndicator={false}
          testID="notifications-list"
        />

        {/* Delete All FAB — visible solo cuando hay notificaciones */}
        {notifications.length > 0 && (
          <View
            style={[
              styles.deleteAllContainer,
              { bottom: styles.deleteAllContainer.bottom + insets.bottom },
            ]}
          >
            <TouchableOpacity
              style={styles.deleteAllButton}
              onPress={() => void deleteAll()}
              testID="delete-all-btn"
            >
              {/* ion-icon name='trash-outline' color=#dc3545 (divergence 4) */}
              <Ionicons name="trash-outline" size={24} color="#dc3545" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerBtn: { padding: 4, minWidth: 36, alignItems: 'center' },
  listWrapper: { flex: 1, backgroundColor: '#FFFFFF' },
  listContent: {
    padding: 8,
    paddingHorizontal: 16,
    paddingBottom: 96, // space for FAB
    gap: 8,
  },
  listContentEmpty: {
    flex: 1,
  },
  // Notification item
  notificationItem: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'flex-start',
    gap: 16,
    // shadow
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  // Unread indicator
  unreadIndicator: {
    width: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    flexShrink: 0,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3880ff', // var(--ion-color-primary)
  },
  // Icon circle
  notifIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  // notifIconText removed — replaced by Ionicons component
  // Notification content
  notifContent: { flex: 1, minWidth: 0 },
  notifTitle: {
    fontSize: 16,
    color: '#171717',
    marginBottom: 4,
    lineHeight: 22,
  },
  notifDescription: {
    fontSize: 14,
    color: '#525252',
    marginBottom: 8,
    lineHeight: 21,
  },
  notifTimestamp: {
    fontSize: 12,
    color: '#737373',
  },
  // Empty state
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 64,
    paddingBottom: 128,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  // emptyIconText removed — replaced by Ionicons component
  emptyTitle: {
    fontSize: 18,
    color: '#000000',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: 'rgba(0,0,0,0.6)',
    textAlign: 'center',
    lineHeight: 21,
  },
  // Delete All FAB
  deleteAllContainer: {
    position: 'absolute',
    bottom: 32,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1000,
  },
  deleteAllButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  deleteAllIcon: { fontSize: 24 },
});

export default AlertsScreen;

/**
 * B16 — ProfileScreen (real implementation)
 *
 * Ported from: src/app/pages/profile/profile.page.ts + .html + .scss
 * Classification: Rewrite (UI layer)
 *
 * Preserved logic:
 *   - shareOptions[] con WhatsApp (wa.me), Notion, Facebook, Copiar enlace (expo-clipboard + Toast),
 *     Más (expo-sharing) — idéntico al original
 *   - unreadCount reactivo vía NotificationContext (useFocusEffect)
 *   - logout COMPLETO: SetupService.signOut + clearSession + DataStore.clear + navigation.reset()
 *   - seed desde UserProgressDSService.getLastUserProgressPure()
 *   - name desde UserDSService.getUser()
 *   - logo Fundación Natura (logo_Natura_Isagen.png)
 *
 * Changes from original:
 *   - ionViewWillEnter → useFocusEffect
 *   - ion-modal bottom sheet → UvaBottomSheet
 *   - Router.navigate → navigation
 *   - IonContent → ScrollView
 *   - Clipboard.write + alert → expo-clipboard + showToast
 *   - Share.share → expo-sharing
 *   - window.open → Linking.openURL
 *
 * Visual parity (docs/evidence/profile/README.md):
 *   - Fondo #F5F5F5
 *   - profile-card: border-radius 16, border #E5E5E5, white bg
 *   - avatar 95×95 circular
 *   - status chips: bg rgba(141,228,255,0.50), border-radius 10
 *   - menu items: height 48, border-radius 10, border #E5E5E5, bg #F5F5F5
 *   - logout button: outline, color #10BCCA, width 50%
 *
 * Risks addressed: R-29, R-37, R-44
 */

import React, { useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  Linking,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { DataStore } from '@aws-amplify/datastore';
import * as Clipboard from 'expo-clipboard';
import * as Sharing from 'expo-sharing';

import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AppTabsParamList, AppStackParamList } from '@/navigation/types';

import { UvaBottomSheet } from '@/components/ui/BottomSheet';
import type { BottomSheetRef } from '@/components/ui/BottomSheet';
import { showToast } from '@/components/ui/Toast';
import { useNotificationContext } from '@/state/notification/NotificationContext';
import { useSessionContext } from '@/state/SessionContext';

import { UserDSService } from '@/data/datastore/user-ds';
import { UserProgressDSService } from '@/data/datastore/user-progress-ds';
import { GamificationService } from '@/domain/gamification/gamification';
import { SetupService } from '@/domain/setup/setup';

import { useTheme } from '@/theme/ThemeProvider';
import { fontFamilyForWeight } from '@/theme/theme';

// ─── Icons ─────────────────────────────────────────────────────────────────────

import SemillaIcon from '@/assets/svg/icons/semilla.svg';

// ─── Props ─────────────────────────────────────────────────────────────────────

type Props = CompositeScreenProps<
  BottomTabScreenProps<AppTabsParamList, 'Profile'>,
  NativeStackScreenProps<AppStackParamList>
>;

// ─── App link (original) ───────────────────────────────────────────────────────

const APP_LINK =
  'https://play.google.com/store/apps/details?id=com.makesens.uva&hl=es_CO';

// ─── Component ─────────────────────────────────────────────────────────────────

export function ProfileScreen({ navigation }: Props): React.JSX.Element {
  const { theme } = useTheme();
  const { unreadCount, updateUnreadCount } = useNotificationContext();
  const { clearSession } = useSessionContext();

  const [name, setName] = React.useState<string | undefined>(undefined);
  const [seed, setSeed] = React.useState<number | null | undefined>(undefined);
  const [isLoading, setIsLoading] = React.useState(false);

  const shareSheetRef = useRef<BottomSheetRef>(null);

  // ─── Focus: load user data + unread count ─────────────────────────────────

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      void (async () => {
        try {
          const [user, userProgress, notifications] = await Promise.all([
            UserDSService.getUser(),
            UserProgressDSService.getLastUserProgressPure(),
            GamificationService.getNotifications(),
          ]);
          if (!isMounted) return;
          setName(user?.Name);
          setSeed(userProgress?.Seed ?? 0);
          const unread = notifications.filter((n) => n.data.isUnread).length;
          updateUnreadCount(unread);
        } catch (err) {
          console.error('ProfileScreen load error:', err);
        }
      })();
      return () => {
        isMounted = false;
      };
    }, [updateUnreadCount]),
  );

  // ─── Share actions (original shareOptions[]) ──────────────────────────────

  const shareOnWhatsApp = useCallback(() => {
    const url = `https://wa.me/?text=${encodeURIComponent(
      'Hola, conoce la aplicación Uva-App para registrar tus datos del clima! ' + APP_LINK,
    )}`;
    void Linking.openURL(url);
  }, []);

  const goUrlShare = useCallback((url: string) => {
    void Linking.openURL(url);
  }, []);

  const copyLink = useCallback(async () => {
    await Clipboard.setStringAsync(APP_LINK);
    showToast({ message: 'Enlace copiado al portapapeles', type: 'success' });
  }, []);

  const shareApp = useCallback(async () => {
    const available = await Sharing.isAvailableAsync();
    if (available) {
      // expo-sharing shares a local file; for a URL we use Linking share intent
      await Sharing.shareAsync(APP_LINK, {
        dialogTitle: 'Compartir Uva-App',
      });
    } else {
      void Linking.openURL(APP_LINK);
    }
  }, []);

  // ─── Logout ───────────────────────────────────────────────────────────────

  const handleLogout = useCallback(async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      const ok = await SetupService.signOut();
      if (ok) {
        await clearSession();
        await DataStore.clear();
        navigation.reset({
          index: 0,
          routes: [{ name: 'Auth' as never }],
        });
      }
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [clearSession, navigation, isLoading]);

  // ─── Notification bell icon ────────────────────────────────────────────────

  const hasUnread = unreadCount > 0;

  // ─── Share options (original shareOptions[]) ──────────────────────────────

  const shareOptions = [
    {
      label: 'WhatsApp',
      icon: require('@/assets/svg/icons/whatapp.svg'),
      action: shareOnWhatsApp,
    },
    {
      label: 'Notion',
      icon: require('@/assets/svg/icons/notion.svg'),
      action: () => goUrlShare('https://notion.so'),
    },
    {
      label: 'Facebook',
      icon: require('@/assets/svg/icons/face.svg'),
      action: () => goUrlShare('https://facebook.com'),
    },
    {
      label: 'Copiar enlace',
      icon: require('@/assets/svg/icons/content_copy.svg'),
      action: () => void copyLink(),
    },
    {
      label: 'Más',
      icon: require('@/assets/svg/icons/more_horiz.svg'),
      action: () => void shareApp(),
    },
  ];

  // ─── Menu items (original ion-list) ───────────────────────────────────────

  const menuItems = [
    {
      label: 'Información personal',
      icon: require('@/assets/png/profile/Arrow-forward.png'),
      onPress: () => navigation.navigate('PersonalInfo'),
    },
    {
      label: 'Tus logros',
      icon: require('@/assets/png/profile/Medal.png'),
      onPress: () => navigation.navigate('Achievement'),
    },
    {
      label: 'Configuración',
      icon: require('@/assets/png/profile/Options.png'),
      onPress: () => navigation.navigate('Configuration'),
    },
    {
      label: 'Comparte la aplicación',
      icon: require('@/assets/png/profile/Share-social.png'),
      onPress: () => shareSheetRef.current?.present(),
    },
    {
      label: 'Soporte documental',
      icon: require('@/assets/png/profile/Open.png'),
      onPress: () => void Linking.openURL('https://docs.makesens.co/ayuda-uva'),
    },
  ];

  return (
    <View style={styles.root}>
      {/* Header — toolbar azul teal */}
      <View
        style={[
          styles.headerBar,
          { backgroundColor: theme.colors.blue[500] },
        ]}
      >
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => navigation.goBack()}
          testID="profile-back-btn"
        >
          <Text style={styles.headerBtnText}>{'<'}</Text>
        </TouchableOpacity>
        <Text
          style={[
            styles.headerTitle,
            { fontFamily: fontFamilyForWeight('600') },
          ]}
        >
          Perfil
        </Text>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => navigation.navigate('Alerts')}
          testID="profile-notifications-btn"
        >
          <Text style={styles.headerBtnText}>
            {hasUnread ? '🔔' : '🔕'}
          </Text>
          {hasUnread && (
            <View
              style={styles.badge}
              testID="notification-badge"
            />
          )}
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView
        style={[styles.scrollContent, { backgroundColor: theme.colors.gray[100] }]}
        contentContainerStyle={styles.scrollInner}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile card — white rounded card */}
        <View style={styles.profileCard}>
          {/* Avatar + name + chips */}
          <View style={styles.profileHeader}>
            <Image
              source={require('@/assets/png/user-circle.png')}
              style={styles.avatar}
              testID="profile-avatar"
            />
            <Text
              style={[
                styles.userName,
                { fontFamily: fontFamilyForWeight('500') },
              ]}
              testID="profile-name"
            >
              {name ?? ''}
            </Text>
            <View style={styles.statusContainer}>
              {/* Graduado chip */}
              <View style={styles.statusItem}>
                <Text
                  style={[
                    styles.statusText,
                    { fontFamily: fontFamilyForWeight('400') },
                  ]}
                >
                  Graduado 🎓
                </Text>
              </View>
              {/* Semillas chip */}
              <View style={styles.statusItem}>
                <Text
                  style={[
                    styles.statusText,
                    { fontFamily: fontFamilyForWeight('400') },
                  ]}
                >
                  Semillas:{' '}
                  <Text
                    style={[
                      styles.seedCount,
                      { color: theme.colors.blue[700] },
                    ]}
                  >
                    {seed ?? 0}
                  </Text>
                </Text>
                <SemillaIcon width={16} height={21} color={theme.colors.blue[700]} />
              </View>
            </View>
          </View>

          {/* Menu list */}
          <View style={styles.menuList}>
            {menuItems.map((item) => (
              <TouchableOpacity
                key={item.label}
                style={styles.menuItem}
                onPress={item.onPress}
                testID={`menu-item-${item.label}`}
              >
                <Text
                  style={[
                    styles.menuLabel,
                    { fontFamily: fontFamilyForWeight('500') },
                  ]}
                >
                  {item.label}
                </Text>
                <Image
                  source={item.icon}
                  style={styles.menuIcon}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            ))}
          </View>

          {/* Logout button — outline, 50% width */}
          <View style={styles.logoutWrapper}>
            <TouchableOpacity
              style={[
                styles.logoutButton,
                { borderColor: theme.colors.blue[500] },
              ]}
              onPress={() => void handleLogout()}
              disabled={isLoading}
              testID="logout-btn"
            >
              <Text
                style={[
                  styles.logoutText,
                  {
                    color: theme.colors.blue[500],
                    fontFamily: fontFamilyForWeight('500'),
                  },
                ]}
              >
                Cerrar sesión
              </Text>
              <Image
                source={require('@/assets/png/profile/logout.png')}
                style={styles.logoutIcon}
                resizeMode="contain"
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer logo — Fundación Natura */}
        <View style={styles.footerLogo}>
          <Image
            source={require('@/assets/png/logo_Natura_Isagen.png')}
            style={styles.logoImg}
            resizeMode="contain"
            testID="natura-logo"
          />
        </View>
      </ScrollView>

      {/* Bottom sheet — Comparte la aplicación */}
      <UvaBottomSheet
        ref={shareSheetRef}
        snapPoints={['45%']}
        enablePanDownToClose
      >
        <View style={styles.shareSheet}>
          {/* Header row */}
          <View style={styles.shareHeaderRow}>
            <Image
              source={require('@/assets/svg/icons/logop.svg')}
              style={styles.shareLogoIcon}
              resizeMode="contain"
            />
            <Text
              style={[
                styles.shareHeaderText,
                { fontFamily: fontFamilyForWeight('500') },
              ]}
            >
              Hola, cónoce la aplicación Uva-App para registrar tus datos del
              clima!
            </Text>
          </View>
          <View style={styles.shareDivider} />
          {/* Grid 3 cols */}
          <View style={styles.shareGrid}>
            {shareOptions.map((opt) => (
              <TouchableOpacity
                key={opt.label}
                style={styles.shareOptionItem}
                onPress={opt.action}
                testID={`share-option-${opt.label}`}
              >
                <Image
                  source={opt.icon}
                  style={styles.shareOptionIcon}
                  resizeMode="contain"
                />
                <Text
                  style={[
                    styles.shareOptionLabel,
                    { fontFamily: fontFamilyForWeight('600') },
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.shareDivider} />
        </View>
      </UvaBottomSheet>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  // Header bar (ion-toolbar color="uva_blue-500")
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 16,
  },
  headerBtn: {
    padding: 4,
    minWidth: 36,
    alignItems: 'center',
    position: 'relative',
  },
  headerBtnText: {
    fontSize: 20,
    color: '#FFFFFF',
  },
  headerTitle: {
    fontSize: 18,
    color: '#FAFAFA',
    flex: 1,
    textAlign: 'center',
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E5245E',
  },
  // Scroll content (background #F5F5F5)
  scrollContent: {
    flex: 1,
  },
  scrollInner: {
    padding: 10,
    paddingBottom: 32,
  },
  // Profile card (white, border, radius 16)
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    padding: 10,
    gap: 16,
  },
  // Profile header (avatar + name + chips)
  profileHeader: {
    alignItems: 'center',
    gap: 16,
  },
  avatar: {
    width: 95,
    height: 95,
    borderRadius: 47.5,
  },
  userName: {
    color: '#404040',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
  },
  statusContainer: {
    flexDirection: 'row',
    gap: 16,
    justifyContent: 'center',
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: 'rgba(141,228,255,0.50)',
    borderRadius: 10,
  },
  statusText: {
    fontSize: 16,
    color: '#404040',
  },
  seedCount: {
    fontFamily: 'Montserrat-Bold',
  },
  // Menu list
  menuList: {
    gap: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 12,
    gap: 32,
  },
  menuLabel: {
    flex: 1,
    fontSize: 14,
    color: '#404040',
  },
  menuIcon: {
    width: 20,
    height: 20,
    tintColor: '#9E9E9E',
  },
  // Logout button (outline, 50% width)
  logoutWrapper: {
    width: '50%',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 4,
  },
  logoutText: {
    fontSize: 14,
    lineHeight: 21,
  },
  logoutIcon: {
    width: 18,
    height: 18,
    tintColor: '#10BCCA',
  },
  // Footer logo
  footerLogo: {
    marginTop: 20,
    alignSelf: 'center',
  },
  logoImg: {
    width: 150,
    height: 60,
  },
  // Share sheet
  shareSheet: {
    paddingHorizontal: 10,
    paddingBottom: 20,
  },
  shareHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  shareLogoIcon: {
    width: 40,
    height: 40,
  },
  shareHeaderText: {
    flex: 1,
    fontSize: 12,
    color: '#404040',
    fontWeight: '600',
  },
  shareDivider: {
    height: 1,
    backgroundColor: '#E5E5E5',
    marginVertical: 16,
  },
  shareGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  shareOptionItem: {
    width: '33.33%',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 4,
  },
  shareOptionIcon: {
    width: 40,
    height: 40,
  },
  shareOptionLabel: {
    fontSize: 12,
    color: '#404040',
    textAlign: 'center',
  },
});

export default ProfileScreen;

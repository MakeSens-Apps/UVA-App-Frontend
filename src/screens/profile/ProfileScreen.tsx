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

import React, { useRef, useCallback, useMemo } from 'react';
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

import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AppStackParamList } from '@/navigation/types';

import { UvaBottomSheet } from '@/components/ui/BottomSheet';
import type { BottomSheetRef } from '@/components/ui/BottomSheet';
import { showToast } from '@/components/ui/Toast';
import { useNotificationContext } from '@/state/notification/NotificationContext';
import { useSessionContext } from '@/state/SessionContext';
import { useNavigationGate } from '@/navigation/useNavigationGate';

import { UserDSService } from '@/data/datastore/user-ds';
import { UserProgressDSService } from '@/data/datastore/user-progress-ds';
import { GamificationService } from '@/domain/gamification/gamification';
import { SetupService } from '@/domain/setup/setup';

import { useTheme } from '@/theme/ThemeProvider';
import { fontFamilyForWeight } from '@/theme/theme';
import { useConfigContext } from '@/state/ConfigContext';

// ─── Icons ─────────────────────────────────────────────────────────────────────

// Deep import — see the note in GuideMeasurementScreen.tsx / bundle-report.md.
import Ionicons from '@expo/vector-icons/Ionicons';
import { Header } from '@/components/header';
import { AppIcon } from '@/components/icons/AppIcons';
import type { AppIconName } from '@/components/icons/AppIcons';
import SemillaIcon from '@/assets/svg/icons/semilla.svg';
import ContentCopyIcon from '@/assets/svg/icons/content_copy.svg';
import MoreHorizIcon from '@/assets/svg/icons/more_horiz.svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Social icons: SVGs use xlink:href with embedded bitmaps (not supported by
// react-native-svg). Use extracted PNG assets instead. (Divergence 12 — audit-round1)
const whatappImg = require('@/assets/png/social/whatapp.png') as number;
const notionImg = require('@/assets/png/social/notion.png') as number;
const faceImg = require('@/assets/png/social/face.png') as number;
const logopImg = require('@/assets/png/social/logop.jpg') as number;

// ─── Props ─────────────────────────────────────────────────────────────────────

type Props = NativeStackScreenProps<AppStackParamList, 'Profile'>;

// ─── App link (original) ───────────────────────────────────────────────────────

// NOTE: The original Angular profile.page.ts used 'com.makesens.uva' (incorrect).
// The real applicationId in app.json / build.gradle is 'com.makesens.appuva'
// (the previous 'com.makesens.uvaapp' listing was closed by Google; that
// applicationId is burned and cannot be reused).
// The user requested this corrected URL explicitly.
const APP_LINK =
  'https://play.google.com/store/apps/details?id=com.makesens.appuva&hl=en';

// ─── Component ─────────────────────────────────────────────────────────────────

export function ProfileScreen({ navigation }: Props): React.JSX.Element {
  const { theme } = useTheme();
  // Edge-to-edge (targetSdk 36 / RN 0.85): this screen is a full-screen stack route
  // with no tab bar underneath, so its scroll content ends flush with the window
  // bottom — i.e. UNDER the Android system navigation bar. Pad by the bottom inset.
  const insets = useSafeAreaInsets();
  const { unreadCount, updateUnreadCount } = useNotificationContext();
  const { clearSession } = useSessionContext();
  const { getConfigurationApp, loadImage } = useConfigContext();
  const { goToAuth } = useNavigationGate();

  const [name, setName] = React.useState<string | undefined>(undefined);
  const [seed, setSeed] = React.useState<number | null | undefined>(undefined);
  const [isLoading, setIsLoading] = React.useState(false);
  // Dynamic branding logo — mirrors original profile.page.ts:145-151 (ngOnInit loadImage)
  const [brandingLogoUri, setBrandingLogoUri] = React.useState<string | null>(
    null,
  );

  const shareSheetRef = useRef<BottomSheetRef>(null);

  // ─── Focus: load user data + unread count ─────────────────────────────────

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      void (async () => {
        try {
          const [user, userProgress, notifications, configModel] =
            await Promise.all([
              UserDSService.getUser(),
              UserProgressDSService.getLastUserProgressPure(),
              GamificationService.getNotifications(),
              getConfigurationApp(),
            ]);
          if (!isMounted) return;
          setName(user?.Name);
          setSeed(userProgress?.Seed ?? 0);
          const unread = notifications.filter((n) => n.data.isUnread).length;
          updateUnreadCount(unread);

          // Dynamic branding logo — mirrors original profile.page.ts:145-151 (ngOnInit):
          //   const img = await this.configuration.loadImage(configModel.branding.logo);
          //   if (img) { this.logo = img; }
          if (configModel?.branding?.logo) {
            const img = await loadImage(configModel.branding.logo);
            if (isMounted && img) {
              setBrandingLogoUri(img);
            }
          }
        } catch (err) {
          console.error('ProfileScreen load error:', err);
        }
      })();
      return () => {
        isMounted = false;
      };
    }, [updateUnreadCount, getConfigurationApp, loadImage]),
  );

  // ─── Share actions (original shareOptions[]) ──────────────────────────────

  const shareOnWhatsApp = useCallback(() => {
    const url = `https://wa.me/?text=${encodeURIComponent(
      'Hola, conoce la aplicación Uva-App para registrar tus datos del clima! ' +
        APP_LINK,
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
        // Device bug: SetupService.signOut() emits Hub 'auth'/'signedOut', and
        // SyncContext's listener fires its OWN DataStore.clear() concurrently
        // (same double-clear as the original: profile.page.ts:237 +
        // sync-monitor-ds.service.ts:72-75). Whichever loses the race throws
        // "Cannot read property 'clear' of undefined" inside DataStore.
        // Swallow it here so the rejection is handled AND the logout completes
        // (goToAuth below must run even if the clear already happened).
        try {
          await DataStore.clear();
        } catch (clearErr) {
          console.warn(
            'DataStore.clear during logout failed (already cleared?):',
            clearErr,
          );
        }
        // Flip the gate back to the Auth stack. A reset to { name: 'Auth' }
        // here is a no-op because the Auth stack is not mounted while in App.
        goToAuth();
      }
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [clearSession, goToAuth, isLoading]);

  // ─── Notification bell icon ────────────────────────────────────────────────

  const hasUnread = unreadCount > 0;

  // ─── Share options (original shareOptions[]) ──────────────────────────────

  type ShareOption =
    | {
        label: string;
        imageSource: number;
        SvgIcon?: never;
        action: () => void;
      }
    | {
        label: string;
        imageSource?: never;
        SvgIcon: React.ElementType;
        action: () => void;
      };

  const shareOptions: ShareOption[] = useMemo(
    () => [
      { label: 'WhatsApp', imageSource: whatappImg, action: shareOnWhatsApp },
      {
        label: 'Notion',
        imageSource: notionImg,
        action: () => goUrlShare('https://notion.so'),
      },
      {
        label: 'Facebook',
        imageSource: faceImg,
        action: () => goUrlShare('https://facebook.com'),
      },
      {
        label: 'Copiar enlace',
        SvgIcon: ContentCopyIcon,
        action: () => void copyLink(),
      },
      { label: 'Más', SvgIcon: MoreHorizIcon, action: () => void shareApp() },
    ],
    [shareOnWhatsApp, goUrlShare, copyLink, shareApp],
  );

  // ─── Open share sheet ─────────────────────────────────────────────────────
  const openShareSheet = useCallback(() => {
    shareSheetRef.current?.present();
  }, []);

  // ─── Menu items (original ion-list) ───────────────────────────────────────

  const menuItems = useMemo(
    () => [
      {
        label: 'Información personal',
        icon: 'profile/arrow-forward' as AppIconName,
        onPress: () => navigation.navigate('PersonalInfo'),
      },
      {
        label: 'Tus logros',
        icon: 'profile/Medal' as AppIconName,
        onPress: () => navigation.navigate('Achievement'),
      },
      {
        label: 'Configuración',
        icon: 'profile/Options' as AppIconName,
        onPress: () => navigation.navigate('Configuration'),
      },
      {
        label: 'Comparte la aplicación',
        icon: 'profile/share-social' as AppIconName,
        onPress: openShareSheet,
      },
      {
        label: 'Soporte documental',
        icon: 'profile/Open' as AppIconName,
        onPress: () =>
          void Linking.openURL('https://docs.makesens.co/ayuda-uva'),
      },
    ],
    [navigation, openShareSheet],
  );

  return (
    <View style={styles.root}>
      {/* Header — shared Header component: it is the ONLY place that applies the
          status-bar inset (useSafeAreaInsets().top). Painting a local toolbar here
          is what put the back arrow / bell at clock height (device F-14, D1, D-02). */}
      <Header
        title="Perfil"
        hasBackButton
        hasProfileButton={false}
        onBackPress={() => navigation.goBack()}
        rightAction={
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => navigation.navigate('Alerts')}
            testID="profile-notifications-btn"
          >
            {/* ion-icon name='notifications'/'notifications-outline' (divergence 1) */}
            <Ionicons
              name={hasUnread ? 'notifications' : 'notifications-outline'}
              size={24}
              color="#FFFFFF"
            />
            {hasUnread && (
              <View style={styles.badge} testID="notification-badge" />
            )}
          </TouchableOpacity>
        }
      />

      {/* Content */}
      <ScrollView
        style={[
          styles.scrollContent,
          { backgroundColor: theme.colors.gray[100] },
        ]}
        contentContainerStyle={[
          styles.scrollInner,
          { paddingBottom: styles.scrollInner.paddingBottom + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile card — white rounded card */}
        <View style={styles.profileCard}>
          {/* Avatar + name + chips */}
          <View style={styles.profileHeader}>
            <Image
              source={require('@/assets/png/user-circle.png')}
              style={styles.avatar}
              /* Android fades images in over 300 ms by default; on first entry the
                 avatar read as an almost-invisible circle (device D-16). */
              fadeDuration={0}
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
                <SemillaIcon
                  width={16}
                  height={21}
                  color={theme.colors.blue[700]}
                />
              </View>
            </View>
          </View>

          {/* Menu list */}
          <View style={styles.menuList}>
            {/* eslint-disable-next-line react-hooks/refs -- ref accessed only inside onPress callbacks, not during render */}
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
                {/* Original: <ion-icon src="…/profile/<name>.svg"> — the SVG carries its
                    own fill (#92949C). The flattened PNGs used before rendered almost
                    invisible on device (D-17). */}
                <AppIcon name={item.icon} width={20} height={20} />
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
              {/* logout.svg: stroke #10BCCA (profile/logout.svg) */}
              <AppIcon name="profile/logout" width={18} height={18} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer logo — dynamic RACIMO branding logo (original profile.page.ts:145-151)
            Falls back to static Fundación Natura asset when branding is not configured. */}
        <View style={styles.footerLogo}>
          <Image
            source={
              brandingLogoUri
                ? { uri: brandingLogoUri }
                : require('@/assets/png/logo_Natura_Isagen.png')
            }
            style={styles.logoImg}
            resizeMode="contain"
            fadeDuration={0}
            testID="natura-logo"
          />
        </View>
      </ScrollView>

      {/* Bottom sheet — Comparte la aplicación. Sin snapPoints: alto por contenido
          (profile.page.html:100 → ion-modal --height:auto; original 376/740 px). */}
      <UvaBottomSheet ref={shareSheetRef} enablePanDownToClose>
        <View style={styles.shareSheet}>
          {/* Header row — uses png logo (logop.svg has xlink:href which is unsupported in RN) */}
          <View style={styles.shareHeaderRow}>
            {/* logop.svg has xlink:href which is unsupported in RN — use PNG */}
            <Image
              source={logopImg}
              style={styles.shareLogoIcon}
              resizeMode="cover"
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
                {opt.imageSource !== undefined ? (
                  <Image
                    source={opt.imageSource}
                    style={styles.shareOptionIcon}
                    resizeMode="contain"
                  />
                ) : (
                  opt.SvgIcon && <opt.SvgIcon width={40} height={40} />
                )}
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
    backgroundColor: '#F5F5F5',
  },
  headerBtn: {
    padding: 4,
    minWidth: 36,
    alignItems: 'center',
    position: 'relative',
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
    // .status-item is 35 px tall in the original (6+6 padding + the 16 px Roboto
    // line box). Without an explicit lineHeight RN rendered a ~28 dp chip (D-20).
    lineHeight: 23,
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
    borderRadius: 4,
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

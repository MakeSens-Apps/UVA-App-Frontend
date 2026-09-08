/**
 * B16 — AchievementScreen (real implementation)
 *
 * Ported from: src/app/pages/profile/achievement/achievement.page.ts + .html + .scss
 * Classification: Rewrite (UI layer)
 *
 * Preserved logic (portability-matrix §4.4):
 *   - ionViewWillEnter → useFocusEffect CON RESET DEL ARRAY antes de cargar
 *     (bug de acumulación corregido — autorizado §4.4)
 *   - getMilestones: brote→brote1.png / plantula→platula.svg / flor→flor.svg
 *   - modals: modal_token_a (semillas) → modal_token_b (germinación) con Siguiente/back
 *   - FAB "¿Dudas?" esquina inferior derecha
 *   - Textos LITERALES del original HTML
 *
 * Changes from original:
 *   - ionViewWillEnter → useFocusEffect
 *   - ion-modal bottom sheets → UvaBottomSheet
 *   - IonContent → ScrollView
 *   - ChangeDetectorRef → useState
 *
 * Visual parity (docs/evidence/profile/README.md screen-09 a 12):
 *   - Fondo verde claro con patrón (background image back.png) → #F4F4F4 (sin imagen en RN)
 *   - Grid 4 columnas de achievement-items (70×70, border-radius 14, fondo rgba(242,249,236,0.7))
 *   - Imágenes de logro 53×52
 *   - FAB: teal (#1097AA), radius 8, padding 10×20, sombra
 *   - Modal tokens: fondo #F5F5F5, cards blancas, h1 font-size 30, color azul-900
 *
 * Bug fix §4.4: achievements array SE LIMPIA en cada useFocusEffect antes del push.
 */

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  ImageBackground,
  StyleSheet,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AppStackParamList } from '@/navigation/types';

import { Header } from '@/components/header';

import { UvaBottomSheet } from '@/components/ui/BottomSheet';
import type { BottomSheetRef } from '@/components/ui/BottomSheet';

import { UserProgressDSService } from '@/data/datastore/user-progress-ds';

import { useTheme } from '@/theme/ThemeProvider';
import { fontFamilyForWeight } from '@/theme/theme';

// ─── Icons ─────────────────────────────────────────────────────────────────────
// NOTE: react-native-svg-transformer requires SVG imports as React components.
// brote uses brote1.png (original also uses .png for brote, see achievement.page.ts line 53)

import SemillaIcon from '@/assets/svg/icons/semilla.svg';
import PlatulaIcon from '@/assets/svg/icons/platula.svg';
import FlorIcon from '@/assets/svg/icons/flor.svg';
import ArrowRightIcon from '@/assets/svg/icons/arrow-right.svg';
import DateIncompleteToDoneIcon from '@/assets/svg/icons/date_incomplete_to_done.svg';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Achievement {
  icon: 'brote' | 'plantula' | 'flor';
}

type Props = NativeStackScreenProps<AppStackParamList, 'Achievement'>;

// ─── Achievement icon renderer ─────────────────────────────────────────────────
// brote uses PNG (original: brote1.png); plantula + flor use SVG

function AchievementIcon({ icon }: { icon: Achievement['icon'] }): React.JSX.Element {
  if (icon === 'brote') {
    return (
      <Image
        source={require('@/assets/png/profile/brote1.png')}
        style={styles.achievementImg}
        resizeMode="contain"
        fadeDuration={0}
      />
    );
  }
  if (icon === 'plantula') {
    return <PlatulaIcon width={53} height={52} />;
  }
  return <FlorIcon width={53} height={52} />;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function AchievementScreen({ navigation }: Props): React.JSX.Element {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  // BUG FIX §4.4: array SE RESETEA antes de cargar (evita acumulación en re-enter)
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  // The original renders the (empty) grid straight away — it has no empty-state copy.
  // Gate the grid on `loaded` so nothing flashes before getMilestones() resolves
  // (device D-13: an invented "Aún no tienes logros…" appeared for ~1 s).
  const [loaded, setLoaded] = useState(false);

  /**
   * Which sheet is mounted, mirroring the original `modals` record + `[isOpen]`
   * (achievement.page.html:19-24, 96-102): ion-modal only exists in the DOM while
   * open. Keeping both @gorhom sheets permanently mounted left a white strip with
   * the drag handle and the "<" / "×" row peeking above the system nav bar, which
   * also covered the "¿Dudas?" pill (device D-05 / F-13).
   */
  const [openSheet, setOpenSheet] = useState<'a' | 'b' | null>(null);

  /** Callback ref: present the sheet as soon as it mounts (ion-modal [isOpen]=true). */
  const presentOnMount = useCallback((instance: BottomSheetRef | null) => {
    if (instance) instance.present();
  }, []);

  // ─── Focus: load achievements (reset array first) ─────────────────────────

  useFocusEffect(
    useCallback(() => {
      // CRITICAL: limpiar antes de cargar para evitar duplicados en re-enter
      setAchievements([]);
      setLoaded(false);

      void (async () => {
        try {
          const milestones = await UserProgressDSService.getMilestones();
          const newAchievements: Achievement[] = milestones
            .map((milestone) => {
              switch (milestone) {
                case 'brote':
                  return { icon: 'brote' as const };
                case 'plantula':
                  return { icon: 'plantula' as const };
                case 'flor':
                  return { icon: 'flor' as const };
                default:
                  return null;
              }
            })
            .filter((a): a is Achievement => a !== null);
          setAchievements(newAchievements);
        } catch (err) {
          console.error('AchievementScreen load error:', err);
        } finally {
          setLoaded(true);
        }
      })();
    }, []),
  );

  // ─── Modal helpers ────────────────────────────────────────────────────────

  /** onCloseAndOpen(current, next) — achievement.page.ts:105-113 (300 ms handover). */
  const closeAndOpen = useCallback((next: 'a' | 'b') => {
    setOpenSheet(null);
    setTimeout(() => setOpenSheet(next), 300);
  }, []);

  return (
    <View style={styles.root}>
      {/* Header — shared Header: applies the status-bar inset (device F-14 / D-02).
          Back + title only ⇒ space-between right-aligns the title, like the original
          (docs/evidence/profile/screen-09 — device D-18). */}
      <Header
        title="Tus logros"
        hasBackButton
        hasProfileButton={false}
        onBackPress={() => navigation.goBack()}
      />

      {/* Content — background verde claro con patrón (achievement.page.scss .content) */}
      <ImageBackground
        source={require('@/assets/png/profile/back.png')}
        style={styles.contentWrapper}
        imageStyle={styles.contentBgImage}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollInner,
            { paddingBottom: styles.scrollInner.paddingBottom + insets.bottom },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Achievements grid — 4 cols.
              The original has NO empty state: it simply renders an empty grid while
              getMilestones() resolves (device D-13). */}
          <View style={styles.achievementsContainer} testID="achievements-grid">
            {loaded &&
              achievements.map((item, index) => (
                <View key={index} style={styles.achievementItem} testID="achievement-item">
                  <AchievementIcon icon={item.icon} />
                </View>
              ))}
          </View>
        </ScrollView>

        {/* FAB "¿Dudas?" — esquina inferior derecha (.floating-button, achievement.page.scss:36-56) */}
        <TouchableOpacity
          style={[
            styles.fab,
            {
              backgroundColor: theme.colors.blue[600],
              bottom: styles.fab.bottom + insets.bottom,
            },
          ]}
          onPress={() => setOpenSheet('a')}
          testID="dudas-fab"
        >
          <Text
            style={[
              styles.fabText,
              { fontFamily: fontFamilyForWeight('500') },
            ]}
          >
            ¿Dudas?
          </Text>
        </TouchableOpacity>
      </ImageBackground>

      {/* modal_token_a — explicación de semillas ([isOpen]="modals['modal_token_a']") */}
      {openSheet === 'a' && (
      <UvaBottomSheet
        ref={presentOnMount}
        snapPoints={['75%']}
        enablePanDownToClose
        onDismiss={() => setOpenSheet((prev) => (prev === 'a' ? null : prev))}
      >
        <View style={styles.modalContent}>
          {/* +2 semillas */}
          <View style={styles.tokenCard}>
            <Text
              style={[
                styles.tokenBody,
                { fontFamily: fontFamilyForWeight('400') },
              ]}
            >
              Cada día que cumplas{' '}
              <Text style={styles.tokenStrong}>con todos tus registros</Text>{' '}
              ganas dos semillas.
            </Text>
            <View style={styles.tokenAmountRow}>
              <Text
                style={[
                  styles.tokenAmount,
                  {
                    fontFamily: fontFamilyForWeight('600'),
                    color: theme.colors.blue[900] ?? theme.colors.blue[700],
                  },
                ]}
              >
                +2
              </Text>
              <SemillaIcon width={30} height={30} color={theme.colors.blue[700]} />
            </View>
          </View>

          {/* +1 semilla */}
          <View style={styles.tokenCard}>
            <Text
              style={[
                styles.tokenBody,
                { fontFamily: fontFamilyForWeight('400') },
              ]}
            >
              Los días que{' '}
              <Text style={styles.tokenStrong}>cumplas con algunos</Text>{' '}
              registros ganas una semilla.
            </Text>
            <View style={styles.tokenAmountRow}>
              <Text
                style={[
                  styles.tokenAmount,
                  {
                    fontFamily: fontFamilyForWeight('600'),
                    color: theme.colors.blue[900] ?? theme.colors.blue[700],
                  },
                ]}
              >
                +1
              </Text>
              <SemillaIcon width={30} height={30} color={theme.colors.blue[700]} />
            </View>
          </View>

          {/* Recuperar racha */}
          <View style={styles.tokenCard}>
            <Text
              style={[
                styles.tokenBody,
                { fontFamily: fontFamilyForWeight('400') },
              ]}
            >
              Con estas semillas podrás recuperar tu racha.
            </Text>
            <DateIncompleteToDoneIcon width={80} height={40} />
            <Text
              style={[
                styles.tokenBody,
                { fontFamily: fontFamilyForWeight('400') },
              ]}
            >
              Para recuperar un día incompleto,{' '}
              <Text style={styles.tokenStrong}>debes pagar 5 semillas.</Text>
            </Text>
          </View>

          {/* +3 semillas */}
          <View style={styles.tokenCard}>
            <Text
              style={[
                styles.tokenBody,
                { fontFamily: fontFamilyForWeight('400') },
              ]}
            >
              Si cumples{' '}
              <Text style={styles.tokenStrong}>con 7 días de racha </Text>
              ganas{' '}
              <Text style={styles.tokenStrong}> 3 semillas adicionales. </Text>
            </Text>
            <View style={styles.tokenAmountRow}>
              <Text
                style={[
                  styles.tokenAmount,
                  {
                    fontFamily: fontFamilyForWeight('600'),
                    color: theme.colors.blue[900] ?? theme.colors.blue[700],
                  },
                ]}
              >
                +3
              </Text>
              <SemillaIcon width={30} height={30} color={theme.colors.blue[700]} />
            </View>
          </View>

          {/* Siguiente */}
          <TouchableOpacity
            style={[
              styles.modalButton,
              { backgroundColor: theme.colors.blue[600] },
            ]}
            onPress={() => closeAndOpen('b')}
            testID="siguiente-btn"
          >
            <Text
              style={[
                styles.modalButtonText,
                { fontFamily: fontFamilyForWeight('600') },
              ]}
            >
              Siguiente
            </Text>
          </TouchableOpacity>
        </View>
      </UvaBottomSheet>
      )}

      {/* modal_token_b — germinación mensual ([isOpen]="modals['modal_token_b']") */}
      {openSheet === 'b' && (
      <UvaBottomSheet
        ref={presentOnMount}
        snapPoints={['80%']}
        enablePanDownToClose
        onDismiss={() => setOpenSheet((prev) => (prev === 'b' ? null : prev))}
      >
        <View style={styles.modalContent}>
          {/* Header row: back + close */}
          <View style={styles.tokenBHeader}>
            <TouchableOpacity
              onPress={() => closeAndOpen('a')}
              style={styles.tokenBHeaderBtn}
              testID="back-to-token-a"
            >
              <Text style={[styles.tokenBHeaderBtnText, { color: theme.colors.gray[700] }]}>{'<'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.tokenBCloseBtn,
                { backgroundColor: theme.colors.blue[600] },
              ]}
              onPress={() => setOpenSheet(null)}
              testID="close-modal-token-b"
            >
              <Text style={[styles.tokenBCloseBtnText, { fontFamily: fontFamilyForWeight('600') }]}>×</Text>
            </TouchableOpacity>
          </View>

          {/* Intro */}
          <View style={styles.tokenCard}>
            <Text
              style={[
                styles.tokenBody,
                { fontFamily: fontFamilyForWeight('400') },
              ]}
            >
              Al finalizar el{' '}
              <Text style={styles.tokenStrong}>mes</Text>
              {' '}la cantidad de tus semillas{' '}
              <Text style={styles.tokenStrong}>germinará</Text>
              {' '}de esta manera:
            </Text>
          </View>

          {/* Rango 11-40 → brote */}
          <View style={styles.tokenCard}>
            <View style={styles.germinationRow}>
              <Text style={[styles.tokenAmount, { color: theme.colors.blue[900] ?? theme.colors.blue[700], fontFamily: fontFamilyForWeight('600') }]}>11</Text>
              <SemillaIcon width={20} height={20} color={theme.colors.blue[700]} />
              <Text style={[styles.tokenBody, { fontFamily: fontFamilyForWeight('400') }]}> a 40</Text>
              <SemillaIcon width={20} height={20} color={theme.colors.blue[700]} />
              <ArrowRightIcon width={20} height={20} color={theme.colors.blue[500]} />
              <Image
                source={require('@/assets/png/profile/brote1.png')}
                style={{ width: 32, height: 32 }}
                resizeMode="contain"
              />
            </View>
            <Text style={[styles.tokenBody, { fontFamily: fontFamilyForWeight('400') }]}>De 11 a 40 semillas germina un <Text style={styles.tokenStrong}>brote</Text></Text>
          </View>

          {/* Rango 41-63 → plántula */}
          <View style={styles.tokenCard}>
            <View style={styles.germinationRow}>
              <Text style={[styles.tokenAmount, { color: theme.colors.blue[900] ?? theme.colors.blue[700], fontFamily: fontFamilyForWeight('600') }]}>41</Text>
              <SemillaIcon width={20} height={20} color={theme.colors.blue[700]} />
              <Text style={[styles.tokenBody, { fontFamily: fontFamilyForWeight('400') }]}> a 63</Text>
              <SemillaIcon width={20} height={20} color={theme.colors.blue[700]} />
              <ArrowRightIcon width={20} height={20} color={theme.colors.blue[500]} />
              <PlatulaIcon width={32} height={32} />
            </View>
            <Text style={[styles.tokenBody, { fontFamily: fontFamilyForWeight('400') }]}>De 41 a 63 semillas germina una <Text style={styles.tokenStrong}>plantula</Text></Text>
          </View>

          {/* Más de 63 → flor */}
          <View style={styles.tokenCard}>
            <View style={styles.germinationRow}>
              <Text style={[styles.tokenAmount, { color: theme.colors.blue[900] ?? theme.colors.blue[700], fontFamily: fontFamilyForWeight('600') }]}>mas de 63</Text>
              <SemillaIcon width={20} height={20} color={theme.colors.blue[700]} />
              <ArrowRightIcon width={20} height={20} color={theme.colors.blue[500]} />
              <FlorIcon width={32} height={32} />
            </View>
            <Text style={[styles.tokenBody, { fontFamily: fontFamilyForWeight('400') }]}>más de 63 semillas germina una <Text style={styles.tokenStrong}>flor</Text></Text>
          </View>

          {/* 0-10 → nada */}
          <View style={styles.tokenCard}>
            <View style={styles.germinationRow}>
              <Text style={[styles.tokenAmount, { color: theme.colors.blue[900] ?? theme.colors.blue[700], fontFamily: fontFamilyForWeight('600') }]}>0</Text>
              <SemillaIcon width={20} height={20} color={theme.colors.blue[700]} />
              <Text style={[styles.tokenBody, { fontFamily: fontFamilyForWeight('400') }]}> a 10</Text>
              <SemillaIcon width={20} height={20} color={theme.colors.blue[700]} />
            </View>
            <Text style={[styles.tokenBody, { fontFamily: fontFamilyForWeight('400') }]}>
              De 0 a 10 semillas <Text style={styles.tokenStrong}>No</Text> alcanza a germinar <Text style={styles.tokenStrong}>nada</Text> 😒
            </Text>
          </View>

          {/* Entendido */}
          <TouchableOpacity
            style={[
              styles.modalButton,
              { backgroundColor: theme.colors.blue[600] },
            ]}
            onPress={() => setOpenSheet(null)}
            testID="entendido-btn"
          >
            <Text
              style={[
                styles.modalButtonText,
                { fontFamily: fontFamilyForWeight('600') },
              ]}
            >
              Entendido
            </Text>
          </TouchableOpacity>
        </View>
      </UvaBottomSheet>
      )}
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  contentWrapper: {
    flex: 1,
  },
  contentBgImage: {
    resizeMode: 'cover',
  },
  scrollInner: { padding: 16, paddingBottom: 80 },
  // Grid 4 columns
  achievementsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    justifyContent: 'center',
  },
  achievementItem: {
    width: 70,
    height: 70,
    borderRadius: 14,
    // .achievement-item background: rgba(242,249,236,.7) composited over back.png.
    // In RN the translucent fill rendered a second, darker layer under the sprite
    // (device D-14); the original reads as a flat #eaf5df tile.
    backgroundColor: '#EAF5DF',
    justifyContent: 'center',
    alignItems: 'center',
    // shadow
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  achievementImg: { width: 53, height: 52 },
  // FAB
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  fabText: { fontSize: 14, color: '#FFFFFF' },
  // Modal content
  modalContent: {
    padding: 10,
    gap: 13,
    paddingBottom: 24,
    backgroundColor: '#F5F5F5',
  },
  tokenCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 10,
    gap: 10,
    alignItems: 'center',
  },
  tokenBody: { fontSize: 16, color: '#164551', textAlign: 'center', lineHeight: 24 },
  tokenStrong: { fontFamily: 'Montserrat-SemiBold' },
  tokenAmountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  tokenAmount: { fontSize: 30 },
  recoveryImg: { width: 60, height: 50 },
  modalButton: {
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  modalButtonText: { fontSize: 16, color: '#FFFFFF' },
  // modal_token_b header
  tokenBHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  tokenBHeaderBtn: { padding: 4 },
  tokenBHeaderBtnText: { fontSize: 22 },
  tokenBCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tokenBCloseBtnText: { fontSize: 20, color: '#FFFFFF' },
  germinationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },
  arrowIcon: { width: 18, height: 18, tintColor: '#164551' },
  germinationIcon: { width: 28, height: 28 },
});

export default AchievementScreen;

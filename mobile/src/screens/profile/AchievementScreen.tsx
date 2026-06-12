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

import React, { useRef, useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AppStackParamList } from '@/navigation/types';

import { UvaBottomSheet } from '@/components/ui/BottomSheet';
import type { BottomSheetRef } from '@/components/ui/BottomSheet';

import { UserProgressDSService } from '@/data/datastore/user-progress-ds';

import { useTheme } from '@/theme/ThemeProvider';
import { fontFamilyForWeight } from '@/theme/theme';

// ─── Icons ─────────────────────────────────────────────────────────────────────
// NOTE: react-native-svg-transformer requires SVG imports as React components.

import SemillaIcon from '@/assets/svg/icons/semilla.svg';
import BroteIcon from '@/assets/svg/icons/brote.svg';
import PlatulaIcon from '@/assets/svg/icons/platula.svg';
import FlorIcon from '@/assets/svg/icons/flor.svg';
import ArrowRightIcon from '@/assets/svg/icons/arrow-right.svg';
import DateIncompleteToDoneIcon from '@/assets/svg/icons/date_incomplete_to_done.svg';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Achievement {
  icon: 'brote' | 'plantula' | 'flor';
}

type Props = NativeStackScreenProps<AppStackParamList, 'Achievement'>;

// ─── Achievement icon map ──────────────────────────────────────────────────────
// Maps achievement icon key → SVG component (react-native-svg-transformer style)

const ACHIEVEMENT_ICONS: Record<Achievement['icon'], React.FC<{ width: number; height: number }>> = {
  brote: BroteIcon,
  plantula: PlatulaIcon,
  flor: FlorIcon,
};

// ─── Component ─────────────────────────────────────────────────────────────────

export function AchievementScreen({ navigation }: Props): React.JSX.Element {
  const { theme } = useTheme();

  // BUG FIX §4.4: array SE RESETEA antes de cargar (evita acumulación en re-enter)
  const [achievements, setAchievements] = useState<Achievement[]>([]);

  const modalTokenARef = useRef<BottomSheetRef>(null);
  const modalTokenBRef = useRef<BottomSheetRef>(null);

  // ─── Focus: load achievements (reset array first) ─────────────────────────

  useFocusEffect(
    useCallback(() => {
      // CRITICAL: limpiar antes de cargar para evitar duplicados en re-enter
      setAchievements([]);

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
        }
      })();
    }, []),
  );

  // ─── Modal helpers ────────────────────────────────────────────────────────

  const openModal = useCallback((ref: React.RefObject<BottomSheetRef | null>) => {
    ref.current?.present();
  }, []);

  const closeAndOpen = useCallback(
    (
      currentRef: React.RefObject<BottomSheetRef | null>,
      nextRef: React.RefObject<BottomSheetRef | null>,
    ) => {
      currentRef.current?.dismiss();
      setTimeout(() => nextRef.current?.present(), 300);
    },
    [],
  );

  return (
    <View style={styles.root}>
      {/* Header */}
      <View
        style={[styles.headerBar, { backgroundColor: theme.colors.blue[500] }]}
      >
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => navigation.goBack()}
          testID="achievement-back-btn"
        >
          <Text style={styles.headerBtnText}>{'<'}</Text>
        </TouchableOpacity>
        <Text
          style={[
            styles.headerTitle,
            { fontFamily: fontFamilyForWeight('600') },
          ]}
        >
          Tus logros
        </Text>
        <View style={styles.headerBtn} />
      </View>

      {/* Content — background verde claro aproximado */}
      <View style={styles.contentWrapper}>
        <ScrollView
          contentContainerStyle={styles.scrollInner}
          showsVerticalScrollIndicator={false}
        >
          {/* Achievements grid — 4 cols */}
          <View style={styles.achievementsContainer} testID="achievements-grid">
            {achievements.length === 0 && (
              <Text
                style={[
                  styles.emptyText,
                  { fontFamily: fontFamilyForWeight('400'), color: theme.colors.gray[500] },
                ]}
              >
                Aún no tienes logros. ¡Completa registros para ganarlos!
              </Text>
            )}
            {achievements.map((item, index) => {
              const AchievIcon = ACHIEVEMENT_ICONS[item.icon];
              return (
                <View key={index} style={styles.achievementItem} testID="achievement-item">
                  <AchievIcon width={52} height={52} />
                </View>
              );
            })}
          </View>
        </ScrollView>

        {/* FAB "¿Dudas?" — esquina inferior derecha */}
        <TouchableOpacity
          style={[
            styles.fab,
            {
              backgroundColor: theme.colors.blue[600],
            },
          ]}
          onPress={() => openModal(modalTokenARef)}
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
      </View>

      {/* modal_token_a — explicación de semillas */}
      <UvaBottomSheet
        ref={modalTokenARef}
        snapPoints={['75%']}
        enablePanDownToClose
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
            onPress={() => closeAndOpen(modalTokenARef, modalTokenBRef)}
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

      {/* modal_token_b — germinación mensual */}
      <UvaBottomSheet
        ref={modalTokenBRef}
        snapPoints={['80%']}
        enablePanDownToClose
      >
        <View style={styles.modalContent}>
          {/* Header row: back + close */}
          <View style={styles.tokenBHeader}>
            <TouchableOpacity
              onPress={() => closeAndOpen(modalTokenBRef, modalTokenARef)}
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
              onPress={() => modalTokenBRef.current?.dismiss()}
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
              <ArrowRightIcon width={20} height={20} />
              <BroteIcon width={32} height={32} />
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
              <ArrowRightIcon width={20} height={20} />
              <PlatulaIcon width={32} height={32} />
            </View>
            <Text style={[styles.tokenBody, { fontFamily: fontFamilyForWeight('400') }]}>De 41 a 63 semillas germina una <Text style={styles.tokenStrong}>plantula</Text></Text>
          </View>

          {/* Más de 63 → flor */}
          <View style={styles.tokenCard}>
            <View style={styles.germinationRow}>
              <Text style={[styles.tokenAmount, { color: theme.colors.blue[900] ?? theme.colors.blue[700], fontFamily: fontFamilyForWeight('600') }]}>mas de 63</Text>
              <SemillaIcon width={20} height={20} color={theme.colors.blue[700]} />
              <ArrowRightIcon width={20} height={20} />
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
            onPress={() => modalTokenBRef.current?.dismiss()}
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
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 16,
  },
  headerBtn: { padding: 4, minWidth: 36, alignItems: 'center' },
  headerBtnText: { fontSize: 20, color: '#FFFFFF' },
  headerTitle: { fontSize: 18, color: '#FAFAFA', flex: 1, textAlign: 'center' },
  contentWrapper: {
    flex: 1,
    backgroundColor: '#F4F4F4', // achievement bg approx
  },
  scrollInner: { padding: 16, paddingBottom: 80 },
  emptyText: { textAlign: 'center', fontSize: 14, marginTop: 40 },
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
    backgroundColor: 'rgba(242,249,236,0.7)',
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

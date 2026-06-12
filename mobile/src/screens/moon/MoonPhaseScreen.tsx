/**
 * B15 — MoonPhaseScreen (full implementation)
 *
 * Ported from: src/app/pages/moon-phase/moon-phase.page.ts + .html
 * Classification: Rewrite
 *
 * Preserved logic (portability-matrix §4.4):
 *   - Promise.all of 3 calls: getCurrentPhase, getMonthPhases, getNextMoonEvents
 *   - month name from meses map (Spanish)
 *   - moonEvents date formatted: toLocaleDateString('es-ES', { weekday:'short', day:'2-digit', month:'long' })
 *   - seed via getLastUserProgressPure (useFocusEffect, R-28)
 *   - phaseName from LUNAR_PHASE_NAME
 *
 * Visual parity (moon-phase.page.scss):
 *   - Background: --Colors-Blue-900 = #164551
 *   - .date-header: white, 16px/700, text-align:center, marginTop:20, marginBottom:10
 *   - .cards: Blue-800 = #1A6270, radius 16, padding 10 0, gap 10
 *   - .text_container: width 90%, space-between, h2 white, p Blue-100
 *   - MoonCard with background="green" hasArrow={false}
 *   - Calendar with typeCalendar="moon" and phaseMoonDays
 *
 * Reference: docs/evidence/moon-phase/screen-04 to screen-09
 *
 * Risks: R-26, R-20
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

import { Header } from '@/components/header/Header';
import { MoonCard, LUNAR_PHASE_NAME } from '@/components/moon-card/MoonCard';
import { Calendar } from '@/components/calendar/Calendar';
import { useTheme } from '@/theme/ThemeProvider';
import { fontFamilyForWeight } from '@/theme/theme';

import { MoonPhaseService } from '@/domain/moon/moon-phase';
import type { LunarPhaseKey } from '@/components/moon-card/MoonCard';
import type { DailyPhaseCalendar, MoonEvent } from '@/domain/moon/moon-phase';
import { UserProgressDSService } from '@/data/datastore/user-progress-ds';

// ─── Month names (preserved from original `meses` map) ───────────────────────

const meses: Record<number, string> = {
  0: 'Enero',
  1: 'Febrero',
  2: 'Marzo',
  3: 'Abril',
  4: 'Mayo',
  5: 'Junio',
  6: 'Julio',
  7: 'Agosto',
  8: 'Septiembre',
  9: 'Octubre',
  10: 'Noviembre',
  11: 'Diciembre',
};

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * MoonPhaseScreen
 *
 * Displays the current lunar phase for the month.
 * Includes: MoonCard (green variant), lunar calendar, and upcoming events.
 *
 * Navigation: HomeStack > MoonPhase (tapped from MoonCard in Home)
 */
export function MoonPhaseScreen(): React.JSX.Element {
  const { theme } = useTheme();
  const navigation = useNavigation();

  // ─── State ─────────────────────────────────────────────────────────────────
  const [seed, setSeed] = useState<number | null>(null);
  const [month] = useState<string>(meses[new Date().getMonth()]);
  const [phase, setPhase] = useState<LunarPhaseKey>('FULL_MOON');
  const [phaseName, setPhaseName] = useState<string>(LUNAR_PHASE_NAME['FULL_MOON']);
  const [phaseMoonDays, setPhaseMoonDays] = useState<DailyPhaseCalendar[]>([]);
  const [moonEvents, setMoonEvents] = useState<Array<{ type: string; date: string }>>([]);

  // ─── useFocusEffect: reload seed on focus (ionViewWillEnter equivalent) ────
  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      const loadSeed = async () => {
        const progress = await UserProgressDSService.getLastUserProgressPure();
        if (mounted && progress) setSeed(progress.Seed ?? 0);
      };
      void loadSeed();
      return () => { mounted = false; };
    }, []),
  );

  // ─── Mount: load moon data via Promise.all (ngOnInit equivalent) ───────────
  useEffect(() => {
    let mounted = true;
    const loadMoonData = async () => {
      try {
        // Original: Promise.all([getCurrentPhase, getMonthPhases, getNextMoonEvents])
        const [responsePhase, responseMonth, responseEvents] = await Promise.all([
          MoonPhaseService.getCurrentPhase(),
          MoonPhaseService.getMonthPhases(),
          MoonPhaseService.getNextMoonEvents(),
        ]);

        if (!mounted) return;

        // Handle getCurrentPhase
        if (responsePhase.success) {
          const newPhase = responsePhase.data as LunarPhaseKey;
          setPhase(newPhase);
          setPhaseName(LUNAR_PHASE_NAME[newPhase]);
        }

        // Handle getMonthPhases
        if (responseMonth.success) {
          setPhaseMoonDays(responseMonth.data);
        }

        // Handle getNextMoonEvents
        if (responseEvents.success) {
          // Original: date.toLocaleDateString('es-ES', { weekday:'short', day:'2-digit', month:'long' })
          const formattedEvents = responseEvents.data.map((event: MoonEvent) => ({
            type: event.type,
            date: new Date(event.date).toLocaleDateString('es-ES', {
              weekday: 'short',
              day: '2-digit',
              month: 'long',
            }),
          }));
          setMoonEvents(formattedEvents);
        }
      } catch (error) {
        console.error('Error al cargar los datos de la luna:', error);
      }
    };
    void loadMoonData();
    return () => { mounted = false; };
  }, []);

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.blue[900] }]}>
      {/* Header: "Calendario lunar" with back + seed counter */}
      <Header
        title="Calendario lunar"
        seed={seed}
        hasBackButton
        hasProfileButton={seed !== null}
        onBackPress={() => navigation.goBack()}
      />

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Month header — Original: h2.date-header { white, 16px/700, center } */}
        <Text
          style={[
            styles.dateHeader,
            { fontFamily: fontFamilyForWeight('700'), color: theme.colors.white },
          ]}
          testID="moon-month-header"
        >
          {month}
        </Text>

        {/* Moon card — green variant, no arrow */}
        <View style={styles.moonCardWrapper}>
          <MoonCard
            phase={phase}
            phaseName={phaseName}
            background="green"
            hasArrow={false}
          />
        </View>

        {/* Lunar calendar for the month */}
        <View style={styles.calendarWrapper}>
          <Calendar
            typeCalendar="moon"
            phaseMoonDays={phaseMoonDays}
            hasHeader
            viewDate={new Date()}
          />
        </View>

        {/* Upcoming moon events
            Original: .cards { Blue-800, radius 16, padding 10 0, gap 10 }
            .text_container { width 90%, space-between, h2 white, p Blue-100 }
        */}
        {moonEvents.length > 0 && (
          <View style={[styles.cards, { backgroundColor: theme.colors.blue[800] }]}>
            {moonEvents.map((event, idx) => (
              <View key={idx} style={styles.textContainer}>
                <Text
                  style={[
                    styles.eventType,
                    { fontFamily: fontFamilyForWeight('600'), color: theme.colors.white },
                  ]}
                >
                  {event.type}
                </Text>
                <Text
                  style={[
                    styles.eventDate,
                    {
                      fontFamily: fontFamilyForWeight('400'),
                      // Original: p { color: var(--Colors-Blue-100) }
                      color: theme.colors.blue[100],
                    },
                  ]}
                >
                  {event.date}
                </Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },

  // Original: h2.date-header { text-align:center; 16px/700; color:white; mt:20; mb:10; line-height:150% }
  dateHeader: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 10,
    lineHeight: 24,
  },

  moonCardWrapper: {
    marginBottom: 12,
  },

  calendarWrapper: {
    marginBottom: 12,
  },

  // Original: .cards { display:flex; padding:10px 0; flex-direction:column; center; gap:10; radius:16; bg:Blue-800 }
  cards: {
    borderRadius: 16,
    paddingVertical: 10,
    flexDirection: 'column',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },

  // Original: .text_container { display:flex; width:90%; justify-content:space-between; align-items:flex-start }
  textContainer: {
    flexDirection: 'row',
    width: '90%',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },

  // Original: h2 { color:white; margin:0; font-size:16px }
  eventType: {
    fontSize: 16,
    marginVertical: 0,
  },

  // Original: p { color:var(--Colors-Blue-100); margin:0; font-size:16px }
  eventDate: {
    fontSize: 16,
    marginVertical: 0,
  },

  bottomPadding: {
    height: 40,
  },
});

export default MoonPhaseScreen;

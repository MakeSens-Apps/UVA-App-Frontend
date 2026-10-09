/**
 * B10 — MoonPhaseIcons: Consolidated moon phase icon index
 *
 * Ported from: two separate sets in:
 *   - src/assets/images/Moon/          (ES names — with typos/spaces)
 *   - src/assets/images/icons/Moon/    (EN names)
 *
 * Consolidation decisions:
 *   1. Use the EN keys as canonical names (more robust, no Spanish locale issues)
 *   2. Map BOTH old name sets to the same components
 *   3. Broken filenames FIXED before copying:
 *      - "eclipses_card_home .svg" (space) → eclipses_card_home.svg
 *      - "cuarto_creceiente.svg" (typo)    → cuarto_creciente.svg
 *   4. Expose typed name union for DayComponent / MoonCard / Calendar usage
 *
 * Used by: MoonCardComponent (B11), CalendarComponent (B11), MoonPhasePage (B15)
 *
 * Risks addressed: R-24 (Metro broken names)
 */

import React from 'react';
import type { SvgProps } from 'react-native-svg';

// ─── SVG imports ───────────────────────────────────────────────────────────────
// NOTE: All filenames have been cleaned of spaces/typos before importing.

// Set 1 — src/assets/images/Moon/ (cards/large use)
import NuevaSvg from '@/assets/svg/moon/nueva.svg';
import CuartoCrecienteSvg from '@/assets/svg/moon/cuarto_creciente.svg'; // was cuarto_creceiente.svg
import GibosaCrecienteSvg from '@/assets/svg/moon/gibosa_creciente.svg';
import LlenaSvg from '@/assets/svg/moon/llena.svg';
import GibosaMenguanteSvg from '@/assets/svg/moon/gibosa_menguante.svg';
import CuartoMenguanteSvg from '@/assets/svg/moon/cuarto_menguante.svg';
import EclipsesCardHomeSvg from '@/assets/svg/moon/eclipses_card_home.svg'; // was "eclipses_card_home .svg"

// ─── Phase name union ──────────────────────────────────────────────────────────

/**
 * Canonical moon phase names.
 * Matches the EN keys used in MoonPhaseService (B07) and LUNAR_PHASE constant.
 */
export const MOON_PHASE_NAMES = [
  'new',
  'crescent',
  'Gibosa_crescent',
  'full',
  'Gibosa_declining',
  'declining',
  'eclipse',
] as const;

export type MoonPhaseName = (typeof MOON_PHASE_NAMES)[number];

// ─── Aliases: ES name → canonical EN name ─────────────────────────────────────

/**
 * Maps Spanish asset names (used in the Ionic templates) to canonical phase names.
 * Allows Calendar/MoonCard code that still uses the ES names to resolve correctly.
 */
export const MOON_PHASE_ES_TO_EN: Record<string, MoonPhaseName> = {
  nueva: 'new',
  cuarto_creciente: 'crescent',
  cuarto_creceiente: 'crescent', // original typo — still resolves
  gibosa_creciente: 'Gibosa_crescent',
  llena: 'full',
  gibosa_menguante: 'Gibosa_declining',
  cuarto_menguante: 'declining',
  eclipses_card_home: 'eclipse',
};

// ─── Icon map ──────────────────────────────────────────────────────────────────

type SvgComponent = React.ComponentType<SvgProps>;

const MOON_ICON_MAP: Record<MoonPhaseName, SvgComponent> = {
  new: NuevaSvg,
  crescent: CuartoCrecienteSvg,
  Gibosa_crescent: GibosaCrecienteSvg,
  full: LlenaSvg,
  Gibosa_declining: GibosaMenguanteSvg,
  declining: CuartoMenguanteSvg,
  eclipse: EclipsesCardHomeSvg,
};

// ─── MoonPhaseIcon component ───────────────────────────────────────────────────

export interface MoonPhaseIconProps extends SvgProps {
  /**
   * Phase name — canonical EN or legacy ES.
   * Example: 'new', 'crescent', 'full', 'llena', 'nueva', 'gibosa_creciente'
   */
  phase: string;
}

/**
 * MoonPhaseIcon
 *
 * Renders the SVG for a given moon phase.
 * Accepts both canonical EN names and legacy ES names.
 *
 * @example
 *   <MoonPhaseIcon phase="new" width={48} height={48} />
 *   <MoonPhaseIcon phase="llena" width={32} height={32} />
 */
export function MoonPhaseIcon({
  phase,
  ...svgProps
}: MoonPhaseIconProps): React.JSX.Element {
  // Try canonical EN name first
  let canonicalName = phase as MoonPhaseName;

  // If not a canonical name, try the ES alias map
  if (!MOON_ICON_MAP[canonicalName]) {
    const resolved = MOON_PHASE_ES_TO_EN[phase];
    if (resolved) canonicalName = resolved;
  }

  const IconComponent = MOON_ICON_MAP[canonicalName];

  if (!IconComponent) {
    // Graceful fallback — never crash for unknown phase
    return <></>;
  }

  return <IconComponent {...svgProps} />;
}

export default MoonPhaseIcon;

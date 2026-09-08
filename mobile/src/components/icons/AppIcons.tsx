/**
 * B10 — AppIcons: Static icon index
 *
 * Maps Ionic [src]="dynamic/path" patterns to static React components.
 *
 * In Angular/Ionic, icons were loaded dynamically via:
 *   <ion-icon [src]="'./assets/images/icons/' + name + '.svg'">
 *
 * Metro bundler requires static require() calls — no dynamic paths.
 * This map provides the bridge: name → SVG component (via react-native-svg-transformer).
 *
 * Usage:
 *   import { AppIcon, APP_ICON_NAMES } from '@/components/icons/AppIcons';
 *   <AppIcon name="check" width={24} height={24} />
 *
 * Risks addressed: R-24, R-46
 */

import React from 'react';
import type { SvgProps } from 'react-native-svg';

// ─── SVG imports (static — required by Metro) ─────────────────────────────────

import ArrowRight from '@/assets/svg/icons/arrow-right.svg';
import Brote from '@/assets/svg/icons/brote.svg';
import Calendar from '@/assets/svg/icons/calendar.svg';
import Check from '@/assets/svg/icons/check.svg';
import CheckSaveStreak from '@/assets/svg/icons/checkSaveStreak.svg';
import CheckmarkCircle from '@/assets/svg/icons/checkmark-circle.svg';
import ClipboardCheck from '@/assets/svg/icons/clipboard-check.svg';
import Cloud from '@/assets/svg/icons/cloud.svg';
import ContentCopy from '@/assets/svg/icons/content_copy.svg';
import DateCheck from '@/assets/svg/icons/date_check.svg';
import DateCurrent from '@/assets/svg/icons/date_current.svg';
import DateIncomplete from '@/assets/svg/icons/date_incomplete.svg';
import DateIncompleteToDone from '@/assets/svg/icons/date_incomplete_to_done.svg';
import Exclamation from '@/assets/svg/icons/exclamation.svg';
import Face from '@/assets/svg/icons/face.svg';
import Fire from '@/assets/svg/icons/fire.svg';
import Flor from '@/assets/svg/icons/flor.svg';
import Home from '@/assets/svg/icons/home.svg';
import InformationCircle from '@/assets/svg/icons/information-circle.svg';
import Logop from '@/assets/svg/icons/logop.svg';
import MoreHoriz from '@/assets/svg/icons/more_horiz.svg';
import Notion from '@/assets/svg/icons/notion.svg';
import Platula from '@/assets/svg/icons/platula.svg';
import Refresh from '@/assets/svg/icons/refresh.svg';
import Semilla from '@/assets/svg/icons/semilla.svg';
import ShareOutline from '@/assets/svg/icons/share-outline.svg';
import SwitchHorizontal from '@/assets/svg/icons/switch-horizontal.svg';
import UserCircle from '@/assets/svg/icons/user-circle.svg';
import Whatapp from '@/assets/svg/icons/whatapp.svg';

// Profile icons
import ProfileArrowForward from '@/assets/svg/icons/profile/arrow-forward.svg';
import ProfileExclamation from '@/assets/svg/icons/profile/exclamation.svg';
import ProfileLogout from '@/assets/svg/icons/profile/logout.svg';
import ProfileMedal from '@/assets/svg/icons/profile/Medal.svg';
import ProfileOpen from '@/assets/svg/icons/profile/Open.svg';
import ProfileOptions from '@/assets/svg/icons/profile/Options.svg';
import ProfilePencil from '@/assets/svg/icons/profile/pencil.svg';
import ProfileShareSocial from '@/assets/svg/icons/profile/share-social.svg';
import ProfileTrash from '@/assets/svg/icons/profile/trash.svg';

// Brand / illustration
import Logo from '@/assets/svg/logo.svg';
import LogoMakesens from '@/assets/svg/logo_Makesens.svg';
import LogoNatura from '@/assets/svg/LogoNaturaColombia.svg';
import Background from '@/assets/svg/background.svg';
import CardMoonBg from '@/assets/svg/card_moon_bg.svg';
import Vault from '@/assets/svg/vault.svg';

// ─── Icon name registry ────────────────────────────────────────────────────────

/**
 * All available icon names.
 * Used for type-safe `<AppIcon name="..." />` usage.
 */
export const APP_ICON_NAMES = [
  'arrow-right',
  'brote',
  'calendar',
  'check',
  'checkSaveStreak',
  'checkmark-circle',
  'clipboard-check',
  'cloud',
  'content_copy',
  'date_check',
  'date_current',
  'date_incomplete',
  'date_incomplete_to_done',
  'exclamation',
  'face',
  'fire',
  'flor',
  'home',
  'information-circle',
  'logop',
  'more_horiz',
  'notion',
  'platula',
  'refresh',
  'semilla',
  'share-outline',
  'switch-horizontal',
  'user-circle',
  'whatapp',
  // Profile
  'profile/arrow-forward',
  'profile/exclamation',
  'profile/logout',
  'profile/Medal',
  'profile/Open',
  'profile/Options',
  'profile/pencil',
  'profile/share-social',
  'profile/trash',
  // Brand
  'logo',
  'logo_Makesens',
  'LogoNaturaColombia',
  'background',
  'card_moon_bg',
  'vault',
] as const;

export type AppIconName = (typeof APP_ICON_NAMES)[number];

// ─── Icon map ──────────────────────────────────────────────────────────────────

type SvgComponent = React.ComponentType<SvgProps>;

const ICON_MAP: Record<AppIconName, SvgComponent> = {
  'arrow-right': ArrowRight,
  brote: Brote,
  calendar: Calendar,
  check: Check,
  checkSaveStreak: CheckSaveStreak,
  'checkmark-circle': CheckmarkCircle,
  'clipboard-check': ClipboardCheck,
  cloud: Cloud,
  content_copy: ContentCopy,
  date_check: DateCheck,
  date_current: DateCurrent,
  date_incomplete: DateIncomplete,
  date_incomplete_to_done: DateIncompleteToDone,
  exclamation: Exclamation,
  face: Face,
  fire: Fire,
  flor: Flor,
  home: Home,
  'information-circle': InformationCircle,
  logop: Logop,
  more_horiz: MoreHoriz,
  notion: Notion,
  platula: Platula,
  refresh: Refresh,
  semilla: Semilla,
  'share-outline': ShareOutline,
  'switch-horizontal': SwitchHorizontal,
  'user-circle': UserCircle,
  whatapp: Whatapp,
  // Profile
  'profile/arrow-forward': ProfileArrowForward,
  'profile/exclamation': ProfileExclamation,
  'profile/logout': ProfileLogout,
  'profile/Medal': ProfileMedal,
  'profile/Open': ProfileOpen,
  'profile/Options': ProfileOptions,
  'profile/pencil': ProfilePencil,
  'profile/share-social': ProfileShareSocial,
  'profile/trash': ProfileTrash,
  // Brand
  logo: Logo,
  logo_Makesens: LogoMakesens,
  LogoNaturaColombia: LogoNatura,
  background: Background,
  card_moon_bg: CardMoonBg,
  vault: Vault,
};

// ─── AppIcon component ─────────────────────────────────────────────────────────

export interface AppIconProps extends SvgProps {
  /** Icon name from the registry. */
  name: AppIconName;
}

/**
 * AppIcon
 *
 * Renders a named SVG icon from the app's icon registry.
 * Replaces dynamic `<ion-icon [src]="'assets/icons/' + name + '.svg'">`.
 *
 * @example
 *   <AppIcon name="check" width={24} height={24} color="#69AB3C" />
 *   <AppIcon name="profile/logout" width={20} height={20} />
 */
export function AppIcon({ name, ...svgProps }: AppIconProps): React.JSX.Element {
  const IconComponent = ICON_MAP[name];
  if (!IconComponent) {
    // Graceful fallback — never crash the UI for a missing icon
    return <></>;
  }
  return <IconComponent {...svgProps} />;
}

export default AppIcon;

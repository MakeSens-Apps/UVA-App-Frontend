/**
 * fix-sheet-height-header-tabbar — paridad visual de sheets, cabecera y tab bar.
 *
 * El original Ionic manda. Referencias:
 *
 *   1. ALTURA DE LOS SHEETS
 *      Todo `ion-modal` de la app es `--height: auto` (global.scss:513,
 *      app.component.scss:37, home.page.scss:163, achievement.page.scss:220,
 *      profile.page.scss:206) con `[initialBreakpoint]="1" [breakpoints]="[0, 1]"`,
 *      es decir: la hoja mide EXACTAMENTE lo que mide su contenido, con el viewport
 *      como techo. Medido sobre las capturas del original (360×740):
 *
 *        docs/evidence/home/screen-05-modal-days-states.png        borde y=415 → 44 %
 *        docs/evidence/home/screen-06-modal-days-question.png      borde y=264 → 64 %
 *        docs/evidence/home/screen-07-modal-token-seeds.png        borde y=63  → 91 %
 *        docs/evidence/home/screen-08-modal-token-germination.png  borde y=24  → 97 %
 *        docs/evidence/app-shell/screen-31-profile-share-modal.png borde y=364 → 51 %
 *
 *      Un único `snapPoints={['100%']}` (o cualquier porcentaje fijo) no reproduce
 *      ninguno: `UvaBottomSheet` deriva el detent del contenido medido
 *      (`enableDynamicSizing`) y lo topa en `maxDynamicContentSize`.
 *
 *   2. CABECERA (D-06)
 *      `.header .title { @include text_base(18px, 600) }` (header.component.scss:13):
 *      SemiBold, no Bold. Y `<ion-label>{{ seed }} </ion-label>`
 *      (header.component.html:16) no pinta nada mientras `seed` es undefined — el chip
 *      mide 73 px sin dígito (home/screen-10-header.png) y 84 px con "0"
 *      (home/screen-16-header-seed-count.png). Sustituir el valor por 0 producía un
 *      parpadeo 0 → valor real al entrar.
 *
 *   3. TAB BAR (D-07)
 *      `ion-tab-button { @include text_base(14px, 500) }` (global.scss:317) aplica a
 *      TODOS los tabs: `--color-selected` sólo cambia el color, nunca el peso. Y
 *      `.tab-selected` pinta el fondo sobre el propio `ion-tab-button`, así que el pill
 *      ocupa todo el ancho del tab: en home/screen-04-tab-bar.png (360×83) va de
 *      x=10 a x=122 → 113 px = (360 − 2×10) / 3.
 */

// ─── Mocks (jest hoisting: antes de los imports) ──────────────────────────────
/* eslint-disable @typescript-eslint/no-require-imports */

const mockInsets = { top: 24, bottom: 48, left: 0, right: 0 };

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => mockInsets,
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('@/theme/ThemeProvider', () => {
  const { baseTheme } = require('@/theme/theme');
  return {
    useTheme: () => ({ theme: baseTheme }),
    ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
  };
});

/**
 * Captura las props que `UvaBottomSheet` / `UvaFullBottomSheet` le pasan al
 * BottomSheet real: son ellas (snapPoints / enableDynamicSizing /
 * maxDynamicContentSize) las que definen la altura.
 */
const sheetProps: Record<string, unknown>[] = [];

jest.mock('@gorhom/bottom-sheet', () => {
  const React = require('react');
  const { View } = require('react-native');

  const MockBottomSheet = React.forwardRef(
    (props: Record<string, unknown>, ref: React.Ref<unknown>) => {
      sheetProps.push(props);
      React.useImperativeHandle(ref, () => ({
        close: () => {},
        snapToIndex: () => {},
      }));
      return (
        <View testID="bottom-sheet">{props.children as React.ReactNode}</View>
      );
    },
  );
  MockBottomSheet.displayName = 'MockBottomSheet';

  return {
    __esModule: true,
    default: MockBottomSheet,
    BottomSheetView: ({
      children,
      style,
      testID,
    }: {
      children: React.ReactNode;
      style?: unknown;
      testID?: string;
    }) => (
      <View style={style as never} testID={testID}>
        {children}
      </View>
    ),
    BottomSheetScrollView: ({
      children,
      contentContainerStyle,
      testID,
    }: {
      children: React.ReactNode;
      contentContainerStyle?: unknown;
      testID?: string;
    }) => (
      <View style={contentContainerStyle as never} testID={testID}>
        {children}
      </View>
    ),
    BottomSheetBackdrop: () => null,
  };
});

/* eslint-enable @typescript-eslint/no-require-imports */

// ─── Imports ──────────────────────────────────────────────────────────────────

/* eslint-disable import/first */
import fs from 'fs';
import path from 'path';

import React, { createRef } from 'react';
import { Dimensions, Text } from 'react-native';
import { render, act } from '@testing-library/react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

import {
  UvaBottomSheet,
  UvaFullBottomSheet,
  type BottomSheetRef,
} from '../components/ui/BottomSheet';
import { Header } from '../components/header/Header';
import { UvaTabBar } from '../navigation/UvaTabBar';
/* eslint-enable import/first */

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Aplana un style prop (posiblemente anidado) en un solo objeto. */
function flat(style: unknown): Record<string, unknown> {
  if (Array.isArray(style)) return Object.assign({}, ...style.map(flat));
  if (style === null || style === undefined || style === false) return {};
  return style as Record<string, unknown>;
}

/** Monta el sheet y lo presenta; devuelve las props que recibió el BottomSheet real. */
async function presentSheet(
  element: React.ReactElement,
  ref: React.RefObject<BottomSheetRef | null>,
) {
  const utils = await render(element);
  await act(async () => {
    ref.current?.present();
  });
  return { utils, props: sheetProps[sheetProps.length - 1] ?? {} };
}

function makeTabBarProps(): BottomTabBarProps {
  const routes = [
    { key: 'HomeStack-1', name: 'HomeStack' },
    { key: 'Measurement-1', name: 'Measurement' },
    { key: 'Historical-1', name: 'Historical' },
  ];
  const descriptors = Object.fromEntries(
    routes.map((r) => [r.key, { options: {} }]),
  );
  return {
    state: { index: 0, routes },
    descriptors,
    navigation: {
      emit: () => ({ defaultPrevented: false }),
      navigate: () => {},
    },
    insets: mockInsets,
  } as unknown as BottomTabBarProps;
}

beforeEach(() => {
  sheetProps.length = 0;
  mockInsets.top = 24;
  mockInsets.bottom = 48;
});

// ─── 1. Altura de los sheets ──────────────────────────────────────────────────

describe('UvaBottomSheet — altura por contenido (ion-modal --height: auto)', () => {
  it('no fija snapPoints y activa el dimensionado dinámico', async () => {
    const ref = createRef<BottomSheetRef>();
    const { props } = await presentSheet(
      <UvaBottomSheet ref={ref}>
        <Text>contenido</Text>
      </UvaBottomSheet>,
      ref,
    );

    // Sin snapPoints el detent lo calcula gorhom a partir del contenido medido:
    // es el equivalente RN de `--height: auto`.
    expect(props.snapPoints).toBeUndefined();
    expect(props.enableDynamicSizing).toBe(true);
  });

  it('topa la altura en la ventana menos el inset de la status bar', async () => {
    const ref = createRef<BottomSheetRef>();
    const { props } = await presentSheet(
      <UvaBottomSheet ref={ref}>
        <Text>contenido</Text>
      </UvaBottomSheet>,
      ref,
    );

    // El sheet más alto del original (screen-08) se queda 24px por debajo del borde:
    // `--height: auto` crece con el contenido pero nunca tapa la status bar.
    expect(props.maxDynamicContentSize).toBe(
      Dimensions.get('window').height - 24,
    );
  });

  it('recalcula el techo cuando cambia el inset superior', async () => {
    mockInsets.top = 0;
    const ref = createRef<BottomSheetRef>();
    const { props } = await presentSheet(
      <UvaBottomSheet ref={ref}>
        <Text>contenido</Text>
      </UvaBottomSheet>,
      ref,
    );

    expect(props.maxDynamicContentSize).toBe(Dimensions.get('window').height);
  });

  it('el contenedor de contenido NO lleva flex:1 (definiría la altura que debe medir)', async () => {
    const ref = createRef<BottomSheetRef>();
    const { utils } = await presentSheet(
      <UvaBottomSheet ref={ref}>
        <Text>contenido</Text>
      </UvaBottomSheet>,
      ref,
    );

    const style = flat(utils.getByTestId('bottom-sheet-content').props.style);
    expect(style.flex).toBeUndefined();
    // El inset inferior sigue reservado para la barra de navegación (D-25).
    expect(style.paddingBottom).toBe(24 + 48);
  });

  it('desactiva el dimensionado dinámico si se pasan snapPoints explícitos', async () => {
    const ref = createRef<BottomSheetRef>();
    const { props } = await presentSheet(
      <UvaBottomSheet ref={ref} snapPoints={['40%', '70%']}>
        <Text>contenido</Text>
      </UvaBottomSheet>,
      ref,
    );

    // Si no, gorhom v5 AÑADE el detent de contenido a la lista provista.
    expect(props.snapPoints).toEqual(['40%', '70%']);
    expect(props.enableDynamicSizing).toBe(false);
  });
});

describe('UvaFullBottomSheet — sigue siendo fullscreen por diseño', () => {
  it('mantiene el detent fijo al 100 % y sin dimensionado dinámico', async () => {
    const ref = createRef<BottomSheetRef>();
    const { props } = await presentSheet(
      <UvaFullBottomSheet ref={ref}>
        <Text>contenido</Text>
      </UvaFullBottomSheet>,
      ref,
    );

    expect(props.snapPoints).toEqual(['100%']);
    expect(props.enableDynamicSizing).toBe(false);
  });
});

describe('usos por pantalla — ningún sheet de la app fija su altura', () => {
  // Cada uno de estos `ion-modal` es `--height: auto` en el original, así que ninguno
  // puede llevar un porcentaje fijo: sus alturas medidas van del 44 % al 97 %.
  const screens = [
    ['home/HomeScreen.tsx', 'home.page.html:67,116,170,235'],
    ['measurement/MeasurementScreen.tsx', 'measurement.page.html:100'],
    ['profile/ProfileScreen.tsx', 'profile.page.html:100'],
    ['profile/AchievementScreen.tsx', 'achievement.page.html:28,93'],
    ['profile/PersonalInfoScreen.tsx', 'personal-info.page.html:137,181'],
  ] as const;

  it.each(screens)('%s no pasa snapPoints (original: %s)', (file) => {
    const source = fs.readFileSync(
      path.join(__dirname, '..', 'screens', file),
      'utf8',
    );
    // Sólo el prop; los comentarios que EXPLICAN por qué no se pasa son bienvenidos.
    expect(source).not.toMatch(/snapPoints\s*=\s*\{/);
  });

  it('HomeScreen usa UvaBottomSheet, no la variante fullscreen', () => {
    const source = fs.readFileSync(
      path.join(__dirname, '..', 'screens', 'home', 'HomeScreen.tsx'),
      'utf8',
    );
    // Los 4 modales de Home miden 44/64/91/97 % en el original: ninguno es fullscreen.
    expect(source).not.toMatch(/UvaFullBottomSheet/);
    expect(source.match(/<UvaBottomSheet/g)).toHaveLength(4);
  });
});

// ─── 2. Cabecera ──────────────────────────────────────────────────────────────

describe('Header — chip de semillas sin parpadeo (screen-10 vs screen-16)', () => {
  it('no pinta número mientras seed es null', async () => {
    const { queryByTestId } = await render(
      <Header title="Inicio" seed={null} />,
    );
    expect(queryByTestId('header-seed')).toBeNull();
  });

  it('no pinta número cuando seed no se pasa (aún cargando)', async () => {
    const { queryByTestId, getByTestId } = await render(
      <Header title="Inicio" />,
    );
    // El chip sigue ahí (avatar + semilla), sólo falta el dígito.
    expect(getByTestId('header-profile-btn')).toBeTruthy();
    expect(queryByTestId('header-seed')).toBeNull();
  });

  it('pinta el 0 real cuando el progreso ya se leyó y vale 0', async () => {
    const { getByTestId } = await render(<Header title="Inicio" seed={0} />);
    expect(getByTestId('header-seed').props.children).toBe(0);
  });

  it('pinta el valor cargado', async () => {
    const { getByTestId } = await render(<Header title="Inicio" seed={3} />);
    expect(getByTestId('header-seed').props.children).toBe(3);
  });
});

describe('Header — peso tipográfico del título (D-06)', () => {
  it('usa Montserrat-SemiBold, no Bold', async () => {
    const { getByTestId } = await render(<Header title="Inicio" />);
    // header.component.scss:13 → text_base(18px, 600)
    expect(flat(getByTestId('header-title').props.style).fontFamily).toBe(
      'Montserrat-SemiBold',
    );
  });
});

// ─── 3. Tab bar ───────────────────────────────────────────────────────────────

describe('UvaTabBar — pesos y ancho del pill (D-07)', () => {
  it('pinta todas las etiquetas en peso 500, la activa incluida', async () => {
    const { getByTestId } = await render(<UvaTabBar {...makeTabBarProps()} />);

    // state.index = 0 → HomeStack activo.
    for (const name of ['HomeStack', 'Measurement', 'Historical']) {
      expect(
        flat(getByTestId(`tab-label-${name}`).props.style).fontFamily,
      ).toBe('Montserrat-Medium');
    }
  });

  it('el pill ocupa todo el ancho del tab, no sólo su contenido', async () => {
    const { getByTestId } = await render(<UvaTabBar {...makeTabBarProps()} />);

    const pill = flat(getByTestId('tab-pill-HomeStack').props.style);
    // `.tab-selected` estiliza el propio ion-tab-button → 113px de 113px disponibles.
    expect(pill.alignSelf).toBe('stretch');
    expect(pill.paddingHorizontal).toBeUndefined();
    expect(pill.height).toBe(56);
    expect(pill.borderRadius).toBe(14);
  });

  it('mantiene el padding lateral de 10px de ion-tab-bar', async () => {
    const { getByTestId } = await render(<UvaTabBar {...makeTabBarProps()} />);
    expect(flat(getByTestId('tab-bar').props.style).paddingHorizontal).toBe(10);
  });

  it('sólo la pestaña activa lleva fondo en el pill', async () => {
    const { getByTestId } = await render(<UvaTabBar {...makeTabBarProps()} />);

    expect(
      flat(getByTestId('tab-pill-HomeStack').props.style).backgroundColor,
    ).toBe('#A9F5F8');
    expect(
      flat(getByTestId('tab-pill-Measurement').props.style).backgroundColor,
    ).toBeUndefined();
  });
});

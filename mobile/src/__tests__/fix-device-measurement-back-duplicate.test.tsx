/**
 * Device report — Redmi Note 10S, 2026-09-10 (registro de temperatura y humedad,
 * tarea con flow1 "máximos" → nextFlow flow2 "mínimos").
 *
 *   #1 (ALTA) — Registro DUPLICADO de máximos al usar el botón atrás.
 *      El usuario guardó máximos y pulsó atrás; al volver a la tarea la app le
 *      pidió máximos otra vez y terminó con dos registros de máximos.
 *
 *      Causa raíz: `goToComplete` hacía `navigation.push` del flujo siguiente, así
 *      que la pantalla de máximos YA GUARDADA seguía en la pila justo debajo. El
 *      atrás del sistema la devolvía — montada y rellena — y "Guardar registro"
 *      insertaba un SEGUNDO registro de máximos.
 *      (Descartadas: la lista SÍ recarga con `useFocusEffect`, y `flowsComplete`
 *      SÍ se calcula a partir de los ids guardados — ambas cosas se verifican aquí.)
 *
 *      Arreglo: `navigation.replace` (equivalente nativo del re-entry con
 *      queryParams del original Angular) + guard anti-duplicado en `confirmSave`.
 *
 *   #3 (MEDIA) — Contraste del modal "Verifica los datos" / "… guardados".
 *      Ver CONFIRM_MODAL_BLUR_INTENSITY / CONFIRM_MODAL_BACKDROP_OPACITY.
 */

// ─── Suppress noisy console output from native mocks ──────────────────────────
beforeAll(() => {
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterAll(() => {
  jest.restoreAllMocks();
});

// ─── Module mocks ─────────────────────────────────────────────────────────────
/* eslint-disable @typescript-eslint/no-require-imports */

jest.mock('@/theme/ThemeProvider', () => ({
  useTheme: () => ({
    theme: {
      colors: {
        blue: { 50: '#EDFEFE', 200: '#A9F5F8', 500: '#10BCCA', 600: '#1097AA', 700: '#14788A', 800: '#1A6270' },
        green: { 100: '#E3F2D5', 200: '#C8E6B0', 500: '#69AB3C' },
        white: '#FFFFFF',
        gray: {
          50: '#FAFAFA',
          100: '#F5F5F5',
          200: '#E5E5E5',
          300: '#D4D4D4',
          400: '#A3A3A3',
          500: '#737373',
          600: '#525252',
          700: '#404040',
        },
        orange: { 50: '#FDF9EF', 100: '#FBF0D9', 500: '#E58B24', 800: '#8E481E' },
        danger: '#E5245E',
        background: '#FAFAFA',
      },
      semanticColors: {
        primary: '#10BCCA',
        background: '#FAFAFA',
        text: '#171717',
        textSecondary: '#525252',
        border: '#E5E5E5',
      },
      typography: { sizes: { base: 16, sm: 14, lg: 18, xl: 22, xs: 12 } },
      spacing: { xs: 4, sm: 8, md: 16 },
      brandingOverrides: {},
    },
  }),
}));

jest.mock('@/theme/theme', () => ({
  fontFamilyForWeight: (w: string, italic?: boolean) =>
    `Montserrat-${w}${italic ? 'Italic' : ''}`,
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 48, right: 0, bottom: 24, left: 0 }),
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('react-native-svg', () => {
  const React = require('react');
  const { View } = require('react-native');
  const SvgXml = ({ testID, ...rest }: Record<string, unknown> & { testID?: string }) =>
    React.createElement(View, { testID, ...rest });
  return { Svg: 'Svg', Path: 'Path', G: 'G', SvgXml };
});

const NO_RESTRICTION = {
  activeDays: { enabled: false, days: null },
  activeTime: { enabled: false, start: '06:00', end: '18:00' },
  activeDuration: { enabled: false, duration: null },
  requiredTask: { enabled: false, taskID: null },
};

const NO_ICON = {
  enable: false,
  name: '',
  colorName: '',
  colorHex: '',
  imagePath: null,
};

/**
 * The real RACIMO shape for this bug: ONE task with TWO flows whose measurement
 * ids are distinct (máximos vs mínimos), chained through `nextFlow`.
 */
const mockMeasurementConfig = {
  tasks: {
    task1: {
      name: 'Temperatura y humedad (mañana) 🌡️',
      restrictions: NO_RESTRICTION,
      flows: ['flow1', 'flow2'],
      id: 'task1',
    },
  },
  flows: {
    flow1: {
      name: 'Registro máximos',
      text: '<p>Registros de temperatura y humedad máxima</p>',
      guides: [],
      measurements: ['temperatura_max'],
      restrictions: null,
      nextFlow: 'flow2',
    },
    flow2: {
      name: 'Registro mínimos',
      text: '<p>Registros de temperatura y humedad mínima</p>',
      guides: [],
      measurements: ['temperatura_min'],
      restrictions: null,
      nextFlow: null,
    },
  },
  guides: {},
  measurements: {
    temperatura_max: {
      name: '<span>Temperatura máxima</span>',
      sortName: '<span>temperatura max</span>',
      icon: NO_ICON,
      fields: 2,
      unit: '°C',
      range: { min: 10, max: 38, optionalMessage: '' },
      style: {
        backgroundColor: { colorName: 'orange', colorHex: '#FDF9EF' },
        borderColor: { colorName: 'orange', colorHex: '#F7DFB1' },
      },
    },
    temperatura_min: {
      name: '<span>Temperatura mínima</span>',
      sortName: '<span>temperatura min</span>',
      icon: NO_ICON,
      fields: 2,
      unit: '°C',
      range: { min: 5, max: 38, optionalMessage: '' },
      style: {
        backgroundColor: { colorName: 'blue', colorHex: '#EDFEFE' },
        borderColor: { colorName: 'blue', colorHex: '#A9F5F8' },
      },
    },
  },
  bonus: {},
  historical: [],
};

const mockConfigContextValue = {
  configMeasurement: mockMeasurementConfig,
  countTasks: () => 1,
  loadImage: jest.fn().mockResolvedValue(null),
  getConfigurationMeasurement: jest.fn().mockResolvedValue(mockMeasurementConfig),
  configApp: null,
  configColors: null,
  getConfigurationApp: jest.fn(),
  getConfigurationColors: jest.fn(),
  downLoadData: jest.fn(),
  configExists: jest.fn(),
  clearCache: jest.fn(),
  loadBranding: jest.fn(),
};

jest.mock('@/state/ConfigContext', () => ({
  useConfigContext: () => mockConfigContextValue,
}));

jest.mock('@/state/SessionContext', () => ({
  useSessionContext: () => ({
    session: { phone: '+573000000002', userID: 'user-1', uvaID: 'uva-1' },
    isLoaded: true,
    setSession: jest.fn(),
    clearSession: jest.fn(),
    refreshSession: jest.fn(),
  }),
}));

jest.mock('@/components/rich-text/RichText', () => ({
  RichText: ({ html }: { html: string }) => {
    const { Text } = require('react-native');
    return <Text testID="rich-text">{html}</Text>;
  },
}));

jest.mock('@/components/ui/ProgressBar', () => ({
  ProgressBar: () => {
    const { View } = require('react-native');
    return <View testID="progress-bar" />;
  },
}));

jest.mock('@/components/ui/BottomSheet', () => {
  const React = require('react');
  const MockSheet = React.forwardRef((_p: unknown, ref: React.Ref<unknown>) => {
    React.useImperativeHandle(ref, () => ({ present: jest.fn(), dismiss: jest.fn() }));
    return null;
  });
  MockSheet.displayName = 'MockSheet';
  return { UvaBottomSheet: MockSheet };
});

const mockAddMeasurement = jest.fn().mockResolvedValue(undefined);
const mockGetMeasurementsByDay = jest.fn().mockResolvedValue([]);
jest.mock('@/data/datastore/measurement-ds', () => ({
  MeasurementDSService: {
    addMeasurement: (...a: unknown[]) => mockAddMeasurement(...a),
    getMeasurementsByDay: (...a: unknown[]) => mockGetMeasurementsByDay(...a),
  },
}));

jest.mock('@/data/datastore/user-progress-ds', () => ({
  UserProgressDSService: {
    getLastUserProgressPure: jest.fn().mockResolvedValue(null),
    getLastUserProgress: jest.fn().mockResolvedValue(null),
  },
}));

jest.mock('@/domain/gamification/gamification', () => ({
  GamificationService: {
    completeTaskProcess: jest.fn().mockResolvedValue(true),
    surpriseTaskProcess: jest.fn().mockResolvedValue(true),
  },
}));

jest.mock('@/data/storage/preferences', () => ({
  Preferences: {
    get: jest.fn().mockResolvedValue({ value: null }),
    set: jest.fn().mockResolvedValue(undefined),
    remove: jest.fn().mockResolvedValue(undefined),
    clear: jest.fn().mockResolvedValue(undefined),
  },
  LAST_MEASUREMENT_VALUES_KEY: 'lastMeasurementValues',
}));

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn(), push: jest.fn(), replace: jest.fn() }),
  useFocusEffect: (cb: () => void | (() => void)) => {
    const React = require('react');
    React.useEffect(() => {
      const cleanup = cb();
      return typeof cleanup === 'function' ? cleanup : undefined;
    }, []);
  },
  useRoute: () => ({ params: {} }),
}));

jest.mock('expo-blur', () => {
  const { View } = require('react-native');
  return { BlurView: View };
});

/* eslint-enable @typescript-eslint/no-require-imports */

/* eslint-disable import/first */
import React from 'react';
import { StyleSheet } from 'react-native';
import type { ViewStyle } from 'react-native';
import { act, render, fireEvent, waitFor } from '@testing-library/react-native';

import { MeasurementScreen } from '@/screens/measurement/MeasurementScreen';
import {
  RegisterMeasurementScreen,
  CONFIRM_MODAL_BLUR_INTENSITY,
  CONFIRM_MODAL_BACKDROP_OPACITY,
} from '@/screens/measurement/RegisterMeasurementScreen';
/* eslint-enable import/first */

// ─── Helpers ──────────────────────────────────────────────────────────────────

function flattenStyle<T>(style: unknown): T {
  return (StyleSheet.flatten(style as never) ?? {}) as T;
}

/** One stored DataStore row: the máximos flow already saved today. */
const SAVED_MAXIMOS = {
  task: 'task1',
  ts: new Date().toISOString(),
  data: JSON.stringify({ temperatura_max: 28 }),
};

function makeRegisterProps(flowId: string) {
  const navigation = {
    navigate: jest.fn(),
    goBack: jest.fn(),
    push: jest.fn(),
    replace: jest.fn(),
  };
  const route = { params: { taskId: 'task1', taskName: 'Registro máximos', flowId } };
  return {
    navigation,
    route,
  } as unknown as React.ComponentProps<typeof RegisterMeasurementScreen> & {
    navigation: { replace: jest.Mock; push: jest.Mock; navigate: jest.Mock };
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockAddMeasurement.mockResolvedValue(undefined);
  mockGetMeasurementsByDay.mockResolvedValue([]);
});

// ─── ════════════════════════════════════════════════════════════════════════ ─
//     #1 — reabrir la tarea después de guardar máximos debe abrir MÍNIMOS
// ─── ════════════════════════════════════════════════════════════════════════ ─

describe('#1 — volver a la lista y reabrir la tarea abre el flujo pendiente', () => {
  it('con máximos ya guardados, la tarea sigue pendiente y goToRegister abre flow2', async () => {
    mockGetMeasurementsByDay.mockResolvedValue([SAVED_MAXIMOS]);

    const { getByTestId, getByText } = await render(<MeasurementScreen />);

    // La lista SÍ se recarga al enfocar (useFocusEffect) y la tarea NO se marca
    // completa con sólo un flujo guardado.
    await waitFor(() => expect(getByTestId('task-row-task1')).toBeTruthy());
    expect(getByText('Registros sin completar')).toBeTruthy();

    // …y al reabrirla debe pedir MÍNIMOS, no máximos otra vez.
    fireEvent.press(getByTestId('task-row-task1'));
    expect(mockNavigate).toHaveBeenCalledWith(
      'RegisterMeasurement',
      expect.objectContaining({ taskId: 'task1', flowId: 'flow2' }),
    );
    expect(mockNavigate).not.toHaveBeenCalledWith(
      'RegisterMeasurement',
      expect.objectContaining({ flowId: 'flow1' }),
    );
  });

  it('sin nada guardado hoy, la tarea abre flow1 (máximos)', async () => {
    const { getByTestId } = await render(<MeasurementScreen />);

    await waitFor(() => expect(getByTestId('task-row-task1')).toBeTruthy());
    fireEvent.press(getByTestId('task-row-task1'));

    expect(mockNavigate).toHaveBeenCalledWith(
      'RegisterMeasurement',
      expect.objectContaining({ taskId: 'task1', flowId: 'flow1' }),
    );
  });

  it('con los dos flujos guardados, la tarea pasa a "Registros completados"', async () => {
    mockGetMeasurementsByDay.mockResolvedValue([
      SAVED_MAXIMOS,
      { task: 'task1', ts: new Date().toISOString(), data: JSON.stringify({ temperatura_min: 14 }) },
    ]);

    const { getByTestId, getByText, queryByText } = await render(<MeasurementScreen />);

    await waitFor(() => expect(getByTestId('task-completed-task1')).toBeTruthy());
    expect(getByText('Registros completados')).toBeTruthy();
    expect(queryByText('Registros sin completar')).toBeNull();
  });
});

// ─── ════════════════════════════════════════════════════════════════════════ ─
//     #1 — avance multi-flujo con REPLACE (la pantalla guardada sale de la pila)
// ─── ════════════════════════════════════════════════════════════════════════ ─

describe('#1 — "Siguiente" reemplaza la pantalla ya guardada (no la apila)', () => {
  it('goToComplete usa replace, nunca push', async () => {
    const props = makeRegisterProps('flow1');
    const { getByTestId } = await render(
      <RegisterMeasurementScreen navigation={props.navigation} route={props.route} />,
    );

    await waitFor(() => expect(getByTestId('digit-input-0-0')).toBeTruthy());

    await act(async () => {
      fireEvent.changeText(getByTestId('digit-input-0-0'), '2');
      fireEvent.changeText(getByTestId('digit-input-0-1'), '8');
    });
    await act(async () => {
      fireEvent.press(getByTestId('save-button'));
    });
    await act(async () => {
      fireEvent.press(getByTestId('confirm-save-button'));
    });

    await waitFor(() => expect(getByTestId('next-flow-button')).toBeTruthy());
    await act(async () => {
      fireEvent.press(getByTestId('next-flow-button'));
    });

    // El bug: `push` dejaba la pantalla de máximos DEBAJO, y el atrás del sistema
    // devolvía a ese formulario ya guardado → segundo registro de máximos.
    expect(props.navigation.push).not.toHaveBeenCalled();
    expect(props.navigation.replace).toHaveBeenCalledTimes(1);
    expect(props.navigation.replace).toHaveBeenCalledWith(
      'RegisterMeasurement',
      expect.objectContaining({ taskId: 'task1', flowId: 'flow2', hasBackButton: false }),
    );
  });
});

// ─── ════════════════════════════════════════════════════════════════════════ ─
//     #1 — guard anti-duplicado (mejora mínima: el original NO lo tiene)
// ─── ════════════════════════════════════════════════════════════════════════ ─

describe('#1 — guard anti-duplicado del mismo flujo en el mismo día', () => {
  it('NO vuelve a insertar máximos si ya están guardados hoy, pero sí avanza', async () => {
    mockGetMeasurementsByDay.mockResolvedValue([SAVED_MAXIMOS]);

    const props = makeRegisterProps('flow1');
    const { getByTestId } = await render(
      <RegisterMeasurementScreen navigation={props.navigation} route={props.route} />,
    );

    await waitFor(() => expect(getByTestId('digit-input-0-0')).toBeTruthy());
    await act(async () => {
      fireEvent.changeText(getByTestId('digit-input-0-0'), '2');
      fireEvent.changeText(getByTestId('digit-input-0-1'), '8');
    });
    await act(async () => {
      fireEvent.press(getByTestId('save-button'));
    });
    await act(async () => {
      fireEvent.press(getByTestId('confirm-save-button'));
    });

    await waitFor(() => expect(getByTestId('next-flow-button')).toBeTruthy());
    // El registro duplicado NUNCA llega al DataStore…
    expect(mockAddMeasurement).not.toHaveBeenCalled();
    // …y el usuario puede seguir a mínimos igualmente.
    expect(getByTestId('next-flow-button')).toBeTruthy();
  });

  it('un registro de OTRO flujo del mismo día no bloquea el guardado', async () => {
    // mínimos guardados, se está registrando máximos → debe insertar.
    mockGetMeasurementsByDay.mockResolvedValue([
      { task: 'task1', ts: new Date().toISOString(), data: JSON.stringify({ temperatura_min: 14 }) },
    ]);

    const props = makeRegisterProps('flow1');
    const { getByTestId } = await render(
      <RegisterMeasurementScreen navigation={props.navigation} route={props.route} />,
    );

    await waitFor(() => expect(getByTestId('digit-input-0-0')).toBeTruthy());
    await act(async () => {
      fireEvent.changeText(getByTestId('digit-input-0-0'), '2');
      fireEvent.changeText(getByTestId('digit-input-0-1'), '8');
    });
    await act(async () => {
      fireEvent.press(getByTestId('save-button'));
    });
    await act(async () => {
      fireEvent.press(getByTestId('confirm-save-button'));
    });

    await waitFor(() => expect(mockAddMeasurement).toHaveBeenCalledTimes(1));
    expect(mockAddMeasurement).toHaveBeenCalledWith(
      'RAW',
      { temperatura_max: 28 },
      {},
      expect.any(String),
      'task1',
    );
  });

  it('sin nada guardado hoy, guarda normalmente', async () => {
    const props = makeRegisterProps('flow1');
    const { getByTestId } = await render(
      <RegisterMeasurementScreen navigation={props.navigation} route={props.route} />,
    );

    await waitFor(() => expect(getByTestId('digit-input-0-0')).toBeTruthy());
    await act(async () => {
      fireEvent.changeText(getByTestId('digit-input-0-0'), '3');
      fireEvent.changeText(getByTestId('digit-input-0-1'), '0');
    });
    await act(async () => {
      fireEvent.press(getByTestId('save-button'));
    });
    await act(async () => {
      fireEvent.press(getByTestId('confirm-save-button'));
    });

    await waitFor(() => expect(mockAddMeasurement).toHaveBeenCalledTimes(1));
  });

  it('si la consulta del guard falla, el guardado NO se bloquea', async () => {
    mockGetMeasurementsByDay.mockRejectedValue(new Error('datastore down'));

    const props = makeRegisterProps('flow1');
    const { getByTestId } = await render(
      <RegisterMeasurementScreen navigation={props.navigation} route={props.route} />,
    );

    await waitFor(() => expect(getByTestId('digit-input-0-0')).toBeTruthy());
    await act(async () => {
      fireEvent.changeText(getByTestId('digit-input-0-0'), '2');
      fireEvent.changeText(getByTestId('digit-input-0-1'), '8');
    });
    await act(async () => {
      fireEvent.press(getByTestId('save-button'));
    });
    await act(async () => {
      fireEvent.press(getByTestId('confirm-save-button'));
    });

    await waitFor(() => expect(mockAddMeasurement).toHaveBeenCalledTimes(1));
  });
});

// ─── ════════════════════════════════════════════════════════════════════════ ─
//     #3 — contraste del backdrop del modal de confirmación / guardado
// ─── ════════════════════════════════════════════════════════════════════════ ─

describe('#3 — backdrop del modal "Verifica los datos" / "… guardados"', () => {
  /**
   * Medición sobre las capturas originales (docs/evidence/measurement), ratio
   * por píxel de la banda teal del header, captura con modal ÷ captura sin modal:
   *   screen-03 (guía, ion-modal con backdrop por defecto) → 0.318 ≈ 0.32
   *   screen-20 (modal de confirmación)                    → 0.000 (no oscurece)
   * El modal de confirmación declara `--backdrop-opacity: 0.5` pero anula el negro
   * con `::part(backdrop) { background: transparent }`, así que TODA la separación
   * viene de `backdrop-filter: blur(20px)`.
   *
   * En RN ese blur no es reproducible: el modal es un `Modal` nativo (ventana
   * propia) y expo-blur 56 usa `blurMethod: 'none'` por defecto en Android, así que
   * `<BlurView>` degrada a un rectángulo plano `getBackgroundColor(intensity,tint)`.
   * Con el `intensity={80} tint="light"` anterior eso era `rgba(249,249,249,0.624)`:
   * un lavado BLANCO del 62 % que ACLARA el fondo — el "se ve poco oscurecido" del
   * reporte. Se sustituye por tinte neutro + capa oscura explícita a 0.32.
   */
  async function openConfirm() {
    const props = makeRegisterProps('flow1');
    const utils = await render(
      <RegisterMeasurementScreen navigation={props.navigation} route={props.route} />,
    );
    await waitFor(() => expect(utils.getByTestId('digit-input-0-0')).toBeTruthy());
    await act(async () => {
      fireEvent.changeText(utils.getByTestId('digit-input-0-0'), '2');
      fireEvent.changeText(utils.getByTestId('digit-input-0-1'), '8');
    });
    await act(async () => {
      fireEvent.press(utils.getByTestId('save-button'));
    });
    await waitFor(() => expect(utils.getByTestId('confirm-save-button')).toBeTruthy());
    return utils;
  }

  it('pins the blur intensity to the CSS blur(20px) of the original', async () => {
    const { getByTestId } = await openConfirm();
    const blur = getByTestId('modal-backdrop-blur');
    expect(CONFIRM_MODAL_BLUR_INTENSITY).toBe(20);
    expect(blur.props.intensity).toBe(CONFIRM_MODAL_BLUR_INTENSITY);
  });

  it('no vuelve a usar el lavado blanco (tint "light" al 80)', async () => {
    const { getByTestId } = await openConfirm();
    const blur = getByTestId('modal-backdrop-blur');
    // rgba(249,249,249, 0.8*0.78) era el rectángulo blanco del device.
    expect(blur.props.tint).not.toBe('light');
    expect(blur.props.tint).toBe('default');
    expect(blur.props.intensity).toBeLessThan(80);
  });

  it('pinta una capa oscura a la opacidad de backdrop que Ionic realmente renderiza', async () => {
    const { getByTestId } = await openConfirm();

    expect(CONFIRM_MODAL_BACKDROP_OPACITY).toBe(0.32);

    const scrim = flattenStyle<ViewStyle>(
      getByTestId('modal-backdrop-scrim').props.style,
    );
    expect(scrim.position).toBe('absolute');
    expect(scrim.backgroundColor).toBe('#000000');
    expect(scrim.opacity).toBe(CONFIRM_MODAL_BACKDROP_OPACITY);
    expect(scrim.top).toBe(0);
    expect(scrim.bottom).toBe(0);
    expect(scrim.left).toBe(0);
    expect(scrim.right).toBe(0);
  });

  it('la capa oscura no captura toques ni tapa el contenido del modal', async () => {
    const { getByTestId } = await openConfirm();
    expect(getByTestId('modal-backdrop-scrim').props.pointerEvents).toBe('none');
    // El contenido se monta DESPUÉS del scrim, así que queda por encima.
    expect(getByTestId('confirm-modal-wrapper')).toBeTruthy();
  });

  it('el mismo backdrop cubre la fase "guardados"', async () => {
    const { getByTestId } = await openConfirm();
    await act(async () => {
      fireEvent.press(getByTestId('confirm-save-button'));
    });
    await waitFor(() => expect(getByTestId('next-flow-button')).toBeTruthy());

    const scrim = flattenStyle<ViewStyle>(
      getByTestId('modal-backdrop-scrim').props.style,
    );
    expect(scrim.opacity).toBe(CONFIRM_MODAL_BACKDROP_OPACITY);
    expect(getByTestId('modal-backdrop-blur').props.intensity).toBe(
      CONFIRM_MODAL_BLUR_INTENSITY,
    );
  });
});

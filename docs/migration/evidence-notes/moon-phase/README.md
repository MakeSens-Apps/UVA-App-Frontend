# Inventario visual — Fase lunar

> Fase 2 de la migración Ionic/Angular → React Native (Expo).
> Capturas tomadas el 2026-06-12 con usuario de prueba 3000000002.
> Viewport: Samsung Galaxy S8 — 360 × 740 px (CSS), DPR 3.

---

## Flujo recorrido paso a paso

1. Login con usuario 3000000002 (sin OTP). Workaround DataStore: `goto /app/tabs/home`.
2. Captura de la pantalla **Home** con la tarjeta de fase lunar visible en la parte inferior.
3. Scroll en Home para mostrar la tarjeta de fase lunar en primer plano.
4. Captura de detalle (elemento) de la tarjeta de fase lunar en Home (fondo gris oscuro, con flecha).
5. Click en la tarjeta → navegación a `/app/tabs/moon-phase`.
6. Captura de la página completa de "Calendario lunar" (entra toda en el viewport).
7. Captura de elementos individuales: tarjeta con fondo verde, calendario lunar, sección de próximos eventos, header con botón back.
8. Regreso a Home con el botón back del header.
9. Cierre del browser.

---

## Condiciones de la sesión

| Variable             | Valor                                                     |
| -------------------- | --------------------------------------------------------- |
| Usuario              | 3000000002                                                |
| Fecha de la sesión   | 2026-06-12 (jueves 11 de junio según el dispositivo)      |
| Mes mostrado         | Junio 2026                                                |
| Fase actual mostrada | Cuarto menguante                                          |
| Próximos eventos     | Luna Nueva: lun 15 de junio / Luna Llena: lun 29 de junio |
| Semillas del usuario | 0                                                         |

---

## Capturas

| #   | Archivo                                  | Descripción                                                                                                                                                                                                                                        |
| --- | ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 01  | `screen-01-home-moon-card.png`           | Home completo con la tarjeta de fase lunar visible al fondo de la pantalla (fondo gris oscuro, ícono de cuarto menguante, texto "Fase lunar / Cuarto menguante", flecha → a la derecha)                                                            |
| 02  | `screen-02-home-moon-card-scrolled.png`  | Home con scroll adicional (confirma que la tarjeta queda fija al fondo y no hay más contenido debajo)                                                                                                                                              |
| 03  | `screen-03-home-moon-card-closeup.png`   | Detalle del elemento `moon-card` en Home: fondo `--Colors-Gray-700` (#3C3C3C aprox.), ícono SVG de luna 56×56 px, etiqueta "Fase lunar" (gris claro, 14 px), nombre de fase en blanco 18 px/600, ícono de flecha derecha (`arrow-forward-outline`) |
| 04  | `screen-04-moon-phase-page-top.png`      | Página completa "Calendario lunar": header teal con back button y seed counter, mes "Junio", tarjeta con fondo `--Colors-Blue-800` (teal oscuro), calendario lunar del mes con ícono de fase por día, sección de próximos eventos                  |
| 05  | `screen-05-moon-phase-page-scrolled.png` | Misma página tras scroll — confirma que todo el contenido cabe en el viewport (no hay scroll real)                                                                                                                                                 |
| 06  | `screen-06-moon-phase-card-green.png`    | Detalle de la tarjeta `moon-card` en la página dedicada: misma estructura que en Home pero con `background="green"` → `--Colors-Blue-800` (#1A6270), sin flecha (`hasArrow=false`)                                                                 |
| 07  | `screen-07-moon-calendar-grid.png`       | Grid del calendario lunar: 7 columnas (D L M M J V S), cada celda tiene un ícono SVG de fase lunar + número de día, el día actual (11) destacado con fondo circular teal                                                                           |
| 08  | `screen-08-moon-events-section.png`      | Sección "próximos eventos lunares": fondo `--Colors-Blue-800`, cada item es una fila con nombre del evento (blanco, bold) a la izquierda y fecha formateada en español (color azul claro) a la derecha                                             |
| 09  | `screen-09-moon-phase-header.png`        | Header de la página "Calendario lunar": fondo teal (`--Colors-Teal-500`), flecha back a la izquierda, título centrado "Calendario lunar", contador de semillas + avatar a la derecha                                                               |
| 10  | `screen-10-home-full-view.png`           | Home completo desde el inicio mostrando: header, fecha del día, widget de racha, calendario semanal, sección de progreso/semillas, tarjeta de fase lunar, barra de tabs                                                                            |

---

## Variantes NO capturadas

| Variante                                                             | Razón                                                                                                                                                               |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fase "Luna nueva" en la tarjeta                                      | La fase actual es "Cuarto menguante". Para capturar otra fase habría que cambiar la fecha del sistema o mockear el servicio — fuera del alcance de este inventario. |
| Fase "Luna llena" en la tarjeta                                      | Igual que la anterior.                                                                                                                                              |
| Fase "Cuarto creciente" en la tarjeta                                | Igual.                                                                                                                                                              |
| Fase "Menguante gibosa" / "Menguante creciente" en la tarjeta        | Igual.                                                                                                                                                              |
| Estado de error en `MoonPhasePage` (red fail / datos no disponibles) | No hay UI de error explícita en la página (según screens.md y el código, los errores se loguean en consola); no fue posible forzar un error de red de forma segura. |
| Estado de carga/loading en `MoonPhasePage`                           | No existe indicador de carga explícito en el template — la página muestra los datos cuando la promesa resuelve o queda vacía sin feedback visual.                   |
| Página lunar en un mes diferente a Junio                             | El servicio carga siempre el mes actual; no hay controles de navegación mes a mes en la página lunar.                                                               |
| Home sin datos de fase lunar (error de API)                          | No fue posible forzar falla sin contaminar sesión.                                                                                                                  |

---

## Notas visuales para el implementador React Native

1. **Dos variantes de fondo de `MoonCard`**: `background="gray"` usa `--Colors-Gray-700` (en Home), `background="green"` usa `--Colors-Blue-800` (#1A6270) (en la página dedicada). El cambio es solo de `backgroundColor` en la tarjeta.

2. **Superposición de imagen "eclipses"**: La tarjeta tiene un SVG decorativo (`eclipses_card_home.svg`) posicionado `absolute` sobre toda la tarjeta. En React Native se implementa con `position: 'absolute'` + `resizeMode: 'contain'` + `pointerEvents="none"` para que no intercepte toques. Fue este overlay el que bloqueó el click directo de Playwright en la prueba.

3. **Icono de luna**: SVG dinámico según la fase. Los 6 SVGs están en `assets/images/Moon/` (`nueva.svg`, `llena.svg`, `cuarto_creceiente.svg`, `cuarto_menguante.svg`, `gibosa_menguante.svg`, `gibosa_creciente.svg`). Todos son círculos de **56×56 px** con sombra ligera y fondo oscuro.

4. **Calendar en modo lunar**: El `CalendarComponent` con `typeCalendar="moon"` muestra solo íconos de fase por día (sin colores de completitud). El día actual tiene un círculo de fondo teal. Las fases se pasan vía `@Input() phaseMoonDays: DailyPhaseCalendar[]` (array de `{day, status}`).

5. **Sección de próximos eventos**: Lista de objetos `{type: 'Luna Nueva'|'Luna Llena', date: string}`. Cada item es una fila con justify-content: space-between. Solo se muestran los dos próximos eventos del mes. La fecha usa `toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit', month: 'long' })`.

6. **Fondo de página**: `MoonPhasePage` tiene `ion-content::part(background)` → `--Colors-Blue-900` (azul muy oscuro). En React Native se aplica como `backgroundColor` en el `ScrollView` o `SafeAreaView`.

7. **Sin estados vacíos ni loading**: La página no tiene feedback visual mientras carga. Si los datos no llegan, la tarjeta queda con valores por defecto (`FULL_MOON`/`Luna llena`) y el calendario queda vacío. Replicar este comportamiento en RN: mostrar placeholders o estado vacío explícito.

8. **Interacción**: El único gesto interactivo es el tap en la `MoonCard` del Home que navega a `/app/tabs/moon-phase`. En la página dedicada no hay interacciones (solo back). En RN usar `Pressable` o `TouchableOpacity` envolviendo la tarjeta completa, con `pointerEvents` en `none` para la imagen overlay.

9. **Header con seed counter**: El header de `MoonPhasePage` muestra el conteo de semillas del usuario (`seed`) junto al ícono de semilla y el avatar. El seed se actualiza en `ionViewWillEnter` (equivalente RN: `useFocusEffect`).

10. **Background del header**: Teal (`--Colors-Teal-500` / ~#00B4CC aprox.) igual que el header del Home. El título "Calendario lunar" está centrado. El botón back navega a `/app/tabs/home`.

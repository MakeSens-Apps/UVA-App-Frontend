# Verificación de la migración Ionic → React Native — documento vivo

**Fase:** 6 (paridad visual) / 8 (hardening B19) — en curso.
**Última actualización:** 2026-09-08.
**Rama:** `feature/ionic-to-react-native`.

Este documento se actualiza a medida que avanza la ronda de verificación en
device real y el hardening de B19 (`docs/migration/plan.md` §B19). No
reemplaza la evidencia cruda (`docs/evidence/`); la resume y le da estado.

---

## 1. Resumen del estado

- **Fases 1–5** (scaffold, Amplify/DataStore, capa de datos, componentes,
  pantallas B01–B18, SLICE de demo B13) — **hechas**. Todas las pantallas y
  servicios de la matriz de portabilidad tienen su contraparte RN portada y
  con Jest verde.
- **B19** (hardening + paridad visual Fase 6 + cutover final) — **pendiente**.
  Este documento cubre la porción de hardening de TypeScript/código muerto
  hecha en esta ronda; el resto del checklist de B19 (§4) sigue abierto.
- **Primera ronda de verificación en device físico real:** 2026-09-07, sobre
  un Redmi Note 10S (Android 13, MIUI 14, 1080×2400 @440dpi). Produjo:
  - `docs/evidence/device-findings-2026-09-07.md` (hallazgos F-01…F-11 del
    recorrido inicial).
  - `docs/evidence/device-2026-09-07/review-frames-021-090.md`,
    `review-frames-091-165.md`, `review-frames-166-239.md` (revisión frame a
    frame, hallazgos D-01…D-44 / D1…D17 según el rango).
  - Dos rondas de fixes ya commiteadas en respuesta a esos hallazgos:
    `24545a5` (edge-to-edge, AsyncStorage 200 MB, gráfica SVG, paridad
    Home/medición/historial) y `c5eec23` (perfil, headers, configuración y
    auth alineados al original).

---

## 2. Tabla de bugs de device

Cruce de `device-findings-2026-09-07.md` + los tres `review-frames-*.md`
contra los cuerpos de commit de `24545a5` y `c5eec23` (`git show --stat` /
`git show -s --format=%B`). Estado:

- **CORREGIDO** = el commit dice explícitamente que lo arregló; pendiente de
  volver a validar visualmente en device (no hay una segunda captura en
  `docs/evidence/` que lo confirme).
- **ABIERTO** = no aparece mencionado como resuelto en ninguno de los dos
  commits.
- **HEREDADO** = comportamiento igual al original Ionic; no se cambia.
- **DECISIÓN DEL USUARIO** = el usuario decidió explícitamente no corregirlo
  (ver lista fija más abajo).

| ID | Hallazgo (resumen) | Estado |
|---|---|---|
| F-01 | Franja gris vertical en Login | CORREGIDO — `24545a5` ("franja gris del Login"); confirmado OK en `review-frames-021-090.md` punto (b). |
| F-02 | Splash nativo con icono placeholder de Expo | CORREGIDO — `24545a5` ("splash/icono placeholder"); confirmado OK en `review-frames-021-090.md` punto (g), aunque queda D-42 (recuadro cuadrado teal en el splash JS) ABIERTO. |
| F-03 | Sonido 'default' no encontrado (notificaciones) | CORREGIDO — `24545a5` ("sonido 'default'"). Sin confirmación visual posterior (no aplica, es un warning de log). |
| F-04 | DataStore arranca antes del login (ruido de subscriptionError) | HEREDADO — el original también arranca DataStore antes de autenticar (`splash-animation.page.ts:75-77`); ruido de logs esperado, sin impacto funcional. No se cambia. |
| F-05 | Warnings "Amplify has not been configured" en import-time | ABIERTO (BAJA) — warnings de import-time; sin impacto funcional. Candidato a B19. |
| F-06 | Tab bar bajo la barra de navegación de Android | CORREGIDO — `24545a5` ("Tab bar y footers bajo la nav bar... edge-to-edge"); confirmado OK en `review-frames-021-090.md` punto (a). |
| F-07 | FileNotFoundException leyendo config.json (carrera lectura/descarga) | ABIERTO (BAJA) — carrera lectura/descarga de config.json; la app se recupera sola. Candidato a B19. |
| F-08 | Dígitos recortados en RegisterMeasurement | CORREGIDO — `24545a5` ("Dígitos recortados"); confirmado OK en `review-frames-021-090.md` punto (c). |
| F-09 | Rich text plano en nativo (negritas/colores perdidos) | CORREGIDO — `24545a5` ("Rich text plano en nativo: RNRH pierde defaultProps..."); confirmado OK en `review-frames-021-090.md` punto (d). |
| F-10 | Faltan flechas ↑ verdes junto a tarjetas; icono "i" cuadrado | CORREGIDO en `24545a5` (pendiente de validar en device): flechas ↑/↓ desde el SVG del RACIMO vía `ConfigIcon` (antes `<Image>` no decodificaba SVG) e icono "i" circular `information-circle.svg` (D-26/D-30/D-31). |
| F-11 | Guía: X bajo la barra de estado; "Entendido" bajo la nav bar | CORREGIDO en `24545a5` (pendiente de validar en device). La X con inset superior entró en la primera tanda y el revisor la confirmó (punto (e)); el fallo de "Entendido" (punto (f)/D-25) se observó en frames capturados ANTES de la segunda tanda del mismo commit, que añadió `paddingBottom + insets.bottom` al contenedor de botones (`GuideMeasurementScreen.tsx:444`), más backdrop 0.32 y drag handle (D-14/D-29). |
| D-01 (091–165, gráfica histórico vacía) | Gráfica del histórico vacía ≥21s | CORREGIDO — `24545a5` ("Gráfica del histórico vacía en nativo... una sola implementación SVG nativo+web"); pendiente de reconfirmar con captura posterior a ese fix específico. |
| D-01/D-02/D-09/D-10/D-37 (021–090, tarjetas Home y modales) | Tarjetas Home sin estructura, círculos grises en días futuros, modales de semillas/racha invertidos o rotos | CORREGIDO en `24545a5` (pendiente de validar en device): tarjetas `.cards` gris con caja interior blanca, `Day` sin fondo en futuros/sin registro, modales de semillas y de ejemplo de racha reconstruidos con los assets originales, ✕ y drag handle en sheets (agente Home/calendarios). |
| D-16 (091–165, avatar de Perfil invisible) | Avatar de Perfil casi invisible | CORREGIDO — `c5eec23` ("Perfil: avatar y logo sin fade de Image (parecían invisibles)"). |
| D-06 back button minimize (F-12 del usuario) | Minimizar desde Home reportado como bug | CORREGIDO — `24545a5` ("Botón atrás cerraba la app: handler nunca montado y módulo app-minimize no resuelto en bridgeless → minimiza en rutas raíz"). |
| D-04/D-40 (091–165, Toast LogBox en inglés / historial en blanco) | Toast de error técnico visible al usuario; pantalla en blanco al cambiar de mes | D-04: artefacto de build dev (LogBox) y guardado corregido en `c5eec23` (email vacío → undefined). D-40: CORREGIDO en `24545a5` — el histórico mantiene header y segmento montados y muestra el loader en el contenido; conserva el modo gráfica al cambiar de mes. Pendiente de validar en device. |
| D2/D-18 (Perfil con tab bar) | Perfil debía ser página empujada sin tabs, con logo Natura al pie | CORREGIDO — `c5eec23` ("Perfil sale de las tabs (ruta en AppStack como /profile del original)... con pie de logos"). Confirmado por el diff de `AppStack.tsx`/`types.ts` en `c5eec23` (agrega `Profile` a `AppStackParamList` y como `Stack.Screen` fuera de `AppTabs`). |
| D1 (166–188, headers de Perfil bajo status bar) | Header de Perfil/Notificaciones/Info personal sin inset superior | CORREGIDO — `c5eec23` ("Header compartido (con inset superior) en Perfil, Información personal, Logros, Notificaciones y Configuración"). |
| D5 (166–239, botón bajo la nav bar en Configuración) | "Actualizar configuraciones" / "Guardar cambios" bajo la nav bar | CORREGIDO — `c5eec23` ("Insets inferiores en Info personal... Configuración: back arrow-back, chips rellenos, SyncAction dentro de tarjeta gris"). |
| D3 (225–239, "Vinculando al proyecto") | Layout de vinculación distinto al original | CORREGIDO — `c5eec23` ("Auth: 'Vinculando al proyecto'... con ExploreContainer, loader.gif y Cancelar sólido"). |
| D18 (166–239, textos "No, editar"/"Sí, continuar") | Capitalización de botones del modal de teléfono | CORREGIDO — `c5eec23` ("modal de teléfono con textos 'No, Editar'/'Sí, Continuar'... revierte la corrección #13 de la auditoría"). |
| D-15 (091–165, agregados Tem/Hum/Acu distintos con el mismo dataset) | Discrepancia de agregación en histórico | PENDIENTE DE DEVICE — la agregación es idéntica al original (test con transcripción literal pasa; paridad exacta en Expo Web). La discrepancia del device apunta a dataset/config cacheada distinta; revalidar tras limpiar caché con el mismo snapshot de backend. Se corrigió además la normalización AWSJSON string/objeto en `transformData`. |
| D6 (166–239, progreso contradictorio Inicio "1 de 3" vs Registrar "0 de 3") | Estado de progreso inconsistente entre pantallas | CORREGIDO en `24545a5` (pendiente de validar en device): carrera entre el rollover diario y la lectura de progreso en HomeScreen; ahora el rollover se espera dentro del efecto de foco. El parpadeo del chip de semillas (Header) está en la oleada en curso. |
| Minimizar en Historial | El original tampoco minimiza ahí | **DECISIÓN DEL USUARIO** — comportamiento igual al Ionic original, no se cambia (ver lista fija abajo). |
| Logos Natura/ISAGEN (issue #57) | Logos de patrocinadores en Perfil | **DECISIÓN DEL USUARIO** — remitido a issue #57, fuera del alcance de este hardening. |
| Umbrales de germinación | Valores de la gamificación de germinación | **DECISIÓN DEL USUARIO** — no se ajustan en esta ronda. |
| Push Firebase | Notificaciones push remotas | **DECISIÓN DEL USUARIO** — fuera de alcance (la app usa notificaciones locales; push remoto no está en el scope actual). |

**Nota metodológica:** "CORREGIDO" en esta tabla significa que el mensaje de
commit lo reclama explícitamente, no que exista una segunda ronda de capturas
en device confirmándolo salvo donde se indica lo contrario (F-01, F-02, F-06,
F-08, F-09, D2/D-18 tienen confirmación visual explícita en
`review-frames-021-090.md`). El resto de los ítems "CORREGIDO" quedan
**pendientes de validar en la próxima ronda de device** (§3).

---

## 3. Gates que exigen device físico

| Gate | Estado |
|---|---|
| Doze / exact-alarm (notificaciones bajo restricciones de batería) | Pendiente — no ejercitado en la ronda del 2026-09-07 (el device se quedó sin validar por el bloqueo de §4). |
| Sync offline real (con y sin red, reconexión) | Pendiente. |
| view-shot / compartir reporte | **Validado** — funcionó de punta a punta (`review-frames-091-165.md`: "compartir reporte de punta a punta" en "Correcto"); quedan detalles menores abiertos (D-08 estilo del toast, D-17 icono, D-19 nombre de archivo). |
| Splash nativo | **Validado** — `review-frames-021-090.md` punto (g): "Splash UVA nativo: OK". Queda abierto un detalle menor del splash JS (D-42, recuadro cuadrado teal). |
| Theming multi-RACIMO visual | Pendiente — no se probó con un segundo RACIMO/branding distinto en device en esta ronda. |
| OTP real (SMS) | Pendiente — la sesión de prueba usó el usuario de test (3000000002, sin OTP); no cubierto en `docs/evidence/device-2026-09-07/`. |
| Vinculación real de RACIMO | Pendiente — `review-frames-166-239.md` reporta la captura "atascada" ~29s en "Vinculando al proyecto" (D3); el flujo completo de vinculación no llegó a validarse hasta el final. |
| Agregados del histórico vs mismo dataset | Pendiente — D-15 (arriba) detectó discrepancias numéricas que aún no se han re-verificado tras ningún fix específico de agregación. |

---

## 4. Bloqueo del device actual

El Redmi Note 10S usado en la ronda del 2026-09-07 **no tiene SIM**, lo que en
MIUI bloquea:
- `adb install` remoto vía red (sin depuración inalámbrica emparejada de forma
  estable) — se recurrió a instalación manual del APK/dev build.
- Inyección de toques por `adb shell input tap/swipe` — MIUI las descarta
  quirúrgicamente por política de seguridad; se recurrió a `uiautomator` como
  respaldo para algunas interacciones y a operar el device a mano para el
  resto.
- Captura de pantalla automatizada por `adb shell screencap` con
  aceleración por software (SwiftShader) — devuelve pantallas en blanco en
  ciertas condiciones; se usó una combinación de instalación manual +
  captura automática cuando fue posible.

Esto limita la velocidad y cobertura de la verificación en este device
concreto: los recorridos de `docs/evidence/device-2026-09-07/` se hicieron
con una mezcla de interacción manual del usuario y automatización parcial,
no con un runner de UI automatizado end-to-end.

---

## 5. Checklist de B19 pendiente (`docs/migration/plan.md` §B19)

Estado actual de cada ítem del checklist de B19:

- [x] **Hardening de TypeScript** (esta ronda): `tsc --noEmit` pasó de 52 a 0
  errores. Ver detalle en el reporte de esta tarea.
- [x] **Código muerto — `devBypass.ts`**: verificado con
  `grep -rn devBypass mobile/src` — SÍ tiene un importador fuera de sí mismo
  (`src/__tests__/fix-rn-auth-app-transition.test.tsx`), así que **no se
  eliminó** (contradiría el propio criterio del checklist).
- [x] **Código muerto — `modules/app-minimize/src`**: verificado sin
  importadores directos en `src/`; se documentó en
  `modules/app-minimize/README.md` (nuevo) que la resolución real vive en
  `src/native/minimize/useAppMinimize.ts` (cadena: registro Expo →
  `NativeModules.AppMinimize` → `BackHandler.exitApp()`). El módulo nativo
  (`android/`) NO se tocó.
- [ ] **Fase 6 paridad** (capturas Ionic `open_browser` S8 360×740 vs RN dev
  build, pantalla-por-pantalla) — pendiente, es el grueso de B19.
- [ ] **Workflows EAS** (`build-android.yml`, `build-android-bundle.yml`,
  eliminar `test-secrets.yml`) — pendiente.
- [ ] **CI lint+jest que bloquea merge** — pendiente de consolidar.
- [ ] **Husky 9 + lint-staged (R-49)** — pendiente.
- [ ] **Scripts build/setup → expo prebuild/eas** (eliminar 6 `.sh` macOS y
  amplify-modelgen/push rotos) — pendiente.
- [ ] **Docs de proceso reescritas para Expo/EAS (R-49)** — pendiente.
- [ ] **Eliminar deps muertas** (sweetalert2+ngx-sweetalert2 R-45,
  ini/inquirer, `@types/date-fns`, plugins Capacitor sin uso, zone.js,
  cordova-res) — pendiente (estas dependencias viven en el Ionic raíz, no en
  `mobile/`, y se eliminan recién en el cutover).
- [ ] **Excluir CreationPage QA y manifest huérfano (R-43)** — pendiente.
- [ ] **Medir bundle con `expo export`** (chart.js/html-to-image/dompurify/
  sweetalert2 ausentes, R-50) — pendiente.
- [ ] **versionCode final > publicado (R-39)** — pendiente.
- [ ] **CUTOVER** (`git mv mobile/* a raíz`, `git rm` Ionic completo,
  desinstalar @angular/@ionic/@capacitor, purgar keystore de la historia,
  build EAS production firmado) — pendiente, es el cierre de todo el plan.
- [ ] **Gate final**: paridad visual+funcional aprobada por humano; jest+
  eslint verdes en CI; `eas build --profile production` firmado
  correctamente; árbol RN limpio en root; keystore purgado; smoke test
  end-to-end del AAB en device — pendiente.

---

## Referencias

- Plan de bloques: `docs/migration/plan.md` §B19.
- Evidencia device: `docs/evidence/device-findings-2026-09-07.md`,
  `docs/evidence/device-2026-09-07/review-frames-021-090.md`,
  `docs/evidence/device-2026-09-07/review-frames-091-165.md`,
  `docs/evidence/device-2026-09-07/review-frames-166-239.md`.
- Commits de la ronda de fixes: `24545a5`, `c5eec23`.
- Módulo app-minimize: `mobile/modules/app-minimize/README.md`.

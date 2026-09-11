# Plan de Migración — Ionic/Angular → React Native (Expo)

> **Post-cutover (2026-09-11):** las rutas `mobile/...` de este documento son históricas; la app vive ahora en la raíz del repo.

**App:** UVA (recolección y monitoreo de datos ambientales comunitarios)
**Fase:** 4 — Plan de Migración (síntesis del panel de arquitectos)
**Rama de entrega:** `feature/ionic-to-react-native` (un único PR)
**Referencias:** `docs/migration/portability-matrix.md` (156 ítems), `docs/migration/discovery/risk-register.md` (R-01…R-51)

---

## 1. Resumen ejecutivo y veredicto del panel

Tres arquitectos planearon con lentes distintos: **Risk-First** (matar primero las incógnitas nativas letales), **Cimientos-primero** (capas ordenadas, lógica antes que UI) y **Rebanada-vertical** (walking skeleton end-to-end).

### Veredicto

**Gana el esqueleto de "Cimientos primero" (Plan 2)** como columna vertebral del roadmap, por seis razones verificadas contra la matriz y el risk-register:

1. **Es el único que ordena correctamente la dependencia real del theming (R-05).** El theming multi-tenant hidrata desde `branding/colors.json` que se **descarga de S3 al filesystem del dispositivo** (`styling-theme.md:299-301`, `configuration-app.service.ts:153-169`). Por tanto el `ThemeProvider` depende de `S3Service` + `FileSystemService` (ambos **Major**). El Plan 1 (Risk-First) coloca su spike de theming (B07) dependiendo solo de B01+B02, pero **no porta FileSystem/S3 hasta B10** — su spike de theming solo puede correr contra un `colors.json` fixture hardcodeado, no contra el contrato real. El Plan 2 porta Session/FileSystem/S3 en B05 **antes** de los contexts (B06) y el ThemeProvider (B08): el cimiento de theming tiene su fuente de datos lista. Esto es correcto.
2. **Maximiza paralelismo de agentes** con un fan-out claro por capas: toolchain en serie → capa de datos en abanico → pantallas por grupos independientes.
3. **Respeta R-11 estructuralmente:** ninguna UI se construye antes de que su lógica esté portada y testeada con Jest (B07 es un gate duro).
4. **Cada bloque cierra commiteable** con gate verificable, sin romper el build Ionic (subcarpeta aislada).
5. **Honra las decisiones vinculantes §4** (DI→módulos singleton 4.1, estado observable→Context+hook 4.2, renombrar los dos NotificationService 4.3, corregir solo bugs autorizados 4.4, eliminar RxJS estructural 4.5).
6. **Cutover atómico al final** mantiene Ionic ejecutable para la comparación visual de Fase 6.

### Qué se absorbió de los otros dos planes

**Del Plan 3 (Rebanada vertical / Walking Skeleton) — la idea más valiosa que adoptamos:**

- **Hito de demo end-to-end temprano (nuevo B13-DEMO).** Tras montar los cimientos y el primer grupo de pantallas críticas (splash→login test-user→home→registrar medición→verla en histórico-lista), insertamos un **gate de validación end-to-end en device** que ejercita TODO el ensamble (stack nativo + datos offline + navegación + theming + persistencia) con el mínimo de pantallas, **antes** de abrir el fan-out masivo de pantallas. Esto da la señal "el ensamble respira" que el Plan 2 puro no entrega hasta muy tarde, y reduce el riesgo de descubrir un fallo de integración con 20 pantallas ya escritas. Es la mejor mitigación de R-04 en la práctica.
- **Diferir deliberadamente Chart.js (victory-native) y el reporte view-shot** fuera del slice inicial: son los XL de mayor riesgo de desperdicio si la base no compila; se montan en la oleada de expansión cuando ya no hay incertidumbre de arranque.

**Del Plan 1 (Risk-First) — el framing que adoptamos:**

- **Tratar B03 (Amplify+DataStore en device real), el keystore EAS (R-10) y las dos integraciones nativas más frágiles (notificaciones bajo Doze + view-shot) como SPIKES con gate en dispositivo físico, no en emulador.** El Plan 1 tiene razón en que estas son las incógnitas que invalidan el plan entero si fallan; las marcamos explícitamente como spikes con validación en device físico y las adelantamos lo máximo que la dependencia de datos permite.
- **EAS keystore temprano (no en el cutover).** Subir el MISMO keystore a EAS Managed Credentials en B02 desbloquea dev builds reales en device para validar R-04/R-13 desde el principio. La **purga de la historia git** del `.jks` se difiere al cutover (mientras Ionic vivo aún lo referencia). Esta separación (subir temprano / purgar al final) viene del Plan 2 pero la reforzamos con el énfasis del Plan 1 en verificar la identidad de firma (SHA-256) cuanto antes.

**Decisión de corrección sobre los tres planes:** la dependencia `B06-render-html → B07-theming` del Plan 1 (render-html necesita resolver `style=var()` a tokens) es real pero parcial — el render-html puede portarse y testearse con la allowlist de seguridad **sin** el theme (el mapeo `var()`→token es un paso posterior de integración). En este plan, render-html (B09) depende del theme (B08) solo para el mapeo de color, lo cual está bien porque B08 ya existe cuando B09 corre.

---

## 2. Layout del repo durante la migración y cutover

### Layout (decisión única)

La app RN vive **aislada en la subcarpeta `mobile/`** dentro del mismo repo y la misma rama `feature/ionic-to-react-native`, conviviendo con el Ionic intacto en la raíz hasta el cutover.

**Por qué subcarpeta y no raíz ni rama aparte:**

- El entregable es **UN PR** en `feature/ionic-to-react-native` → descartada la rama aparte.
- La restricción "Ionic debe seguir ejecutable" (Fase 6 compara capturas Ionic vs RN) impide borrar `src/` y `android/` hasta el final → descartado el reemplazo en raíz.
- Dos `package.json` en la misma raíz colisionan (React vs Angular, jest-expo vs karma, metro/babel vs webpack/angular.json) y `expo prebuild` reclama el `android/` que hoy pertenece a Capacitor → subcarpeta aislada con su propio `package.json`, `node_modules`, `app.json`, `eas.json`, `metro.config.js`, `babel.config.js`, `tsconfig.json` y su propio `android/` generado por prebuild (gitignored, CNG).

```
raíz/                              ← Ionic INTACTO y ejecutable hasta el cutover
├── src/                           (Angular/Ionic)
├── android/                       (Capacitor — NO se toca durante la migración)
├── angular.json, capacitor.config.ts, ionic.config.json, karma*
├── amplify/                       ← backend PRESERVADO (AppId d2l8hh51bqhq16)
├── package.json                  (Angular)
└── mobile/                        ← App RN/Expo (toda la migración vive aquí)
    ├── App.tsx                    (bootstrap: get-random-values → Amplify.configure → DataStore.configure)
    ├── app.json, eas.json, metro.config.js, babel.config.js, tsconfig.json
    ├── android/                   (expo prebuild — gitignored/CNG)
    └── src/
        ├── data/                  (api/, datastore/, auth/, session/, storage/, amplify-bootstrap)
        ├── domain/                (gamification/, moon/, aggregations/, measurement-engine/ — lógica pura testeable)
        ├── state/                 (SessionContext, SyncContext, ConfigContext, ThemeProvider, NotificationContext)
        ├── theme/                 (theme.ts, fonts)
        ├── components/            (primitivas + componentes de dominio compartidos)
        ├── navigation/            (RootNavigator condicional, AuthStack, AppTabs, ModalGroup)
        ├── screens/              (auth/, home/, measurement/, historical/, profile/, moon/, configuration/)
        ├── native/               (notifications, filesystem, share, minimize, back, clipboard)
        └── assets/               (svg/, fonts/, gifs/, png/)
```

- Los modelos generados (`schema.js`, `models/`, `graphql/`, `API.ts`) se **regeneran con `amplify codegen`** apuntando al mismo `schema.json`/backend Amplify de la raíz y se copian a `mobile/src/data/models`. Metro **no** resuelve fuera de `mobile/`.
- El `android/` de Capacitor NO se toca (sirve para builds Ionic de comparación). El `android/` de RN se genera bajo `mobile/android` con `expo prebuild`.

### Estrategia de cutover (shadow build → swap atómico al final)

Durante toda la migración el Ionic en raíz permanece intacto y ejecutable (`ng serve` / `open_browser` en viewport S8 360×740). La app RN se ejecuta con `cd mobile && npx expo run:android` / Dev Client. La comparación visual de Fase 6 corre **ambas** apps desde el mismo working tree, pantalla por pantalla.

El **cutover** es un único bloque final (B19), gateado por la aprobación de paridad de Fase 6:

1. Congelar Ionic tras la última captura de referencia.
2. `git mv mobile/*` a la raíz.
3. `git rm -r` de la implementación Ionic: `src/` (Angular), `android/` (Capacitor), `angular.json`, `capacitor.config.ts`, `ionic.config.json`, `karma*`, `src/polyfills.ts`, `src/zone-flags.ts`, `src/test.ts`, `.browserslistrc`, `build.json`, `scripts/*.sh`, `resources/`, workflows Ionic.
4. Desinstalar del package.json: `@angular/*`, `@ionic/*`, `@capacitor/*`, `zone.js`, `rxjs`, `chart.js`, `chartjs-adapter-date-fns`, `html-to-image`, `dompurify`, `sweetalert2`, `@sweetalert2/ngx-sweetalert2`, `ini`, `inquirer`, `cordova-res`, `@types/date-fns` (matriz §2.1).
5. **Purgar `android/keys/keystore.jks` de la historia git** (git-filter-repo/BFG); confirmar que el MISMO keystore ya está en EAS Managed Credentials (subido en B02). Rotar solo si la historia fue pública (ver pregunta abierta).
6. Reemplazar `package.json` raíz por el de Expo; regenerar `android/` con `expo prebuild`; preservar `amplify/` y `docs/migration/`.
7. `eas build --profile production` (AAB firmado) + verificación de identidad de firma + `versionCode` > publicado.

**Rollback:** hasta el paso 3, revertir = borrar `mobile/`. Tras el swap, revertir = revert del commit de cutover.

---

## 3. Roadmap por bloques (B01…B19)

Convención de esfuerzo: **S** trivial · **M** medio · **L** varias piezas/agregación · **XL** dependencia web crítica.

### CIMIENTOS — Build system y capa de datos

#### B01 — Scaffolding Expo + toolchain (lint/test/CI) · `build system` · **M**

- **Objetivo:** Proyecto Expo aislado en `mobile/` con Dev Client/CNG, toolchain de calidad (ESLint expo + Prettier + Jest+jest-expo + RN Testing Library) y CI que bloquea merge con lint+jest. Cimiento absoluto: sin App.tsx que arranque y sin Jest verde, nada es verificable.
- **Ítems matriz:** Karma/Jasmine→Jest+jest-expo+RNTL; `@angular-eslint/*`→eslint-config-expo; prettier/.prettierrc (glob `*.{ts,tsx,js,jsx}`); typescript/tsconfig\*→expo/tsconfig.base (strict, paths con module-resolver); angular.json→app.json+eas.json+metro.config.js+babel.config.js (esqueleto); scripts npm test/start; "Ausencia de CI lint/test"→workflow `npm ci → eslint → jest`; `react-native-get-random-values`+`react-native-url-polyfill`; Patrón DI Angular→RN documentado.
- **Depende de:** —
- **Riesgos:** R-03, R-11, R-50, R-40.
- **Gate:** `cd mobile && npx expo start --dev-client` levanta Metro y App.tsx renderiza placeholder en emulador Android; `npm run lint` y `npm test` (smoke) verdes; CI corre lint+jest sobre `mobile/`. Ionic en raíz sigue compilando. **Commiteable.**

#### B02 — EAS + keystore + app.json/permisos · `build system`, `integraciones nativas` · **M**

- **Objetivo:** EAS Build (perfiles development/preview/production), subir el MISMO keystore a EAS Managed Credentials (no generar nuevo), fijar applicationId/version, declarar permisos Android. Temprano (no en F6) porque desbloquea dev builds reales en device para validar R-04/R-13.
- **Ítems matriz:** Keystore `android/keys/keystore.jks`→EAS Managed Credentials; applicationId `com.makesens.uvaapp`→expo.android.package; versionName 2.1.7→expo.version; versionCode 8→eas.json autoIncrement (consultar publicado en Play); permisos (POST*NOTIFICATIONS, SCHEDULE_EXACT_ALARM, USE_EXACT_ALARM, WAKE_LOCK, SYSTEM_ALERT_WINDOW, REQUEST_IGNORE_BATTERY_OPTIMIZATIONS)→app.json/config plugins; `android/` Capacitor→expo prebuild regenera `mobile/android` (CNG); iconos/splash (icon 1024×1024 — **falta crear**, adaptiveIcon, expo-splash-screen); expo-build-properties minSdk22/compileSdk35/targetSdk35; config entornos Amplify→perfiles eas.json + EXPO_PUBLIC*\*.
- **Depende de:** B01.
- **Riesgos:** R-10, R-22, R-39, R-40.
- **Gate (SPIKE en device):** `eas build -p android --profile development` produce dev build instalable firmado con el keystore correcto (verificar fingerprint SHA-256 == keystore actual); `expo prebuild` genera `android/` bajo `com.makesens.uvaapp` con MainActivity correcta y permisos declarados. NO se generó keystore nuevo. **Purga del .jks de la historia git se difiere al cutover (B19).** **Commiteable.**

#### B03 — SPIKE CRÍTICO: Amplify bootstrap + DataStore + NetInfo + modelos/schema · `integraciones nativas`, `build system` · **L**

- **Objetivo:** Portar el arranque Amplify a App.tsx en orden correcto (get-random-values → Amplify.configure → DataStore.configure con syncExpressions) con libs nativas RN, y regenerar modelos/schema/graphql con codegen. **Cimiento del que cuelga TODO el splash:** sin NetInfo el Hub no emite networkStatus y `waitForSyncDataStore` se cuelga (R-04). Mata la incertidumbre más letal.
- **Ítems matriz:** `aws-amplify ^6`+`@aws-amplify/react-native`+netinfo+async-storage+url-polyfill; `@aws-amplify/datastore ^5`+adapter RN (AsyncStorage default; evaluar SQLite); Amplify bootstrap (main.ts+app.component.ts)→App.tsx (configure pre-generateClient); syncExpressions selectivos idénticos (GamificationEvent isUnclean===true; AppUsageEvent outbox-only id.eq('')); schema.js+schema.d.ts (codegen); index.js+index.d.ts (initSchema 7 modelos); graphql/\*+API.ts (codegen framework none/react); script update-graphql.
- **Depende de:** B02.
- **Riesgos:** R-04, R-09, R-40, R-21, R-03.
- **Gate (SPIKE en device físico):** Amplify.configure corre antes de cualquier generateClient sin error; `DataStore.start()` alcanza READY y el Hub emite `networkStatus` con red y en modo avión (R-04 desbloqueado); en avión `waitForSyncDataStore` resuelve/timeout controlado SIN colgar; un generateClient query básico responde. Test Jest: initSchema produce 7 clases de modelo. Sin zone.js. **Commiteable.**

#### B04 — Capa Amplify portable: API + Auth + DS services + modelos/interfaces · `lógica/datos` · **L**

- **Objetivo:** Portar la franja Reusable/Minor (64% casi 1:1) quitando `@Injectable`→módulos singleton (4.1), con tests Jest del contrato de errores y del bootstrap de modelos. Máximo ROI y máximo paralelismo (archivos independientes salvo la dep común a SessionService, que llega en B05).
- **Ítems matriz:** `errors-api.service.ts` (Reusable, conservar typo `mensage`); user-api/racimo-api/uva-api/user-progress-api/moon-phase-api (Minor singleton); `auth.service.ts` (singleton, aws-amplify/auth 1:1, tokens a SecureStore/AsyncStorage, passwordless+MFA SMS); `test-users.service.ts`→`export const isTestUser` (3000000002 salta OTP); 6 DS services (measurement/user-progress(_)/gamification-event/user/uva/racimo, métodos static); modelos `config.model.ts`/`colors.model.ts`/`measurements.model.ts`; `session.model.ts` (sessionKeys); `IMeasurement.ts`+`ITask.ts`. (_)user-progress-ds se profundiza en B07.
- **Depende de:** B03.
- **Riesgos:** R-04, R-09, R-21.
- **Gate:** Compila sin `@Injectable` ni imports Angular; Jest verde para `errors.ts` (contrato `{success,data}|{success,error}`) y bootstrap de modelos; lint pasa; los DS services importan el singleton de SessionService (placeholder hasta B05). **Commiteable.**

#### B05 — Persistencia: Session + storage nativo (Filesystem/S3/Preferences) · `lógica/datos`, `integraciones nativas` · **M**

- **Objetivo:** Portar la franja Major de persistencia preservando firmas y nombres de archivo/rutas EXACTOS (R-09/R-20/R-26). **Dependencia transversal** (cada DS service hace `static session`) y **fuente de datos del ThemeProvider** (colors.json descargado de S3) → va inmediatamente tras B04 y antes de contexts/theme.
- **Ítems matriz:** `session/session.service.ts`→AsyncStorage/expo-secure-store, preservar API pública, `clear()` por clave (sessionKeys, R-37); `file-system.service.ts`→expo-file-system (rutas absolutas, makeDirectoryAsync intermediates, preservar firma `{success,data|error}` y nombres); `s3.service.ts`→list + rama JSON/TXT + rama binaria base64 (sin Blob/btoa), rutas `public/racimos/<code>/...` idénticas; `@capacitor/preferences`→AsyncStorage+expo-secure-store; `@capacitor/filesystem`→expo-file-system; otros estados en Preferences (lastMeasurementValues, notificationPermission\* keys).
- **Depende de:** B04.
- **Riesgos:** R-09, R-37, R-20, R-26, R-21.
- **Gate:** Jest verde: SessionService round-trip set/getInfo y `clear()` borra todas las sessionKeys sin huérfanas; FileSystem crea dirs intermedios y preserva nombres; S3 list+rama JSON parsean. En dev build: descarga real de un archivo de config de RACIMO a documentDirectory y lectura por `file://`. **Commiteable.**

#### B06 — Estado reactivo: SessionContext + SyncContext + ConfigContext · `lógica/datos`, `estado` · **L**

- **Objetivo:** Construir los contexts que la UI debe OBSERVAR (4.2), reemplazando el pull no reactivo y los statics mutados por Hub. SyncContext suscribe el Hub y **corrige el type guard** `data.model===AppUsageEvent` (Hermes ofusca Function.name, R-21); convierte polling 100ms en promesa por eventos. ConfigContext es la parte I/O+cache de ConfigurationAppService (applyColors se va al ThemeProvider de B08).
- **Ítems matriz:** `SessionContext` envuelve el singleton SessionService (R-27); `SyncContext`→`{state, networkStatus, synchronizedData(), waitForSync()}`, corrige type guard (R-21), rompe dep a AppUsageService (R-04/R-27); `sync-monitor-ds.service.ts` (Major)→SyncContext, instalar NetInfo, polling→evento; `configuration-app.service.ts` parte 1 (Major)→ConfigContext descarga+cache; `app-usage.service.ts`→módulo, syncExpression outbox-only; Patrón estado observable→Context+hook (4.2).
- **Depende de:** B05.
- **Riesgos:** R-27, R-04, R-21, R-09.
- **Gate:** Jest: SyncContext mapea eventos del Hub a estados (mock Hub.listen) y waitForSync resuelve en READY; el type guard reconoce AppUsageEvent por clase importada (bajo Hermes). En dev build: UI placeholder reacciona a networkStatus (avión on/off). ConfigContext carga config una sola vez. **Commiteable.**

#### B07 — Lógica pura de dominio con tests Jest PRIMERO (gate R-11) · `lógica/datos` · **XL**

- **Objetivo:** Núcleo algorítmico. Portar con tests Jest ANTES de cualquier UI que lo consuma (R-11 vinculante). Deshacer herencias por composición (4.1), separar lectura pura de side-effects en `getLastUserProgress` (4.4/R-28), corregir bugs autorizados (reset de achievements; separación de efectos). Extraer agregaciones de HistoricalPage (1322 líneas) y el motor de medición ANTES de Historical/RegisterMeasurement (R-32). Cuatro sub-áreas paralelizables entre agentes.
- **Ítems matriz:** `user-progress-ds.service.ts` (Major)→separar recálculo diario idempotente del getter puro (R-28)+Jest; `gamification.service.ts` (Major)→deshacer `extends UserProgressDSService` (composición), excluir DEBUG, reactivar `gamification.service.spec.ts` (R-11); `gamification-alerts.service.ts` (Minor)+`gamification-alerts-types.service.ts` (Reusable, catálogo ~135 mensajes ES); `moon-phase.service.ts` (Major)→resolver extends por composición, PHASE*MAPPING+24 meses puros, preservar `lunar-phases-YYYY-MM.json`, Jest del parseo regex AWSJSON (R-26); agregaciones de HistoricalPage (transformData, calculateMeasurement, calculateDetailedMeasurement, calculateOverallStats, sum/mean)→domain/aggregations+tests (R-32); motor de medición (validateRestriction operadores 0:>:1 + getMessageError + measurements.model.ts)→domain/measurement-engine+tests, documentar FlowRestriction.validationFunction ignorada (R-35); `setup.service.ts`+`setup-racimo.service.ts` (Minor)→módulos, Jest del id secuencial UVA*<code>\_<00000+1>.
- **Depende de:** B06.
- **Riesgos:** R-11, R-28, R-26, R-32, R-35.
- **Gate:** Suite Jest reactivada y EN VERDE para: gamificación (recompensa tarea/racha/bonus, reintentos x3 backoff, coste 5 semillas), getLastUserProgress getter puro idempotente (no duplica en doble invocación), fase lunar (parseo+mapeo+próximos eventos), agregaciones (sum/mean/avg/min/max sobre fixtures), motor de medición (rango y restricción), id secuencial de UVA. **Commiteable.**

### CIMIENTOS — Sistema visual y componentes compartidos

#### B08 — Theme/tokens + ThemeProvider multi-tenant + tipografía Montserrat · `layouts`, `componentes compartidos` · **L**

- **Objetivo:** Formalizar el sistema visual como cimiento de TODA la UI. `theme.ts` (objeto JS tipado, fuente única), ThemeProvider/useTheme hidratado por RACIMO desde colors.json (reemplaza applyColors/CSS vars, R-05 crítico) — **ahora con su fuente de datos real lista (S3+FileSystem de B05, ConfigContext de B06)**. Montserrat estática con expo-font (Android RN no interpola variable fonts, R-16). Unifica los dos sistemas de color y define la escala de spacing/radio que hoy no existe (R-42).
- **Ítems matriz:** Theme/Design tokens→theme.ts (unificar 2 sistemas de color R-42, forzar tema claro R-51); ThemeProvider/useTheme()→reemplaza applyColors/setProperty, hidrata de colors.json vía ConfigContext (R-05); `configuration-app.service.ts` parte 2→ThemeProvider; `colors.model.ts` alimenta el provider; tipografía Montserrat→pesos estáticos 400/500/600/700 normal+italic con expo-font (familias separadas), refactor `text_base` (R-16); tokens spacing/radio/sombra (xl/3xl/4xl/White sin definir)→escala formal, box-shadow→elevation/shadow (R-42).
- **Depende de:** B06.
- **Riesgos:** R-05, R-16, R-42, R-51.
- **Gate (SPIKE de theming en device):** useTheme() expone tokens tipados; cambiar el `colors.json` de un RACIMO re-hidrata el ThemeProvider y los colores cambian en una pantalla demo en runtime sin recompilar; las 4 familias Montserrat estáticas renderizan los 4 pesos correctamente en device Android (no interpolados). Snapshot test del theme object. **Commiteable.**

#### B09 — Render HTML enriquecido + sanitización · `componentes compartidos` · **M**

- **Objetivo:** Cimiento transversal R-08 (~6 sitios: guías, modales, texto S3, alertas, explore-container). Reemplazar SafeHtmlPipe/[innerHTML]/DOMPurify por react-native-render-html + sanitize-html preservando la allowlist EXACTA como spec de seguridad, y mapear `style=var()` a tokens del theme.
- **Ítems matriz:** SafeHtmlPipe→eliminar; render con react-native-render-html (R-08); dompurify→sanitize-html preservando whitelist exacta (tags/attrs/policy) como spec de seguridad (R-08/R-34); `style=var()`→tokens del theme (R-05); componente compartido `<RichText/>`; auditar HTML embebido del backend (guías/mensajes) para compatibilidad (R-34).
- **Depende de:** B08.
- **Riesgos:** R-08, R-34.
- **Gate:** Jest: sanitize-html con la allowlist exacta filtra los mismos tags/attrs que DOMPurify original (fixtures, incluyendo `style` con var()); `<RichText/>` renderiza un HTML de guía real (tablas/estilos inline) en device sin romper; test de regresión de seguridad (script/onload no pasan). **Commiteable.**

#### B10 — Componentes compartidos de UI: modales, toasts, loaders, iconos, assets · `componentes compartidos` · **L**

- **Objetivo:** Primitivas idiomáticas RN que reemplazan los 4 controladores Ionic y resuelven los dos paradigmas de modal (R-17/R-18), más iconos/SVG/GIF (R-24). Casi todas las pantallas las consumen; construirlas una vez evita N reimplementaciones.
- **Ítems matriz:** ModalController/IonModal→`@gorhom/bottom-sheet` (R-17/R-18/R-36); AlertComponent→ConfirmModal RN que resuelve `Promise<'OK'|'CANCEL'>` (contrato preservado, render-html de B09); AlertController→Alert.alert, ToastController→react-native-toast-message, LoadingController→ActivityIndicator overlay (R-44); assets iconos UI SVG (~28, Major)→react-native-svg+transformer, mapa nombre→componente para dinámicos `[src]` (R-24); Ionicons built-in name=→@expo/vector-icons, eliminar CDN unpkg y addIcons huérfano (R-47); assets fase lunar SVG→consolidar 1 set, renombrar `eclipses_card_home .svg` (espacio) y `cuarto_creceiente` (typo) (R-24); GIFs (Minor)→expo-image, ilustraciones/logos/fondos→svg/Image+expo-blur+expo-linear-gradient (R-23/R-24); ProgressBarComponent, DayComponent (S).
- **Depende de:** B08, B09.
- **Riesgos:** R-17, R-18, R-36, R-44, R-24, R-23, R-47.
- **Gate:** Pantalla demo: ConfirmModal devuelve OK/CANCEL por promesa; toast/loader/Alert se muestran; un SVG dinámico por nombre y un GIF (expo-image) renderizan; ningún nombre de asset con espacio/typo rompe Metro (bundle compila). Snapshot tests de ProgressBar/Day. **Commiteable.**

#### B11 — Componentes compartidos de datos: Calendar, MoonCard, Header, ExploreContainer + Areachart · `componentes compartidos` · **XL**

- **Objetivo:** Componentes con mayor ratio lógica/UI (los 2 Major + Areachart XL), que consumen domain (B07) + theme (B08) + primitivas (B10). Calendar reusa date-fns 1:1 y extrae generate\*/getStatus a funciones puras; Header se desacopla de DataStore/Router (R-29); MoonCard corrige el bug del setter (4.4); ExploreContainer envuelve ~13 pantallas auth. **Areachart es un SPIKE (victory-native/Skia)** para validar el detailedMode end-to-end antes de cablearlo en pantallas.
- **Ítems matriz:** `CalendarComponent` (Major)→grid flexbox, date-fns reusado, generateCalendarMonth/Week+getStatus extraídos puros, SVG luna, onDayPress (R-29/R-24); `DayComponent` (de B10) integrado; `MoonCardComponent`→View card+Image SVG, LUNAR_PHASE/NAME, corregir bug setter phase (fallback consistente), renombrar asset con espacio (4.4/R-24); `HeaderComponent` (Major)→header RN, desacoplar de DataStore/Router (hook/context), seed fallback, decidir logout sin implementar (4.4/R-29); `ExploreContainerComponent`→layout children/slots, titleHTML vía RichText(B09), linear-gradient (R-08/R-23); `TimeFrameComponent`+`SyncActionComponent` (S); `AreachartComponent` (XL, Skia)→victory-native por props reactivas (eliminar UpdateChart imperativo), gradiente Skia, detailedMode, tooltip (R-02).
- **Depende de:** B07, B08, B10.
- **Riesgos:** R-29, R-02, R-24, R-08, R-23.
- **Gate:** Jest: generateCalendarMonth/Week y getStatus (prioridad saveStreak>complete>incomplete>normal) producen el calendario correcto sobre fixtures; MoonCard nunca queda con name/icon undefined. **Demo en device:** Calendar y Areachart (victory-native) renderizan datos históricos reales (normal+detailedMode, área min/max+línea avg+gradiente+tooltip) reactivo a props; Header navega sin tocar DataStore directamente. **Commiteable.**

### CIMIENTOS — Shell de navegación

#### B12 — Shell de navegación: RootNavigator condicional + AuthGate + splash + tabs + NotificationContext · `navegación`, `pantallas` · **L**

- **Objetivo:** Árbol React Navigation v6: navegador condicional por auth state (Auth vs App stack, reemplaza la ausencia de guards), AuthGate que porta la decisión del splash (checkUserAuthentication/continueWithAuthenticatedFlow alimentado por SyncContext/SessionContext), params TIPADOS (R-15), Modal group, tracking por onStateChange (sin window.location). Incluye el splash animado, el TabsPage shell y el NotificationContext/UnreadNotificationsStore (badge, renombrado 4.3). Esqueleto que todas las pantallas habitan; consolida rutas duplicadas y excluye huérfanas (R-43).
- **Ítems matriz:** Sistema de rutas/navegación→React Navigation v6 condicional por auth, createBottomTabNavigator, Modal group, params tipados (R-15); SplashAnimationPage (lógica)→hook `useAuthGate()` (R-04/R-15) + UI reanimated+expo-blur+expo-splash-screen (R-41/R-23/R-30); consolidar rutas duplicadas (home/register/moon-phase), excluir CreationPage y huérfanas (R-43); tracking (initializeNavigationTracking)→onStateChange/`__getCurrentRoute`; analytics Pinpoint urlProvider→estado de React Navigation; redirecciones por setTimeout→useEffect con cleanup/clearTimeout (R-30); TabsPage shell→createBottomTabNavigator (3 tabs + moon-phase oculta en stack Home), tabBarIcon con svg, eliminar addIcons (R-24/R-47); `notification.service.ts` BADGE (Major)→NotificationContext/UnreadNotificationsStore (rename 4.3), suscripciones con cleanup (R-27/R-31); rxjs BehaviorSubject→Context+hook (4.5), eliminar rxjs.
- **Depende de:** B06, B10.
- **Riesgos:** R-15, R-43, R-30, R-04, R-12, R-41, R-23, R-27, R-31, R-47.
- **Gate:** App.tsx monta NavigationContainer con root navigator condicional; `useAuthGate` decide Auth vs App según SessionContext (test con mocks: sin auth→Auth stack, auth+UVA+code→App tabs, falta UVA→validate-project). Params tipados compilan (TS). En dev build: el splash anima y transiciona al destino correcto sin navegación fantasma; el bottom tab (3 tabs) navega y mantiene estado por tab; moon-phase accesible desde Home stack; un modal del Modal group abre/cierra; useUnreadCount se actualiza reactivamente. **Commiteable.**

### SLICE CRÍTICO — Pantallas del esqueleto andante + DEMO end-to-end

#### B13 — SLICE: Login (test user) + Home + Measurement + RegisterMeasurement + Historical-lista + DEMO end-to-end · `pantallas` · **XL**

- **Objetivo:** **Hito de validación del ensamble (absorbido del Plan 3).** Montar el camino más corto que ejercita TODO: splash→login (test user 3000000002 salta OTP)→home con datos reales de DataStore→registrar una medición (digit inputs + addMeasurement + gamificación testeada B07)→verla en histórico (lista + calendario, **difiriendo** la gráfica Skia detallada y el reporte view-shot a la oleada de expansión). Cierra con un **gate de demo end-to-end en device físico** antes de abrir el fan-out de pantallas.
- **Ítems matriz:** LoginPage→react-hook-form phone, ConfirmModal (B10), ramaje signIn (MFA/sin MFA/UserNotFound), reusar SetupService (R-17/R-15/R-31); HomePage→bottom-sheet modales (B10), useFocusEffect carga config/datos/notificaciones, MoonCard(B11)+Calendar(B11)+ProgressBar, goToDetail/goToMoonCalendar params tipados, 4 modales germinación 11-40/41-63/>63 con textos exactos como spec, getLastUserProgress getter puro (B07/R-28) (R-18/R-12/R-28/R-15); MeasurementPage (tab Registrar)→FlatList, modal bonus, RichText sortName, showBonus/restricciones/groupRemainingLazyMeasurements/surpriseTaskProcess/isTestUser/goToRegister (R-08/R-32/R-12/R-18/R-15); RegisterMeasurementPage (XL)→inputs por dígito TextInput+useRef[], modales, RichText guías, reemplazar window.location.reload por refetch reactivo, lastMeasurementValues→AsyncStorage, validateRestriction (motor B07), addMeasurement, completeTaskProcess (R-07/R-08/R-18/R-35/R-31/R-15); GuideMeasurementComponent→bottom-sheet por estado, RichText, loadImage file://, onClose(nextGuide) (R-08/R-17/R-20); HistoricalPage (parcial: lista+calendario, sin gráfica/reporte)→agregación testeada (B07), changeModeData, goToDetail, loaders RN (R-32/R-12/R-15); TimeFrameComponent (B11); ExploreContainerComponent (B11) en auth.
- **Depende de:** B11, B12, B07.
- **Riesgos:** R-04, R-07, R-08, R-35, R-18, R-32, R-12, R-15, R-31.
- **Gate (DEMO END-TO-END en device):** login(test user 3000000002 salta OTP)→home muestra semillas/racha reales→registrar medición (guía HTML→captura por dígitos→valida rango+restricción con motor testeado→addMeasurement persiste en DataStore offline→completeTaskProcess dispara gamificación sin duplicar)→abrir Historial y VER la medición del día en lista y calendario, abrir su detalle. El esqueleto respira completo. Captura del flujo. **Commiteable.** **(Gate de validación del enfoque: si el ensamble falla, falla aquí, no con 20 pantallas escritas.)**

### EXPANSIÓN — Pantallas por flujos completos (alto paralelismo)

#### B14 — Flujo AUTH completo: register + otp + validate-code + vinculación RACIMO · `pantallas` · **L**

- **Objetivo:** Completar el flujo de entrada (registro nuevo usuario + vinculación a RACIMO con branding por proyecto), reusando SetupService/SetupRacimoService (B07), ConfigContext/ThemeProvider (B06/B08) y navegación (B12).
- **Ítems matriz:** RegisterPage+PreRegisterPage+SetPhoneRegisterPage (react-hook-form, checkbox propio, modal confirmación, FIXME número duplicado) (R-07/R-15); OtpPage→N TextInput+useRef[] foco, timer 60s, auto-avance/envío, bypass test user (R-44/R-12/R-15); ValidateCodePage→useEffect setTimeout(2s)+clearTimeout, navigation.replace por type (R-30/R-15); RegisterSuccessPage (GIF, reset) (R-15/R-24); ProjectVinculationPage→getRACIMOByCode/configExists, bloqueo vía SyncContext, code min/max 6 (R-04/R-27/R-15); ValidateProjectPage→Promise.all (downLoadData+loadBranding+moon phases)+clearTimeout, branding→ThemeContext (R-30/R-05/R-20/R-26); ProjectVinculationDonePage→confeti, loadImage file://, clearTimeout 3s (R-30/R-20/R-05); RegisterProjectFormPage→form dinámico react-hook-form desde fieldsUVA, createNewUVA+updateUVA (R-07/R-38/R-15); RegisterCompletedPage→confeti, clearTimeout 3s, navigation.reset (R-30/R-31/R-42).
- **Depende de:** B13.
- **Riesgos:** R-30, R-15, R-44, R-17, R-31, R-04, R-05, R-20, R-26, R-07, R-38.
- **Gate (device, backend real):** registro de un teléfono de prueba que recibe OTP real→confirma→aterriza en login; login normal dispara MFA→otp; usuario autenticado sin UVA introduce código de RACIMO válido→descarga config+24 meses de lunaciones, aplica branding (colores cambian vía ThemeProvider), crea UVA con id `UVA_<code>_<NNNNN>`→home. Timers con cleanup (sin navegación fantasma). **Commiteable.**

#### B15 — Flujo HISTÓRICO/LUNAR: gráfica Skia + reporte view-shot + MeasurementDetail + MoonPhase · `pantallas`, `componentes compartidos` · **XL**

- **Objetivo:** Completar las piezas diferidas en B13: la gráfica Skia detallada en Historical/Detail, la generación del reporte ambiental con view-shot (R-01 crítico), y las pantallas de detalle y fase lunar. Reusa Areachart (B11), agregaciones testeadas (B07), MoonPhaseService (B07).
- **Ítems matriz:** HistoricalPage (completar XL)→victory-native modo detalle (B11), reporte react-native-view-shot, share react-native-share/expo-sharing (R-01/R-02/R-33); `environmental-report.service.ts` (Rewrite)→agregación pura ya en B07, render con view-shot sin document.body, generateReportImage (R-01/R-32); `EnvironmentalReportComponent` (XL)→View capturable, tabla flexbox, expo-linear-gradient, logos SVG/Image, formateadores (formatRainfall/formatValue/getFirstHalfDays) + DayData/ReportData (R-01/R-23/R-42/R-24); `html-to-image`→react-native-view-shot; MeasurementDetailPage→params tipados calendar+origin, modal RN, GamificationService.recoverStreak (B07), RichText, isYesterday, reglas alertas (semillas/racha), cleanup useEffect (R-15/R-17/R-08/R-31); MoonPhasePage→MoonPhaseService (B07), Calendar/MoonCard (B11), header React Navigation, Promise.all 3 llamadas, toLocaleDateString es-ES, seeds vía getLastUserProgress (R-26/R-12/R-24/R-06).
- **Depende de:** B13, B11, B07.
- **Riesgos:** R-01, R-02, R-32, R-33, R-15, R-12, R-26, R-08, R-31, R-23.
- **Gate (device):** Historical alterna calendario/gráfica con datos reales agregados (paridad numérica con Ionic, normal+detailed), genera imagen del reporte vía view-shot (PNG con tabla 2-columnas, gradientes, logos) y la comparte por react-native-share; MeasurementDetail recibe calendar por params tipados, muestra gráfica y recoverStreak() restaura la racha cobrando 5 semillas; MoonPhase muestra fase actual+próximos eventos. Sin document.createElement/window.reload. **Commiteable.**

#### B16 — Flujo PERFIL + GAMIFICACIÓN: Profile + PersonalInfo + Achievement + Alerts · `pantallas` · **L**

- **Objetivo:** Grupo perfil + gamificación visible, reusando NotificationContext (B12), GamificationService (B07) y Session (B05).
- **Ítems matriz:** ProfilePage→Linking.openURL wa.me, expo-clipboard+toast, react-native-share, unreadCount→NotificationContext, modal RN, logout (signOut+clearSession clave-por-clave+DataStore.clear) (R-07/R-31/R-27/R-37/R-18); PersonalInfoPage (L)→2 forms react-hook-form, foco por refs, parseo defensivo uva.fields, validateInput('ELIMINAR CUENTA'), handleDeleteUser, Alert.alert (R-07/R-36/R-44/R-12); AchievementPage→grid FlatList, modal semillas compartido con Home, useFocusEffect CON reset del array (corregir bug acumulación 4.4), FAB Dudas (R-12/R-18/R-24/R-42); AlertsPage→FlatList+empty state, GamificationService (B07), NotificationContext, getNotificationIcon/Bg, markAsRead/deleteAll (R-12/R-27/R-08); `share.service.ts` (Rewrite)→react-native-share/expo-sharing+view-shot, eliminar rama web, Platform.OS (R-33/R-20/R-07); `@capacitor/clipboard`→expo-clipboard; `@capacitor/device`→expo-device/Platform.Version (R-25).
- **Depende de:** B12, B11, B07.
- **Riesgos:** R-07, R-31, R-27, R-37, R-18, R-12, R-24, R-33, R-25.
- **Gate (device):** Profile comparte por WhatsApp/clipboard y logout limpia TODAS las sessionKeys+DataStore.clear sin huérfanos; PersonalInfo edita y elimina cuenta tras 'ELIMINAR CUENTA'; Achievement no duplica logros al re-entrar (bug corregido); Alerts lista/marca-leída/borra y el badge baja. **Commiteable.**

### INTEGRACIONES NATIVAS — Back/minimizar, notificaciones, configuración

#### B17 — Integraciones nativas: back/minimizar + recordatorios locales · `integraciones nativas` · **L**

- **Objetivo:** Capacidades nativas Android transversales. Back/minimizar (R-14, requiere módulo nativo `moveTaskToBack`) y recordatorios diarios 6/18h bajo Doze, **corrigiendo el bug** `cancelAllNotifications` (R-48). Spikes en device físico (no emulador) por R-13.
- **Ítems matriz:** `minimize/app-minimize.service.ts` (Rewrite)→BackHandler+React Navigation, routesToMinimize como dato, moveTaskToBack vía módulo nativo (R-14/R-07); `@capacitor/app`→AppState+BackHandler, moveTaskToBack config plugin (R-14/R-19); `@capacitor/core` (getPlatform/convertFileSrc)→Platform.OS, file:// directas (R-22); `services/notification/notification.service.ts` PUSH LOCAL (Rewrite)→LocalRemindersService sobre expo-notifications (DailyTrigger 6/18h, setNotificationChannelAsync importance4, permisos A13+, exact-alarm A12+), rename (4.3), preservar lógica de horarios pura (R-13/R-19/R-22); **CORREGIR** cancelAllNotifications→cancelAllScheduledNotificationsAsync (4.4/R-48); `@capacitor/local-notifications`→expo-notifications (R-13); `@capacitor/device` osVersion→Platform.Version, re-mapear A12=API31/A15=API35 (R-25).
- **Depende de:** B12, B13.
- **Riesgos:** R-13, R-14, R-19, R-25, R-48, R-22.
- **Gate (SPIKE en device físico, optimización de batería activa):** back en pantallas raíz MINIMIZA (no cierra) la app; en pantallas internas retrocede; las 2 notificaciones 6/18h se programan y disparan puntualmente bajo Doze; desactivar CANCELA realmente (bug R-48 corregido, verificado: no llegan tras desactivar); comparaciones de versión usan API level. **Commiteable.**

#### B18 — ConfigurationPage + sync manual · `pantallas`, `integraciones nativas` · **XL**

- **Objetivo:** La pantalla más acoplada a Android nativo (R-19). Llega tarde a propósito: depende de TODAS las integraciones nativas ya probadas (B17). Diagnóstico exact-alarm/batería, AppState, sync manual, branding.
- **Ítems matriz:** ConfigurationPage (XL)→AppState+cleanup, expo-notifications, reconstruir diagnóstico exact-alarm/Private Space/batería con config plugin/módulo nativo + Platform.Version, toasts/loader RN, branding→ThemeContext, updateConfiguration, chips de estado, 2 app-sync-action, DataStore.start (R-19/R-25/R-13/R-44/R-12/R-05); SyncActionComponent (B11) integrado, onClickSync→syncData (SyncContext B06); sync manual (red→DataStore.start; sin red→toast), updateConfiguration (re-descarga config+lunaciones).
- **Depende de:** B17, B11, B12.
- **Riesgos:** R-19, R-25, R-13, R-44, R-12, R-05.
- **Gate (device físico):** chips reflejan exact-alarm/optimización-batería reales (API level correcto, R-25); toggle de recordatorios programa/cancela de verdad (B17); updateConfiguration re-descarga y re-aplica branding; app-sync-action dispara DataStore.start y muestra estado de sync; el diagnóstico refleja el estado real tras volver de ajustes (AppState). **Commiteable.**

### CIERRE — Hardening, paridad visual y cutover

#### B19 — Hardening + paridad visual Fase 6 + CUTOVER final · `build system` · **L**

- **Objetivo:** Validar paridad Ionic vs RN, limpiar dependencias muertas, medir bundle, reconstruir CI/release EAS, y ejecutar el cutover atómico. Cierra el PR único.
- **Ítems matriz:** Fase 6 paridad (capturas Ionic open_browser S8 360×740 vs RN dev build, pantalla-por-pantalla); workflows EAS (build-android.yml→preview APK; build-android-bundle.yml→production AAB autoIncrement; eliminar test-secrets.yml); CI lint+jest que bloquea merge (consolidar B01); husky 9 + lint-staged (R-49); scripts build/setup→expo prebuild/eas (eliminar 6 .sh macOS y amplify-modelgen/push rotos); docs de proceso→reescribir para Expo/EAS (R-49); eliminar deps muertas (sweetalert2+ngx-sweetalert2 R-45, ini/inquirer, @types/date-fns, plugins Capacitor sin uso haptics/keyboard/network/splash/status-bar, zone.js, cordova-res); excluir CreationPage QA y manifest huérfano (R-43); medir bundle con expo export (chart.js/html-to-image/dompurify/sweetalert2 ausentes, R-50); versionCode final > publicado (R-39); **CUTOVER**: git mv mobile/\* a raíz, git rm Ionic completo, desinstalar @angular/@ionic/@capacitor, **purgar keystore de la historia** (filter-repo/BFG, rotar si fue público, R-10); build EAS production firmado verificado.
- **Depende de:** B14, B15, B16, B18.
- **Riesgos:** R-10, R-39, R-40, R-45, R-49, R-50, R-43.
- **Gate:** Paridad visual+funcional aprobada (humano); jest+eslint verdes en CI; `eas build --profile production` firma con el keystore correcto (SHA-256 == publicado) y versionCode > publicado; árbol RN limpio en root sin restos Ionic; keystore purgado de la historia (verificado con git log); smoke test end-to-end del AAB en device. PR único en `feature/ionic-to-react-native` listo. **Commit final.**
- **Estado de verificación en curso:** ver `docs/migration/verification.md` (tabla de bugs de device, gates pendientes de device físico y checklist de B19).

---

## 4. Diagrama de dependencias (texto) y oleadas de ejecución

```
                                    B01 (scaffold)
                                      │
                                    B02 (EAS+keystore)
                                      │
                                    B03 (SPIKE Amplify+DataStore) ◄── bootstrap del que cuelga TODO
                                      │
                                    B04 (capa Amplify portable)
                                      │
                                    B05 (Session+FileSystem+S3)  ◄── fuente de datos del theme
                                      │
                                    B06 (Session/Sync/Config contexts)
                                   ╱    ╲
                                  ╱      ╲
                          B07 (lógica   B08 (theme+tipografía)
                          pura+Jest)      │
                              │         B09 (render-html)
                              │           │
                              │         B10 (primitivas UI)
                               ╲        ╱   ╲
                                ╲      ╱     ╲
                                 B11 (Calendar/Header/   B12 (navegación+splash+
                                 MoonCard/Areachart)      tabs+NotificationContext)
                                       ╲              ╱
                                        ╲            ╱
                                         B13 (SLICE + DEMO end-to-end) ◄── HITO de validación
                                       ╱   │    ╲      ╲
                                      ╱    │     ╲      ╲
                                  B14    B15     B16    B17 (back/minimizar
                                 (auth) (histó/  (perfil) +notificaciones)
                                        reporte)              │
                                                            B18 (Configuration)
                                       ╲    │    ╱    ╱
                                        ╲   │   ╱    ╱
                                         B19 (hardening + paridad + CUTOVER)
```

### Oleadas (qué corre en paralelo)

- **Wave 0 (serie estricta — cimiento de arranque):** B01 → B02 → B03 → B04 → B05 → B06. Es la espina dorsal; cada uno depende del anterior y no se paraleliza (un fallo aquí invalida todo). Los SPIKES B02 (keystore) y B03 (Amplify en device) son los gates letales.
- **Wave 1 (fan-out de cimientos — paralelo tras B06):** **B07** (lógica pura+Jest) ∥ **B08** (theme+tipografía). Dos agentes independientes.
- **Wave 2 (componentes compartidos — paralelo tras B08):** **B09** (render-html) → **B10** (primitivas UI). B09 y B10 pueden solaparse parcialmente (B10 solo necesita B09 para AlertComponent/ConfirmModal).
- **Wave 3 (componentes de dominio + navegación — paralelo tras B07+B10):** **B11** (Calendar/Header/MoonCard/Areachart, necesita B07+B08+B10) ∥ **B12** (navegación+splash+tabs, necesita B06+B10).
- **Wave 4 (SLICE — serie, hito de validación):** **B13**. Único bloque; gate de demo end-to-end en device. No se paraleliza (es la prueba del ensamble).
- **Wave 5 (expansión de pantallas — máximo paralelismo tras B13):** **B14** (auth) ∥ **B15** (histórico/reporte) ∥ **B16** (perfil/gamificación) ∥ **B17** (back/minimizar+notificaciones). Cuatro agentes en paralelo; comparten cimientos probados, no se pisan.
- **Wave 6 (integración nativa pesada — tras B17):** **B18** (Configuration). Depende de B17 (notificaciones) ya validado.
- **Wave 7 (cierre — serie):** **B19** (hardening + paridad Fase 6 + cutover). Depende de todas las pantallas y nativas.

**Resumen de paralelismo:** picos de 2 agentes (Wave 1, 3) y de 4 agentes (Wave 5). El cuello de botella es la espina Wave 0 (6 bloques en serie) — inevitable porque es la cadena de arranque que cuelga el splash si se rompe.

---

## 5. Mapeo de bloques a los 6 workstreams

| Workstream                  | Bloques que lo tocan                                                                                                                                                                                                                    |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Navegación**              | B12 (RootNavigator condicional, AuthGate, splash, tabs, Modal group, params tipados, tracking)                                                                                                                                          |
| **Layouts**                 | B08 (theme/tokens/tipografía como sistema visual base), B11 (ExploreContainer layout de auth)                                                                                                                                           |
| **Pantallas**               | B13 (slice: login/home/measurement/register-measurement/historical-lista), B14 (auth: register/otp/validate/vinculación), B15 (histórico/reporte/detail/moon-phase), B16 (perfil/personal-info/achievement/alerts), B18 (configuration) |
| **Componentes compartidos** | B09 (render-html/RichText), B10 (modales/toasts/loaders/iconos/assets/ProgressBar/Day), B11 (Calendar/MoonCard/Header/Areachart/TimeFrame/SyncAction), B15 (EnvironmentalReport)                                                        |
| **Integraciones nativas**   | B02 (EAS/keystore/permisos), B03 (Amplify/DataStore/NetInfo), B05 (FileSystem/S3/SecureStore), B17 (back/minimizar/notificaciones/device/clipboard), B18 (exact-alarm/batería/AppState/sync)                                            |
| **Build system**            | B01 (scaffold/toolchain/CI), B02 (EAS/eas.json), B03 (codegen/schema), B19 (workflows/husky/bundle/cutover)                                                                                                                             |

---

## 6. Tabla de cobertura: 156 ítems de la matriz → bloque

> Verificación: ningún ítem queda huérfano. Los ítems agrupados referencian su sección de la matriz (§3.1 UI, §3.2 Lógica, §3.3 Deps). Total 156 = 48 UI + 42 Lógica + 67 Deps − 1 dedup (Ionicons).

### §3.1 Dominio UI (48 ítems)

| Ítem matriz                           | Bloque                                                |
| ------------------------------------- | ----------------------------------------------------- |
| SplashAnimationPage                   | B12                                                   |
| LoginPage                             | B13                                                   |
| OtpPage                               | B14                                                   |
| ValidateCodePage                      | B14                                                   |
| RegisterPage                          | B14                                                   |
| PreRegisterPage                       | B14                                                   |
| SetPhoneRegisterPage                  | B14                                                   |
| ProjectVinculationPage                | B14                                                   |
| ValidateProjectPage                   | B14                                                   |
| ProjectVinculationDonePage            | B14                                                   |
| RegisterProjectFormPage               | B14                                                   |
| RegisterCompletedPage                 | B14                                                   |
| RegisterSuccessPage                   | B14                                                   |
| TabsPage shell                        | B12                                                   |
| HomePage                              | B13                                                   |
| MeasurementPage (tab Registrar)       | B13                                                   |
| RegisterMeasurementPage               | B13                                                   |
| HistoricalPage (tab Historial)        | B13 (lista/calendario) + B15 (gráfica/reporte)        |
| TimeFrameComponent                    | B11                                                   |
| MeasurementDetailPage                 | B15                                                   |
| MoonPhasePage                         | B15                                                   |
| ProfilePage                           | B16                                                   |
| PersonalInfoPage                      | B16                                                   |
| AchievementPage                       | B16                                                   |
| AlertsPage (Notificaciones)           | B16                                                   |
| ConfigurationPage                     | B18                                                   |
| SyncActionComponent                   | B11                                                   |
| CreationPage (QA)                     | B19 (EXCLUIR, R-43)                                   |
| GuideMeasurementComponent             | B13                                                   |
| AlertComponent                        | B10                                                   |
| AreachartComponent                    | B11                                                   |
| CalendarComponent                     | B11                                                   |
| DayComponent                          | B10 (primitiva) → B11 (integración Calendar)          |
| EnvironmentalReportComponent          | B15                                                   |
| HeaderComponent                       | B11                                                   |
| MoonCardComponent                     | B11                                                   |
| ProgressBarComponent                  | B10                                                   |
| ExploreContainerComponent             | B11                                                   |
| SafeHtmlPipe                          | B09                                                   |
| Sistema de rutas/navegación           | B12                                                   |
| Theme / Design tokens                 | B08                                                   |
| Tipografía Montserrat                 | B08                                                   |
| Assets: iconos UI SVG (~28)           | B10                                                   |
| Assets: iconos de fase lunar SVG      | B10                                                   |
| Assets: GIFs de animación             | B10                                                   |
| Assets: ilustraciones, logos, fondos  | B10                                                   |
| Assets: iconos PWA/Capacitor + splash | B02                                                   |
| Iconos Ionicons built-in (name=)      | B10 _(dedup con Deps `ionicons` — se cuenta en Deps)_ |

### §3.2 Dominio Lógica/datos/Amplify (42 ítems)

| Ítem matriz                                                | Bloque                                           |
| ---------------------------------------------------------- | ------------------------------------------------ |
| errors-api.service.ts                                      | B04                                              |
| user-api.service.ts                                        | B04                                              |
| racimo-api.service.ts                                      | B04                                              |
| uva-api.service.ts                                         | B04                                              |
| user-progress-api.service.ts                               | B04                                              |
| moon-phase-api.service.ts                                  | B04                                              |
| auth.service.ts                                            | B04                                              |
| test-users.service.ts                                      | B04                                              |
| session/session.service.ts                                 | B05                                              |
| datastore/measurement-ds.service.ts                        | B04                                              |
| datastore/user-progress-ds.service.ts                      | B04 (port) → B07 (separar lectura/efectos, Jest) |
| datastore/gamification-event-ds.service.ts                 | B04                                              |
| datastore/user-ds.service.ts                               | B04                                              |
| datastore/uva-ds.service.ts                                | B04                                              |
| datastore/racimo-ds.service.ts                             | B04                                              |
| datastore/sync-monitor-ds.service.ts                       | B06                                              |
| storage/file-system/file-system.service.ts                 | B05                                              |
| storage/s3/s3.service.ts                                   | B05                                              |
| storage/configuration-app.service.ts                       | B06 (ConfigContext) + B08 (ThemeProvider)        |
| view/setup/setup.service.ts                                | B07                                              |
| view/setup/setup-racimo.service.ts                         | B07                                              |
| view/gamification/gamification.service.ts                  | B07                                              |
| view/gamification/gamification-alerts.service.ts           | B07                                              |
| view/gamification/gamification-alerts-types.service.ts     | B07                                              |
| view/gamification/notification.service.ts (BADGE)          | B12 (UnreadNotificationsStore)                   |
| view/moon/moon-phase.service.ts                            | B07                                              |
| view/app-usage.service.ts                                  | B06                                              |
| view/environmental-report.service.ts                       | B07 (agregación pura) → B15 (render view-shot)   |
| view/share.service.ts                                      | B16                                              |
| minimize/app-minimize.service.ts                           | B17                                              |
| services/notification/notification.service.ts (PUSH LOCAL) | B17 (LocalRemindersService)                      |
| src/models/session.model.ts                                | B04                                              |
| src/models/schema.js + schema.d.ts                         | B03                                              |
| src/models/index.js + index.d.ts                           | B03                                              |
| src/models/configuration/config.model.ts                   | B04                                              |
| src/models/configuration/measurements.model.ts             | B04 (modelo) → B07 (motor/validateRestriction)   |
| src/models/configuration/colors.model.ts                   | B04 (modelo) → B08 (alimenta ThemeProvider)      |
| src/app/Interfaces/IMeasurement.ts                         | B04                                              |
| src/app/Interfaces/ITask.ts                                | B04                                              |
| src/graphql/\* + src/API.ts                                | B03                                              |
| Amplify bootstrap (main.ts+app.component.ts)               | B03                                              |
| Patrón DI Angular → RN                                     | B01 (convención) + B04/B06 (aplicación)          |

### §3.3 Dominio Dependencias/Build (67 ítems)

| Ítem matriz                                                                        | Bloque                                                                |
| ---------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| @angular/\* (core/common/compiler/forms/router/animations/platform-browser)        | B01 (scaffold reemplaza) + B19 (desinstalar)                          |
| @ionic/angular                                                                     | B01 (reemplazo) + B19 (desinstalar)                                   |
| @ionic/angular-toolkit                                                             | B19                                                                   |
| ionicons + addIcons (tabs)                                                         | B10 _(pieza dedup; acción dominante: eliminar paquete+CDN)_           |
| rxjs                                                                               | B12 (BehaviorSubject→Context) + B19 (desinstalar)                     |
| zone.js                                                                            | B01 (no se incluye) + B19 (desinstalar)                               |
| tslib                                                                              | B01 (lo trae preset Expo)                                             |
| aws-amplify ^6                                                                     | B03                                                                   |
| @aws-amplify/datastore ^5                                                          | B03                                                                   |
| chart.js                                                                           | B11 (victory-native) + B19 (desinstalar)                              |
| chartjs-adapter-date-fns                                                           | B11 + B19 (desinstalar)                                               |
| date-fns ^4                                                                        | B07/B11 (conservar)                                                   |
| @types/date-fns                                                                    | B19 (eliminar)                                                        |
| dompurify                                                                          | B09 (sanitize-html) + B19 (desinstalar)                               |
| html-to-image                                                                      | B15 (view-shot) + B19 (desinstalar)                                   |
| sweetalert2                                                                        | B19 (eliminar, R-45)                                                  |
| @sweetalert2/ngx-sweetalert2                                                       | B19 (eliminar)                                                        |
| @capacitor/core                                                                    | B17 (Platform.OS) + B19 (desinstalar)                                 |
| @capacitor/android                                                                 | B19                                                                   |
| @capacitor/app                                                                     | B17                                                                   |
| @capacitor/preferences                                                             | B05                                                                   |
| @capacitor/filesystem                                                              | B05                                                                   |
| @capacitor/local-notifications                                                     | B17                                                                   |
| @capacitor/share                                                                   | B16                                                                   |
| @capacitor/clipboard                                                               | B16                                                                   |
| @capacitor/device                                                                  | B17                                                                   |
| @capacitor/haptics                                                                 | B19 (eliminar)                                                        |
| @capacitor/keyboard                                                                | B19 (eliminar; Keyboard.dismiss puntual en B14/B16)                   |
| @capacitor/network                                                                 | B03 (NetInfo) + B19 (eliminar plugin)                                 |
| @capacitor/splash-screen                                                           | B12 (expo-splash-screen) + B19 (eliminar plugin)                      |
| @capacitor/status-bar                                                              | B12 (expo-status-bar) + B19 (eliminar plugin)                         |
| @capacitor/cli                                                                     | B01/B02 (expo/eas) + B19                                              |
| @capacitor/assets                                                                  | B02 (app.json) + B19                                                  |
| cordova-res                                                                        | B19 (eliminar)                                                        |
| Toolchain ESLint (eslint+@typescript-eslint+plugins)                               | B01                                                                   |
| @angular-eslint/\*                                                                 | B01 (reemplazo) + B19 (desinstalar)                                   |
| prettier + .prettierrc                                                             | B01                                                                   |
| Stack Karma/Jasmine                                                                | B01 (Jest) + B19 (desinstalar)                                        |
| 57 specs \*.spec.ts                                                                | B07 (lógica pura) + B13/B14/B15/B16 (RN Testing Library por pantalla) |
| husky                                                                              | B19                                                                   |
| ini + inquirer                                                                     | B19 (eliminar)                                                        |
| typescript + tsconfig\*                                                            | B01                                                                   |
| @angular-devkit/build-angular + CLI + compiler                                     | B01 (Metro/Expo) + B19 (desinstalar)                                  |
| Script npm start (ng serve)                                                        | B01                                                                   |
| Script npm build/watch                                                             | B01/B02                                                               |
| Scripts npm test/test:dev/test:ci                                                  | B01                                                                   |
| Scripts npm lint/lint:fix/format                                                   | B01                                                                   |
| Script npm update-graphql (codegen)                                                | B03                                                                   |
| Scripts amplify-modelgen/amplify-push                                              | B19 (eliminar, rotos)                                                 |
| scripts/setup-android.sh                                                           | B02 (expo prebuild) + B19                                             |
| scripts/build-android.sh + build-bundle.sh                                         | B02/B19                                                               |
| scripts/build-production.sh + -safe                                                | B02 (perfiles eas) + B19                                              |
| android:full + build-android-debug                                                 | B02/B19                                                               |
| scripts/setup-dev-environment.sh (312 líneas)                                      | B19 (reescribir para Expo)                                            |
| capacitor.config.ts + ionic.config.json                                            | B02 (app.json) + B19 (eliminar)                                       |
| angular.json                                                                       | B01 (app.json+eas.json+metro+babel) + B19 (eliminar)                  |
| android/ (Gradle/Capacitor)                                                        | B02 (expo prebuild en mobile/) + B19 (eliminar el de raíz)            |
| Keystore android/keys/keystore.jks                                                 | B02 (subir a EAS) + B19 (purgar historia git, R-10)                   |
| versionCode/versionName/applicationId                                              | B02                                                                   |
| Íconos/splash (resources/splash.png; sin icon.png) + parche sed                    | B02                                                                   |
| Workflow build-android.yml (APK)                                                   | B19                                                                   |
| Workflow build-android-bundle.yml (AAB)                                            | B19                                                                   |
| Workflow test-secrets.yml                                                          | B19 (eliminar)                                                        |
| Ausencia de CI lint/test                                                           | B01 (crear) + B19 (consolidar)                                        |
| Docs de proceso (README-PIPELINE, release-workflow)                                | B19                                                                   |
| Config entornos Amplify (amplify/.config, team-provider)                           | B02 (perfiles eas + EXPO*PUBLIC*\*)                                   |
| Tooling aux (.editorconfig, .browserslistrc, karma.minimal, test.ts, polyfills.ts) | B01 (conservar .editorconfig) + B19 (eliminar resto)                  |

**Cobertura: 156/156 ítems asignados. Ningún huérfano.** (Los ítems con dos bloques reflejan port en un cimiento + integración/desinstalación posterior; no son doble conteo.)

---

## 7. Preguntas abiertas consolidadas (requieren al dueño del producto)

Deduplicadas de los tres planes; solo las que de verdad bloquean decisiones de negocio/seguridad o requieren acceso que el equipo de migración no tiene.

1. **versionCode publicado en Google Play (bloquea B02/B19, R-39).** El CI sobrescribía versionCode con timestamp/10 (8-9 dígitos) mientras `build.gradle` declara `8`. EAS autoIncrement debe partir por encima del mayor publicado o Play rechaza el update. ¿Cuál es el versionCode más alto realmente publicado? Solo accesible desde Play Console.

2. **Identidad del keystore y Play App Signing (bloquea B02/B19, R-10).** ¿El `android/keys/keystore.jks` versionado es el MISMO con el que está firmada la app publicada (SHA-256 del cert vs Play App Signing)? Si Play usa App Signing gestionado por Google, el **upload key** puede diferir del **app signing key** → cambia la estrategia. Y: ¿la historia git del repo fue alguna vez pública/compartida con el keystore commiteado? Si sí, hay que **ROTAR** (invalida la firma, requiere coordinar con Play), no solo purgar.

3. **Adapter de DataStore: AsyncStorage vs SQLite (decisión en B03).** AsyncStorage (default, mitigado por selective sync + outbox-only) vs `@aws-amplify/datastore-storage-adapter` SQLite (mejor para el histórico de Measurements). ¿Cuál es el volumen real de Measurements por usuario del RACIMO más activo en producción? Idealmente medir en device con datos reales.

4. **Motor de restricciones `FlowRestriction.validationFunction` (afecta B07/B13, R-35).** Hoy se ignora (la UI usa la función fija `0:>:1`). Por defecto se **preserva y documenta** (4.4). ¿Hay RACIMOs en producción que necesiten restricciones de medición configurables/distintas? Decisión de producto.

5. **Umbrales de germinación hardcodeados 11/41/64 vs `ConfigModel.gamification` (afecta B07/B13).** Divergen de la config descargable por RACIMO. ¿Se unifican con la config del RACIMO (multi-tenant real) o se preservan hardcodeados? Afecta los textos exactos de los 4 modales de Home.

6. **Push remoto Firebase (afecta alcance de B17).** `google-services.json` está ausente y el push Firebase no funciona hoy. El alcance actual cubre solo recordatorios LOCALES (expo-notifications). ¿Se debe reactivar el push remoto (requiere FCM/google-services + trabajo fuera de la matriz) o solo recordatorios locales?

7. **Minimizar app con botón atrás (afecta B17, R-14).** `moveTaskToBack` requiere un módulo nativo Android propio dentro del CNG/prebuild (rompe "prebuild puro"). ¿Es requisito de producto mantener exactamente "minimizar en vez de cerrar" en rutas raíz, o se acepta el comportamiento estándar de back?

8. **`HeaderComponent.goBack` logout sin implementar (afecta B11, R-29).** Rama muerta de logout en el header. ¿Se implementa el logout desde el header o se elimina la rama? Decisión de producto.

9. **Acceso a dispositivo Android físico para spikes (bloquea gates de B03/B17/B18).** Los gates críticos (notificaciones bajo Doze, sync offline, exact-alarm, view-shot) NO se verifican fiablemente en emulador. ¿Hay un device físico (con optimización de batería/Doze) disponible para los spikes?

10. **Entornos Amplify y credenciales (afecta B02).** El repo local apunta a `develop`; el CI usa también `test` y `main` (no presentes localmente) y las credenciales de AppSync/Cognito están hardcodeadas en `amplifyconfiguration.json`. ¿Qué entorno usa cada perfil EAS (development/preview/production) y se asume el schema/backend Amplify **congelado** durante la migración (necesario para el codegen)?

11. **Criterio de aceptación de paridad visual Fase 6 (afecta B19).** RN nativo no replica el shadow DOM Ionic 1:1. ¿La paridad debe ser pixel-perfect o aproximada idiomática? Define el gate de aceptación del cutover.

# B13c — Demo end-to-end del slice en emulador (gate de validación del ensamble)

**Fecha:** 2026-06-12 · **Build:** dev client Expo (debug) sobre Metro · **Emulador:** AVD `UVA_API35` (Android 35, arm64, medium_phone) · **Usuario de prueba:** `3000000002` (salta OTP) · **RACIMO:** ANT025 · **UVA:** `UVA_ANT025_00001`

Las capturas (`NN-*.png`) están **gitignoradas** (regla global `*.png`); este README es el artefacto versionado.

## Veredicto: PASA CON SALVEDADES

El camino completo splash → login (test user) → home con datos reales → registro de medición (validación por rangos + dígitos) → persistencia en DataStore → sync a nube (ACK con `owner`/`createdAt`) → historial (calendario + agregaciones + detalle con params tipados) **funciona en emulador**. Para llegar ahí el gate destapó **2 bugs de integración reales** (corregidos y commiteados aparte) y un **límite de plataforma** (AsyncStorage 6MB) mitigado localmente. Los huecos restantes son los placeholders planificados (B14/B15/B16).

## Bugs encontrados por el gate (corregidos)

1. **`async-storage ^3.1.1` rompía Amplify DataStore por completo** (entró en B03, commit `76943c8`). La v3 eliminó `multiGet`/`multiSet`/`multiRemove`; el adapter `AsyncStorageDatabase` de `@aws-amplify/datastore` los invoca → `DataStore.start()` rechazaba con `TypeError: undefined is not a function` → **todo `DataStore.query()` colgaba indefinidamente** (el sync con la nube nunca había corrido en el RN app). Invisible por partida doble: el `catch` de `SyncContext.waitForSync()` tragaba el error sin log, y el mock global de Jest sí provee `multiGet`. **Fix:** downgrade a `2.2.0` (la versión que empaqueta Expo SDK 56) + rebuild del APK + test de contrato (`b13c-async-storage-amplify-contract.test.ts`) que importa el módulo real y verifica la superficie de API que Amplify usa.
2. **Deadlock del splash por closure obsoleto** (`SplashScreen.tsx`): el callback de fin de animación (Reanimated `runOnJS`) se crea en el primer render y capturaba `destination=null`; cuando el auth resolvía ANTES que la animación (el caso normal una vez arreglado el bug 1), `maybeFireCallback(null)` consumía el flag `callbackFired` sin disparar `onAuthResolved` → splash eterno. Solo funcionaba antes porque el auth tardaba >10s en timeouts de DataStore. **Fix:** ref con el valor fresco de `destination` + no consumir el flag si aún no hay destino.
3. (Observabilidad) `SyncContext.waitForSync()` ahora loguea los fallos de `DataStore.start()` en vez de tragarlos.

## Guion ejecutado y resultado por paso

| # | Paso | Resultado | Evidencia |
|---|------|-----------|-----------|
| 1 | Splash animado (logo UVA + Powered by MakeSens) → AuthGate → LoginScreen, sin DevGate | ✓ | 01, 08, 09 |
| 2a | "123" → botón Continuar deshabilitado (gris) | ✓ | 03 |
| 2b | "3000000002" → habilitado (teal) → modal "¿Es correcto este número…?" → "Sí, continuar" → sign-in OK sin OTP | ✓ | 04, 05, 10, 11 |
| 3a | Post-login aterriza en placeholder ProjectVinculation | ✓ (hueco B14 esperado) | 06, 12 |
| 3b | Relanzar app → AuthGate con sesión persistida: `Local user found` → UVA → racimo code → **"All validations passed, navigating to home"** (queries DataStore en ~80ms; antes del fix colgaban) | ✓ | logs |
| 4a | Home: fecha real, racha 0, calendario semanal con el 12 (Vi) resaltado, "Progreso: 0 de 3", barra, tarjeta lunar "Luna llena", chip semillas | ✓ | 13 |
| 4b | Modal ⓘ racha (estados de días + página 2 con ejemplo "¿Por qué solo dos días?") | ✓ | 14, 15 |
| 4c | Modal ⓘ semillas (+2/+1/+3, recuperar racha 5 semillas) + página 2 con **los 4 rangos de germinación** (0-10 nada / 11-40 brote / 41-63 plántula / >63 flor) con textos exactos | ✓ | 16, 17 |
| 5a | Tab Registrar: 3 tareas reales de la config del RACIMO con restricciones de horario calculadas ("Disponible hasta las 08:00" / "Disponible en 7h49m") | ✓ | 18 |
| 5b | Entrar a "Temperatura y humedad (mañana)" fuera de ventana → **bypass isTestUser** permite continuar → guía paso a paso (RichText HTML + imagen) → Continuar | ✓ | 19 |
| 5c | Formulario "Registro máximos": inputs por dígito con auto-avance; valor fuera de rango (9 °C < 16) → error en vivo "La temperatura max no puede ser menor a 16 °C" | ✓ | 20, 21 |
| 5d | Valores válidos 29 °C / 65 % → "Guardar registro" → modal "Verifica los datos 🤔" → confirmar | ✓ | 22, 23, 24 |
| 6a | Persistencia: tarea pasa a "Registros completados" con `temperatura max 29°C / humedad max 65%`, "Progreso: 1 de 3" | ✓ | 25 |
| 6b | **Round-trip a la nube verificado en la BD local**: el registro (`8a0696f4-94fd-457a-9b9d-77861dce884b`, `{TEMPERATURA_MAX:29, HUMEDAD_MAX:65}`, task1, `2026-06-12T15:14:02Z`) aparece con `owner` + `createdAt` devueltos por AppSync | ✓ | inspección RKStorage |
| 6c | Historial (Mes): día 12 resaltado, agregados del mes 29.0 °C / 65.0 % / 0.0 mm; navegación ← Mayo / Julio → | ✓ | 26 |
| 6d | Toggle "Ver como gráfica": selector de serie activo; **gráfica Skia EN BLANCO por SwiftShader** (limitación del emulador, no de la app — solo verificable en device físico) | ⚠ parcial | 27 |
| 6e | Toggle Año: agregación anual real multi-mes (23.4 °C prom., max 29.0 incluye el dato QA; hay histórico previo del test user sincronizado) | ✓ | 28 |
| 6f | Tap día 12 → MeasurementDetail placeholder **con params tipados correctos** (`calendar: 2026-06-12T05:00:00.000Z`, `origin: historical`) | ✓ (hueco B15 esperado) | 29 |
| 7a | Tarjeta lunar → MoonPhase placeholder (B15) | ✓ | 30 |
| 7b | Tab Perfil → placeholder (B16) con accesos Logros/Alertas/Info Personal/Configuración | ✓ | 31 |

## Datos QA creados

- 1 medición real del test user (`3000000002`, UVA `UVA_ANT025_00001`, RACIMO ANT025): **task1 "Temperatura y humedad (mañana)" = 29 °C / 65 %**, `ts 2026-06-12T15:14:02.156Z`, id `8a0696f4-94fd-457a-9b9d-77861dce884b`. Sincronizada a la nube (develop).

## Hallazgos / huecos para B14–B16 (no son fallos de B13)

- **B14 — vinculación**: `LoginScreen` navega incondicionalmente a `ProjectVinculation` tras sign-in directo (`LoginScreen.tsx:136`) y el placeholder no hace el check `configExists()` → tabs. Tras instalación fresca **nada descarga la config del RACIMO ni las lunaciones** (eso vive en ValidateProject/`downLoadData`): para la demo se inyectó la config real de ANT025 desde el repo `UVA-App-Configuration` vía `adb push` al sandbox (`files/public/racimos/ANT025/`). El ENOENT de `lunar-phases-YYYY-MM.json` persiste (no bloqueante: la tarjeta lunar tiene fallback) y sus toasts de LogBox en dev **cubren la tab bar** (estorban la interacción, solo en dev).
- **B14 — sesión**: tras `signIn` el sync engine de DataStore no rearranca solo con las credenciales nuevas; el primer sync completo ocurre en el siguiente arranque (el gate `waitForSync` de 30s lo absorbe). Verificar en B14 si conviene `DataStore.start()` explícito post-login.
- **B15**: gráfica Skia pendiente de validar en device físico; "0 Registros" como contador del mes con 1 día parcial — confirmar paridad de ese conteo contra Ionic.
- **Menor (B13b)**: tras confirmar el guardado, la pantalla se queda en el formulario lleno en vez de encadenar visiblemente `nextFlow` (flow2 mínimos) o volver a la lista; el guardado y el estado de la tarea son correctos al volver manualmente.

## Limitaciones de entorno conocidas (emulador)

- **AsyncStorage cap 6MB (Android)**: el sync inicial llenó `RKStorage` hasta 6.0MB exactos → `SQLITE_FULL` en cada escritura posterior. Mitigado **localmente** con `AsyncStorage_db_size_in_MB=60` en `mobile/android/gradle.properties` (árbol generado por prebuild, gitignorado) + rebuild. **Pendiente fix durable** (B19 o antes): fijarlo vía config plugin/expo-build-properties o migrar DataStore al adapter SQLite — con histórico real de usuarios, 6MB no alcanza.
- **Skia (victory-native) renderiza en blanco** bajo SwiftShader: charts solo verificables en device físico (gate de B15).
- **DNS stale del emulador**: si el host cambia de red tras el boot, el emulador conserva el DNS viejo y Cognito se vuelve inalcanzable (`login "Unknown"`). Solución: relanzar con `-dns-server 8.8.8.8,1.1.1.1`.
- Demo ejecutada en emulador; el **gate en device físico** (plan B13) sigue pendiente como parte de la validación de R-04/R-13.

# Wave 5 — Integración Visual y Funcional (Round 4)

**Fecha:** 2026-06-12  
**Integrador:** Claude Fable 5 (agente)  
**SHA base:** 6b98dad  
**SHA integración:** 9b952c2  
**Branch:** feature/ionic-to-react-native

---

## Bug crítico encontrado y corregido

### SVG-como-Image crash ("property is not configurable")

**Causa raíz:** `ProfileScreen`, `PersonalInfoScreen`, `AchievementScreen` y `Calendar.tsx` usaban
`require('@/assets/svg/icons/*.svg')` como `source` de `Image` de React Native. Con
`react-native-svg-transformer`, los SVGs son módulos de componentes React (NO assets binarios).
El deepFreeze de Amplify DataStore congelaba estos objetos y RN intentaba mutar el prop `source`,
causando el error `TypeError: property is not configurable` al montar cualquier pantalla del perfil.

**Fix:** Todos los SVGs importados como `import XxxIcon from '@/assets/svg/icons/xxx.svg'` y
usados como `<XxxIcon width={N} height={N} />`. Day.tsx actualizado para aceptar
`React.FC | string | null` en el prop `icon`. Calendar.tsx migrado de require() a imports.

**Archivos modificados:**
- `mobile/src/screens/profile/ProfileScreen.tsx`
- `mobile/src/screens/profile/PersonalInfoScreen.tsx`
- `mobile/src/screens/profile/AchievementScreen.tsx`
- `mobile/src/components/calendar/Calendar.tsx`
- `mobile/src/components/ui/Day.tsx`
- `mobile/App.tsx` (LogBox.ignoreLogs para ENOENT lunar-phases)

---

## Tabla de veredictos por pantalla

| Pantalla | Bloque | Captura | Veredicto | Nota |
|---|---|---|---|---|
| HomeScreen | B13 | `02-home-after-login.png` | PARIDAD OK | Fecha, racha, progreso, moon card, tab bar |
| ProfileScreen | B16 | `14-profile-clean.png` + `34-profile-final.png` | PARIDAD OK tras fix SVG | Avatar, nombre, chips, menú, logout, logo Natura |
| PersonalInfoScreen | B16 | `15-personal-info-scaled.png` | PARIDAD OK tras fix SVG | Datos personales, ubicación, footer Editar datos |
| AchievementScreen | B16 | `16-achievements-scaled.png` | PARIDAD OK tras fix SVG | Grid 4 cols, BroteIcon SVG, FAB ¿Dudas? |
| ConfigurationScreen | B18 | `17-configuration.png` | PLACEHOLDER B18 | Esperado: B18 implementa la UI de configuración |
| HistoricalScreen (calendario) | B15 | `28-historical-clean.png` + `31-mayo-68-registros.png` | PARIDAD OK | Junio vacío + Mayo 68 registros con días completos |
| HistoricalScreen (gráfica) | B15 | `32-mayo-grafica.png` | PARIDAD PARCIAL | Selección Tem funciona; chart en blanco (deuda GPU emulador) |
| MoonPhaseScreen | B15 | `33-moon-phase.png` | PARIDAD PARCIAL | Fondo teal, MoonCard, calendario; icons vacíos por ENOENT lunar |
| Share de Historical | B15 | `29-mayo-calendar.png` (share sheet abierto) | FUNCIONAL OK | Android native share sheet con texto de reporte |

---

## Verificación funcional B17 (Notificaciones / Back button)

| Test | Resultado | Nota |
|---|---|---|
| Toggle notificaciones (Configuración) | PENDIENTE | ConfigurationScreen es placeholder B18 |
| BackHandler en HomeScreen | NO VERIFICADO EN DISPOSITIVO | Requiere AppMinimize native module (ver desviaciones B17) |
| BackHandler en pantallas internas | COMPORTAMIENTO CORRECTO | Hardware back navega hacia atrás |
| LocalRemindersService.scheduleDailyNotifications | CÓDIGO LISTO | Verificación con trigger corto pendiente (integrador manual) |

---

## Estado de tests y lint al cierre

- **Jest:** 655/655 tests PASS en 31 suites
- **ESLint:** 0 errores en archivos modificados
- **TypeScript:** 57 errores preexistentes (sin nuevos)

---

## Deuda pendiente para device físico / B18

1. **Chart Skia:** Blank en emulador SwiftShader. Verificar en device real con GPU.
2. **Moon SVG icons:** Muestran como círculos vacíos por ENOENT lunar-phases-YYYY-MM.json.
   Se resuelve sólo con conectividad (la API descarga el JSON, MoonPhaseService lo cachea).
3. **ConfigurationScreen (B18):** Placeholder. Notificaciones toggle pendiente de B18.
4. **AppMinimize:** BackHandler.exitApp() cierra en lugar de minimizar. Requiere native module
   `mobile/modules/app-minimize/` con `activity?.moveTaskToBack(true)` + `npx expo prebuild`.
5. **B14 ANT025 racimo test:** Verificación con código RACIMO real pendiente de integrador
   (no se ejecuta signUp real ni SMS en CI).

---

## Ambiente al cierre

- Emulador: UVA_API35 corriendo
- Metro: running en puerto 8081
- App: en pantalla de **Perfil** (ProfileScreen) lista para validación manual del usuario

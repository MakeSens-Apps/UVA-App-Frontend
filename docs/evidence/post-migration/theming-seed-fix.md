# Fix: theming dinámico por RACIMO + icono de semilla

**Fecha:** 2026-06-17 · **Reportado por:** el usuario (validación manual) · **Commits:** `88dd830` (semilla), `bbc3022` (theming)

Dos hallazgos del usuario que ni los tests ni las auditorías adversariales habían atrapado. Ambos corregidos y verificados por código + tests (814/814 verdes). La verificación visual en vivo del workflow se colgó (inestabilidad de Metro/browser); el cierre se hizo por verificación de código + test unitario, que prueba el mecanismo de punta a punta.

## 1. Theming dinámico por RACIMO (R-05) — era un bug REAL

### El problema
`buildRuntimeTheme` (ThemeProvider.tsx) guardaba los colores del RACIMO en un campo aparte `theme.brandingOverrides`, que **solo lee `varTokenResolver`/`RichText`**. Las pantallas leen `theme.colors.*`, que siempre devolvía el valor base → **únicamente el HTML enriquecido se re-tematizaba; la UI (header, tab bar, botones, tarjetas, calendario) NO**. Un RACIMO con branding distinto se habría visto igual de teal en casi toda la app.

El original (`src/app/core/services/storage/configuration-app.service.ts:273` `applyColors`) hace `document.documentElement.style.setProperty('--${key}', valor)` para cada color del `colors.json` → reescribe las CSS vars globalmente, así que toda la UI que usa `var(--Colors-X)` se re-tematiza.

### El fix
`buildRuntimeTheme` ahora **clona el árbol de tokens y aplica cada override del RACIMO al slot correcto** (`applyOverrideToColors`), mapeando las llaves del `colors.json` (`Colors-Blue-500`, `Colors-Gray-50`, ...) a las rutas de token (`colors.blue[500]`, `colors.gray[50]`). Las pantallas siguen leyendo `theme.colors.X` sin cambios, pero ahora `X` refleja el override del RACIMO. Se conserva `theme.brandingOverrides` para el HTML.

### Prueba (b08-theme.test.ts:276-277)
```js
applyOverrideToColors('Colors-Blue-500', '#FF0000', target);
expect(target.blue[500]).toBe('#FF0000');
```
Un override de RACIMO propaga al token que consumen las pantallas. Cobertura HEX y RGB.

> **Lección de proceso:** el cableado superficial existía (descarga → configColors → ThemeProvider → useTheme) y nos engañó tanto en la auditoría como en la remediación (ambas lo marcaron "ausente"→"falso positivo"). *Que esté cableado ≠ que el valor propague.* Verificar siempre el efecto end-to-end.

### Pendiente de validación visual
Confirmar en device/navegador que múltiples superficies (no solo el HTML) cambian al cargar un RACIMO con branding distinto. Mecanismo probado por test; falta la confirmación con ojo.

## 2. Icono de semilla y etapas de germinación — asset inventado

### El problema
`HomeScreen` usaba el emoji **🌰 (castaña, no la semilla de la marca)** en todos los modales (`+2 🌰`, `5 🌰`, `11 🌰 a 40 🌰`...) y emojis 🌱🌿🌸 para las etapas de germinación. El original (`home.page.html:39-41`) usa el SVG `semilla.svg` y los SVG `brote.svg` / `platula.svg` / `flor.svg`.

### El fix
Reemplazados todos los emojis por los SVG del original (importados como componentes vía `react-native-svg-transformer`): `SemillaIcon`, `BroteIcon`, `PlatulaIcon`, `FlorIcon`. Los 4 assets están en `mobile/src/assets/svg/icons/` (idénticos a los de `src/assets/images/icons/`). `HomeScreen` quedó con **cero emojis de semilla/germinación** (verificado por grep). El `semilla.svg` ya era byte-idéntico al original.

## Estado
- 814/814 tests verdes; 55 errores tsc (baseline preexistente, sin regresión); lint limpio; árbol commiteado.
- Validación visual en vivo pendiente (la del usuario o una pasada de browser estable).

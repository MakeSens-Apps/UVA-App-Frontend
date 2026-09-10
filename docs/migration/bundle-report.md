# Reporte de bundle — RN (Expo/Metro) vs Ionic

Generado como parte de B19 (hardening + cutover). Comando ejecutado:

```bash
cd mobile
npx expo export --platform android --output-dir /tmp/uva-export
```

Fecha: 2026-09-10. Commit base: `c52e69e`.

## Tamaño del export Android (Metro/Hermes)

| Artefacto | Tamaño |
|---|---|
| Bundle JS (Hermes bytecode, `.hbc`) | **11 MB** (`_expo/static/js/android/index-*.hbc`) |
| Assets empaquetados (fuentes, íconos, imágenes de `@expo/vector-icons`, `@react-navigation`, `assets/`, `src/assets/`) | **6.6 MB** |
| `metadata.json` | 8 KB |
| **Total `expo export`** | **18 MB** |

El bundle es código Hermes precompilado (bytecode), no JS de texto plano — es lo que se empaqueta dentro del APK/AAB final (junto con los assets, ya no requiere un WebView ni `www/`).

### Comparación contra Ionic (`www/`)

No existe build de Ionic disponible en este árbol de trabajo (no hay carpeta `www/` en la raíz del repo ni `node_modules` instalados para generarla en este worktree — el workflow de Angular no está bootstrapeado aquí). No fue posible generar `ionic build`/`ng build` para obtener una comparación de tamaño 1:1 sin instalar dependencias Angular, lo cual está fuera del alcance de esta tarea (aislada a `mobile/` y docs). Se documenta la ausencia en vez de una cifra estimada.

Como referencia cualitativa: la arquitectura Ionic previa cargaba un WebView completo (Angular + Ionic + Capacitor + Chart.js + zone.js + rxjs) además de los assets — típicamente varias decenas de MB en `www/` para apps Ionic/Angular de este tamaño — mientras que el bundle RN es una sola app nativa Hermes sin motor de renderizado web embebido. Si se requiere la cifra exacta, generar `ionic build --prod` (o `ng build --configuration production`) en un entorno con `npm install` en la raíz y volver a ejecutar `du -sh www`.

## Verificación R-50 (librerías del stack Ionic ausentes del bundle RN)

Se buscó dentro del bundle Hermes exportado (`strings` sobre el `.hbc`) por referencias de texto a las librerías que debían quedar fuera de la migración:

```bash
strings /tmp/uva-export/_expo/static/js/android/index-*.hbc | grep -iE "chart\.js|html-to-image|dompurify|sweetalert2"
```

Resultado: **sin coincidencias** para `chart.js`, `html-to-image`, `dompurify` ni `sweetalert2`. Confirma R-50: el reemplazo de estas librerías (gráfica SVG propia en `AreachartSvg.tsx`, `react-native-view-shot` para compartir, `sanitize-html` para renderizado seguro, alertas nativas/Toast) no dejó rastro de las dependencias Ionic originales en el artefacto final.

## Notas del proceso

- `expo export` requiere `mobile/amplifyconfiguration.json` (gitignored, no versionado). Para esta medición se usó temporalmente el mock de pruebas (`src/__tests__/__mocks__/amplify-config-mock.json`) copiado a `mobile/amplifyconfiguration.json` solo durante el export, y se eliminó al terminar — no afecta el árbol de trabajo ni queda commiteado (el archivo está en `.gitignore`).
- El export completo (4138 módulos) tardó ~9s en Metro sobre este equipo; no se detectaron errores de bundling una vez presente `amplifyconfiguration.json`.

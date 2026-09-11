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

---

# Tamaño de descarga en Play

Fecha: 2026-09-10. Commit base: `c8710d0`. Toolchain: JDK 17, Gradle 9.3.1, build-tools 36.0.0, bundletool 1.18.x.

## Por qué el APK universal de 112 MB no es la cifra a comparar

La app Ionic publicada "pesaba ~24 MB" en la ficha de Google Play: eso es **descarga**, no artefacto. Lo que se estaba comparando contra ella era el **APK universal** que produce `assembleRelease` — un solo archivo que mete *las cuatro* ABIs, *todas* las densidades y *todos* los idiomas, porque tiene que poder instalarse en cualquier dispositivo. Google Play nunca sirve ese archivo: se sube un AAB y Play genera, por dispositivo, un juego de *splits* (una ABI, una densidad, un idioma) y solo eso se descarga.

La métrica correcta es la de `bundletool get-size total`, que es exactamente la que Play muestra en la consola:

```bash
cd mobile/android && ./gradlew :app:bundleRelease --no-daemon
java -jar bundletool.jar build-apks \
  --bundle=app/build/outputs/bundle/release/app-release.aab \
  --output=/tmp/base.apks --mode=default \
  --ks="$HOME/.android/debug.keystore" --ks-key-alias=androiddebugkey \
  --ks-pass=pass:android --key-pass=pass:android
java -jar bundletool.jar get-size total --apks=/tmp/base.apks --dimensions=ABI
```

**Medido sobre el árbol sin optimizar, la descarga en Play ya era de ~25 MB, no de 112 MB.** El problema real era otro: el AAB sin R8 llevaba 27,6 MB de `.dex`, dos ABIs que ningún teléfono usa y 9,9 MB de bundle Hermes con sprites y fuentes que nunca se dibujan.

## Antes / después (bytes reales medidos)

| Artefacto | Antes (`c8710d0`) | Después | Δ |
|---|---:|---:|---:|
| **Descarga Play — arm64-v8a** (MIN–MAX) | 26 644 872 – 26 776 559 | **17 317 990 – 17 411 101** | **−35 %** |
| **Descarga Play — armeabi-v7a** (MIN–MAX) | 25 706 134 – 25 837 821 | **16 379 252 – 16 472 363** | **−36 %** |
| Descarga Play — x86_64 (MIN–MAX) | 27 222 479 – 27 354 166 | *(ya no se publica)* | — |
| Descarga Play — x86 (MIN–MAX) | 27 364 540 – 27 496 227 | *(ya no se publica)* | — |
| **AAB** (`app-release.aab`) | 74 816 263 | **40 372 990** | −46 % |
| **APK universal** (`app-release.apk`) | 112 302 701 | **54 237 822** | −52 % |

La descarga en un teléfono real queda en **16,5 MiB (arm64-v8a)** / **15,7 MiB (armeabi-v7a)** — por debajo de los ~24 MB de la app Ionic publicada.

### Desglose por paso (cada fila acumula la anterior)

| Paso | AAB | APK universal | Play arm64-v8a (MIN) |
|---|---:|---:|---:|
| Línea base | 74 816 263 | 112 302 701 | 26 644 872 |
| + R8 / `shrinkResources` / solo ABIs ARM | 43 613 079 | 57 988 758 | 20 544 119 |
| + recorte de los sprites lunares (SVG) | 42 415 303 | 56 389 930 | 19 347 237 |
| + import profundo de `Ionicons` | **40 372 990** | **54 237 822** | **17 317 990** |

### Composición del AAB (bytes sin comprimir dentro del `.aab`)

| Entrada | Antes | Después |
|---|---:|---:|
| `dex/` | 27 579 872 | 9 905 956 |
| `assets/index.android.bundle` (Hermes) | 9 926 108 | 8 006 324 |
| `res/` | 7 940 231 | 4 107 209 |
| `lib/arm64-v8a` | 22 305 720 | 22 305 720 |
| `lib/armeabi-v7a` | 15 468 712 | 15 468 712 |
| `lib/x86` | 23 663 152 | 0 |
| `lib/x86_64` | 23 864 104 | 0 |

> El AAB además contiene `BUNDLE-METADATA/com.android.tools.build.debugsymbols` (46 MB sin comprimir, ~12 MB comprimidos) y, ahora que R8 está activo, `…build.obfuscation` (el `mapping.txt` de 31 MB). **Nada de eso se descarga**: son metadatos que Play usa para desofuscar stack traces. Por eso el AAB (40 MB) es mucho mayor que la descarga (17 MB) y no sirve como proxy del tamaño de la app.

### De qué se compone la descarga de 17,3 MB (arm64-v8a)

Aproximación por entrada comprimida de los splits que Play sirve:

| Componente | ≈ bytes descargados |
|---|---:|
| `lib/arm64-v8a/*.so` (runtime RN + Hermes + módulos nativos) | ~7 371 180 |
| `classes*.dex` (Java/Kotlin ya pasado por R8) | ~4 029 056 |
| `assets/index.android.bundle` (bytecode Hermes; 8 006 324 en claro) | ~3 627 223 |
| `res/` (fuentes, GIFs, drawables) | ~2 198 605 |
| manifiesto, firmas, perfiles ART | ~0,2 MB |

## Cambios aplicados

### 1. R8 + `shrinkResources` (`mobile/app.json`)

```jsonc
["expo-build-properties", { "android": {
  …,
  "enableMinifyInReleaseBuilds": true,
  "enableShrinkResourcesInReleaseBuilds": true
}}]
```

Es el cambio más rentable con diferencia: **`dex` 27,6 MB → 9,9 MB** (−64 %). El `android/app/build.gradle` que genera el template ya lee esas dos propiedades (`android.enableMinifyInReleaseBuilds`, `android.enableShrinkResourcesInReleaseBuilds`), así que basta declararlas.

**Reglas ProGuard añadidas: ninguna.** Se revisaron los `proguard-rules.pro` que las librerías del stack ya exponen como `consumerProguardFiles` antes de escribir nada:

| Librería | Reglas que ya aporta |
|---|---|
| `react-native` (`ReactAndroid/proguard-rules.pro`) | `@DoNotStrip`/`@DoNotStripAny` (fbjni y RN), `-keep class * implements com.facebook.react.bridge.NativeModule { *; }`, `native <methods>`, `@ReactProp`/`@ReactPropGroup`, `com.facebook.react.bridge.**`, `turbomodule.core.**`, `com.facebook.jni.**` (Hermes), okio, yoga, fresco |
| `expo-modules-core` | `expo.modules.kotlin.modules.Module`, `Record`, `SharedObject`, `Enumerable`, `ExpoView`, `Service`, `@DoNotStrip` de Expo |
| `react-native-svg` | `-keep public class com.horcrux.svg.** {*;}` |
| `react-native-reanimated` | `com.swmansion.reanimated.**`, `turbomodule.**`, `fabric.**` |
| `react-native-worklets` | reglas propias |
| `expo-notifications` | reglas propias |
| app (`proguard-rules.pro` del template) | keeps extra de reanimated |

AWS Amplify aquí es **JavaScript puro** (`aws-amplify`, `@aws-amplify/datastore`, `@aws-amplify/storage`): vive dentro del bundle Hermes, R8 no lo toca, y `@aws-amplify/react-native` solo aporta un `NativeModule` que las reglas de RN ya conservan. `react-native-screens`, `gesture-handler`, `safe-area-context`, `netinfo`, `async-storage` y `view-shot` son módulos/`ViewManager` de RN estándar, cubiertos por `-keep class * implements NativeModule` (los nombres de `ViewManager` no hacen falta: se registran por el `String` que devuelve `getName()`, no por reflexión de clase).

Verificación de que R8 no rompió nada:

- `app/build/outputs/mapping/release/` contiene `mapping.txt`, `seeds.txt`, `usage.txt`, `resources.txt`, `configuration.txt`.
- **No se generó `missing_rules.txt`** → R8 no encontró ninguna referencia sin resolver que necesitara una regla adicional.
- `npx jest --ci`: 1063/1064 (el único fallo es el snapshot de MoonCard de B11, que depende de la ruta absoluta del worktree; no se actualiza).
- `npx tsc --noEmit`: 0 errores.

### 2. Solo ABIs ARM en release (`mobile/plugins/withReleaseArchitectures.js`)

Nuevo config plugin (mismo patrón que `withAsyncStorageDbSize.js`) que escribe en `android/gradle.properties`:

```
reactNativeArchitectures=armeabi-v7a,arm64-v8a
```

`x86`/`x86_64` solo existen para el emulador; ningún teléfono de Play los usa. Como Play ya sirve splits por ABI, esto **no cambia la descarga**, pero saca 47,5 MB de `.so` del AAB y del APK universal (y ahorra el tiempo de CMake/NDK de reanimated, worklets, rnscreens, rnsvg y expo-modules-core en dos arquitecturas).

Por qué *gradle property* y no `buildTypes.release { ndk { abiFilters … } }`: AGP hace la **unión** de `ndk.abiFilters` entre `defaultConfig` y el build type, así que un filtro por build type no puede *quitar* una ABI — sería un no-op. `reactNativeArchitectures` es la única palanca que lee el plugin Gradle de React Native, y es global al proyecto.

Para correr en un emulador x86_64 hay dos escapes documentados en el docblock del plugin:

```bash
cd android && ./gradlew assembleDebug -PreactNativeArchitectures=x86_64
# o
EXPO_ANDROID_ARCHITECTURES=armeabi-v7a,arm64-v8a,x86,x86_64 npx expo prebuild --platform android --clean
```

> **Al commitear**: el `.gitignore` de la raíz tiene un `*.js` heredado de la etapa Angular/Java, así que `git status` **no muestra** el plugin nuevo. Los otros dos (`withAsyncStorageDbSize.js`, `withReleaseSigning.js`) están versionados porque en su día se añadieron a la fuerza. Hay que hacer lo mismo:
>
> ```bash
> git add -f mobile/plugins/withReleaseArchitectures.js
> ```

### 3. Recorte de los sprites lunares (`mobile/src/assets/svg/moon/*.svg`)

El análisis del bundle JS (ver abajo) mostró que **el 45,6 % del bundle eran seis SVG**. No son vectores: son exportaciones de Figma en las que un `<rect>` se rellena con un `<pattern patternContentUnits="objectBoundingBox" width="1" height="1">` cuyo único hijo es un `<use>` de un `<image>` con un PNG en base64. Figma exporta la **hoja de sprites completa** y la desplaza con un `transform`; el `pattern` recorta al cuadrado unidad, así que más del 90 % de los píxeles del PNG nunca se dibujan. Los dos `gibosa_*.svg` llevaban *el mismo* PNG de 1920×1080 (md5 idéntico) y los otros cuatro *el mismo* PNG de 685×228.

Se recortó cada PNG a exactamente la región que cae dentro del tile (+2 px de margen) y se compensó el desplazamiento en el `transform`, de modo que **se pintan los mismos píxeles de origen a la misma escala**: no hay reescalado ni pérdida de resolución.

| Archivo | PNG embebido | Recorte | Antes (B) | Después (B) |
|---|---|---|---:|---:|
| `gibosa_creciente.svg` | 1920×1080 | 336×336 | 1 725 066 | 105 657 |
| `gibosa_menguante.svg` | 1920×1080 | 336×337 | 1 725 065 | 104 002 |
| `nueva.svg` | 685×228 | 150×150 | 186 284 | 18 582 |
| `llena.svg` | 685×228 | 159×159 | 186 282 | 38 153 |
| `cuarto_creciente.svg` | 685×228 | 149×150 | 186 282 | 30 274 |
| `cuarto_menguante.svg` | 685×228 | 150×150 | 186 282 | 28 730 |
| | | | **4 195 261** | **325 398** |

**Verificación de fidelidad visual**: los seis SVG se rasterizaron con Chromium (Playwright) antes y después, a 344×344 CSS con `deviceScaleFactor=2` (688×688 px de dispositivo — 8× el tamaño nominal de 86 px con el que se usan en la app). Los seis PNG de captura salieron **byte a byte idénticos**. No es "parecido": es el mismo render.

> Ojo con la aritmética: en el `.hbc` el ahorro es de 1,6 MB y no de 3,87 MB porque **Hermes deduplica literales de cadena**. Antes, las dos `gibosa` compartían una única copia del base64 en la tabla de strings y las cuatro pequeñas otra; ahora cada recorte es distinto, así que el ahorro neto es `1,72 + 0,19 − 0,32 ≈ 1,6 MB`.

### 4. `@expo/vector-icons`: import profundo en vez del barrel

`import { Ionicons } from '@expo/vector-icons'` arrastra el barrel completo, y el registro de assets de Metro acaba empaquetando **los 20 TTF de todas las familias de iconos** en `res/raw` — MaterialCommunityIcons (1,3 MB), FontAwesome6 Solid (424 KB), MaterialIcons (357 KB), Fontisto (314 KB)… La app solo usa `Ionicons`.

Cambio mecánico en cuatro archivos (`src/components/header/Header.tsx`, `src/screens/profile/ProfileScreen.tsx`, `src/screens/profile/AlertsScreen.tsx`, `src/screens/measurement/GuideMeasurementScreen.tsx`):

```ts
import Ionicons from '@expo/vector-icons/Ionicons';
```

Assets copiados por Metro: **27 TTF (8,6 MB) → 9 TTF (3,0 MB)**; `res/` del AAB: **7 940 231 → 4 107 209 bytes**. Los 9 TTF que quedan son Ionicons y las ocho variantes de Montserrat, todas en uso (las cuatro cursivas las consume `RichText.tsx` para el HTML del backend).

El mock de Jest (`__mocks__/expoVectorIconsMock.js`) necesitó `__esModule: true` + `default`, porque el `moduleNameMapper` redirige tanto el barrel como los subpaths al mismo archivo y el import por defecto tenía que resolver al componente, no al objeto de namespace.

### 5. Imports de `aws-amplify`: ya estaban bien (sin cambios)

Se revisó si el barrel de Amplify inflaba el bundle. `mobile/src` ya importa por subpath (`@aws-amplify/datastore` ×22, `aws-amplify/api` ×5, `aws-amplify/utils` ×3, `@aws-amplify/storage` ×3, `aws-amplify/auth` ×2). El único import del barrel raíz es `import { Amplify } from 'aws-amplify'` en `src/data/amplify-bootstrap/amplify-config.ts`, y `aws-amplify/dist/cjs/index.js` es un archivo de **12 líneas** que solo reexporta `DefaultAmplify`. No hay nada que ganar ahí.

## Composición del bundle JS (top paquetes)

Medido con `npx expo export:embed --platform android --dev false --sourcemap-output …` y un atribuidor propio sobre el `mappings` VLQ del source map (`source-map-explorer` no sirve porque el artefacto de `expo export` es bytecode Hermes, no JS).

Bundle JS minificado: **11 214 881 B (10,70 MB) → 6 914 738 B (6,59 MB)**.

| # | Paquete | Antes (B) | Después (B) | % del bundle final |
|---:|---|---:|---:|---:|
| 1 | `mobile/src/assets` (SVG inline) | 5 116 747 | 1 246 851 | 18,0 % |
| 2 | `react-native-reanimated` | 704 946 | 704 946 | 10,2 % |
| 3 | `react-native` | 690 052 | 690 052 | 10,0 % |
| 4 | *(runtime de Metro, sin mapeo)* | 925 950 | 511 706 | 7,4 % |
| 5 | `graphql` | 256 317 | 256 317 | 3,7 % |
| 6 | `rxjs` | 245 716 | 245 716 | 3,6 % |
| 7 | `entities` | 218 224 | 218 224 | 3,2 % |
| 8 | `@aws-amplify/auth` | 190 588 | 190 588 | 2,8 % |
| 9 | `date-fns` | 172 461 | 172 461 | 2,5 % |
| 10 | `@gorhom/bottom-sheet` | 161 631 | 161 631 | 2,3 % |
| 11 | `@aws-amplify/datastore` | 123 679 | 123 679 | 1,8 % |
| 12 | `@aws-amplify/core` | 119 266 | 119 266 | 1,7 % |
| 13 | `react-native-gesture-handler` | 107 194 | 107 194 | 1,6 % |
| 14 | `react-native-svg` | 104 413 | 104 413 | 1,5 % |
| 15 | `expo` | 91 295 | 91 295 | 1,3 % |
| 16 | `@aws-amplify/storage` | 85 497 | 85 497 | 1,2 % |
| 17 | `ramda` | 82 172 | 82 172 | 1,2 % |
| 18 | `@react-navigation/core` | 81 307 | 81 307 | 1,2 % |
| 19 | `react-native-worklets` | 77 138 | 77 138 | 1,1 % |
| 20 | `buffer` | 65 500 | 65 500 | 0,9 % |

El reparto de Amplify (auth + datastore + core + storage + api-graphql + `graphql` + `rxjs` + `ramda` + `fast-xml-parser` + `urijs` + `whatwg-url-without-unicode`) suma **~1,4 MB**: es el coste del cliente offline-first, y no hay poda trivial sin cambiar de estrategia de datos.

## Candidatos de assets NO aplicados

Estos siguen ahí a propósito: reducirlos exige **rebajar resolución** (no es un recorte sin pérdida como el de los sprites lunares), así que se documentan en vez de tocarlos.

| Asset | Tamaño (B) | Se dibuja a | PNG embebido | Propuesta |
|---|---:|---|---|---|
| `src/assets/svg/vault.svg` | 614 368 | 44×38 CSS px | 686×586 | reescalar a ~176×152 (4×) → ~25 KB |
| `src/assets/svg/icons/notion.svg` | 94 139 | 33×33 CSS px | 800×800 | reescalar a ~132×132 → ~10 KB |
| `src/assets/svg/icons/whatapp.svg` | 52 720 | 33×33 CSS px | 400×400 | reescalar a ~132×132 → ~8 KB |
| `src/assets/svg/icons/face.svg` | 40 695 | 33×33 CSS px | 800×800 | reescalar a ~132×132 → ~8 KB |
| `src/assets/gifs/done_register.gif` | 365 612 | pantalla completa | GIF animado | recortar fotogramas / reducir paleta |
| `src/assets/gifs/confety.gif` | 224 930 | pantalla completa | GIF animado | recortar fotogramas / reducir paleta |
| `src/assets/gifs/loader.gif` | 84 813 | pequeño | GIF animado | reescalar |

Total potencial: **~1,3 MB** más entre bundle JS y `res`. En esta máquina no hay `pngquant`, `optipng` ni `ffmpeg`; solo `sips`, que reescala pero no optimiza GIF animado. Requiere validación visual de diseño antes de aplicarse.

Otras palancas evaluadas y descartadas:

- **`android.enableBundleCompression=true`** comprimiría el `index.android.bundle` dentro del APK (8,0 MB → ~3,6 MB en el archivo), pero Play ya comprime para la descarga, así que **no cambiaría los 17,3 MB** y sí penalizaría el arranque (Hermes deja de poder mapear el bytecode con `mmap`).
- **Quitar los símbolos de depuración nativos del AAB** (`ndk.debugSymbolLevel = 'none'`) bajaría el AAB de 40 MB a ~28 MB, pero tampoco toca la descarga y se perderían los stack traces nativos desofuscados en Play Console.
- **`npm ci` para podar `node_modules`**: no se ejecutó. `mobile/node_modules` de este worktree es un *symlink* al árbol principal, que no se puede tocar. Se verificó en su lugar que `@shopify/react-native-skia` y `victory-native` (residuos en disco) **no aparecen en `package-lock.json` ni en el APK final** (`unzip -l app-release.apk | grep -ic 'skia|victory'` → 0): no pesan nada en el artefacto, `npm ci` solo limpiaría el disco.

## Cuál es el mínimo realista

El suelo de una app React Native es el runtime nativo más el motor JS, y eso no se poda:

| Componente irreducible (arm64-v8a) | bytes en claro |
|---|---:|
| `libreactnative.so` | 6 763 936 |
| `libhermesvm.so` | 2 460 728 |
| `libappmodules.so` | 1 678 704 |
| `libexpo-modules-core.so` | 1 464 696 |
| `libreanimated.so` + `libworklets.so` | 2 424 752 |
| `libc++_shared.so` + `libfbjni.so` + `libjsi.so` | 1 865 816 |
| resto (`rnscreens`, `rnsvg`, fresco/avif/webp/gif, zstd…) | ~5 647 000 |
| **Total `.so` arm64** | **22 305 720 → ~7 371 180 descargados** |

A eso se suman ~4,0 MB de `dex` (ya pasado por R8: RN + AndroidX + Expo + los módulos nativos) y ~3,6 MB de bytecode Hermes. **El piso práctico de esta app está en torno a 13–14 MB de descarga**; los 16,5 MiB actuales dejan ~2–3 MB de margen, que son justamente los candidatos de assets de arriba.

Ionic conseguía sus ~24 MB porque el motor de render (Chrome/WebView) **lo pone el sistema operativo**: el APK solo llevaba HTML/JS/CSS y una capa fina de Capacitor. React Native trae su propio runtime C++ y su propio motor JavaScript dentro del APK — ~20 MB sin comprimir por ABI solo en `.so`. Que aun así la descarga quede **por debajo** de la de Ionic se explica por lo que se gana en el otro lado: no hay Angular, ni Ionic Framework, ni zone.js, ni Chart.js, ni un `www/` completo dentro del binario.

## Reproducir la medición

```bash
cd mobile
npx expo prebuild --platform android --clean --no-install
printf 'sdk.dir=%s\n' "$ANDROID_HOME" > android/local.properties
cd android && ./gradlew :app:bundleRelease :app:assembleRelease --no-daemon

java -jar bundletool.jar build-apks \
  --bundle=app/build/outputs/bundle/release/app-release.aab \
  --output=/tmp/uva.apks --mode=default \
  --ks="$HOME/.android/debug.keystore" --ks-key-alias=androiddebugkey \
  --ks-pass=pass:android --key-pass=pass:android
java -jar bundletool.jar get-size total --apks=/tmp/uva.apks --dimensions=ABI
```

`mobile/amplifyconfiguration.json` (gitignored) tiene que existir o `createBundleReleaseJsAndAssets` falla al resolver el `require` de `src/data/amplify-bootstrap/amplify-config.ts`.

Nota sobre Gradle: la tarea `createBundleReleaseJsAndAssets` **no detecta cambios en `mobile/src/assets`**. Después de tocar un asset hay que borrar `android/app/build/generated/assets/react/release` antes de volver a construir, o se mide un bundle viejo.

# Expo Web — validación visual pixel-perfect

## Para qué sirve

La app RN (Expo 56) corre en Expo Web para hacer comparaciones visuales pixel-perfect contra las capturas de referencia Ionic (tomadas en Chrome a 360x740). Mismo motor de render, mismas fuentes, misma viewport. NO es para producción.

## Cómo correr

```bash
cd mobile
npm run web                    # puerto automático (por defecto 8081 o libre)
# o con puerto fijo para playwright:
npx expo start --web --port 8090
```

El servidor queda en `http://localhost:8090/` (o el puerto elegido).

## Login con usuario de prueba

El usuario `3000000002` no requiere OTP:

```bash
# 1. Abrir browser en viewport móvil
playwright-cli open --config=.playwright/cli.config.json "http://localhost:8090/"
playwright-cli resize 360 740

# 2. Login
playwright-cli fill e50 "3000000002"
playwright-cli click "getByRole('button', { name: 'Continuar' })"
playwright-cli click "getByRole('button', { name: 'Sí, continuar' })"

# 3. Workaround: la pantalla "Vinculando al proyecto" se cuelga en web
#    (DataStore/Cognito no pueden obtener tokens en el browser).
#    Navegar directamente al home:
playwright-cli goto "http://localhost:8090/app/tabs/home"
```

## Workarounds y limitaciones conocidas

### expo-secure-store (RESUELTO)
`expo-secure-store` no tiene implementación web — su módulo nativo exporta `{}`.
Se creó `src/data/session/session.web.ts` que reemplaza SecureStore con AsyncStorage
(localStorage en web) SOLO para la plataforma web. El código nativo (Android/iOS) no se altera.

### DataStore sync cuelga en web
Después del login, `waitForSyncDataStore()` se cuelga porque el DataStore no puede
obtener tokens JWT de Cognito en el browser. Workaround: navegar directamente con
`playwright-cli goto "http://localhost:8090/app/tabs/home"`.

### expo-file-system no disponible en web
`expo-file-system.readAsStringAsync` no está disponible en web. Afecta la caché local
de fases lunares. El error se loguea pero la app continúa (la API de fases lunares
funciona normalmente).

### react-native-view-shot (captureRef) no disponible en web
La funcionalidad de captura de imagen del reporte ambiental (`captureRef`) no funciona
en web. El fallback a reporte de texto funciona correctamente.

### expo-notifications (push/scheduling) parcialmente disponible en web
`expo-notifications` en web solo soporta Web Push (no scheduling nativo).
Las pantallas de configuración de notificaciones muestran advertencias en consola
pero no bloquean la navegación.

### BackHandler / minimize no aplica en web
`BackHandler.addEventListener('hardwareBackPress', ...)` y `minimizeApp()` son no-op
en web — Platform.OS !== 'android' los cortocircuita correctamente.

## Pantallas validables en web

| Pantalla | URL | Notas |
|---|---|---|
| Login | `http://localhost:<port>/` | OK — renderiza y acepta login |
| Home | `http://localhost:<port>/app/tabs/home` | OK con workaround de goto directo |
| Historial | `http://localhost:<port>/app/tabs/history` | OK — gráficas Skia/victory-native renderizan |
| Perfil | `http://localhost:<port>/app/tabs/profile` | OK |
| Registro | `http://localhost:<port>/app/tabs/record` | OK |

## Deuda web — pantallas/elementos que NO renderizan bien

- **Captura de imagen del reporte**: `captureRef` (react-native-view-shot) falla en web;
  el fallback a texto funciona. La cosecha pixel-perfect debe saltarse este elemento.
- **Fases lunares desde caché**: el archivo de caché no se lee (expo-file-system).
  La fase actual sí se muestra (vía API).
- **Notificaciones**: la configuración de notificaciones push/scheduling no es funcional
  en web — solo visual.
- **Minimize app**: no aplica en web (correcto).

## Dependencias instaladas para web

```
react-native-web    (react-native → DOM)
react-dom           (React rendering en browser)
@expo/metro-runtime (runtime Expo para Metro en web)
```

Instaladas con `npx expo install react-native-web react-dom @expo/metro-runtime`
desde `mobile/`.

## Configuración en app.json

```json
"web": {
  "bundler": "metro",
  "favicon": "./assets/favicon.png"
}
```

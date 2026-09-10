# UVA App (mobile)

App móvil de UVA en React Native / Expo (target Android). Ver la documentación completa en la raíz del repo: [`../README.md`](../README.md), [`../docs/arquitectura.md`](../docs/arquitectura.md).

## Arranque rápido

```bash
npm install

# Requiere mobile/amplifyconfiguration.json (gitignored, provisto aparte)
npm start                 # expo start --dev-client, necesita un Dev Client instalado
npm run android            # expo run:android
npm run web                 # expo start --web
```

## Tests y calidad

```bash
npm run test:ci    # jest --ci --coverage
npx tsc --noEmit
npm run lint
```

## Build nativo (sin EAS)

```bash
npx expo prebuild --platform android --clean
cd android
./gradlew assembleRelease   # APK
./gradlew bundleRelease     # AAB
```

## Documentación relacionada

- [`../docs/arquitectura.md`](../docs/arquitectura.md) — arquitectura de la app
- [`../docs/android-build.md`](../docs/android-build.md) — build Android local y en CI
- [`../docs/release-workflow.md`](../docs/release-workflow.md) — versionado, firma y release
- [`../docs/github-actions-pipeline.md`](../docs/github-actions-pipeline.md) — pipeline de CI/CD
- [`../docs/migration/bundle-report.md`](../docs/migration/bundle-report.md) — medición de bundle
- [`AGENTS.md`](AGENTS.md) — nota sobre versión de Expo para agentes/Claude Code

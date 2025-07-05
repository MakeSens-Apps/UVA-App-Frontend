#!/bin/bash

echo "🚀 Compilando aplicación para PRODUCCIÓN con restauración automática..."

# Configurar variables de entorno
export JAVA_HOME="/opt/homebrew/opt/openjdk@17"
export ANDROID_HOME="$HOME/Library/Android/sdk"
export PATH="$PATH:$ANDROID_HOME/emulator:$ANDROID_HOME/tools:$ANDROID_HOME/platform-tools"
export PATH="/opt/homebrew/opt/openjdk@17/bin:$PATH"

echo "📋 Paso 1: Guardando entorno actual..."
ORIGINAL_ENV=$(cat amplify/.config/local-env-info.json | grep -o '"envName": "[^"]*' | cut -d'"' -f4)
echo "   Entorno original: $ORIGINAL_ENV"

echo "🔄 Paso 2: Cambiando al entorno MAIN (producción)..."
amplify env checkout main

echo "📥 Paso 3: Obteniendo configuración de producción..."
amplify pull --yes

echo "🏗️  Paso 4: Compilando aplicación web para producción..."
npm run build

echo "🔄 Paso 5: Sincronizando con Capacitor..."
npx cap sync android

echo "📱 Paso 6: Compilando APK de producción..."
cd android

echo "🔨 Compilando APK de Release..."
gradle assembleRelease

echo "📦 Compilando Bundle AAB..."
gradle bundleRelease

cd ..

echo "🔄 Paso 7: Restaurando entorno original ($ORIGINAL_ENV)..."
amplify env checkout $ORIGINAL_ENV
amplify pull --yes

echo ""
echo "✅ ¡Compilación de PRODUCCIÓN completada y entorno restaurado!"
echo ""
echo "📱 Archivos de PRODUCCIÓN generados:"
echo "   📄 APK Release: android/app/build/outputs/apk/release/app-release-unsigned.apk"
echo "   📦 Bundle AAB: android/app/build/outputs/bundle/release/app-release.aab"
echo ""
echo "🎯 APK/Bundle configurado para backend de PRODUCCIÓN (main)"
echo "🔧 Entorno local restaurado a: $ORIGINAL_ENV" 
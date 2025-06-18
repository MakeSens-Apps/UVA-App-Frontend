#!/bin/bash

echo "🚀 Compilando aplicación para PRODUCCIÓN (entorno main)..."

# Configurar variables de entorno
export JAVA_HOME="/opt/homebrew/opt/openjdk@17"
export ANDROID_HOME="$HOME/Library/Android/sdk"
export PATH="$PATH:$ANDROID_HOME/emulator:$ANDROID_HOME/tools:$ANDROID_HOME/platform-tools"
export PATH="/opt/homebrew/opt/openjdk@17/bin:$PATH"

echo "📋 Paso 1: Verificando entorno actual..."
CURRENT_ENV=$(cat amplify/.config/local-env-info.json | grep -o '"envName": "[^"]*' | cut -d'"' -f4)
echo "   Entorno actual: $CURRENT_ENV"

echo "🔄 Paso 2: Cambiando al entorno MAIN (producción)..."
amplify env checkout main

echo "📥 Paso 3: Obteniendo configuración más reciente del backend..."
amplify pull --yes

echo "🏗️  Paso 4: Compilando aplicación web para producción..."
npm run build

echo "🔄 Paso 5: Sincronizando con Capacitor..."
npx cap sync android

echo "📱 Paso 6: Compilando APK de producción..."
cd android

echo "🔨 Compilando APK de Debug (más rápido para pruebas)..."
gradle assembleDebug

echo "🔨 Compilando APK de Release (para distribución)..."
gradle assembleRelease

echo "📦 Compilando Bundle AAB (para Google Play Store)..."
gradle bundleRelease

cd ..

echo ""
echo "✅ ¡Compilación de PRODUCCIÓN completada!"
echo ""
echo "📱 Archivos generados:"
echo "   📄 APK Debug: android/app/build/outputs/apk/debug/app-debug.apk"
echo "   📄 APK Release: android/app/build/outputs/apk/release/app-release-unsigned.apk"
echo "   📦 Bundle AAB: android/app/build/outputs/bundle/release/app-release.aab"
echo ""
echo "🎯 La aplicación está configurada para el backend de PRODUCCIÓN (main)"
echo "🔧 Entorno activo: main" 
#!/bin/bash

echo "📱 Compilando APK de Android..."

# Configurar variables de entorno
export JAVA_HOME="/opt/homebrew/opt/openjdk@17"
export ANDROID_HOME="$HOME/Library/Android/sdk"
export PATH="$PATH:$ANDROID_HOME/emulator:$ANDROID_HOME/tools:$ANDROID_HOME/platform-tools"
export PATH="/opt/homebrew/opt/openjdk@17/bin:$PATH"

# Ir al directorio android y compilar
cd android

echo "🔨 Compilando APK de Debug..."
gradle assembleDebug

echo "🔨 Compilando APK de Release..."
gradle assembleRelease

echo ""
echo "✅ Compilación completada!"
echo "📄 APK Debug: android/app/build/outputs/apk/debug/app-debug.apk"
echo "📄 APK Release: android/app/build/outputs/apk/release/app-release-unsigned.apk" 
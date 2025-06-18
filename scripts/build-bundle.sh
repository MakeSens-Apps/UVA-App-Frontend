#!/bin/bash

echo "📦 Compilando Bundle de Android (AAB)..."

# Configurar variables de entorno
export JAVA_HOME="/opt/homebrew/opt/openjdk@17"
export ANDROID_HOME="$HOME/Library/Android/sdk"
export PATH="$PATH:$ANDROID_HOME/emulator:$ANDROID_HOME/tools:$ANDROID_HOME/platform-tools"
export PATH="/opt/homebrew/opt/openjdk@17/bin:$PATH"

# Ir al directorio android y compilar bundle
cd android

echo "🔨 Compilando Bundle de Release..."
gradle bundleRelease

echo ""
echo "✅ Bundle compilado!"
echo "📦 Bundle Release: android/app/build/outputs/bundle/release/app-release.aab"
echo "🚀 Listo para subir a Google Play Store" 
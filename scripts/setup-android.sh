#!/bin/bash

echo "🔧 Configurando plataforma Android..."

# 1. Verificar dependencias
if ! command -v brew &> /dev/null; then
    echo "❌ Homebrew no está instalado"
    exit 1
fi

if ! command -v java &> /dev/null; then
    echo "❌ Java no está instalado. Instalando OpenJDK 17..."
    brew install openjdk@17
fi

if ! command -v gradle &> /dev/null; then
    echo "❌ Gradle no está instalado. Instalando..."
    brew install gradle
fi

# 2. Configurar variables de entorno
export JAVA_HOME="/opt/homebrew/opt/openjdk@17"
export ANDROID_HOME="$HOME/Library/Android/sdk"
export PATH="$PATH:$ANDROID_HOME/emulator:$ANDROID_HOME/tools:$ANDROID_HOME/platform-tools"
export PATH="/opt/homebrew/opt/openjdk@17/bin:$PATH"

echo "✅ Variables de entorno configuradas"

# 3. Compilar la aplicación web
echo "🏗️  Compilando aplicación web..."
npm run build

# 4. Sincronizar con Capacitor
echo "🔄 Sincronizando con Capacitor..."
npx cap sync android

# 5. Generar assets (iconos y splash screens)
echo "🎨 Generando assets..."
npx @capacitor/assets generate

# 6. Corregir referencias de iconos si es necesario
if grep -q "@mipmap/ic_launcher_background" android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml 2>/dev/null; then
    echo "🔧 Corrigiendo referencias de iconos..."
    sed -i '' 's/@mipmap\/ic_launcher_background/@drawable\/ic_launcher_background/g' android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml
    sed -i '' 's/@mipmap\/ic_launcher_foreground/@drawable\/ic_launcher_foreground/g' android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml
    sed -i '' 's/@mipmap\/ic_launcher_background/@drawable\/ic_launcher_background/g' android/app/src/main/res/mipmap-anydpi-v26/ic_launcher_round.xml
    sed -i '' 's/@mipmap\/ic_launcher_foreground/@drawable\/ic_launcher_foreground/g' android/app/src/main/res/mipmap-anydpi-v26/ic_launcher_round.xml
fi

echo "✅ Configuración Android completada"
echo ""
echo "📱 Para compilar APK: ./scripts/build-android.sh"
echo "📦 Para compilar Bundle: ./scripts/build-bundle.sh" 
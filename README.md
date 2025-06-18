# UVA-App-Frontend

Aplicación móvil híbrida desarrollada con **Ionic/Angular** para medición y monitoreo de radiación UV, utilizando **AWS Amplify** como backend y **Capacitor** para funcionalidad nativa.

## 📋 Tabla de Contenidos

- [Requisitos del Sistema](#-requisitos-del-sistema)
- [Instalación Paso a Paso](#-instalación-paso-a-paso)
- [Configuración del Proyecto](#-configuración-del-proyecto)
- [Comandos de Desarrollo](#-comandos-de-desarrollo)
- [Troubleshooting](#-troubleshooting)
- [Arquitectura](#-arquitectura)

## 🖥️ Requisitos del Sistema

### Sistemas Operativos Soportados

- **macOS**: 10.15 (Catalina) o superior
- **Linux**: Ubuntu 18.04+ / Debian 10+ / CentOS 8+

### Hardware Mínimo

- **RAM**: 8GB (16GB recomendado)
- **Espacio en disco**: 10GB libres
- **Procesador**: Intel i5 / AMD Ryzen 5 o superior

## 🚀 Instalación Paso a Paso

### Paso 1: Node.js y npm

#### En macOS (usando Homebrew - Recomendado)

```bash
# Instalar Homebrew si no está instalado
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Instalar Node.js (versión LTS)
brew install node@20

# Verificar instalación
node -v  # Debe mostrar v20.x.x o superior
npm -v   # Debe mostrar 9.x.x o superior
```

#### En Linux (Ubuntu/Debian)

```bash
# Actualizar repositorios
sudo apt update

# Instalar Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verificar instalación
node -v
npm -v
```

### Paso 2: Git (si no está instalado)

#### macOS

```bash
# Git viene preinstalado, pero puedes actualizarlo
brew install git
```

#### Linux

```bash
sudo apt install git
```

### Paso 3: Herramientas de Desarrollo Global

```bash
# Instalar CLIs necesarios globalmente
npm install -g @ionic/cli @capacitor/cli @angular/cli @aws-amplify/cli

# Verificar instalaciones
ionic --version    # Debe mostrar 7.x.x o superior
npx cap --version  # Debe mostrar 6.x.x o superior
ng version         # Debe mostrar 18.x.x o superior
amplify --version  # Debe mostrar 12.x.x o superior
```

### Paso 4: Desarrollo Android (Opcional)

#### Java Development Kit (JDK)

**macOS:**

```bash
# Usando Homebrew
brew install openjdk@17

# Configurar JAVA_HOME
echo 'export JAVA_HOME=$(/usr/libexec/java_home)' >> ~/.zshrc
source ~/.zshrc
```

**Linux:**

```bash
sudo apt install openjdk-17-jdk

# Configurar JAVA_HOME
echo 'export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64' >> ~/.bashrc
echo 'export PATH=$PATH:$JAVA_HOME/bin' >> ~/.bashrc
source ~/.bashrc
```

#### Android Studio

1. **Descargar** desde [developer.android.com/studio](https://developer.android.com/studio)
2. **Instalar** siguiendo el asistente de instalación
3. **Configurar SDK** (Android SDK 33 o superior)
4. **Configurar variables de entorno:**

```bash
# Agregar al archivo ~/.zshrc (macOS) o ~/.bashrc (Linux)
export ANDROID_HOME=$HOME/Library/Android/sdk  # macOS
export ANDROID_HOME=$HOME/Android/Sdk          # Linux
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

## 📦 Configuración del Proyecto

### Opción 1: Configuración Automática (Recomendada) 🚀

```bash
# Clonar el proyecto
git clone [URL_DEL_REPOSITORIO]
cd UVA-App-Frontend

# Ejecutar script de configuración automática
./scripts/setup-dev-environment.sh
```

### Opción 2: Configuración Manual

#### Paso 1: Clonar el Repositorio

```bash
# Clonar el proyecto
git clone [URL_DEL_REPOSITORIO]
cd UVA-App-Frontend

# Verificar rama actual
git branch
```

#### Paso 2: Instalación de Dependencias

```bash
# Instalar todas las dependencias del proyecto
npm install

# Si hay errores, limpiar cache y reintentar
npm cache clean --force
npm install
```

#### Paso 3: Configuración de AWS Amplify

```bash
# Configurar Amplify CLI con tus credenciales AWS omitir este paso si no realizara acciones de administracion
amplify configure

# Inicializar Amplify en el proyecto (solo primera vez)
amplify init

# Obtener configuración del ambiente de desarrollo
amplify pull --appId [APP_ID] --envName develop

# Esto descargará automáticamente:
# - src/amplifyconfiguration.json
# - src/aws-exports.js
# - amplify/ (carpeta con configuración del backend)
```

> **Nota**: Solicita al administrador del proyecto el `APP_ID` de Amplify para el ambiente de desarrollo.

#### Paso 4: Configuración de Capacitor

```bash
# Sincronizar Capacitor con las plataformas
npx cap sync

# Agregar plataforma Android (si planeas desarrollar para móvil)
npx cap add android
```

#### Paso 5: Verificación de la Instalación

```bash
# Ejecutar tests de configuración
npm run lint          # Verificar código
npm run test           # Ejecutar tests unitarios
ionic serve --dry-run  # Verificar configuración de Ionic
```

### 🔍 Verificación Rápida del Entorno

Para verificar que todo está configurado correctamente, ejecuta:

```bash
# Verificar versiones de herramientas
node -v        # Debe mostrar v20.x.x o superior
npm -v         # Debe mostrar 9.x.x o superior
ionic --version # Debe mostrar 7.x.x o superior
ng version     # Debe mostrar Angular 18.x.x
amplify --version # Debe mostrar 12.x.x o superior

# Verificar archivos de configuración
ls src/amplifyconfiguration.json  # Debe existir
ls amplify/                       # Debe existir

# Test rápido del proyecto
npm run lint   # Sin errores de linting
ionic serve --dry-run # Sin errores de configuración
```

Si algún comando falla, revisa la sección de [Troubleshooting](#-troubleshooting).

## ⚡ Comandos de Desarrollo

### Desarrollo Web

```bash
# Servidor de desarrollo con hot reload
ionic serve
# o
npm start

# Servidor con puerto específico
ionic serve --port 8100

# Servidor accesible desde red local
ionic serve --external
```

### Desarrollo Móvil

```bash
# Construir para Android
ionic capacitor build android

# Ejecutar en Android Studio
ionic capacitor run android

# Ejecutar en dispositivo específico
ionic capacitor run android --target [device-id]

# Live reload en dispositivo
ionic capacitor run android --livereload --external
```

### Testing y Quality

```bash
# Tests unitarios
npm run test

# Tests con coverage
npm run test:ci

# Linting
npm run lint

# Formatear código
npm run format

# Build de producción
npm run build
```

### Amplify Commands

```bash
# Ver estado del backend
amplify status

# Actualizar backend
amplify push

# Generar modelos GraphQL
amplify codegen models

# Cambiar de ambiente
amplify env checkout [nombre-ambiente]

# Ver logs de funciones
amplify function logs [nombre-funcion]
```

## 🔧 Troubleshooting

### Problemas Comunes

#### Error: "Command not found"

```bash
# Verificar instalación global
npm list -g --depth=0

# Reinstalar CLI faltante
npm install -g @ionic/cli @capacitor/cli
```

#### Error: "Cannot resolve dependency"

```bash
# Limpiar node_modules y reinstalar
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

#### Error: "JAVA_HOME not set"

```bash
# Verificar JAVA_HOME
echo $JAVA_HOME

# Si está vacío, configurar según tu SO (ver Paso 4)
```

#### Error: "SDK not found" (Android)

```bash
# Verificar Android SDK
echo $ANDROID_HOME

# Listar SDKs instalados
sdkmanager --list

# Instalar SDK faltante
sdkmanager "platforms;android-33"
```

#### Error: "Amplify configuration not found"

```bash
# Verificar configuración de Amplify
amplify status

# Si no está inicializado
amplify init

# Obtener configuración del ambiente
amplify pull --appId [APP_ID] --envName dev
```

#### Error de permisos

```bash
# Cambiar ownership de npm folders
sudo chown -R $(whoami) ~/.npm
sudo chown -R $(whoami) /usr/local/lib/node_modules
```

### Logs y Debugging

```bash
# Ver logs detallados de Ionic
ionic serve --verbose

# Ver logs de Capacitor
npx cap open android  # Abre Android Studio con logs

# Logs de Amplify
amplify status --verbose
```

### Limpiar Proyecto

```bash
# Limpiar completamente el proyecto
npm run clean:all

# O manualmente:
rm -rf node_modules
rm -rf www
rm -rf .angular
npm cache clean --force
npm install
npx cap sync
```

## 🏗️ Arquitectura

### Stack Tecnológico

- **Frontend**: Angular 18 + Ionic 8
- **Móvil**: Capacitor 6
- **Backend**: AWS Amplify (GraphQL + Cognito)
- **Base de Datos**: DynamoDB
- **Lenguaje**: TypeScript 5.5

### Estructura del Proyecto

```
src/
├── app/
│   ├── components/          # Componentes reutilizables
│   ├── core/               # Servicios centrales
│   │   ├── services/       # Auth, API, Storage
│   │   └── pipes/          # Pipes personalizados
│   ├── pages/              # Páginas de la aplicación
│   │   ├── auth/           # Autenticación
│   │   ├── home/           # Página principal
│   │   ├── measurement/    # Mediciones UV
│   │   └── tabs/           # Navegación
│   └── Interfaces/         # Tipos TypeScript
├── assets/                 # Recursos estáticos
├── environments/           # Configuraciones de entorno
├── amplifyconfiguration.json # Configuración de Amplify
└── theme/                 # Estilos globales
```

### Comandos de Arquitectura

```bash
# Generar nuevo componente
ionic generate component components/mi-componente

# Generar nueva página
ionic generate page pages/mi-pagina

# Generar servicio
ionic generate service core/services/mi-servicio
```

## 📚 Recursos Adicionales

### Documentación

- [Ionic Documentation](https://ionicframework.com/docs)
- [Angular Documentation](https://angular.io/docs)
- [Capacitor Documentation](https://capacitorjs.com/docs)
- [AWS Amplify Documentation](https://docs.amplify.aws/)

### Comunidad

- [Ionic Forum](https://forum.ionicframework.com/)
- [Stack Overflow - ionic](https://stackoverflow.com/questions/tagged/ionic-framework)

## 🤝 Contribución

1. **Fork** el proyecto
2. **Crear** rama feature (`git checkout -b feature/nueva-funcionalidad`)
3. **Commit** cambios (`git commit -m 'Agregar nueva funcionalidad'`)
4. **Push** a la rama (`git push origin feature/nueva-funcionalidad`)
5. **Abrir** Pull Request

### Estándares de Código

- Usar **Prettier** para formateo
- Seguir **ESLint** rules
- Escribir **tests** para nuevas funcionalidades
- Documentar **funciones públicas**

---

## 📄 Licencia

Este proyecto está bajo la Licencia GPL-3.0. Ver el archivo [LICENSE](LICENSE) para más detalles.

## 📞 Soporte

Para soporte técnico o preguntas sobre el desarrollo:

- **Email**: desarrollo@makesens.com
- **Slack**: #uva-app-dev
- **Issues**: [GitHub Issues](https://github.com/tu-organizacion/UVA-App-Frontend/issues)

---

_Última actualización: Diciembre 2024 - Versión 2.1_

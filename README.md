# UVA-App-Frontend

En este repositorio se alojará todo el software relacionado con la aplicación UVA-App desarrollada en Ionic.

## Guía Definitiva para Iniciar en el Proyecto 🚀

### Requisitos Previos

1. **Node.js**:
   - Instala Node.js (versión 20 o superior) desde [nodejs.org](https://nodejs.org/).
   - Verifica la instalación ejecutando:
     ```sh
     node -v
     npm -v
     ```

2. **Ionic CLI**:
   - Instala Ionic CLI globalmente usando npm:
     ```sh
     npm install -g @ionic/cli
     ```

3. **Capacitor CLI**:
   - Instala Capacitor CLI globalmente usando npm:
     ```sh
     npm install -g @capacitor/cli
     ```

4. **AWS Amplify**:
   - Instala las librerías de AWS Amplify:
     ```sh
     npm install aws-amplify @aws-amplify/ui-react
     ```
   - Configura Amplify en tu proyecto:
     ```sh
     amplify init
     amplify configure
     ```
   - Baja las variables de entorno de Amplify desde la rama correspondiente:
     ```sh
     git checkout <nombre-de-la-rama>
     amplify pull
     ```

5. **Android Studio**:
   - Descarga e instala Android Studio desde [developer.android.com/studio](https://developer.android.com/studio).
   - Asegúrate de instalar el SDK de Android y las herramientas de línea de comandos.

6. **Java Development Kit (JDK)**:
   - Instala JDK (versión 11 o superior):
     ```sh
     sudo apt update
     sudo apt install openjdk-11-jdk
     ```
   - Configura la variable de entorno `JAVA_HOME`:
     ```sh
     export JAVA_HOME=/usr/lib/jvm/java-11-openjdk-amd64
     export PATH=$PATH:$JAVA_HOME/bin
     ```

### Configuración del Proyecto

1. **Instalar dependencias del proyecto**:
   - Navega al directorio raíz del proyecto y ejecuta:
     ```sh
     npm install
     ```

2. **Incluir carpetas necesarias**:
   - Descarga e incluye la carpeta `assets` en [src](http://_vscodecontentref_/0).
   - Descarga e incluye la carpeta `res` en [main](http://_vscodecontentref_/1).

3. **Sincronizar Capacitor**:
   - Sincroniza tu proyecto con Capacitor:
     ```sh
     npx cap sync
     ```

### Comandos Básicos de Uso Común 📋

- **Iniciar la aplicación en modo desarrollo**:
  ```sh
  ionic serve
  ```

### Arquitectura y Estructura de Carpetas 🗂️

#### Arquitectura del Proyecto

Este proyecto está desarrollado utilizando Ionic y Angular, con Capacitor para la integración nativa. La arquitectura sigue una estructura modular, donde cada funcionalidad principal se organiza en módulos y componentes reutilizables. Además, se utiliza AWS Amplify para la gestión de la autenticación y otros servicios en la nube.

#### Estructura de Carpetas

- **.angular/**: Archivos de caché generados por Angular.
- **.vscode/**: Configuraciones específicas de Visual Studio Code.
- **amplify/**: Configuraciones y archivos generados por AWS Amplify.
- **android/**: Proyecto Android generado por Capacitor.
- **src/**: Código fuente principal de la aplicación.
  - **app/**: Contiene los módulos, componentes, servicios y páginas de la aplicación.
    - **core/**: Servicios y utilidades centrales de la aplicación.
    - **pages/**: Páginas principales de la aplicación.
    - **components/**: Componentes reutilizables.
  - **assets/**: Recursos estáticos como imágenes y fuentes.
  - **environments/**: Configuraciones de entorno para diferentes ambientes (desarrollo, producción).
- **www/**: Archivos generados para la versión web de la aplicación.
- **angular.json**: Configuración del proyecto Angular.
- **capacitor.config.ts**: Configuración de Capacitor.
- **ionic.config.json**: Configuración de Ionic.
- **package.json**: Dependencias y scripts del proyecto.
- **tsconfig.json**: Configuración del compilador TypeScript.

Esta estructura permite una organización clara y modular del código, facilitando el mantenimiento y la escalabilidad del proyecto.

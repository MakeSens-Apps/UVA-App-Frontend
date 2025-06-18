#!/bin/bash

# 🚀 UVA App - Configuración Automática del Entorno de Desarrollo
# Este script instala todas las dependencias necesarias para desarrollar en el proyecto UVA App
# Soporta: macOS y Linux

set -e  # Salir si cualquier comando falla

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funciones de utilidad
print_step() {
    echo -e "${BLUE}📋 $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Detectar sistema operativo
detect_os() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        OS="macOS"
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        OS="Linux"
    else
        print_error "Sistema operativo no soportado: $OSTYPE"
        print_error "Este script solo funciona en macOS y Linux"
        exit 1
    fi
    print_success "Sistema detectado: $OS"
}

# Verificar si un comando existe
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Instalar Node.js
install_nodejs() {
    print_step "Instalando Node.js..."
    
    if command_exists node; then
        NODE_VERSION=$(node -v)
        print_success "Node.js ya está instalado: $NODE_VERSION"
        return 0
    fi
    
    case $OS in
        "macOS")
            if ! command_exists brew; then
                print_step "Instalando Homebrew..."
                /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
            fi
            brew install node@20
            ;;
        "Linux")
            curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
            sudo apt-get install -y nodejs
            ;;
    esac
    
    print_success "Node.js instalado correctamente"
}

# Instalar Git
install_git() {
    print_step "Verificando Git..."
    
    if command_exists git; then
        GIT_VERSION=$(git --version)
        print_success "Git ya está instalado: $GIT_VERSION"
        return 0
    fi
    
    case $OS in
        "macOS")
            if command_exists brew; then
                brew install git
            else
                print_warning "Por favor instala Git desde https://git-scm.com"
            fi
            ;;
        "Linux")
            sudo apt update
            sudo apt install -y git
            ;;
    esac
    
    print_success "Git instalado correctamente"
}

# Instalar CLIs globales
install_global_tools() {
    print_step "Instalando herramientas globales..."
    
    # Lista de herramientas a instalar
    TOOLS=("@ionic/cli" "@capacitor/cli" "@angular/cli" "@aws-amplify/cli")
    
    for tool in "${TOOLS[@]}"; do
        print_step "Instalando $tool..."
        npm install -g "$tool"
        print_success "$tool instalado"
    done
}

# Verificar instalaciones
verify_installations() {
    print_step "Verificando instalaciones..."
    
    # Verificar Node.js
    if command_exists node; then
        NODE_VERSION=$(node -v)
        print_success "Node.js: $NODE_VERSION"
    else
        print_error "Node.js no encontrado"
    fi
    
    # Verificar npm
    if command_exists npm; then
        NPM_VERSION=$(npm -v)
        print_success "npm: $NPM_VERSION"
    else
        print_error "npm no encontrado"
    fi
    
    # Verificar Ionic CLI
    if command_exists ionic; then
        IONIC_VERSION=$(ionic --version)
        print_success "Ionic CLI: $IONIC_VERSION"
    else
        print_error "Ionic CLI no encontrado"
    fi
    
    # Verificar Capacitor CLI
    if command_exists cap; then
        CAP_VERSION=$(npx cap --version)
        print_success "Capacitor CLI: $CAP_VERSION"
    else
        print_error "Capacitor CLI no encontrado"
    fi
    
    # Verificar Angular CLI
    if command_exists ng; then
        print_success "Angular CLI: instalado"
    else
        print_error "Angular CLI no encontrado"
    fi
    
    # Verificar Amplify CLI
    if command_exists amplify; then
        AMPLIFY_VERSION=$(amplify --version)
        print_success "Amplify CLI: $AMPLIFY_VERSION"
    else
        print_error "Amplify CLI no encontrado"
    fi
}

# Instalar dependencias del proyecto
install_project_dependencies() {
    print_step "Instalando dependencias del proyecto..."
    
    if [ -f "package.json" ]; then
        npm install
        print_success "Dependencias del proyecto instaladas"
    else
        print_warning "No se encontró package.json en el directorio actual"
        print_warning "Asegúrate de estar en el directorio raíz del proyecto UVA App"
    fi
}

# Configurar AWS Amplify
setup_amplify() {
    print_step "Configurando AWS Amplify..."
    
    if [ ! -f "src/amplifyconfiguration.json" ]; then
        print_warning "No se encontró amplifyconfiguration.json"
        echo ""
        print_step "Para configurar Amplify, ejecuta los siguientes comandos:"
        echo -e "${YELLOW}1. amplify configure${NC} (configurar credenciales AWS)"
        echo -e "${YELLOW}2. amplify pull --appId [APP_ID] --envName dev${NC} (obtener configuración)"
        echo ""
        print_warning "Solicita al administrador del proyecto el APP_ID de Amplify"
    else
        print_success "Configuración de Amplify encontrada"
    fi
}

# Configurar Capacitor
setup_capacitor() {
    print_step "Configurando Capacitor..."
    
    if [ -f "capacitor.config.ts" ]; then
        npx cap sync
        print_success "Capacitor sincronizado"
    else
        print_warning "No se encontró capacitor.config.ts"
    fi
}

# Configurar pre-commit hooks
setup_precommit_hooks() {
    print_step "Configurando pre-commit hooks..."
    
    if [ -f "package.json" ] && grep -q "husky" package.json; then
        npm run prepare 2>/dev/null || true
        print_success "Pre-commit hooks configurados"
    else
        print_warning "Husky no encontrado en package.json"
    fi
}

# Verificar configuración final
verify_project_setup() {
    print_step "Verificando configuración del proyecto..."
    
    # Verificar archivos importantes
    if [ -f "package.json" ]; then
        print_success "package.json encontrado"
    else
        print_error "package.json no encontrado"
    fi
    
    if [ -f "src/amplifyconfiguration.json" ]; then
        print_success "amplifyconfiguration.json encontrado"
    else
        print_warning "amplifyconfiguration.json no encontrado (se necesita configurar Amplify)"
    fi
    
    if [ -d "node_modules" ]; then
        print_success "node_modules instalado"
    else
        print_error "node_modules no encontrado"
    fi
    
    if [ -f "capacitor.config.ts" ]; then
        print_success "capacitor.config.ts encontrado"
    else
        print_warning "capacitor.config.ts no encontrado"
    fi
}

# Mostrar siguiente pasos
show_next_steps() {
    echo ""
    echo -e "${GREEN}🎉 ¡Configuración completada!${NC}"
    echo ""
    echo -e "${BLUE}📋 Próximos pasos:${NC}"
    echo ""
    
    if [ ! -f "src/amplifyconfiguration.json" ]; then
        echo -e "${YELLOW}1. Configurar AWS Amplify:${NC}"
        echo "   amplify configure"
        echo "   amplify pull --appId [APP_ID] --envName dev"
        echo ""
        echo -e "${YELLOW}2. Iniciar el servidor de desarrollo:${NC}"
    else
        echo -e "${YELLOW}1. Iniciar el servidor de desarrollo:${NC}"
    fi
    
    echo "   ionic serve"
    echo ""
    echo -e "${YELLOW}3. Para desarrollo Android (opcional):${NC}"
    echo "   - Instalar Android Studio desde: https://developer.android.com/studio"
    echo "   - Instalar JDK 17"
    echo "   - Configurar variables de entorno ANDROID_HOME y JAVA_HOME"
    echo ""
    echo -e "${YELLOW}4. Comandos útiles:${NC}"
    echo "   npm run lint    # Verificar código"
    echo "   npm run test    # Ejecutar tests"
    echo "   npm run build   # Build de producción"
    echo ""
    echo -e "${YELLOW}5. Para más información, consulta el README.md${NC}"
    echo ""
    echo -e "${GREEN}¡Happy coding! 🚀${NC}"
}

# Función principal
main() {
    echo ""
    echo -e "${BLUE}🚀 UVA App - Configuración del Entorno de Desarrollo${NC}"
    echo -e "${BLUE}   Soporta: macOS y Linux${NC}"
    echo ""
    
    detect_os
    install_git
    install_nodejs
    install_global_tools
    verify_installations
    install_project_dependencies
    setup_amplify
    setup_capacitor
    setup_precommit_hooks
    verify_project_setup
    show_next_steps
}

# Ejecutar función principal
main "$@" 
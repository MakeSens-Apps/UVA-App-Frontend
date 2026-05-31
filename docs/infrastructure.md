# Documentación de Infraestructura

## Descripción General

UVA-App aprovecha una **arquitectura serverless nativa en la nube** construida enteramente sobre servicios administrados de AWS. La infraestructura se aprovisiona y gestiona mediante la **AWS Amplify CLI**, siguiendo los principios de infraestructura como código.

---

## Proveedor de Nube

**Amazon Web Services (AWS)**
- **Región Principal**: `us-east-1` (Virginia del Norte)
- **Herramienta de Gestión**: AWS Amplify CLI
- **Modelo de Despliegue**: Serverless (sin gestión de servidores)

---

## Arquitectura de Servicios AWS

### Diagrama de Infraestructura de Alto Nivel

```
┌─────────────────────────────────────────────────────────────┐
│                     Aplicación Móvil                         │
│                  (Angular + Ionic + Capacitor)               │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        │ HTTPS/WebSocket
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                      AWS Amplify                             │
│              (Configuración y Orquestación)                  │
└───────────────────────┬─────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
        ▼               ▼               ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│  AWS Cognito │ │ AWS AppSync  │ │   AWS S3     │
│    (Auth)    │ │  (GraphQL)   │ │ (Almacen.)   │
└──────────────┘ └──────┬───────┘ └──────────────┘
                        │
                        ▼
                ┌──────────────┐
                │  DynamoDB    │
                │ (Base datos) │
                └──────────────┘
                        │
                        ▼
                ┌──────────────┐
                │ CloudWatch   │
                │ (Monitoreo)  │
                └──────────────┘
```

---

## Desglose de Servicios AWS

### 1. AWS Amplify

**Propósito**: Orquestación de infraestructura backend y alojamiento frontend

#### Funcionalidades Utilizadas
- **Amplify CLI**: Aprovisionamiento y gestión de infraestructura
- **Amplify DataStore**: Sincronización de datos offline-first
- **Amplify Auth**: Integración de autenticación con Cognito
- **Amplify Storage**: Integración con S3 para subida de archivos
- **Amplify Analytics**: Seguimiento del comportamiento del usuario

#### Configuración
- **Archivo de Configuración**: `amplify/cli.json`
- **Configuración del Equipo**: `amplify/team-provider-info.json`
- **Indicadores de Características**: GraphQL Transformer V2 habilitado

#### Configuraciones Clave
```json
{
  "features": {
    "graphqltransformer": {
      "transformerVersion": 2,
      "useExperimentalPipelinedTransformer": false
    }
  }
}
```

---

### 2. AWS Cognito

**Propósito**: Autenticación y autorización de usuarios

#### Tipo de Servicio
**Amazon Cognito User Pools**

#### Flujo de Autenticación
- **Método Principal**: Autenticación por número de teléfono
- **Verificación**: SMS OTP (Contraseña de Un Solo Uso)
- **MFA**: Habilitado para mayor seguridad
- **Gestión de Tokens**: Tokens JWT (Acceso, ID, Actualización)

#### Configuración del Pool de Usuarios

| Configuración | Valor |
|---------------|-------|
| Atributo de Nombre de Usuario | Número de Teléfono |
| Verificación de Teléfono | Requerida (SMS) |
| MFA | Opcional/Requerido |
| Política de Contraseñas | N/A (auth solo por teléfono) |
| Validez del Token | Acceso: 1 hora, Actualización: 30 días |
| Atributos de Usuario | phone_number, name, email (opcional) |

#### Permisos Requeridos
- `cognito-idp:InitiateAuth`
- `cognito-idp:RespondToAuthChallenge`
- `cognito-idp:GetUser`
- `cognito-idp:SignUp`
- `cognito-idp:ConfirmSignUp`

#### Características de Seguridad
- Limitación de velocidad de SMS
- Protección contra toma de cuenta
- Seguridad avanzada (auth adaptativa basada en riesgo)
- Detección de credenciales comprometidas

---

### 3. AWS AppSync

**Propósito**: API GraphQL administrada con capacidades en tiempo real

#### Tipo de Servicio
**AWS AppSync GraphQL API**

#### Configuración

| Configuración | Valor |
|---------------|-------|
| Tipo de API | GraphQL |
| Región | us-east-1 |
| API ID | uqr6xntysfa3lbguhirvcj3pa4 |
| Versión del Esquema | GraphQL Transformer V2 |
| Tiempo Real | Suscripciones WebSocket habilitadas |
| Caché | Caché a nivel de API (configurable) |

#### Modos de Autorización
1. **Amazon Cognito User Pools** (Principal)
   - Para operaciones de usuario autenticado
   - Control de acceso basado en propietario

2. **API Key** (Secundario - para consultas públicas)
   - Para datos de fases lunares
   - Acceso de solo lectura público

#### Resolución de Conflictos
- **Estrategia**: Fusión automática con bloqueo optimista
- **Campo de Versión**: `_version` en todos los modelos
- **Detección**: Detección de conflictos del lado del servidor
- **Resolución**: El último en escribir gana con verificaciones de versión

#### Sincronización DataStore
- **Latencia Base**: ~20ms
- **Intervalo de Sincronización**: Tiempo real (WebSocket) + periódico (60s)
- **Modelos Sincronizados**: Todos (RACIMO, UVA, Usuario, Medición, ProgresoUsuario)

---

### 4. Amazon DynamoDB

**Propósito**: Base de datos NoSQL principal para los datos de la aplicación

#### Tablas

| Tabla | Propósito | Clave de Partición | GSIs |
|-------|-----------|-------------------|------|
| RACIMO | Datos de proyecto/clúster | id | LinkageCode |
| UVA | Datos de unidad agrícola | id | userID, racimoID |
| Usuario | Perfiles de usuario | id | PhoneNumber, uvaID |
| Medición | Datos en series temporales | id | uvaID+ts |
| ProgresoUsuario | Datos de gamificación | id | userID+ts |

#### Configuración de Capacidad
- **Modo de Facturación**: Bajo Demanda (pago por solicitud)
- **Escalado Automático**: Automático (administrado por AWS)
- **Capacidad de Lectura**: Ilimitada (limitada por cuotas de cuenta)
- **Capacidad de Escritura**: Ilimitada (limitada por cuotas de cuenta)

#### Características Habilitadas
- **Recuperación a Punto en el Tiempo (PITR)**: Habilitado (retención de 35 días)
- **Cifrado**: Claves administradas por AWS (SSE)
- **Streams**: Habilitados (para sincronización de AppSync)
- **TTL**: No configurado (uso futuro)
- **Tablas Globales**: No configurado (región única)

#### Rendimiento
- **Latencia Promedio**: <10ms (p50), <20ms (p99)
- **Rendimiento**: Escala automáticamente
- **Particiones Calientes**: Evitadas mediante alcance por usuario/UVA

---

### 5. Amazon S3

**Propósito**: Almacenamiento de objetos para archivos subidos por usuarios

#### Buckets

| Bucket | Propósito | Nivel de Acceso | Ciclo de Vida |
|--------|-----------|-----------------|---------------|
| `uva-app-storage-{env}` | Fotos de perfil de usuario | Privado | Sin expiración |
| `uva-app-public-{env}` | Activos públicos (futuro) | Lectura pública | Sin expiración |

#### Configuración de S3

| Configuración | Valor |
|---------------|-------|
| Versionado | Habilitado |
| Cifrado | AES-256 (SSE-S3) |
| Acceso Público | Bloqueado (predeterminado) |
| CORS | Habilitado para el dominio de la app |
| Control de Acceso | IAM + Cognito |

#### Organización de Archivos
```
s3://uva-app-storage-{env}/
├── public/              # Acceso de lectura pública
│   └── assets/
├── protected/           # Protegido (cualquier usuario autenticado)
│   └── shared/
└── private/             # Privado (solo propietario)
    └── {cognito-id}/
        ├── profile-pictures/
        └── measurement-attachments/
```

#### Patrones de Acceso
- **Subida**: Cliente → Amplify → S3 (URL prefirmada)
- **Descarga**: Cliente → Amplify → S3 (URL prefirmada)
- **Autorización**: Credenciales del pool de identidades de Cognito

---

### 6. Amazon CloudWatch

**Propósito**: Monitoreo, registro y alertas

#### Registros

| Grupo de Logs | Fuente | Retención |
|---------------|--------|-----------|
| `/aws/appsync/{api-id}` | Logs GraphQL de AppSync | 7 días |
| `/aws/lambda/{function-name}` | Resolvers Lambda (si aplica) | 7 días |
| `/aws/amplify/{app-id}` | Logs del backend de Amplify | 7 días |

#### Métricas Rastreadas
- **AppSync**: Recuento de solicitudes, latencia, errores, rendimiento de resolvers
- **DynamoDB**: Unidades de lectura/escritura, limitaciones, latencia
- **Cognito**: Registros, inicios de sesión, autenticaciones fallidas
- **S3**: Solicitudes, transferencia de datos, errores

#### Alarmas (Configuración Recomendada)
- Tasa alta de errores en API (> 5%)
- Limitación de DynamoDB
- Pico en fallos de autenticación de Cognito
- Aumento en tasa de errores 4xx/5xx de S3

---

### 7. AWS Pinpoint (Analíticas)

**Propósito**: Analíticas de usuario y seguimiento de compromiso

#### Eventos de Analíticas
- **Inicio de Sesión**: El usuario abre la app
- **Fin de Sesión**: El usuario cierra la app
- **Vistas de Página**: Seguimiento de navegación
- **Eventos Personalizados**: Envíos de mediciones, logros desbloqueados

#### Datos Recolectados
- Información del dispositivo (modelo, versión del SO)
- Versión de la app
- Datos demográficos del usuario (si se proporcionan)
- Métricas de compromiso (DAU, MAU, duración de sesión)

---

## Infraestructura como Código (IaC)

### Archivos de Configuración de Amplify

| Archivo | Propósito |
|---------|-----------|
| `amplify/cli.json` | Indicadores de características y configuración de la CLI de Amplify |
| `amplify/team-provider-info.json` | Configuraciones específicas por entorno |
| `amplify/backend/api/{api-name}/schema.graphql` | Definición del esquema GraphQL |
| `amplify/backend/auth/{auth-name}/parameters.json` | Configuración de Cognito |
| `amplify/backend/storage/{storage-name}/parameters.json` | Configuración de S3 |

### Comandos de Despliegue

```bash
# Obtener configuración del backend desde la nube
amplify pull

# Enviar cambios locales a la nube
amplify push

# Agregar nuevo recurso
amplify add <category>

# Actualizar recurso existente
amplify update <category>

# Verificar estado
amplify status

# Ver información del entorno
amplify env list
```

---

## Entornos

### Estrategia de Entornos

| Entorno | Propósito | Rama | Despliegue Automático |
|---------|-----------|------|----------------------|
| Development | Desarrollo/pruebas | develop | No |
| Staging | Pre-producción | staging | Sí (opcional) |
| Production | App en producción | main | Sí (aprobación manual) |

### Variables de Entorno

**Administradas por Amplify** (sin configuración manual requerida):
- `AWS_REGION`
- `API_ENDPOINT`
- `AUTH_REGION`
- `USER_POOL_ID`
- `WEB_CLIENT_ID`
- `IDENTITY_POOL_ID`
- `S3_BUCKET`

---

## Redes y Seguridad

### Configuración de Red
- **VPC**: No requerida (serverless)
- **Subredes**: Administradas por AWS
- **NAT Gateway**: No requerido
- **Internet Gateway**: Administrado por AWS

### Grupos de Seguridad
No aplicable (servicios serverless)

### Roles y Políticas IAM

#### Rol del Backend de Amplify
- **DynamoDB**: Lectura/Escritura en todas las tablas
- **S3**: Lectura/Escritura/Eliminación en buckets de almacenamiento
- **AppSync**: Ejecutar operaciones de API
- **CloudWatch**: Escribir logs

#### Roles del Pool de Identidades de Cognito

**Usuarios Autenticados**:
```json
{
  "Effect": "Allow",
  "Action": [
    "s3:PutObject",
    "s3:GetObject",
    "s3:DeleteObject"
  ],
  "Resource": [
    "arn:aws:s3:::uva-app-storage-{env}/private/${cognito-identity.amazonaws.com:sub}/*"
  ]
}
```

**Usuarios No Autenticados**:
- Sin permisos (sin acceso no autenticado)

---

## Pipeline de CI/CD

### Proceso de Compilación

```
Commit de Código (GitHub)
    ↓
GitHub Actions / Amplify Console
    ↓
Instalar Dependencias (npm install)
    ↓
Ejecutar Pruebas (npm test)
    ↓
Compilar Frontend (ng build --prod)
    ↓
Amplify Push (amplify push --yes)
    ↓
Capacitor Copy (cap copy)
    ↓
Compilación Android (gradlew assembleRelease)
    ↓
Despliegue Completado
```

### Objetivos de Despliegue

#### Web (Futuro)
- **Servicio**: AWS Amplify Hosting
- **URL**: `https://{branch}.{app-id}.amplifyapp.com`
- **SSL**: Administrado por Amplify (gratuito)

#### Móvil (Actual)
- **Android**: Subida manual de APK/AAB a Google Play
- **iOS**: Futuro - Despliegue en App Store

---

## Costos y Precios

### Costos Mensuales Estimados (100 usuarios)

| Servicio | Uso | Costo |
|---------|-----|-------|
| **Cognito** | 100 usuarios, 3000 auth/mes | $0 (capa gratuita) |
| **AppSync** | 300K solicitudes/mes | $1.20 |
| **DynamoDB** | 1M lecturas, 500K escrituras | $0.50 |
| **S3** | 10GB almacenamiento, 1K solicitudes | $0.25 |
| **CloudWatch** | 5GB logs, 10 alarmas | $0.50 |
| **Transferencia de Datos** | 5GB/mes | $0.45 |
| **Total** | | **~$3/mes** |

### Costos con Escalado (10,000 usuarios)

| Servicio | Uso | Costo |
|---------|-----|-------|
| **Cognito** | 10K usuarios, 300K auth/mes | $275 |
| **AppSync** | 30M solicitudes/mes | $120 |
| **DynamoDB** | 100M lecturas, 50M escrituras | $50 |
| **S3** | 1TB almacenamiento, 100K solicitudes | $24 |
| **CloudWatch** | 50GB logs, 50 alarmas | $2.50 |
| **Transferencia de Datos** | 500GB/mes | $45 |
| **Total** | | **~$517/mes** |

---

## Recuperación ante Desastres

### Estrategia de Respaldo

#### DynamoDB
- **PITR**: Recuperación a punto en el tiempo de 35 días
- **Respaldos bajo demanda**: Manuales antes de cambios mayores
- **Replicación entre regiones**: No configurada (futuro)

#### S3
- **Versionado**: Habilitado
- **Políticas de ciclo de vida**: Ninguna (todos los datos retenidos)
- **Replicación entre regiones**: No configurada

#### Cognito
- **Exportación del pool de usuarios**: Exportación manual a S3 (periódica)
- **Atributos de usuario**: Respaldados con DynamoDB

### Objetivo de Tiempo de Recuperación (RTO)
- **RTO Objetivo**: < 4 horas
- **RPO Objetivo**: < 1 hora (vía PITR)

### Escenarios de Desastre

| Escenario | Plan de Recuperación | RTO |
|-----------|---------------------|-----|
| Corrupción de tabla DynamoDB | Restaurar desde PITR | 1-2 horas |
| Bucket S3 eliminado | Restaurar desde versionado | 30 min |
| Pool de usuarios Cognito eliminado | Recrear + importar respaldo | 2-4 horas |
| API AppSync mal configurada | Revertir vía Amplify CLI | 15 min |
| Interrupción regional | Conmutación a región secundaria | N/A (futuro) |

---

## Monitoreo y Alertas

### Endpoints de Verificación de Salud

**Salud de AppSync**:
```graphql
query HealthCheck {
  listRACIMOS(limit: 1) {
    items { id }
  }
}
```

### Indicadores Clave de Rendimiento (KPIs)

| Métrica | Objetivo | Umbral de Alerta |
|---------|----------|-----------------|
| Latencia API (p99) | < 500ms | > 1000ms |
| Tasa de Error API | < 0.1% | > 1% |
| Limitaciones DynamoDB | 0 | > 5/min |
| Éxito Auth Cognito | > 99% | < 95% |
| Éxito Subida S3 | > 99.9% | < 99% |

---

## Seguridad y Cumplimiento

### Cifrado de Datos
- **En Reposo**: Todos los datos cifrados (DynamoDB, S3, Cognito)
- **En Tránsito**: TLS 1.2+ para todas las comunicaciones
- **Claves**: Claves administradas por AWS (KMS)

### Control de Acceso
- **Autenticación Multifactor (MFA)**: Habilitado para usuarios administradores
- **Privilegio Mínimo**: Los roles IAM siguen el principio de privilegio mínimo
- **Políticas de Recursos**: Las políticas de bucket S3 restringen el acceso

### Consideraciones de Cumplimiento
- **RGPD**: Capacidades de exportación y eliminación de datos de usuario
- **Residencia de Datos**: us-east-1 (considerar requisitos regionales)
- **Registro de Auditoría**: CloudTrail para cambios en infraestructura

---

## Consideraciones de Escalabilidad

### Escalado Horizontal
Todos los servicios escalan automáticamente:
- **AppSync**: Las conexiones concurrentes escalan automáticamente
- **DynamoDB**: Escalado bajo demanda a millones de solicitudes/seg
- **S3**: Almacenamiento y rendimiento ilimitados
- **Cognito**: Soporte para millones de usuarios

### Escalado Vertical
No aplicable (serverless)

### Optimización de Rendimiento
- Usar GSIs para consultas eficientes
- Habilitar caché de AppSync para consultas de alta lectura
- Implementar CDN para activos estáticos (futuro)
- Operaciones por lotes donde sea posible

---

## Mantenimiento y Actualizaciones

### Tareas de Mantenimiento Regular
- Revisar logs de CloudWatch semanalmente
- Actualizar dependencias de Amplify mensualmente
- Rotar claves de API trimestralmente (si se usan)
- Revisar permisos IAM trimestralmente
- Probar el plan de recuperación ante desastres semestralmente

### Proceso de Actualización
1. Actualizar en el entorno de desarrollo
2. Probar exhaustivamente
3. Desplegar en staging
4. Ejecutar pruebas de humo
5. Desplegar en producción (en horas de baja actividad)
6. Monitorear durante 24 horas

---

## Configuración de Plataforma Nativa

### Android

**Configuración de Compilación**:
- **ID de Paquete**: `com.makesens.uvaapp`
- **SDK Mínimo**: 22 (Android 5.1)
- **SDK Objetivo**: 34 (Android 14)
- **Herramienta de Compilación**: Gradle 8.x

**Permisos Requeridos**:
```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.VIBRATE" />
```

**Servicios de Google**:
- Firebase Cloud Messaging (notificaciones push)
- Google Analytics (seguimiento de analíticas)

---

## Resolución de Problemas

### Problemas Comunes

| Problema | Causa | Solución |
|---------|-------|----------|
| Errores "Not Authorized" | Token JWT expirado | Re-autenticar al usuario |
| Conflictos de sincronización | Actualizaciones concurrentes | Resuelto automáticamente por DataStore |
| Limitación de DynamoDB | Tráfico de ráfaga alto | Habilitar facturación bajo demanda |
| Fallos en subida a S3 | Tiempo de espera de red agotado | Implementar lógica de reintento |
| Errores de AppSync | Desajuste de esquema | Ejecutar `amplify codegen` |

---

## Convenciones de Nomenclatura de Recursos

```
{servicio}-{nombre-app}-{env}-{tipo-recurso}

Ejemplos:
- appsync-uvaapp-prod-api
- dynamodb-uvaapp-prod-racimo
- s3-uvaapp-prod-storage
- cognito-uvaapp-prod-userpool
```

---

## Documentación y Soporte

### Documentación de AWS
- [Documentación de AWS Amplify](https://docs.amplify.aws/)
- [Guía del Desarrollador de AppSync](https://docs.aws.amazon.com/appsync/)
- [Guía del Desarrollador de DynamoDB](https://docs.aws.amazon.com/dynamodb/)
- [Guía del Desarrollador de Cognito](https://docs.aws.amazon.com/cognito/)

### Herramientas de Diagramas de Infraestructura
- Íconos de Arquitectura AWS
- draw.io / Lucidchart
- Amplify Console (mapa visual de recursos)

---

## Ruta de Migración

### Mejoras Futuras de Infraestructura
1. **Despliegue multi-región** para alta disponibilidad
2. **CloudFront CDN** para activos web
3. **ElastiCache** para capa de caché
4. **Funciones Lambda** para lógica de negocio compleja
5. **Step Functions** para flujos de trabajo orquestados
6. **AWS WAF** para seguridad de API
7. **AWS Backup** para gestión centralizada de respaldos

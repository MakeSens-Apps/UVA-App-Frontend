# Configuración y Variables de Entorno — UVA-App Frontend

---

## Variables de Entorno

Las variables de entorno de la app son **administradas automáticamente por AWS Amplify CLI** durante el proceso de `amplify pull` / `amplify push`. No se requiere configuración manual de variables individuales en producción.

### Variables gestionadas por Amplify

| Variable           | Origen               | Descripción                              | Secreto |
| ------------------ | -------------------- | ---------------------------------------- | ------- |
| `AWS_REGION`       | Amplify (automático) | Región AWS del backend (`us-east-1`)     | No      |
| `API_ENDPOINT`     | Amplify (automático) | URL del endpoint de AWS AppSync GraphQL  | No      |
| `AUTH_REGION`      | Amplify (automático) | Región del pool de usuarios de Cognito   | No      |
| `USER_POOL_ID`     | Amplify (automático) | ID del pool de usuarios de Cognito       | No      |
| `WEB_CLIENT_ID`    | Amplify (automático) | ID del cliente web de Cognito            | No      |
| `IDENTITY_POOL_ID` | Amplify (automático) | ID del pool de identidades de Cognito    | No      |
| `S3_BUCKET`        | Amplify (automático) | Nombre del bucket S3 para almacenamiento | No      |

> La configuración de Amplify se almacena en `src/amplifyconfiguration.json` (generado automáticamente por `amplify pull`).

### Variables de entorno Angular

| Archivo                                | Entorno    | Descripción                                        |
| -------------------------------------- | ---------- | -------------------------------------------------- |
| `src/environments/environment.ts`      | Desarrollo | Indicadores de características, URLs de desarrollo |
| `src/environments/environment.prod.ts` | Producción | Configuración de producción, analytics habilitadas |

---

## Dependencias Principales (`package.json`)

### Framework y Plataforma

| Librería          | Versión | Propósito                            |
| ----------------- | ------- | ------------------------------------ |
| `@angular/core`   | 18.x    | Framework de aplicaciones web        |
| `@ionic/angular`  | 8.x     | Componentes de UI móvil              |
| `@capacitor/core` | 6.x     | Puente de tiempo de ejecución nativo |
| `typescript`      | 5.5     | Lenguaje con tipado fuerte           |
| `rxjs`            | 7.8     | Extensiones reactivas (observables)  |

### Backend y Nube

| Librería      | Versión | Propósito                                                               |
| ------------- | ------- | ----------------------------------------------------------------------- |
| `aws-amplify` | 6.8     | Plataforma de integración backend (DataStore, Auth, Storage, Analytics) |

### UI y Visualización

| Librería      | Versión | Propósito                                                |
| ------------- | ------- | -------------------------------------------------------- |
| `chart.js`    | 4.4     | Visualización de datos (gráficos de área, línea, barras) |
| `sweetalert2` | latest  | Alertas y confirmaciones personalizadas                  |
| `ionicons`    | latest  | Biblioteca de íconos de Ionic                            |

### Herramientas de Desarrollo

| Librería   | Versión | Propósito                         |
| ---------- | ------- | --------------------------------- |
| `karma`    | latest  | Runner de pruebas                 |
| `jasmine`  | latest  | Framework de pruebas unitarias    |
| `eslint`   | latest  | Linting de código (modo estricto) |
| `prettier` | latest  | Formateo de código                |
| `husky`    | latest  | Git hooks (linting pre-commit)    |

---

## Configuración de Build (`angular.json`)

### Límites de bundle

| Tipo                | Límite de advertencia | Límite de error |
| ------------------- | --------------------- | --------------- |
| `initial`           | 3 MB                  | 7 MB            |
| `anyComponentStyle` | 2 KB                  | 4 KB            |

### Optimizaciones de producción

| Optimización                    | Estado                              |
| ------------------------------- | ----------------------------------- |
| Minificación                    | Habilitada                          |
| Compilación AOT (Ahead-of-Time) | Habilitada                          |
| Tree-shaking                    | Habilitado (componentes standalone) |
| Source maps                     | Deshabilitados en producción        |
| Lazy loading de rutas           | Habilitado                          |

### Configuración de entornos

```json
{
  "configurations": {
    "production": {
      "fileReplacements": [
        {
          "replace": "src/environments/environment.ts",
          "with": "src/environments/environment.prod.ts"
        }
      ],
      "optimization": true,
      "sourceMap": false,
      "aot": true
    }
  }
}
```

---

## Configuración de Capacitor (`capacitor.config.ts`)

```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.makesens.uvaapp',
  appName: 'UVA-App',
  webDir: 'www',
  server: {
    androidScheme: 'https',
  },
};
```

---

## Configuración de Amplify (`amplify/cli.json`)

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

## Archivos de Configuración de Amplify

| Archivo                                                  | Propósito                                                |
| -------------------------------------------------------- | -------------------------------------------------------- |
| `amplify/cli.json`                                       | Indicadores de características y configuración de la CLI |
| `amplify/team-provider-info.json`                        | Configuraciones específicas por entorno                  |
| `amplify/backend/api/<api-name>/schema.graphql`          | Definición del esquema GraphQL                           |
| `amplify/backend/auth/<auth-name>/parameters.json`       | Configuración de Cognito                                 |
| `amplify/backend/storage/<storage-name>/parameters.json` | Configuración de S3                                      |
| `src/amplifyconfiguration.json`                          | Configuración runtime generada por `amplify pull`        |

---

## Configuración de AWS Cognito

| Parámetro                          | Valor                                      |
| ---------------------------------- | ------------------------------------------ |
| Atributo de nombre de usuario      | Número de teléfono                         |
| Verificación de teléfono           | Requerida (SMS)                            |
| MFA                                | Opcional/Requerido                         |
| Política de contraseñas            | N/A (auth solo por teléfono)               |
| Validez del token de acceso        | 1 hora                                     |
| Validez del token de actualización | 30 días                                    |
| Atributos de usuario               | `phone_number`, `name`, `email` (opcional) |

---

## Configuración de AppSync

| Parámetro                             | Valor                                   |
| ------------------------------------- | --------------------------------------- |
| Tipo de API                           | GraphQL                                 |
| Región                                | us-east-1                               |
| API ID                                | uqr6xntysfa3lbguhirvcj3pa4              |
| Versión del esquema                   | GraphQL Transformer V2                  |
| Tiempo real                           | Suscripciones WebSocket habilitadas     |
| Intervalo de sincronización DataStore | Tiempo real (WebSocket) + 60s periódico |

---

## Configuración de S3

| Parámetro      | Valor                                |
| -------------- | ------------------------------------ |
| Versionado     | Habilitado                           |
| Cifrado        | AES-256 (SSE-S3)                     |
| Acceso público | Bloqueado por defecto                |
| CORS           | Habilitado para el dominio de la app |

### Estructura de buckets S3

```
s3://uva-app-storage-{env}/
├── public/                    # Acceso de lectura pública
│   └── assets/
├── protected/                 # Solo usuarios autenticados
│   └── shared/
└── private/                   # Solo propietario
    └── {cognito-id}/
        ├── profile-pictures/
        └── measurement-attachments/
```

---

## Configuración de Android

### Build (`build.gradle`)

| Parámetro                  | Valor                 |
| -------------------------- | --------------------- |
| ID de paquete              | `com.makesens.uvaapp` |
| SDK mínimo                 | 22 (Android 5.1)      |
| SDK objetivo               | 34 (Android 14)       |
| Herramienta de compilación | Gradle 8.x            |
| Versión de la app          | 2.1.6 (código: 7)     |

### Alias de rutas TypeScript (`tsconfig.json`)

```json
{
  "compilerOptions": {
    "paths": {
      "@app/*": ["src/app/*"],
      "@components/*": ["src/app/components/*"],
      "@pages/*": ["src/app/pages/*"],
      "@service/*": ["src/app/core/services/*"],
      "@storage/*": ["src/app/core/services/storage/*"],
      "@interfaces/*": ["src/app/Interfaces/*"]
    },
    "strict": true
  }
}
```

---

## Convenciones de Nomenclatura de Recursos AWS

```
{servicio}-{nombre-app}-{env}-{tipo-recurso}

Ejemplos:
- appsync-uvaapp-prod-api
- dynamodb-uvaapp-prod-racimo
- s3-uvaapp-prod-storage
- cognito-uvaapp-prod-userpool
```

---

## Documentación de AWS

| Servicio        | Documentación                         |
| --------------- | ------------------------------------- |
| AWS Amplify     | https://docs.amplify.aws/             |
| AWS AppSync     | https://docs.aws.amazon.com/appsync/  |
| Amazon DynamoDB | https://docs.aws.amazon.com/dynamodb/ |
| AWS Cognito     | https://docs.aws.amazon.com/cognito/  |

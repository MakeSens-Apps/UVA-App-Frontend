# Documentación de Funcionalidades

## Descripción General de Funcionalidades

UVA-App proporciona capacidades completas de monitoreo agrícola con elementos de gamificación para fomentar la recolección de datos consistente y el compromiso del usuario.

---

## 1. Autenticación y Gestión de Usuarios

### Descripción
Sistema de autenticación seguro basado en teléfono con verificación por SMS, diseñado para usuarios que pueden no tener dirección de email o que prefieren el acceso basado en teléfono.

### Casos de Uso
- **CU-01**: Registro de usuario por primera vez
- **CU-02**: Inicio de sesión de usuario recurrente
- **CU-03**: Verificación OTP para seguridad
- **CU-04**: Recuperación de cuenta
- **CU-05**: Autenticación multifactor

### Flujo de Trabajo

#### Flujo de Registro
```
1. El usuario abre la app → Pantalla de inicio
   ↓
2. Hace clic en "Registrarse" → Página de pre-registro
   ↓
3. Ingresa número de teléfono (validación de formato)
   ↓
4. Cognito envía SMS OTP
   ↓
5. Ingresa código OTP de 6 dígitos
   ↓
6. Verificación de OTP
   ↓
7. Elegir: Unirse a RACIMO existente (vía código) O Crear nuevo RACIMO
   ↓
8. Completar información del perfil
   ↓
9. Cuenta creada → Navegar al inicio
```

#### Flujo de Inicio de Sesión
```
1. Ingresar número de teléfono
   ↓
2. Cognito envía OTP
   ↓
3. Ingresar código OTP
   ↓
4. Verificación exitosa
   ↓
5. Sesión establecida
   ↓
6. DataStore sincroniza datos del usuario
   ↓
7. Navegar a inicio/pestañas
```

### Características Clave
- Validación de formato de número de teléfono
- Entrega de SMS OTP vía AWS Cognito
- Código de verificación de 6 dígitos
- Gestión automática de sesiones
- Almacenamiento seguro de tokens
- Cumplimiento de MFA para seguridad

### Detalles de Implementación
- **Servicios**: `auth-api.service.ts`, `session.service.ts`
- **Páginas**: `src/app/pages/auth/`
- **Backend**: AWS Cognito User Pool

---

## 2. Registro de Mediciones

### Descripción
Funcionalidad central para la recolección de datos agrícolas en series temporales. Los usuarios completan tareas diarias con restricciones horarias y validación específica por campo.

### Casos de Uso
- **CU-06**: Registrar mediciones diarias
- **CU-07**: Ver tareas pendientes
- **CU-08**: Completar tareas con restricción horaria
- **CU-09**: Enviar mediciones con validación
- **CU-10**: Ver historial de mediciones

### Flujo de Trabajo

#### Flujo de Medición Diaria
```
1. El usuario navega a la pestaña de Medición
   ↓
2. El sistema muestra las tareas disponibles para hoy
   ↓
3. El usuario selecciona una tarea
   ↓
4. El sistema valida:
   - ¿Está disponible la tarea hoy? (verificación del día de la semana)
   - ¿Está la hora actual dentro del horario permitido?
   - ¿Se ha completado la tarea hoy?
   ↓
5. Si es válido → Mostrar formulario de medición
   ↓
6. El usuario ingresa datos (con validación de campos)
   ↓
7. Enviar medición
   ↓
8. Guardar en DataStore (local-first)
   ↓
9. Actualizar UI inmediatamente (optimista)
   ↓
10. Sincronización en segundo plano con la nube
   ↓
11. Actualizar progreso de gamificación
   ↓
12. Mostrar mensaje de éxito
```

### Características Clave

#### Restricciones Horarias
- Las tareas pueden restringirse a horas específicas (ej., 6 AM - 8 PM)
- Programación por día de la semana (ej., solo lunes, miércoles, viernes)
- Patrones por semana del mes (ej., solo 1.ª y 3.ª semana)
- Patrones de recurrencia mensual

#### Tipos de Tareas
- Mediciones numéricas (con validación de mínimo/máximo)
- Observaciones de texto
- Selecciones únicas/múltiples
- Marcas de fecha/hora
- Adjuntos de fotos

#### Validación
- Verificación de campos obligatorios
- Validación de tipo de dato
- Validación de rango (valores mínimo/máximo)
- Cumplimiento de ventana horaria
- Prevención de duplicados (una tarea por día)

### Detalles de Implementación
- **Servicios**: `uva-api.service.ts`, `measurement.service.ts`
- **Páginas**: `src/app/pages/measurement/`
- **Componentes**: Entradas de formulario, directivas de validación
- **Modelos**: Modelo DataStore `Measurement`

---

## 3. Sistema de Gamificación

### Descripción
Sistema de seguimiento de progreso y logros para fomentar la recolección de datos consistente y el compromiso con la app.

### Casos de Uso
- **CU-11**: Seguir el progreso del usuario (semillas, rachas)
- **CU-12**: Ganar logros
- **CU-13**: Completar tareas bonus
- **CU-14**: Ver clasificaciones del marcador
- **CU-15**: Desbloquear hitos

### Flujo de Trabajo

#### Cálculo de Progreso
```
El usuario completa una medición
   ↓
El sistema calcula:
- Semillas ganadas (puntos por completar)
- Racha actual (días consecutivos)
- Progreso de hitos
- Elegibilidad para tareas bonus
   ↓
Actualizar modelo ProgresoUsuario
   ↓
Verificar nuevos logros
   ↓
Mostrar UI de celebración (si aplica)
   ↓
Sincronizar progreso con la nube
```

### Características Clave

#### Semillas (Sistema de Puntos)
- Ganar semillas por cada medición completada
- Semillas bonus por:
  - Rachas de días consecutivos
  - Semanas perfectas (todas las tareas completadas)
  - Primera vez que se completa un nuevo tipo de tarea
  - Completar en la mañana temprano

#### Rachas
- Contador de racha diaria
- Seguimiento de racha semanal
- Récord de racha más larga
- Período de gracia para recuperar racha (1 día)

#### Hitos
- Niveles Bronce, Plata, Oro, Platino
- Basados en el total de mediciones completadas
- Logros especiales por:
  - Racha de 7 días
  - Racha de 30 días
  - 100 mediciones totales
  - Mes perfecto

#### Tareas Bonus
- Desafíos semanales recurrentes
- Eventos especiales mensuales
- Actividades agrícolas estacionales
- Desafíos comunitarios (a nivel de RACIMO)

### Detalles de Implementación
- **Servicios**: `gamification.service.ts`
- **Modelos**: Modelo DataStore `UserProgress`
- **Componentes**: `progress-bar`, insignias de logros
- **Páginas**: La página de perfil muestra los logros

---

## 4. Gestión de Proyectos (RACIMO)

### Descripción
Sistema de organización multi-inquilino donde los usuarios pertenecen a un RACIMO (clúster/proyecto) y gestionan su UVA (unidad de viñedo).

### Casos de Uso
- **CU-16**: Unirse a un RACIMO existente vía código de vinculación
- **CU-17**: Crear un nuevo RACIMO
- **CU-18**: Configurar detalles de la UVA
- **CU-19**: Ver la lista de miembros del RACIMO
- **CU-20**: Compartir código de vinculación con miembros del equipo

### Flujo de Trabajo

#### Unirse a un RACIMO
```
Durante el registro:
1. El usuario recibe el código de vinculación del administrador
   ↓
2. Seleccionar "Unirse a RACIMO existente"
   ↓
3. Ingresar código de vinculación de 8 caracteres
   ↓
4. El sistema valida el código
   ↓
5. Vincular usuario al RACIMO
   ↓
6. Crear registro de UVA para el usuario
   ↓
7. Sincronizar configuración del RACIMO
   ↓
8. El usuario puede comenzar a registrar mediciones
```

#### Crear un RACIMO
```
Durante el registro:
1. Seleccionar "Crear nuevo RACIMO"
   ↓
2. Ingresar detalles del RACIMO:
   - Nombre
   - Ubicación
   - Configuración de campos
   ↓
3. El sistema genera un código de vinculación único
   ↓
4. Crear registro de RACIMO
   ↓
5. Crear UVA para el creador
   ↓
6. Establecer al creador como administrador
   ↓
7. Mostrar código de vinculación para compartir
```

### Características Clave

#### RACIMO (Proyecto/Clúster)
- Código de vinculación único de 8 caracteres
- Nombre y descripción
- Ubicación geográfica
- Gestión de miembros
- Configuraciones de tareas compartidas

#### UVA (Unidad Agrícola)
- Asociada a un RACIMO
- Una UVA por usuario
- Datos de ubicación (latitud, longitud, altitud)
- Configuración específica por campo
- Historial de mediciones

#### Código de Vinculación
- Código alfanumérico de 8 caracteres
- Sin distinción entre mayúsculas y minúsculas
- Único por RACIMO
- Compartible para invitaciones de equipo

### Detalles de Implementación
- **Servicios**: `racimo-api.service.ts`, `uva-api.service.ts`
- **Modelos**: Modelos DataStore `RACIMO`, `UVA`
- **Páginas**: Asistente de registro, configuración del perfil

---

## 5. Datos Históricos y Analíticas

### Descripción
Visualización y análisis de datos de medición históricos con gráficos, tendencias y capacidades de exportación.

### Casos de Uso
- **CU-21**: Ver historial de mediciones
- **CU-22**: Analizar tendencias a lo largo del tiempo
- **CU-23**: Comparar diferentes períodos de tiempo
- **CU-24**: Exportar datos para informes
- **CU-25**: Filtrar por rango de fechas y tipo de tarea

### Flujo de Trabajo

#### Ver Datos Históricos
```
1. El usuario navega a la pestaña Histórico
   ↓
2. Seleccionar rango de fechas (predeterminado: últimos 30 días)
   ↓
3. Opcionalmente filtrar por:
   - Tipo de tarea
   - Tipo de medición
   - Campo específico de UVA
   ↓
4. El sistema consulta DataStore
   ↓
5. Agregar y procesar datos
   ↓
6. Renderizar visualizaciones de Chart.js
   ↓
7. Mostrar estadísticas resumidas
```

### Características Clave

#### Visualizaciones
- Gráficos de área para datos en series temporales
- Gráficos de línea para tendencias
- Gráficos de barras para comparaciones
- Tarjetas de resumen con métricas clave

#### Rangos de Tiempo
- Últimos 7 días
- Últimos 30 días
- Últimos 90 días
- Selector de rango de fechas personalizado
- Vista del año en curso

#### Analíticas
- Valores promedio
- Detección de mínimos/máximos
- Dirección de tendencia (subida/bajada/estable)
- Porcentaje de tasa de completado
- Visualización de rachas

### Detalles de Implementación
- **Servicios**: `historical.service.ts`
- **Páginas**: `src/app/pages/historical/`
- **Componentes**: `areachart` (envoltorio de Chart.js)
- **Bibliotecas**: Chart.js 4.4, date-fns

---

## 6. Integración con Fases Lunares

### Descripción
Calendario agrícola basado en ciclos lunares, que proporciona recomendaciones para la siembra, cosecha y otras actividades agrícolas.

### Casos de Uso
- **CU-26**: Ver la fase lunar actual
- **CU-27**: Ver el calendario lunar mensual
- **CU-28**: Obtener recomendaciones agrícolas
- **CU-29**: Planificar actividades basadas en el ciclo lunar
- **CU-30**: Recibir notificaciones de fases lunares

### Flujo de Trabajo

#### Vista de Fase Lunar
```
1. El usuario navega a la pestaña de Fase Lunar
   ↓
2. El sistema obtiene los datos lunares actuales
   ↓
3. Mostrar:
   - Fase actual (con ícono)
   - Nombre de la fase (Nueva, Creciente, Llena, Menguante)
   - Porcentaje de iluminación
   - Fecha de próxima fase
   ↓
4. Mostrar recomendaciones agrícolas
   ↓
5. Mostrar calendario mensual
```

### Características Clave

#### Fases Lunares
- 8 fases distintas rastreadas
- Íconos visuales de fases lunares
- Porcentaje de iluminación
- Fechas de transición de fase

#### Recomendaciones Agrícolas
- Mejores días para siembra
- Tiempos óptimos de cosecha
- Orientación sobre riego
- Momentos para control de plagas

#### Integración de Calendario
- Calendario mensual de fases lunares
- Indicadores de fase en las fechas
- Planificación de actividades agrícolas
- Sistema de recordatorios

### Detalles de Implementación
- **Servicios**: `moon-phase-api.service.ts`, `moon.service.ts`
- **Páginas**: `src/app/pages/moon-phase/`
- **Componentes**: `moon-card`, `calendar`
- **Datos**: Almacenados en caché localmente para acceso offline

---

## 7. Capacidades Offline-First

### Descripción
Funcionalidad completa de la app incluso sin conexión a internet, con sincronización automática en segundo plano cuando hay conexión.

### Casos de Uso
- **CU-31**: Usar la app en zonas remotas sin conectividad
- **CU-32**: Registrar mediciones sin conexión
- **CU-33**: Ver datos históricos sin conexión
- **CU-34**: Sincronización automática al restablecer conexión
- **CU-35**: Resolver conflictos de sincronización

### Flujo de Trabajo

#### Operación Offline
```
El usuario abre la app (sin internet)
   ↓
DataStore carga desde IndexedDB local
   ↓
Todos los datos disponibles para su visualización
   ↓
El usuario registra una nueva medición
   ↓
Guardada en DataStore local
   ↓
UI actualizada inmediatamente
   ↓
DataStore pone en cola para sincronización
   ↓
[Más tarde, cuando hay conexión]
   ↓
Sincronización en segundo plano comienza
   ↓
Cargar cambios pendientes
   ↓
Descargar actualizaciones del servidor
   ↓
Resolver conflictos (si los hay)
   ↓
Notificar al usuario del estado de sincronización
```

### Características Clave

#### Almacenamiento Offline
- Todos los datos sincronizados almacenados en caché localmente
- IndexedDB para datos estructurados
- Sistema de archivos de Capacitor para archivos
- Capacidad de almacenamiento ilimitada

#### Estrategia de Sincronización
- Actualizaciones optimistas de la UI
- Sincronización en segundo plano cuando hay conexión
- Sincronización incremental (solo cambios)
- Resolución de conflictos con versionado

#### Resolución de Conflictos
- Estrategia del último en escribir gana
- Detección de conflictos basada en versiones
- Notificación al usuario sobre conflictos
- Opción de resolución manual

### Detalles de Implementación
- **Servicios**: AWS Amplify DataStore
- **Almacenamiento**: IndexedDB, Sistema de archivos de Capacitor
- **Sincronización**: Proceso automático en segundo plano

---

## 8. Perfil y Configuración

### Descripción
Gestión del perfil de usuario, configuración de la app y preferencias de cuenta.

### Casos de Uso
- **CU-36**: Actualizar información del perfil
- **CU-37**: Ver logros y estadísticas
- **CU-38**: Configurar ajustes de la app
- **CU-39**: Gestionar seguridad de la cuenta
- **CU-40**: Cerrar sesión y gestión de la sesión

### Flujo de Trabajo

#### Actualización de Perfil
```
1. El usuario navega a la pestaña de Perfil
   ↓
2. Ver datos actuales del perfil
   ↓
3. Hacer clic en "Editar Perfil"
   ↓
4. Modificar campos (nombre, detalles de UVA, etc.)
   ↓
5. Opcional: Subir foto de perfil a S3
   ↓
6. Guardar cambios en DataStore
   ↓
7. Sincronizar con el backend
   ↓
8. Mostrar confirmación de éxito
```

### Características Clave

#### Información del Perfil
- Nombre y datos de contacto
- Información de UVA asociada
- Detalles de membresía al RACIMO
- Foto de perfil (almacenamiento S3)
- Fecha de creación de la cuenta

#### Visualización de Logros
- Total de semillas ganadas
- Racha actual
- Hitos alcanzados
- Colección de insignias
- Posición en el marcador

#### Configuración
- Preferencias de idioma
- Configuración de notificaciones
- Preferencias de sincronización de datos
- Opciones de tema (futuro)
- Configuración de privacidad

#### Gestión de Cuenta
- Cambiar número de teléfono
- Activar/desactivar MFA
- Funcionalidad de cierre de sesión
- Solicitud de eliminación de cuenta

### Detalles de Implementación
- **Servicios**: `user-api.service.ts`, `s3.service.ts`
- **Páginas**: `src/app/pages/profile/`
- **Almacenamiento**: S3 para fotos de perfil

---

## 9. Notificaciones y Recordatorios

### Descripción
Notificaciones push y recordatorios dentro de la app para fomentar el completado de tareas diarias.

### Casos de Uso
- **CU-41**: Recibir recordatorios de tareas diarias
- **CU-42**: Obtener notificaciones de advertencia de racha
- **CU-43**: Celebraciones por desbloqueo de logros
- **CU-44**: Actualizaciones y anuncios del RACIMO

### Características Clave

#### Tipos de Notificaciones
- Recordatorios de tareas diarias (hora configurable)
- Advertencia de racha (si las tareas no se completaron)
- Logro desbloqueado
- Anuncios del administrador del RACIMO
- Actualizaciones del estado de sincronización

#### Programación
- Horarios de recordatorio definidos por el usuario
- Tiempo inteligente (basado en restricciones de tareas)
- Funcionalidad de posponer
- Horas de no molestar

### Detalles de Implementación
- **Plataforma**: Notificaciones Locales de Capacitor
- **Backend**: AWS Pinpoint (futuro)
- **Programación**: Programador de notificaciones locales

---

## 10. Exportación de Datos e Informes

### Descripción
Exportar datos de medición para análisis externo, informes y mantenimiento de registros.

### Casos de Uso
- **CU-45**: Exportar datos a CSV
- **CU-46**: Generar informes PDF
- **CU-47**: Compartir datos con miembros del equipo
- **CU-48**: Hacer copia de seguridad de datos personales

### Características Clave

#### Formatos de Exportación
- CSV para análisis en hojas de cálculo
- JSON para acceso programático
- Informes PDF con gráficos (futuro)

#### Opciones de Exportación
- Selección de rango de fechas
- Filtrado por tipo de tarea
- Incluir/excluir metadatos
- Datos agregados vs. datos en bruto

### Detalles de Implementación
- **Servicios**: Utilidades de exportación
- **Bibliotecas**: Parser CSV, generador PDF
- **Almacenamiento**: Sistema de archivos de Capacitor, API de compartir

---

## Hoja de Ruta de Funcionalidades

### Funcionalidades Planificadas
- **Soporte para iOS**: Compilar y desplegar versión iOS
- **Adjuntos de Fotos**: Adjuntar fotos a las mediciones
- **Integración con Clima**: Correlacionar mediciones con datos meteorológicos
- **Colaboración en Equipo**: Comentarios y notas compartidas
- **Analíticas Avanzadas**: Perspectivas y predicciones basadas en ML
- **Soporte Multiidioma**: Localización en español y portugués
- **Modo Oscuro**: Personalización del tema
- **Entrada de Voz**: Ingreso de datos manos libres para trabajo de campo
- **Lectura de Códigos de Barras**: Identificación rápida de productos/campos

### En Consideración
- Panel web para administradores de RACIMO
- Integración con sensores IoT
- Sugerencias automatizadas de medición
- Recomendaciones de sistema experto
- Funcionalidades sociales y comunidad

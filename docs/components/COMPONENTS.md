# Componentes Angular/Ionic — UVA-App Frontend

---

## Descripción General

Los componentes de UVA-App siguen la **arquitectura standalone de Angular 18** (sin NgModules). Todos los componentes son auto-contenidos con sus propias dependencias declaradas en `imports: []`.

Los componentes se organizan en dos categorías:
- **Componentes reutilizables** (`src/app/components/`): Usados en múltiples páginas
- **Páginas** (`src/app/pages/`): Componentes de nivel de ruta con lógica de negocio

---

## Componentes Reutilizables

### `<app-alert />`

**Archivo:** `src/app/components/alert/`

**Propósito:** Envoltorio personalizado sobre SweetAlert2 para mostrar alertas, confirmaciones y mensajes de éxito coherentes con el diseño de la app.

**Tipos de alerta:**
- Éxito (confirmar acción completada)
- Error (mostrar error de red o validación)
- Confirmación (pedir confirmación al usuario antes de una acción)
- Celebración (desbloqueo de logro / hito alcanzado)

**Dependencias:**
- `sweetalert2` — Librería de alertas modales

---

### `<app-areachart />`

**Archivo:** `src/app/components/areachart/`

**Propósito:** Envoltorio sobre Chart.js 4.4 para renderizar gráficos de área de series temporales. Usado principalmente en la página Histórico para visualizar las mediciones a lo largo del tiempo.

**Props principales:**

| Prop | Tipo | Descripción |
|------|------|-------------|
| `data` | `ChartDataset[]` | Conjuntos de datos a visualizar (uno por tipo de medición) |
| `labels` | `string[]` | Etiquetas del eje X (fechas en formato legible) |
| `options` | `ChartOptions` | Opciones de configuración de Chart.js (escalas, tooltips, etc.) |

**Tipos de gráficos soportados:**
- Gráficos de área (relleno bajo la curva) — para series temporales continuas
- Gráficos de línea — para tendencias
- Gráficos de barras — para comparaciones entre períodos

**Dependencias:**
- `chart.js` 4.4 — Librería de visualización de datos

---

### `<app-calendar />`

**Archivo:** `src/app/components/calendar/`

**Propósito:** Calendario personalizado con múltiples usos:
1. **En la página Histórico:** Selector de rango de fechas para filtrar mediciones
2. **En la página Fase Lunar:** Visualización del calendario mensual con indicadores de fases lunares

**Características:**
- Resaltado de días con tareas completadas
- Indicadores visuales de fases lunares en cada día
- Selección de rango de fechas (fecha inicio — fecha fin)
- Navegación entre meses
- Sistema de recordatorios agrícolas

---

### `<app-header />`

**Archivo:** `src/app/components/header/`

**Propósito:** Cabecera compartida con navegación, marca de MakeSens e indicadores de estado.

**Características:**
- Nombre/logo de la aplicación
- Indicador de estado de sincronización (online/offline/sincronizando)
- Navegación de vuelta (si aplica)
- Menú de opciones contextual (si aplica)

---

### `<app-moon-card />`

**Archivo:** `src/app/components/moon-card/`

**Propósito:** Tarjeta de visualización de la fase lunar actual con información astronómica y recomendaciones agrícolas.

**Datos mostrados:**
- Ícono visual de la fase lunar actual
- Nombre de la fase (Nueva, Creciente Cóncava, Cuarto Creciente, Creciente Gibosa, Llena, Menguante Gibosa, Cuarto Menguante, Menguante Cóncava)
- Porcentaje de iluminación
- Fecha de la próxima fase
- Recomendaciones agrícolas para la fase actual

**Dependencias:**
- `moon.service.ts` — Cálculos de fases lunares
- `moon-phase-api.service.ts` — Datos remotos de fases lunares

---

### `<app-progress-bar />`

**Archivo:** `src/app/components/progress-bar/`

**Propósito:** Visualización del progreso de gamificación del usuario. Muestra semillas acumuladas, racha activa e indicadores de hitos.

**Datos mostrados:**
- Semillas ganadas (puntos acumulados)
- Contador de racha actual (días consecutivos)
- Progreso hacia el siguiente hito (Bronce → Plata → Oro → Platino)
- Insignias de logros desbloqueados

---

## Páginas

### Páginas de Autenticación (`src/app/pages/auth/`)

**Propósito:** Flujo completo de autenticación por teléfono con SMS OTP.

#### Página de Inicio / Login

**Flujo:**
1. Entrada y validación del número de teléfono
2. Envío de SMS OTP vía AWS Cognito
3. Entrada del código OTP de 6 dígitos
4. Verificación y establecimiento de sesión

**Servicios utilizados:**
- `auth-api.service.ts` — Gestión de llamadas a Cognito
- `session.service.ts` — Almacenamiento seguro de tokens

#### Asistente de Registro (multi-paso)

**Pasos:**
1. Número de teléfono + verificación OTP
2. Unirse a RACIMO existente (código de vinculación) O Crear nuevo RACIMO
3. Completar información del perfil

**Validaciones:**
- Formato internacional del número de teléfono
- Longitud y formato del código OTP (6 dígitos numéricos)
- Código de vinculación RACIMO (8 caracteres alfanuméricos)

---

### Página de Medición (`src/app/pages/measurement/`)

**Propósito:** Funcionalidad central para la recolección de datos agrícolas diarios.

**Lógica de validación de tareas:**

| Validación | Descripción |
|-----------|-------------|
| Disponibilidad horaria | Las tareas tienen ventanas horarias configurables (ej. 6 AM - 8 PM) |
| Día de la semana | Algunos tipos de tarea solo aplican ciertos días |
| Semana del mes | Patrones de recurrencia mensual (ej. 1.a y 3.a semana) |
| Duplicados | Una tarea puede completarse una sola vez por día |

**Tipos de campos en formularios:**

| Tipo | Descripción |
|------|-------------|
| Numérico | Con validación de rango (mínimo/máximo) |
| Texto | Observaciones libres |
| Selección única | Una opción de una lista predefinida |
| Selección múltiple | Varias opciones de una lista predefinida |
| Fecha/Hora | Timestamps con validación de formato |
| Foto | Adjunto de imagen (almacenamiento en S3) |

**Servicios utilizados:**
- `uva-api.service.ts` — Operaciones CRUD de UVA
- `measurement.service.ts` — Guardado y consulta de mediciones
- `gamification.service.ts` — Actualización de progreso post-medición

---

### Página Histórico (`src/app/pages/historical/`)

**Propósito:** Visualización y análisis de datos de medición históricos.

**Rangos de tiempo predefinidos:**

| Rango | Descripción |
|-------|-------------|
| Últimos 7 días | Vista de la semana pasada |
| Últimos 30 días | Vista mensual (predeterminado) |
| Últimos 90 días | Vista trimestral |
| Año en curso | Desde el 1 de enero hasta hoy |
| Personalizado | Selector de rango libre |

**Analíticas mostradas:**
- Valor promedio del período
- Valor mínimo y máximo detectados
- Dirección de tendencia (subida / bajada / estable)
- Porcentaje de tasa de completado de tareas
- Visualización de rachas (días consecutivos con mediciones)

**Componentes utilizados:**
- `<app-areachart />` — Gráficos de series temporales
- `<app-calendar />` — Selector de rango de fechas

**Servicios utilizados:**
- `historical.service.ts` — Consultas optimizadas al DataStore
- DataStore GSI `byUVAandTs` — Consultas por UVA y rango de fechas

---

### Página Perfil (`src/app/pages/profile/`)

**Propósito:** Gestión del perfil de usuario, visualización de logros y configuración de la app.

**Secciones:**

#### Información del Perfil
- Nombre y datos de contacto (editables)
- Información de UVA asociada (ubicación del viñedo)
- Detalles de membresía al RACIMO
- Foto de perfil (almacenada en S3)
- Fecha de creación de la cuenta

#### Visualización de Logros
- Total de semillas ganadas (histórico)
- Racha actual y récord histórico
- Hitos alcanzados con fecha de desbloqueo
- Colección de insignias
- Posición en el marcador del RACIMO

#### Configuración
- Preferencias de idioma
- Configuración de notificaciones (horario de recordatorios)
- Preferencias de sincronización de datos
- Opciones de tema (futuro)
- Configuración de privacidad

#### Gestión de Cuenta
- Cambiar número de teléfono (requiere re-verificación)
- Activar/desactivar MFA
- Cerrar sesión
- Solicitar eliminación de cuenta

**Servicios utilizados:**
- `user-api.service.ts` — Perfil de usuario
- `s3.service.ts` — Carga y descarga de fotos de perfil
- `racimo-api.service.ts` — Datos del proyecto RACIMO

---

### Página Fase Lunar (`src/app/pages/moon-phase/`)

**Propósito:** Calendario agrícola basado en ciclos lunares con recomendaciones para actividades de viñedo.

**Contenido mostrado:**
- Fase lunar actual (con ícono animado)
- Porcentaje de iluminación actual
- Nombre de la fase (8 fases rastreadas)
- Fecha y hora de la próxima transición de fase
- Recomendaciones agrícolas para la fase actual:
  - Mejores días para siembra
  - Tiempos óptimos de cosecha
  - Orientación sobre riego
  - Momentos para control de plagas
- Calendario mensual completo con indicadores de fase

**Almacenamiento en caché:**
Los datos de fases lunares se almacenan en caché localmente para permitir acceso offline. Se actualiza automáticamente cuando hay conexión.

**Componentes utilizados:**
- `<app-moon-card />` — Tarjeta de la fase actual
- `<app-calendar />` — Calendario mensual con indicadores lunares

**Servicios utilizados:**
- `moon-phase-api.service.ts` — Obtención de datos lunares remotos
- `moon.service.ts` — Cálculos de fases y almacenamiento en caché

---

## Sistema de Navegación

La app usa una **estructura de pestañas (tabs)** de Ionic como navegación principal:

| Pestaña | Ruta | Ícono | Descripción |
|---------|------|-------|-------------|
| Medición | `/tabs/measurement` | `flask-outline` | Registro de tareas diarias |
| Histórico | `/tabs/historical` | `bar-chart-outline` | Visualización de datos |
| Perfil | `/tabs/profile` | `person-outline` | Perfil y configuración |
| Fase Lunar | `/tabs/moon-phase` | `moon-outline` | Calendario lunar |

Las rutas de autenticación (`/auth/*`) están fuera de la estructura de pestañas y se muestran cuando el usuario no tiene sesión activa.

---

## Patrones de Desarrollo de Componentes

### Componentes Standalone (Angular 18)

```typescript
// Patrón de componente standalone en UVA-App
@Component({
  selector: 'app-progress-bar',
  standalone: true,
  imports: [IonicModule, CommonModule],
  templateUrl: './progress-bar.component.html',
  styleUrls: ['./progress-bar.component.scss']
})
export class ProgressBarComponent {
  @Input() seeds: number = 0;
  @Input() streak: number = 0;
  @Input() milestone: string = 'Bronze';
}
```

### Inyección de Dependencias

```typescript
// Patrón de inyección de servicios en páginas
@Component({ ... })
export class MeasurementPage implements OnInit {
  constructor(
    private uvaApiService: UvaApiService,
    private gamificationService: GamificationService,
    private router: Router
  ) {}

  async ngOnInit() {
    // Cargar datos desde DataStore (offline-first)
    const tasks = await this.uvaApiService.getTasksForToday();
  }
}
```

### Uso de DataStore con RxJS

```typescript
// Patrón de observables para datos reactivos
import { DataStore } from 'aws-amplify/datastore';
import { Measurement } from '@/models';

// Observar cambios en tiempo real
const subscription = DataStore.observe(Measurement).subscribe(msg => {
  if (msg.opType === 'INSERT') {
    this.measurements.unshift(msg.model);
    this.updateChart();
  }
});

// Limpiar suscripción al destruir el componente
ngOnDestroy() {
  subscription.unsubscribe();
}
```

# ActasTI

Aplicación Angular para gestión de actas TI: creación de asignaciones, aprobación por enlace/token, consulta histórica de actas, dashboard de indicadores e inventario filtrable.

## Stack técnico

- Angular `21`
- Angular Material
- RxJS
- Chart.js + ng2-charts
- Pruebas unitarias con `ng test` + Vitest (tipos `vitest/globals`)

## Módulos funcionales

- `Login`: autenticación y persistencia de sesión.
- `Inicio`: dashboard con KPIs, filtros y gráficas.
- `Crear acta`: flujo por pasos, selección de activos, datos técnicos y notificación.
- `Listar actas`: historial, descarga de PDF, reactivación de asignaciones.
- `Inventario`: consulta con filtros, paginación y exportación CSV.
- `Aprobar`: confirmación/rechazo mediante token de correo.

## Estructura del proyecto

```text
src/app
├── components/               # Layout, diálogo confirmación, diálogo datos técnicos
├── core/
│   ├── guards/               # AuthGuard
│   ├── interceptors/         # authInterceptor (Bearer token)
│   ├── models/               # Tipos de dominio
│   ├── services/             # Auth, Dashboard, Inventario, Actas, etc.
│   └── mocks/                # Datos de soporte para pruebas/desarrollo
├── pages/
│   ├── login/
│   ├── inicio/
│   ├── actas/                # aprobar, crear-acta, listar-acta
│   └── activos/inventario/
└── interceptors/             # ngrok interceptor (opcional)
```

## Configuración de entorno

Archivo: `src/environments/environment.ts`

- En `localhost` usa `http://localhost:3000/api/v1`
- En host distinto usa `https://bk-actas-sodimac.onrender.com/api/v1`

No existe `environment.prod.ts` en esta versión; la selección de API se hace por hostname.

## Requisitos

- Node.js LTS
- npm

## Scripts disponibles

```bash
npm start          # ng serve
npm run build      # build producción
npm run watch      # build en modo watch
npm test           # pruebas unitarias
```

## Ejecución local

```bash
npm install
npm start
```

Abrir `http://localhost:4200`.

## Pruebas unitarias

Ejecutar:

```bash
npm test -- --watch=false
```

Estado actual de la suite:

- `19` archivos de prueba
- `69` pruebas pasando

Cobertura funcional validada:

- Servicios:
  - `AuthService`: login, sesión, expiración, token.
  - `DashboardService`: saneamiento y serialización de filtros.
  - `InventarioService`: caché, invalidación, búsqueda por campo.
  - `ActasService`: creación, reactivación y descarga de PDF por rutas fallback.
  - `UserService`: búsqueda por username y fallback de endpoint.
  - `TiendaEstadoService`: estados/tipos dinámicos y refresco por serial.
  - `NotificationService`: toasts de éxito/error.
- Interceptores/guards:
  - `authInterceptor`: adjunta token sólo cuando aplica.
  - `AuthGuard`: acceso autenticado y redirección con `redirect`.
- Componentes/páginas:
  - `Layout`, `Dialog`.
  - `Login`, `Inicio`, `Aprobar`, `CrearActaComponent`, `ListarActa`, `InventarioComponent`.
- Routing:
  - Verificación de rutas públicas/protegidas y composición en `Layout`.

Para cobertura HTML:

```bash
npm test -- --watch=false --code-coverage
```

## Seguridad y sesión

- `authInterceptor` agrega `Authorization: Bearer <token>` a requests del backend.
- Excluye explícitamente el endpoint de login.
- `AuthService` persiste sesión en `sessionStorage` (`actasti_auth_session`) y valida expiración local.
- `Layout.logout()` limpia sesión y `localStorage`.

## Integración con backend

Principales rutas consumidas:

- `POST /auth/login`
- `GET /dashboard/stats`
- `GET /elementos`, `GET /elementos/:campo/:valor`
- `GET /tiendas`
- `GET /movimientos`
- `POST /asignacion/notificar-asignacion`
- `POST /asignacion/confirmar-asignacion`
- `POST /asignacion/reactivar-asignacion`
- `POST /asignacion/reactivar-asignacion-token`

## Notas de mantenimiento

- Mantener tests alineados a Vitest (`vi.fn`, `vi.spyOn`, `expect.objectContaining`).
- Evitar `jasmine.*` en nuevos specs.
- Si se agregan rutas o servicios, crear/actualizar su spec correspondiente.

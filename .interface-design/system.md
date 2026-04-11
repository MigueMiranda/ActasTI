# Interface Design System - ActasTI

## Direction & Feel
- **Tono:** Corporativo profesional -干净, sobrio, confiable
- **Primary:** `#1a365d` (azul navy profundo)
- **Feel:** Confiable, ordenado, sin ruido visual

## Depth Strategy
- **Approach:** Borders-only con surface color shifts
- **No shadows** - todo definido por borders sutiles
- **Elevación:** Solo por background color differences (surface vs surface-alt)

## Spacing
- **Base unit:** 4px
- **Border radius:** 6px (pequeño), 8px (mediano), 12px (grande)
- **Padding:** Múltiplos de 4px (12, 16, 20, 24)

## Key Patterns

### Tokens CSS
```
--primary: #1a365d
--primary-dark: #0f2744
--primary-soft: #ebf4ff
--bg-canvas: #f1f5f9
--surface: #ffffff
--surface-alt: #f8fafc
--border-soft: #e2e8f0
--border-subtle: #cbd5e1
--text: #0f172a
--text-secondary: #475569
--text-muted: #64748b
```

### Tablas
- Header: background surface-alt, border-bottom 1px
- Sin gradientes, sin shadows
- Borders sutiles (#e2e8f0)
- Hover en filas: surface-alt

### Buttons
- Border-radius: 6px
- Sin gradientes - color sólido
- Sin box-shadow - solo border sutil en focus

### Cards/Panels
- Background: surface
- Border: 1px solid border-soft
- Border-radius: 8px
- Sin shadow

### Badges/Estados
- Padding: 4px 10px
- Border-radius: 4px
- Colores pastel profesionales

### Form Fields
- Border-radius: 6px
- Background: surface-alt
- Focus: border-primary + box-shadow sutil (0 0 0 2px rgba)

### Dashboard Filters
- Layout: row, nowrap, gap 16px
- Breakpoint: 768px (wrap en móvil)
- Fields: min-width 180px, flex 0 0 auto
- Button: align-items center

## Components
- Login: Fondo sutil gradient, card limpio con border
- Dashboard KPIs: Grid 4 columnas, borders sutiles
- Dashboard Filters: Horizontal row, responsive wrap
- Sidebar: Fondo surface, border-right, items con hover
- Stepper: Header con background surface-alt, border-radius 8px

## Tests
- **Framework:** Vitest
- **Ejecutar:** `npm test` o `npm run test:ui` (interfaz visual)
- **Archivos:** `src/**/*.vitest.ts`
- **Nota:** Los tests de componentes Angular (`.spec.ts`) requieren configuración adicional del TestBed que no es compatible con Vitest sin migrar la sintaxis
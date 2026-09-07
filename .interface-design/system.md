# Interface Design System - ActasTI

## Sistema de Temas

El proyecto soporta **3 temas corporativos profesionales** que puedes cambiar desde el header haciendo click en el icono de paleta.

### Tema activo actual: Trust & Clarity (predeterminado)

---

## Temas Disponibles

### 1. Enterprise Precision
- **Feel:** Técnico, datos densos, control total
- **Primary:** `#0f172a` (Navy oscuro)
- **Accent:** `#0891b2` (Cyan)
- **Depth:** Borders-only
- **Best for:** Operaciones IT, gestión de activos densos

### 2. Trust & Clarity (default)
- **Feel:** Accesible, clara lectura, confiable
- **Primary:** `#1e40af` (Azul profesional)
- **Accent:** `#2563eb` (Blue)
- **Depth:** Mix borders + subtle shadow
- **Best for:** Help desk, usuarios generales

### 3. Modern SaaS
- **Feel:** Espacioso, moderno pero serio
- **Primary:** `#4338ca` (Indigo)
- **Accent:** `#818cf8` (Light indigo)
- **Depth:** Layered surfaces
- **Best for:** Admin general, interfaz moderna

---

## Cambiar Tema

1. Haz click en el icono de **paleta** en el header
2. Selecciona uno de los 3 temas
3. El tema se guarda automáticamente en localStorage

---

## Depth Strategy
- **Approach:** varies by theme
- **No shadows** (enterprise) → **subtle shadows** (trust) → **layered** (modern)
- **Elevación:** Surface color shifts

## Spacing
- **Base unit:** 4px
- **Border radius:** varies by theme (4-16px)
- **Padding:** Múltiplos de 4px (12, 16, 20, 24)

## Tests
- **Framework:** Vitest
- **Ejecutar:** `npm test`
- **Archivos:** `src/**/*.vitest.ts`
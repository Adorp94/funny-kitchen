# Funny Kitchen - Sistema de Cotizaciones

Sistema de gestión de cotizaciones para Funny Kitchen, una empresa de cerámica artesanal.

## Características

### 📋 Gestión de Cotizaciones
- Creación y edición de cotizaciones
- Gestión de clientes
- Cálculo automático de precios
- Estados de cotización (pendiente, enviada, aprobada, etc.)

### 💰 Finanzas
- Registro de ingresos y egresos
- Seguimiento de pagos
- Reportes financieros
- Manejo de múltiples monedas (MXN/USD)

### 🏭 Producción
- Cola de producción
- Planificación de entregas
- Gestión de moldes activos

### 📦 **Inventario de Moldes** (Nuevo)
Sistema completo para gestionar el inventario de moldes físicos utilizados en la producción:

#### Características principales:
- **Inventario en tiempo real**: Visualiza la cantidad de moldes disponibles para cada producto
- **Edición inline**: Haz clic en cualquier cantidad para editarla directamente
- **Filtros inteligentes**: Filtra por productos sin moldes, con pocos moldes, o suficientes
- **Búsqueda avanzada**: Busca por nombre del producto o SKU
- **Estados visuales**: Indicadores de color para identificar rápidamente el estado del inventario
  - 🔴 Sin moldes (0)
  - 🟡 Pocos moldes (1-3)
  - 🟢 Suficientes (4+)
- **Exportación CSV**: Exporta reportes para análisis externo
- **Selección masiva**: Selecciona múltiples productos para operaciones en lote

#### Cómo usar:
1. Ve a Dashboard → Inventario
2. Busca productos por nombre o SKU
3. Haz clic en el campo "MOLDES" para editar la cantidad
4. Presiona Enter para guardar o Esc para cancelar
5. Usa los filtros para encontrar productos que necesitan más moldes
6. Exporta datos seleccionados o toda la vista a CSV

#### Datos técnicos:
- Campo: `moldes_disponibles` en tabla `productos`
- Relacionado con: `productos_en_mesa` (moldes en uso activo)
- También muestra: `vueltas_max_dia` (ciclos máximos de producción por día)

## Tecnologías

- **Frontend**: Next.js 15, React, TypeScript
- **Base de datos**: Supabase (PostgreSQL)
- **Estilos**: TailwindCSS + shadcn/ui
- **Autenticación**: Supabase Auth

## Estructura del Proyecto

```
src/
├── app/
│   ├── dashboard/
│   │   ├── cotizaciones/     # Gestión de cotizaciones
│   │   ├── finanzas/         # Ingresos y egresos
│   │   └── inventario/       # 📦 Inventario de moldes
│   ├── produccion/           # Cola de producción
│   └── api/                  # Endpoints de la API
├── components/
│   ├── ui/                   # Componentes base (shadcn/ui)
│   ├── cotizacion/           # Componentes específicos
│   └── produccion/           # Moldes activos
└── lib/                      # Utilidades y configuración
```

## Base de Datos

### Tablas principales:
- `productos`: Catálogo de productos con `moldes_disponibles`
- `mesas_moldes`: Estaciones de trabajo de producción
- `productos_en_mesa`: Moldes asignados a producción activa
- `cotizaciones`: Cotizaciones y órdenes
- `clientes`: Información de clientes
- `pagos`: Registro de pagos

## Instalación

1. Clona el repositorio
2. Instala dependencias: `npm install`
3. Configura variables de entorno (`.env.local`)
4. Ejecuta: `npm run dev`

## Variables de Entorno

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Contribuir

1. Fork del proyecto
2. Crea una rama: `git checkout -b feature/nueva-funcionalidad`
3. Commit: `git commit -m 'Agregar nueva funcionalidad'`
4. Push: `git push origin feature/nueva-funcionalidad`
5. Pull Request

---

Desarrollado con Next.js 14 y Tailwind CSS.

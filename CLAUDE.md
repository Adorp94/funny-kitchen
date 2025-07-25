# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Development**: `npm run dev` - Start Next.js development server
- **Build**: `npm run build` - Create production build
- **Start**: `npm start` - Start production server
- **Lint**: `npm run lint` - Run ESLint

## Application Architecture

### Tech Stack
- **Framework**: Next.js 15 with App Router
- **Database**: Supabase (PostgreSQL)
- **Styling**: TailwindCSS with shadcn/ui components
- **Authentication**: Supabase Auth
- **TypeScript**: Full TypeScript support with strict mode

### Core Features
This is a quotation management system for Funny Kitchen (ceramic artisan company) with four main modules:

1. **Quotations** (`/dashboard/cotizaciones/`) - Create, edit, and manage quotes
2. **Finance** (`/dashboard/finanzas/`) - Track income, expenses, and payments
3. **Production** (`/produccion/`) - Production queue, allocation management, and fulfillment tracking
4. **Inventory** (`/dashboard/inventario/`) - Mold inventory management

### Key Architecture Patterns

#### API Structure
- API routes follow RESTful patterns in `/src/app/api/`
- Supabase client is configured in `/src/lib/supabase/`
- Database schema defined in `/src/lib/db/schema.ts` using Drizzle ORM

#### Component Organization
- **UI Components**: `/src/components/ui/` - Base shadcn/ui components
- **Feature Components**: `/src/components/cotizacion/`, `/src/components/finanzas/`, `/src/components/produccion/`
- **Layout Components**: Sidebar navigation with breadcrumbs in root layout

#### State Management
- **ProductosContext** (`/src/contexts/productos-context.tsx`) - Manages product state for quotations
- **CartContext** (`/src/contexts/cart-context.tsx`) - Shopping cart functionality

#### Database Tables
Key tables include:
- `cotizaciones` - Quotations with pricing and status
- `clientes` - Customer information
- `productos` - Product catalog with SKUs and inventory
- `cotizacion_productos` - Products linked to quotations
- `moldes_activos` - Active molds for production
- `mesas_moldes` - Production workstations
- `production_queue` - Production scheduling and planning
- `production_active` - Real-time production tracking
- `production_allocations` - Product allocation for packaging and delivery

### Development Patterns

#### Quotation Flow
Main quotation creation flow:
1. **Entry Point**: `/src/app/nueva-cotizacion/page.tsx`
2. **Client Form**: `/src/components/cotizacion/cliente-form.tsx`
3. **Product Addition**: `/src/components/cotizacion/producto-simplificado.tsx`
4. **Product List**: `/src/components/cotizacion/lista-productos.tsx`

#### Currency Handling
- Supports MXN and USD with exchange rate integration
- Exchange rate fetched from Banxico API
- Currency conversion utilities in `/src/lib/utils/currency.ts`

#### PDF Generation
- PDF quotations generated using React PDF (`@react-pdf/renderer`)
- PDF service in `/src/services/pdf-service.tsx`

### Configuration Notes
- Next.js config ignores TypeScript and ESLint errors in production builds
- Supabase SSR configured for server-side rendering
- TailwindCSS configured with shadcn/ui theme system
- Path aliases: `@/*` maps to `./src/*`

### Production Management System
The production module includes sophisticated allocation and fulfillment tracking:

#### Production Stages Flow
1. **Pedidos** → **Bitácora** (manual selection) → **Por Detallar** → **Detallado** → **Sancocho** → **Terminado** (manufacturing stages)
2. **Terminado** → **Empaque** → **Entregado** (fulfillment stages)

#### Manual Bitácora Process
- **Status Change**: When moving cotización to "producción" status, products are NO LONGER automatically added to bitácora
- **Manual Selection**: Users must manually select products in the Pedidos section to add them to bitácora
- **Selection Criteria**: Only products with available moldes can be selected (checkbox only appears for products with moldes > 0)
- **Move to Bitácora**: Selected products are moved using the "Mover X a Bitácora" button which calls `/api/production/move-to-bitacora`

#### Key Production Components
- **Pedidos Section** (`/src/components/produccion/pedidos-section.tsx`)
  - View all products from cotizaciones in "producción" status
  - Manual selection system with checkboxes (only for products with moldes)
  - "Mover X a Bitácora" button to move selected products to production queue
  - Integration with moldes availability checking

- **Clientes Activos Section** (`/src/components/produccion/clientes-activos-section.tsx`)
  - Search quotations by ID to view product details and production status
  - Move products from "Terminado" to "Empaque" with allocation limit validation
  - Real-time production status tracking and allocation management

- **Empaque Management** (`/src/components/produccion/empaque-table.tsx`, `/src/components/produccion/move-to-empaque-dialog.tsx`)
  - Package products for specific quotations
  - Track box counts (small/large boxes) and packaging comments
  - Move products from "Empaque" to "Entregado" when ready for shipment

- **Enviados Tracking** (`/src/components/produccion/enviados-table.tsx`, `/src/components/produccion/move-to-enviados-dialog.tsx`)
  - Final delivery stage tracking
  - Automatic quotation completion when all products are fully delivered

#### Production API Endpoints
- **`/api/production/pedidos`** - Fetch all products from cotizaciones in "producción" status for manual selection
- **`/api/production/move-to-bitacora`** - Move selected products to production queue (bitácora) with molde validation
- **`/api/production/clientes-activos/[cotizacionId]`** - Fetch quotation details with production status
- **`/api/production/empaque`** - Manage empaque allocations (POST: move to empaque, GET: view empaque products, DELETE: return to terminado, PATCH: update box counts)
- **`/api/production/enviados`** - Manage delivery allocations with auto-completion logic

#### Allocation Logic
- **Smart Validation**: Products can only be allocated up to their quotation quantity
- **Partial Allocations**: Support for moving products in batches (e.g., 10 out of 15 pieces)
- **Global Stock Awareness**: Considers both quotation limits and actual available terminado stock
- **Auto-Completion**: Automatically marks quotations as 'enviada' when all products are fully delivered
- **Demand Calculation**: Pedidos column shows net unfulfilled demand (total ordered - allocated), preventing over-production
- **Box Tracking**: Complete preservation of packaging information across empaque → entregado stages

#### Database Tables (Production-Specific)
- `production_active` - Current production status for all products (por_detallar, detallado, sancocho, terminado)
- `production_allocations` - Tracks product movement through empaque and entregado stages with box counts
- `production_queue` - Production scheduling and planning queue
- `production_active_with_gap` - View that calculates net unfulfilled demand (pedidos - allocated)
- Migration `005_add_allocation_constraints.sql` - Allocation tracking and constraint validation
- Migration `006_create_production_active_with_gap_view.sql` - Smart demand calculation view

### Important File Locations
- Database migrations: `/database/migrations/`
- API endpoints: `/src/app/api/`
- Supabase config: `/src/lib/supabase/`
- UI components: `/src/components/ui/`
- Production components: `/src/components/produccion/`
- Application constants: `/src/lib/constants.ts`
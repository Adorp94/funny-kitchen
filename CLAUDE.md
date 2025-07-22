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
This is a quotation management system for Funny Kitchen (ceramic artisan company) with three main modules:

1. **Quotations** (`/dashboard/cotizaciones/`) - Create, edit, and manage quotes
2. **Finance** (`/dashboard/finanzas/`) - Track income, expenses, and payments
3. **Production** (`/produccion/`) - Production queue and mold management
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

### Important File Locations
- Database migrations: `/database/migrations/`
- API endpoints: `/src/app/api/`
- Supabase config: `/src/lib/supabase/`
- UI components: `/src/components/ui/`
- Application constants: `/src/lib/constants.ts`
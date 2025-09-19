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
2. **Finance** (`/dashboard/finanzas/`) - Track income, expenses, payments, and accounts receivable
3. **Production** (`/produccion/`) - Production queue, allocation management, fulfillment tracking, and mold inventory management

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
- **AuthContext** (`/src/contexts/auth-context.tsx`) - Manages user authentication state with hydration safety
- **ProductosContext** (`/src/contexts/produtos-context.tsx`) - Manages product state for quotations with hydration safety
- **CartContext** (`/src/contexts/cart-context.tsx`) - Shopping cart functionality

#### Database Tables
Key tables include:
- `cotizaciones` - Quotations with pricing and status (includes `deuda_incobrable` field for bad debt management)
- `clientes` - Customer information
- `productos` - Product catalog with SKUs and inventory
- `cotizacion_productos` - Products linked to quotations (includes `cantidad_produccion` field for production demand tracking)
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

#### React Hydration Safety
- **useHydration Hook** (`/src/hooks/use-hydration.ts`) - Prevents server/client mismatches
- **AuthContext** - Only runs auth operations after client hydration
- **ProductosContext** - Waits for hydration before sessionStorage access and financial calculations
- **LayoutWrapper** - Shows loading state until hydration and auth are ready

### Production Management System
The production module includes sophisticated allocation and fulfillment tracking:

#### Production Stages Flow
1. **Pedidos** → **Bitácora** (manual selection) → **Por Detallar** → **Detallado** → **Sancocho** → **Terminado** (manufacturing stages)
2. **Terminado** → **Empaque** → **Entregado** (fulfillment stages)

#### Manual Bitácora Process
- **Status Change**: When moving cotización to "producción" status, products are NO LONGER automatically added to bitácora
- **Manual Selection**: Users must manually select products in the Pedidos section to add them to bitácora
- **Selection Criteria**: Only products with available moldes can be selected (checkbox only appears for products with moldes > 0)
- **Move to Producción Activa**: Selected products are processed using the "Mover a Producción Activa" dialog which calls `/api/production/process-cotizaciones-manual`

#### Key Production Components
- **Pedidos Section** (`/src/components/produccion/pedidos-section.tsx`)
  - View all products from cotizaciones in "producción" status
  - Cotización-level selection system with inventory analysis
  - "Mover a Producción Activa" dialog for smart allocation (direct to empaque or to production queue)
  - Integration with moldes availability checking and terminado inventory

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
- **`/api/production/process-cotizaciones-manual`** - Smart allocation processing: moves products with terminado inventory directly to empaque, remaining to production queue (bitácora)
- **`/api/production/clientes-activos/[cotizacionId]`** - Fetch quotation details with production status
- **`/api/production/empaque`** - Manage empaque allocations (POST: move to empaque, GET: view empaque products, DELETE: return to terminado, PATCH: update box counts)
- **`/api/production/enviados`** - Manage delivery allocations with auto-completion logic

#### Production Quantity Management
- **Dual Quantity System**:
  - `cantidad` - Original cotización quantity (preserved for billing/finance)
  - `cantidad_produccion` - Actual production demand (accounts for breakage, partial completion, etc.)
- **Smart Fallback**: System uses `cantidad_produccion` when available, falls back to `cantidad` for legacy records
- **Production Planning**: All production APIs (pedidos, cronograma, clientes-activos) use production quantities
- **Financial Integrity**: Original quantities preserved for billing and contract purposes

#### Allocation Logic
- **Smart Validation**: Products can only be allocated up to their production quantity
- **Partial Allocations**: Support for moving products in batches (e.g., 10 out of 15 pieces)
- **Global Stock Awareness**: Considers both quotation limits and actual available terminado stock
- **Auto-Completion**: Automatically marks quotations as 'enviada' when all products are fully delivered
- **Demand Calculation**: Pedidos column shows net unfulfilled demand (production ordered - allocated), preventing over-production
- **Box Tracking**: Complete preservation of packaging information across empaque → entregado stages

#### Database Tables (Production-Specific)
- `production_active` - Current production status for all products (por_detallar, detallado, sancocho, terminado)
- `production_allocations` - Tracks product movement through empaque and entregado stages with box counts
- `production_queue` - Production scheduling and planning queue
- `production_active_with_gap` - View that calculates net unfulfilled demand (pedidos - allocated)
- Migration `005_add_allocation_constraints.sql` - Allocation tracking and constraint validation
- Migration `006_create_production_active_with_gap_view.sql` - Smart demand calculation view

### Finance Module Features
The finance module includes comprehensive financial tracking with five main sections:

#### Accounts Receivable (Cuentas por Cobrar)
- **Component**: `/src/components/finanzas/cuentas-por-cobrar-section.tsx`
- **API Endpoint**: `/src/app/api/finanzas/cuentas-por-cobrar/route.ts`
- **Server Actions**: `getAccountsReceivableMetrics()`, `getAccountsReceivableList()`, `markBadDebt()` in `/src/app/actions/finanzas-actions.ts`
- **Features**:
  - Track outstanding balances from approved quotations
  - Monitor overdue accounts (>30 days, 15-30 days, <15 days)
  - Client contact information display
  - Pagination and filtering by month/year
  - **Bad Debt Management**: Mark unpayable quotations as bad debt
  - Optimized RPC functions for complex SQL queries

#### Bad Debt Management System
- **Database Field**: `deuda_incobrable` BOOLEAN in `cotizaciones` table
- **Component**: `/src/components/finanzas/bad-debt-confirmation-dialog.tsx`
- **API Endpoint**: `/src/app/api/cotizaciones/[id]/bad-debt/route.ts`
- **Business Logic**:
  - Removes quotations from accounts receivable calculations without affecting payment records
  - Preserves financial data integrity (no fake payments added)
  - Provides clear audit trail of bad debt decisions
  - Action is reversible through quotation management
- **UI Features**:
  - Red trash icon button in accounts receivable table
  - Simple confirmation dialog with quotation details
  - Loading states and error handling
  - Automatic data refresh after operations

#### Database Functions (Accounts Receivable)
- **`get_accounts_receivable_metrics()`** - Calculate aggregate metrics (total outstanding, client count, overdue accounts)
- **`get_accounts_receivable_list()`** - Paginated list of outstanding accounts with client details
- **`get_accounts_receivable_count()`** - Total count for pagination
- **Note**: Uses RPC functions because PostgREST doesn't support column-to-column comparisons (`total > monto_pagado`)
- **Bad Debt Exclusion**: All functions automatically exclude quotations marked as `deuda_incobrable = TRUE`

#### Cash Flow Metrics (Ventas Tab)
- **Component**: `/src/components/finanzas/cash-flow-section.tsx`
- **Server Actions**: `getCashFlowMetrics()`, `getCotizacionPayments()` in `/src/app/actions/finanzas-actions.ts`
- **Features**:
  - **Cotizaciones Vendidas**: Total value of cotizaciones that have received payments
  - **Pagos Recibidos**: Actual payments received from sold cotizaciones (includes NULL handling for `monto_mxn`)
  - **Pendiente por Cobrar**: Outstanding amount from sold cotizaciones
  - **Tasa de Cobranza**: Collection rate percentage (payments received / total sold value)
- **Business Logic**: "Sold cotizaciones" = cotizaciones with payments (not all approved/production cotizaciones)
- **Data Integrity Fix**: Handles NULL `monto_mxn` values by falling back to `monto` for MXN payments

### User Management and Access Control System
The application includes a comprehensive role-based access control (RBAC) system:

#### User Roles
- **Super Admin** (`adolfo@heyaylabs.com`) - Full system access, cannot be deleted, manages all users
- **Admin** - Can manage regular users, access to assigned modules 
- **User** - Basic access to assigned modules only

#### Access Control Features
- **Module-Level Permissions**: Granular control over Dashboard, Cotizaciones, Producción, Finanzas, and Admin access
- **Protected Routes**: All main pages use `ProtectedRoute` component for authorization
- **Dynamic Navigation**: Sidebar only shows modules user has permission to access
- **Admin Panel**: Accessible via user icon → "Configuración" (admin/super admin only)

#### Key Admin Components
- **Admin Page** (`/src/app/admin/page.tsx`) - Main configuration interface
- **User Management** (`/src/components/admin/user-management.tsx`) - Add/edit/delete users and permissions
- **Protected Route** (`/src/components/protected-route.tsx`) - Route authorization wrapper
- **Permissions Hook** (`/src/hooks/use-permissions.tsx`) - Client-side permission checking

#### Database Tables (User Management)
- `user_profiles` - User roles and permissions with RLS policies
- **Functions**: `is_admin_user()`, `is_super_admin_user()` for permission checking
- **Trigger**: `create_user_profile()` automatically creates profiles for new auth users
- **Migrations**: `add_user_roles_and_permissions`, `fix_user_profile_trigger_security`, `fix_infinite_recursion_rls`

#### Authentication Flow & Invitation System
The application uses a sophisticated Supabase Auth setup with invitation flow:

- **Auth Context** (`/src/contexts/auth-context.tsx`) - Manages authentication state with hydration safety
- **Layout Wrapper** (`/src/components/layout-wrapper.tsx`) - Conditionally renders sidebar based on auth state
- **Hydration Hook** (`/src/hooks/use-hydration.ts`) - Prevents SSR/CSR mismatches in auth flow

##### Invitation Flow
1. **Admin Creates User** → `/src/app/actions/admin-actions.ts` calls `inviteUserByEmail()`
2. **User Clicks Email Link** → Routes to `/src/app/auth/callback/route.ts` 
3. **Token Verification** → Handles both PKCE and token_hash flows
4. **Password Creation** → `/src/app/reset-password/confirm/page.tsx`
5. **Auto-Login** → New users redirect directly to dashboard, existing users to login

##### Key Authentication Components
- **Auth Callback** (`/src/app/auth/callback/route.ts`) - Handles invitation tokens and PKCE flow
- **Login Page** (`/src/app/login/page.tsx`) - Sign-in with success message handling
- **Password Reset** (`/src/app/reset-password/confirm/page.tsx`) - Password creation with user detection
- **Admin Actions** (`/src/app/actions/admin-actions.ts`) - User creation and invitation sending

##### Production Configuration Requirements
- **Supabase Dashboard** → **Settings** → **Authentication**
  - **Site URL**: `https://funny-kitchen.vercel.app`
  - **Redirect URLs**: `https://funny-kitchen.vercel.app/**`
- **Environment Variables**:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` 
  - `SUPABASE_SERVICE_ROLE_KEY` (for admin operations)
  - `NEXT_PUBLIC_APP_URL` (for invitation redirects)

### Important File Locations
- Database migrations: `/database/migrations/`
- API endpoints: `/src/app/api/`
- Supabase config: `/src/lib/supabase/`
- UI components: `/src/components/ui/`
- Production components: `/src/components/produccion/`
- Finance components: `/src/components/finanzas/`
- Admin components: `/src/components/admin/`
- Application constants: `/src/lib/constants.ts`

## Security and Authentication Best Practices

### Next.js 15 Dynamic Route Patterns
All dynamic API routes must use the new async params pattern:

```typescript
// ❌ OLD PATTERN (Next.js 14 and below)
export async function GET(
  request: NextRequest,
  { params: { id } }: { params: { id: string } }
) {
  // Direct usage - causes warnings in Next.js 15
  const cotizacionId = id;
}

// ✅ NEW PATTERN (Next.js 15)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Must await params first
  const { id } = await params;
  const cotizacionId = id;
}
```

### Authentication Security Guidelines

#### Supabase Auth Best Practices

**❌ AVOID `getSession()` - Security Risk:**
```typescript
// Insecure - data comes directly from cookies
const { data: { session } } = await supabase.auth.getSession();
const user = session?.user; // ⚠️ May not be authentic
```

**✅ USE `getUser()` - Secure:**
```typescript
// Secure - validates with Supabase Auth server
const { data: { user }, error } = await supabase.auth.getUser();
// User data is authenticated by the server
```

#### Route Protection Patterns

**All pages requiring authentication must use `ProtectedRoute` wrapper:**

```typescript
// ✅ CORRECT - Explicit protection
export default function SomePage() {
  return (
    <ProtectedRoute requiredModule="cotizaciones">
      <SomePageContent />
    </ProtectedRoute>
  );
}

// ✅ CORRECT - Admin-only pages
export default function AdminPage() {
  return (
    <ProtectedRoute requireAdmin={true}>
      <AdminPageContent />
    </ProtectedRoute>
  );
}

// ✅ CORRECT - Super admin only
export default function SuperAdminPage() {
  return (
    <ProtectedRoute requireSuperAdmin={true}>
      <SuperAdminPageContent />
    </ProtectedRoute>
  );
}
```

#### Protected Route Coverage

**All pages are properly protected:**
- ✅ `/dashboard/**` - Requires dashboard permission
- ✅ `/cotizaciones/**` - Requires cotizaciones permission  
- ✅ `/produccion` - Requires produccion permission
- ✅ `/dashboard/finanzas` - Requires finanzas permission
- ✅ `/admin` - Requires admin role
- ✅ `/nueva-cotizacion` - Requires cotizaciones permission

#### API Route Security

**Server-side authentication for API routes:**
```typescript
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  
  // ✅ Verify user authentication
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // ✅ Check user permissions if needed
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, permissions')
    .eq('email', user.email)
    .single();
    
  // Continue with authorized logic...
}
```

### Currency Conversion Best Practices

#### Consistent Precision Handling
Always use consistent rounding for currency conversions:

```typescript
// ✅ CORRECT - Frontend and backend use same precision
const convertMXNtoUSD = (amountMXN: number): number => {
  if (!exchangeRate) return amountMXN;
  return Number((amountMXN / exchangeRate).toFixed(2));
};

// ✅ CORRECT - API routes match frontend precision
if (data.moneda === 'USD' && exchangeRate && exchangeRate > 0) {
  displaySubtotal = Number((subtotalMXN / exchangeRate).toFixed(2));
  displayCostoEnvio = Number((costoEnvioMXN / exchangeRate).toFixed(2));
  displayTotal = Number((totalMXN / exchangeRate).toFixed(2));
}
```

### Code Review Security Checklist

Before deploying changes, verify:

1. ✅ All dynamic routes use `await params` pattern
2. ✅ All pages have appropriate `ProtectedRoute` wrappers
3. ✅ API routes validate user authentication
4. ✅ Currency calculations use consistent precision
5. ✅ No direct usage of `getSession()` for security-critical operations
6. ✅ User permissions are checked server-side for sensitive operations
7. ✅ No hardcoded credentials or API keys in client code

### Performance Optimization Notes

#### Hydration Safety
- Use `useHydration()` hook to prevent SSR/CSR mismatches
- AuthContext waits for hydration before auth operations
- ProductosContext waits for hydration before sessionStorage access

#### Loading States
- Always show loading states during authentication checks
- Use skeleton components during data fetching
- Implement proper error boundaries for auth failures
# Design Document

## Overview

This design implements a comprehensive production management system that replicates the Excel-based workflow currently used by the business. The system will extend the existing `/produccion` page with three main sections: Pedidos (Orders listing), Producción (existing production tracking), and Clientes Activos (client-specific order tracking). The design maintains the existing "Producción Activa" functionality while adding the missing components to complete the production management workflow.

## Architecture

### Page Structure
The `/produccion` page will be restructured to include multiple sections accessible via tabs or navigation:

1. **Planificación** (existing) - Contains the current "Producción Activa" section
2. **Pedidos** (new) - Comprehensive orders listing
3. **Producción** (new) - Enhanced production tracking (may replace or complement existing)
4. **Clientes Activos** (new) - Client-specific order search and tracking

### Data Flow
```mermaid
graph TD
    A[Database Tables] --> B[API Endpoints]
    B --> C[React Components]
    C --> D[UI Sections]
    
    A1[cotizaciones] --> B1[/api/production/pedidos]
    A2[cotizacion_productos] --> B1
    A3[productos] --> B1
    A4[clientes] --> B1
    
    A5[production_active] --> B2[/api/production/active]
    
    B1 --> C1[PedidosSection]
    B2 --> C2[ProduccionSection]
    B1 --> C3[ClientesActivosSection]
    
    C1 --> D1[Orders Table]
    C2 --> D2[Production Status Table]
    C3 --> D3[Client Search & Details]
```

## Components and Interfaces

### 1. API Endpoints

#### `/api/production/pedidos`
- **Method**: GET
- **Purpose**: Fetch all orders across cotizaciones
- **Response**: Array of order items with client, product, quantity, date, and price information
- **Query Parameters**: 
  - `status` (optional): Filter by cotizacion status
  - `limit` (optional): Pagination limit

#### `/api/production/clientes-activos/[cotizacionId]`
- **Method**: GET
- **Purpose**: Fetch specific cotizacion details with production status
- **Response**: Cotizacion details with products and their production stage quantities
- **Parameters**: 
  - `cotizacionId`: The cotizacion ID to fetch

### 2. React Components

#### `PedidosSection`
```typescript
interface PedidosData {
  folio: string;
  cliente: string;
  producto: string;
  cantidad: number;
  fecha: string;
  precioVenta: number;
}

interface PedidosSectionProps {
  data: PedidosData[];
  loading: boolean;
  onRefresh: () => void;
}
```

#### `ClientesActivosSection`
```typescript
interface ClienteActivoData {
  cotizacionId: number;
  folio: string;
  cliente: string;
  totalProductos: number;
  precioTotal: number;
  productos: {
    nombre: string;
    cantidad: number;
    fecha: string;
    precioVenta: number;
    precioTotal: number;
    produccionStatus: {
      porDetallar: number;
      detallado: number;
      sancocho: number;
      terminado: number;
    };
  }[];
}
```

#### `ProduccionSection`
- Maintains existing functionality from current production active implementation
- May be enhanced to show additional production metrics

### 3. Database Queries

#### Pedidos Query
```sql
SELECT 
  c.folio,
  cl.nombre as cliente,
  p.nombre as producto,
  cp.cantidad,
  c.fecha_creacion::date as fecha,
  cp.precio_unitario as precio_venta
FROM cotizaciones c
JOIN clientes cl ON c.cliente_id = cl.cliente_id
JOIN cotizacion_productos cp ON c.cotizacion_id = cp.cotizacion_id
JOIN productos p ON cp.producto_id = p.producto_id
WHERE c.estado IN ('aprobada', 'producción', 'pagada')
ORDER BY c.cotizacion_id, p.nombre;
```

#### Clientes Activos Query
```sql
-- Main cotizacion data
SELECT 
  c.cotizacion_id,
  c.folio,
  cl.nombre as cliente,
  c.total,
  COUNT(cp.producto_id) as total_productos
FROM cotizaciones c
JOIN clientes cl ON c.cliente_id = cl.cliente_id
JOIN cotizacion_productos cp ON c.cotizacion_id = cp.cotizacion_id
WHERE c.cotizacion_id = $1
GROUP BY c.cotizacion_id, c.folio, cl.nombre, c.total;

-- Products with production status
SELECT 
  p.nombre as producto,
  cp.cantidad,
  c.fecha_creacion::date as fecha,
  cp.precio_unitario,
  (cp.cantidad * cp.precio_unitario) as precio_total,
  COALESCE(pa.por_detallar, 0) as por_detallar,
  COALESCE(pa.detallado, 0) as detallado,
  COALESCE(pa.sancocho, 0) as sancocho,
  COALESCE(pa.terminado, 0) as terminado
FROM cotizacion_productos cp
JOIN productos p ON cp.producto_id = p.producto_id
JOIN cotizaciones c ON cp.cotizacion_id = c.cotizacion_id
LEFT JOIN production_active pa ON p.producto_id = pa.producto_id
WHERE cp.cotizacion_id = $1
ORDER BY p.nombre;
```

## Data Models

### PedidosTableRow
```typescript
interface PedidosTableRow {
  id: string;
  folio: string;
  cliente: string;
  producto: string;
  cantidad: number;
  fecha: string; // DD-MM-YY format
  precioVenta: number;
}
```

### ClienteActivoDetail
```typescript
interface ClienteActivoDetail {
  cotizacionId: number;
  folio: string;
  cliente: string;
  totalProductos: number;
  precioTotal: number;
  productos: ProductoConEstatus[];
}

interface ProductoConEstatus {
  nombre: string;
  cantidad: number;
  fecha: string;
  precioVenta: number;
  precioTotal: number;
  produccionStatus: ProduccionStatus;
}

interface ProduccionStatus {
  porDetallar: number;
  detallado: number;
  sancocho: number;
  terminado: number;
}
```

## Error Handling

### API Error Responses
- **404**: Cotizacion not found
- **500**: Database connection issues
- **400**: Invalid parameters

### UI Error States
- Loading states for all data fetching operations
- Empty states when no data is available
- Error messages for failed API calls
- Retry mechanisms for transient failures

### Data Validation
- Validate cotizacion ID format before API calls
- Handle missing or null production status data
- Ensure numeric calculations don't result in NaN values

## Testing Strategy

### Unit Tests
- Test API endpoint responses with mock data
- Test React component rendering with various data states
- Test data transformation functions
- Test error handling scenarios

### Integration Tests
- Test complete data flow from database to UI
- Test search functionality in Clientes Activos
- Test data consistency between sections
- Test responsive design across different screen sizes

### End-to-End Tests
- Test navigation between production sections
- Test search and display of specific cotizaciones
- Test data refresh functionality
- Test error recovery scenarios

### Performance Tests
- Test page load times with large datasets
- Test search response times
- Test memory usage with multiple sections active
- Test database query performance

## UI/UX Considerations

### Layout Design
- Use existing design system and components from the current application
- Implement responsive tables that work on mobile devices
- Use consistent spacing and typography
- Maintain visual hierarchy with clear section headers

### Navigation
- Implement tab-based navigation between sections
- Preserve current URL structure for bookmarking
- Add breadcrumb navigation if needed
- Ensure keyboard accessibility

### Data Presentation
- Use consistent date formatting (DD-MM-YY)
- Format currency values consistently
- Use color coding for production status indicators
- Implement sorting and filtering capabilities where appropriate

### User Interactions
- Provide clear feedback for search operations
- Implement loading states for all async operations
- Add tooltips for production status explanations
- Enable export functionality for data tables

## Security Considerations

### Data Access
- Ensure proper authentication for production data access
- Implement role-based access control if needed
- Validate all input parameters to prevent SQL injection
- Use parameterized queries for all database operations

### API Security
- Implement rate limiting for search endpoints
- Validate cotizacion ID ownership if user-specific access is required
- Log access to sensitive production data
- Use HTTPS for all API communications
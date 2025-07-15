# Requirements Document

## Introduction

This feature replicates the Excel-based production management logic that has been working effectively for the user. The system will provide three main sections: Pedidos (Orders), Producción (Production), and Clientes Activos (Active Clients). The goal is to maintain the existing "Producción Activa" section while adding the missing Pedidos and Clientes Activos sections, and potentially improving the existing Cronograma Producción section.

## Requirements

### Requirement 1

**User Story:** As a production manager, I want to view all orders (pedidos) in a comprehensive table, so that I can see all products across all quotations with their details.

#### Acceptance Criteria

1. WHEN I navigate to the Pedidos section THEN the system SHALL display a table with columns: CLIENTE, PRODUCTO, CANTIDAD, FECHA, PRECIO DE VENTA
2. WHEN the table loads THEN the system SHALL show all products from all approved cotizaciones
3. WHEN displaying each row THEN the system SHALL show the cotizacion folio (e.g., "COT 2025-2126"), client name, product name, quantity, creation date, and unit price
4. WHEN multiple products exist in the same cotizacion THEN the system SHALL display each product as a separate row
5. WHEN the data loads THEN the system SHALL sort the entries by cotizacion ID and then by product name

### Requirement 2

**User Story:** As a production manager, I want to maintain the existing Producción Activa section, so that I can continue tracking production stages as currently implemented.

#### Acceptance Criteria

1. WHEN I access the Producción section THEN the system SHALL preserve all existing functionality from the current "Producción Activa" implementation
2. WHEN viewing production data THEN the system SHALL display columns: PIEZA, PEDIDOS, Por Detallar, Detallado, Sancocho, Defectuoso, Terminado, Piezas en Proceso
3. WHEN the production data updates THEN the system SHALL maintain real-time synchronization with the production_active table
4. WHEN calculating totals THEN the system SHALL use the existing computed column logic for piezas_en_proceso

### Requirement 3

**User Story:** As a production manager, I want to search for specific cotizaciones in the Clientes Activos section, so that I can see detailed information about a specific order and its production status.

#### Acceptance Criteria

1. WHEN I navigate to Clientes Activos THEN the system SHALL provide a search input to find cotizaciones by ID or folio
2. WHEN I search for a cotizacion THEN the system SHALL display the total number of products and total price for that cotizacion
3. WHEN displaying cotizacion details THEN the system SHALL show a table with columns: PRODUCTO, CANTIDAD, FECHA, PRECIO DE VENTA, PRECIO CANTIDAD (subtotal)
4. WHEN showing production status THEN the system SHALL display current quantities in each production stage (POR DETALLAR, DETALLADO, SANCOCHO, TERMINADO) for each product in the cotizacion
5. WHEN no cotizacion is found THEN the system SHALL display an appropriate message
6. WHEN the cotizacion has multiple products THEN the system SHALL show each product with its individual production stage quantities

### Requirement 4

**User Story:** As a production manager, I want the system to integrate with existing database tables, so that all data remains consistent with the current production workflow.

#### Acceptance Criteria

1. WHEN fetching order data THEN the system SHALL query cotizaciones, cotizacion_productos, productos, and clientes tables
2. WHEN displaying production status THEN the system SHALL use data from the production_active table
3. WHEN calculating totals THEN the system SHALL use the existing precio_unitario and cantidad fields from cotizacion_productos
4. WHEN filtering data THEN the system SHALL only include cotizaciones with appropriate status (approved, in production, etc.)
5. WHEN displaying dates THEN the system SHALL format them consistently as DD-MM-YY

### Requirement 5

**User Story:** As a production manager, I want the new sections to be integrated into the existing /produccion page structure, so that I can access all production information from one location.

#### Acceptance Criteria

1. WHEN I navigate to /produccion THEN the system SHALL display tabs or sections for: Planificación (existing), Pedidos (new), Producción (existing), Clientes Activos (new)
2. WHEN switching between sections THEN the system SHALL maintain the current page context without full page reloads
3. WHEN accessing any section THEN the system SHALL load data efficiently without impacting other sections
4. WHEN the page loads THEN the system SHALL preserve the existing "Producción Activa" functionality in the Planificación section
5. WHEN implementing new sections THEN the system SHALL follow the existing UI/UX patterns and styling
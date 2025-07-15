# Implementation Plan

- [ ] 1. Create API endpoints for production data
  - Create `/api/production/pedidos` endpoint to fetch all orders across cotizaciones
  - Create `/api/production/clientes-activos/[cotizacionId]` endpoint for specific cotizacion details
  - Implement proper error handling and response formatting for both endpoints
  - _Requirements: 1.1, 1.2, 1.3, 3.2, 3.3, 4.1, 4.3_

- [ ] 2. Implement Pedidos API endpoint
  - Write SQL query to join cotizaciones, cotizacion_productos, productos, and clientes tables
  - Filter cotizaciones by appropriate status (approved, in production, etc.)
  - Format response data with folio, cliente, producto, cantidad, fecha, and precio_venta fields
  - Add pagination support and sorting by cotizacion_id and product name
  - Write unit tests for the endpoint functionality
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 4.1, 4.4_

- [ ] 3. Implement Clientes Activos API endpoint
  - Write SQL queries to fetch cotizacion details and associated products
  - Join with production_active table to get current production stage quantities
  - Calculate total products and total price for the cotizacion
  - Format response with nested product details and production status
  - Handle cases where cotizacion is not found with appropriate 404 response
  - Write unit tests for the endpoint functionality
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 4.2, 4.3_

- [ ] 4. Create TypeScript interfaces and types
  - Define PedidosData interface for orders table data structure
  - Define ClienteActivoData interface for client-specific cotizacion data
  - Define ProductoConEstatus interface for products with production status
  - Define ProduccionStatus interface for production stage quantities
  - Create API response types for both endpoints
  - _Requirements: 4.1, 4.2, 4.3_

- [ ] 5. Implement PedidosSection React component
  - Create component to display orders table with CLIENTE, PRODUCTO, CANTIDAD, FECHA, PRECIO DE VENTA columns
  - Implement data fetching using the pedidos API endpoint
  - Add loading states and error handling for API calls
  - Format dates consistently as DD-MM-YY and currency values
  - Implement table sorting and basic filtering functionality
  - Write unit tests for component rendering and data handling
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 4.5_

- [ ] 6. Implement ClientesActivosSection React component
  - Create search input component for cotizacion ID or folio lookup
  - Implement cotizacion details display with total products and total price
  - Create products table showing PRODUCTO, CANTIDAD, FECHA, PRECIO DE VENTA, PRECIO CANTIDAD columns
  - Add production status display with POR DETALLAR, DETALLADO, SANCOCHO, TERMINADO columns
  - Handle empty search results with appropriate messaging
  - Write unit tests for search functionality and data display
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 4.5_

- [ ] 7. Update production page structure with new sections
  - Modify existing `/produccion` page to include tabbed navigation
  - Add Pedidos and Clientes Activos tabs alongside existing sections
  - Preserve existing "Producción Activa" functionality in Planificación section
  - Implement tab switching without full page reloads
  - Ensure consistent styling with existing UI patterns
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 8. Integrate new components into production page
  - Import and render PedidosSection component in the Pedidos tab
  - Import and render ClientesActivosSection component in the Clientes Activos tab
  - Ensure proper data loading and state management across tabs
  - Implement error boundaries for component error handling
  - Add loading indicators for each section
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 9. Implement responsive design and styling
  - Apply consistent styling using existing design system components
  - Ensure tables are responsive and work on mobile devices
  - Add proper spacing, typography, and visual hierarchy
  - Implement color coding for production status indicators
  - Add hover states and interactive feedback for table rows
  - _Requirements: 4.5, 5.5_

- [ ] 10. Add data refresh and real-time updates
  - Implement refresh functionality for all sections
  - Add automatic data refresh intervals where appropriate
  - Ensure production status data stays synchronized with production_active table
  - Add manual refresh buttons for user-initiated updates
  - Implement optimistic updates where applicable
  - _Requirements: 2.3, 2.4, 5.3_

- [ ] 11. Implement search and filtering functionality
  - Add search capability in Clientes Activos section for cotizacion lookup
  - Implement filtering options in Pedidos section (by client, product, date range)
  - Add sorting capabilities for all table columns
  - Implement debounced search to improve performance
  - Add clear search/filter functionality
  - _Requirements: 3.1, 3.5, 1.5_

- [ ] 12. Add comprehensive error handling and validation
  - Implement proper error states for all API failures
  - Add input validation for search fields
  - Handle edge cases like missing production data gracefully
  - Add retry mechanisms for failed API calls
  - Implement proper loading states for all async operations
  - _Requirements: 3.5, 4.4, 5.3_

- [ ] 13. Write integration tests for complete workflow
  - Test data flow from database queries to UI display
  - Test navigation between production sections
  - Test search functionality with various cotizacion IDs
  - Test error handling scenarios and recovery
  - Test responsive design across different screen sizes
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 3.1, 3.2, 5.1, 5.2_

- [ ] 14. Optimize performance and add caching
  - Implement proper data caching strategies for frequently accessed data
  - Optimize database queries for better performance
  - Add pagination for large datasets in Pedidos section
  - Implement virtual scrolling for large tables if needed
  - Add performance monitoring and logging
  - _Requirements: 1.5, 4.1, 4.2, 5.3_

- [ ] 15. Final testing and deployment preparation
  - Conduct end-to-end testing of all functionality
  - Test with real production data to ensure accuracy
  - Verify that existing "Producción Activa" functionality remains intact
  - Test performance with large datasets
  - Prepare deployment documentation and rollback procedures
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 4.1, 4.2, 4.3, 4.4, 5.1, 5.2, 5.3, 5.4, 5.5_
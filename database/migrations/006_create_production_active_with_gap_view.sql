-- Create production_active_with_gap view that shows net demand
-- This view calculates the correct "pedidos" by subtracting allocated products from total demand

-- Drop the view if it exists (for idempotent migrations)
DROP VIEW IF EXISTS production_active_with_gap;

-- Create the production_active_with_gap view
CREATE VIEW production_active_with_gap AS
SELECT 
    pa.id,
    pa.producto_id,
    p.nombre as producto_nombre,
    p.sku,
    p.precio,
    p.tipo_producto,
    p.moldes_disponibles,
    pa.updated_at,
    -- Calculate net pedidos (total demand minus allocated products)
    GREATEST(0, pa.pedidos - COALESCE(allocated.total_allocated, 0)) as pedidos,
    pa.por_detallar,
    pa.detallado,
    pa.sancocho,
    pa.terminado,
    -- Calculate piezas_en_proceso (unchanged)
    (pa.por_detallar + pa.detallado + pa.sancocho + pa.terminado) as piezas_en_proceso,
    -- Calculate faltan_sobran using net pedidos
    ((pa.por_detallar + pa.detallado + pa.sancocho + pa.terminado) - GREATEST(0, pa.pedidos - COALESCE(allocated.total_allocated, 0))) as faltan_sobran
FROM production_active pa
LEFT JOIN productos p ON pa.producto_id = p.producto_id
LEFT JOIN (
    -- Subquery to calculate total allocated products per product across all stages
    SELECT 
        producto_id,
        SUM(cantidad_asignada) as total_allocated
    FROM production_allocations
    WHERE stage IN ('empaque', 'entregado')  -- Only count products that are "fulfilled"
    GROUP BY producto_id
) allocated ON pa.producto_id = allocated.producto_id;

-- Add comments for documentation
COMMENT ON VIEW production_active_with_gap IS 'Production active view with corrected pedidos calculation that subtracts allocated products from total demand';

-- Create index for better performance (indexes on views are not directly supported, but underlying table indexes will be used)
-- The existing indexes on production_active(producto_id) and production_allocations(producto_id) should provide good performance

-- Log the creation
-- Note: This view will now show the correct net demand in the Pedidos column
-- Products allocated to empaque or entregado stages will be subtracted from the total demand
-- This prevents over-production by showing only the remaining unfulfilled demand
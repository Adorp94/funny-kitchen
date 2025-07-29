-- Fix surplus calculation in production_active_with_gap view
-- The current calculation uses total production instead of surplus inventory

-- Drop the existing view
DROP VIEW IF EXISTS production_active_with_gap;

-- Recreate the production_active_with_gap view with corrected surplus calculation
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
    -- FIXED: Calculate faltan_sobran using surplus inventory (terminado - allocated) minus net demand
    -- Positive = surplus available, Negative = deficit (need more production)
    ((pa.terminado - COALESCE(allocated.total_allocated, 0)) - GREATEST(0, pa.pedidos - COALESCE(allocated.total_allocated, 0))) as faltan_sobran
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
COMMENT ON VIEW production_active_with_gap IS 'Production active view with corrected surplus calculation: (terminado - allocated) - net_pedidos. Positive = surplus available, Negative = deficit.';

-- Log the fix
-- The surplus calculation now correctly shows:
-- - Surplus inventory available for new orders (terminado - allocated)
-- - Minus remaining unfulfilled demand (net_pedidos)
-- - Result: Positive values = surplus available, Negative values = deficit requiring more production
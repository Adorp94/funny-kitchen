-- Add allocation constraints to prevent infinite product loops
-- This ensures total allocated products never exceed the original cotización quantity

-- Create function to validate total allocations don't exceed cotización quantity
CREATE OR REPLACE FUNCTION validate_allocation_limit()
RETURNS TRIGGER AS $$
DECLARE
    cotiz_quantity INTEGER;
    current_total INTEGER;
    new_total INTEGER;
BEGIN
    -- Get the original quantity ordered for this product in the cotización
    SELECT cp.cantidad INTO cotiz_quantity
    FROM cotizacion_productos cp
    WHERE cp.cotizacion_id = NEW.cotizacion_id 
    AND cp.producto_id = NEW.producto_id;
    
    -- If no cotización product found, reject the operation
    IF cotiz_quantity IS NULL THEN
        RAISE EXCEPTION 'Product % not found in cotización %', NEW.producto_id, NEW.cotizacion_id;
    END IF;
    
    -- Calculate current total allocated for this product in this cotización (excluding current record for updates)
    SELECT COALESCE(SUM(cantidad_asignada), 0) INTO current_total
    FROM production_allocations
    WHERE cotizacion_id = NEW.cotizacion_id 
    AND producto_id = NEW.producto_id
    AND (TG_OP = 'INSERT' OR id != NEW.id);  -- Exclude current record for updates
    
    -- Calculate what the new total would be
    new_total := current_total + NEW.cantidad_asignada;
    
    -- Check if new total would exceed the cotización quantity
    IF new_total > cotiz_quantity THEN
        RAISE EXCEPTION 'Total allocated quantity (%) would exceed cotización quantity (%) for product % in cotización %', 
            new_total, cotiz_quantity, NEW.producto_id, NEW.cotizacion_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce allocation limits
DROP TRIGGER IF EXISTS trigger_validate_allocation_limit ON production_allocations;
CREATE TRIGGER trigger_validate_allocation_limit
    BEFORE INSERT OR UPDATE ON production_allocations
    FOR EACH ROW
    EXECUTE FUNCTION validate_allocation_limit();

-- Create view to easily check allocation status per cotización
CREATE OR REPLACE VIEW allocation_status AS
SELECT 
    pa.cotizacion_id,
    pa.producto_id,
    p.nombre as producto_nombre,
    cp.cantidad as cantidad_cotizacion,
    COALESCE(SUM(CASE WHEN pa.stage = 'empaque' THEN pa.cantidad_asignada ELSE 0 END), 0) as cantidad_empaque,
    COALESCE(SUM(CASE WHEN pa.stage = 'entregado' THEN pa.cantidad_asignada ELSE 0 END), 0) as cantidad_entregado,
    COALESCE(SUM(pa.cantidad_asignada), 0) as total_asignado,
    (cp.cantidad - COALESCE(SUM(pa.cantidad_asignada), 0)) as cantidad_disponible,
    CASE 
        WHEN COALESCE(SUM(pa.cantidad_asignada), 0) >= cp.cantidad THEN true 
        ELSE false 
    END as limite_alcanzado
FROM cotizacion_productos cp
LEFT JOIN production_allocations pa ON cp.cotizacion_id = pa.cotizacion_id AND cp.producto_id = pa.producto_id
LEFT JOIN productos p ON cp.producto_id = p.producto_id
GROUP BY pa.cotizacion_id, pa.producto_id, p.nombre, cp.cantidad
ORDER BY pa.cotizacion_id, pa.producto_id;

-- Create index for better performance on allocation queries
CREATE INDEX IF NOT EXISTS idx_production_allocations_cotiz_product 
ON production_allocations(cotizacion_id, producto_id, stage);

COMMENT ON FUNCTION validate_allocation_limit() IS 'Ensures total product allocations per cotización never exceed the original ordered quantity';
COMMENT ON VIEW allocation_status IS 'Shows allocation status and limits for each product per cotización';
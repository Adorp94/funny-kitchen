-- Function to generate SKU based on tipo_producto
CREATE OR REPLACE FUNCTION generate_sku(p_tipo_producto TEXT)
RETURNS TEXT AS $$
DECLARE
    next_number INTEGER;
    sku_prefix TEXT;
    new_sku TEXT;
BEGIN
    -- Determine the prefix based on tipo_producto
    IF p_tipo_producto = 'Catálogo' THEN
        sku_prefix := 'FK-';
    ELSIF p_tipo_producto = 'Personalizado' THEN
        sku_prefix := 'FKP-';
    ELSE
        RAISE EXCEPTION 'Invalid tipo_producto: %. Must be "Catálogo" or "Personalizado"', p_tipo_producto;
    END IF;

    -- Get the highest number for this prefix
    SELECT COALESCE(MAX(
        CASE 
            WHEN sku ~ ('^' || sku_prefix || '[0-9]+$') THEN
                CAST(SUBSTRING(sku FROM LENGTH(sku_prefix) + 1) AS INTEGER)
            ELSE 0
        END
    ), 0) + 1
    INTO next_number
    FROM productos
    WHERE sku LIKE sku_prefix || '%';

    -- Also check the temp table to avoid duplicates during batch processing
    SELECT GREATEST(next_number, COALESCE(MAX(
        CASE 
            WHEN sku ~ ('^' || sku_prefix || '[0-9]+$') THEN
                CAST(SUBSTRING(sku FROM LENGTH(sku_prefix) + 1) AS INTEGER)
            ELSE 0
        END
    ), 0) + 1)
    INTO next_number
    FROM productos_temp
    WHERE sku LIKE sku_prefix || '%';

    -- Format the SKU with zero-padding to 3 digits
    new_sku := sku_prefix || LPAD(next_number::TEXT, 3, '0');
    
    RETURN new_sku;
END;
$$ LANGUAGE plpgsql; 
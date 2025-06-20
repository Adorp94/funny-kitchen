-- Function to process productos from temp table to main productos table
CREATE OR REPLACE FUNCTION process_productos_temp()
RETURNS TABLE(
    processed_count INTEGER,
    success_count INTEGER,
    error_count INTEGER,
    errors TEXT[]
) AS $$
DECLARE
    temp_record RECORD;
    next_producto_id INTEGER;
    generated_sku TEXT;
    error_messages TEXT[] := '{}';
    success_counter INTEGER := 0;
    error_counter INTEGER := 0;
    total_processed INTEGER := 0;
BEGIN
    -- Process each unprocessed record in productos_temp
    FOR temp_record IN 
        SELECT * FROM productos_temp 
        WHERE processed = FALSE 
        ORDER BY temp_id
    LOOP
        BEGIN
            -- Get the next producto_id
            SELECT COALESCE(MAX(producto_id), 0) + 1 
            INTO next_producto_id 
            FROM productos;

            -- Generate SKU if not provided or if tipo_producto is set
            IF temp_record.sku IS NULL OR temp_record.sku = '' THEN
                IF temp_record.tipo_producto IS NOT NULL THEN
                    generated_sku := generate_sku(temp_record.tipo_producto);
                ELSE
                    generated_sku := NULL;
                END IF;
            ELSE
                generated_sku := temp_record.sku;
            END IF;

            -- Insert into productos table
            INSERT INTO productos (
                producto_id,
                nombre,
                tipo_ceramica,
                precio,
                sku,
                capacidad,
                unidad,
                tipo_producto,
                colores,
                descripcion,
                cantidad_inventario
            ) VALUES (
                next_producto_id,
                temp_record.nombre,
                temp_record.tipo_ceramica,
                temp_record.precio,
                generated_sku,
                temp_record.capacidad,
                temp_record.unidad,
                temp_record.tipo_producto,
                temp_record.colores,
                temp_record.descripcion,
                temp_record.cantidad_inventario
            );

            -- Update temp record as processed
            UPDATE productos_temp 
            SET processed = TRUE, 
                producto_id = next_producto_id,
                sku = generated_sku
            WHERE temp_id = temp_record.temp_id;

            success_counter := success_counter + 1;

        EXCEPTION WHEN OTHERS THEN
            error_messages := error_messages || (temp_record.temp_id || ': ' || SQLERRM);
            error_counter := error_counter + 1;
        END;

        total_processed := total_processed + 1;
    END LOOP;

    RETURN QUERY SELECT total_processed, success_counter, error_counter, error_messages;
END;
$$ LANGUAGE plpgsql; 
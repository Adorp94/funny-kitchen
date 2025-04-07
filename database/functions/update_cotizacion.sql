CREATE OR REPLACE FUNCTION update_cotizacion(
  p_cotizacion_id INT,
  p_cliente_id INT,
  p_cliente_data JSONB,
  p_productos JSONB,
  p_moneda TEXT,
  p_subtotal DECIMAL,
  p_descuento_global DECIMAL,
  p_iva BOOLEAN,
  p_monto_iva DECIMAL,
  p_incluye_envio BOOLEAN,
  p_costo_envio DECIMAL,
  p_total DECIMAL,
  p_tipo_cambio DECIMAL DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  v_cliente_id INT;
  v_producto JSONB;
BEGIN
  -- Begin transaction
  BEGIN
    -- Update or insert cliente
    IF p_cliente_id IS NULL THEN
      -- Insert new cliente
      INSERT INTO clientes (
        nombre,
        telefono,
        email,
        direccion,
        ciudad,
        estado,
        codigo_postal
      ) VALUES (
        p_cliente_data->>'nombre',
        p_cliente_data->>'telefono',
        p_cliente_data->>'email',
        p_cliente_data->>'direccion',
        p_cliente_data->>'ciudad',
        p_cliente_data->>'estado',
        p_cliente_data->>'codigo_postal'
      )
      RETURNING cliente_id INTO v_cliente_id;
    ELSE
      -- Update existing cliente
      UPDATE clientes
      SET
        nombre = COALESCE(p_cliente_data->>'nombre', nombre),
        telefono = COALESCE(p_cliente_data->>'telefono', telefono),
        email = COALESCE(p_cliente_data->>'email', email),
        direccion = COALESCE(p_cliente_data->>'direccion', direccion),
        ciudad = COALESCE(p_cliente_data->>'ciudad', ciudad),
        estado = COALESCE(p_cliente_data->>'estado', estado),
        codigo_postal = COALESCE(p_cliente_data->>'codigo_postal', codigo_postal)
      WHERE cliente_id = p_cliente_id;
      
      v_cliente_id := p_cliente_id;
    END IF;
    
    -- Update cotizacion
    UPDATE cotizaciones
    SET
      cliente_id = v_cliente_id,
      moneda = p_moneda,
      subtotal = p_subtotal,
      descuento_global = p_descuento_global,
      iva = p_iva,
      monto_iva = p_monto_iva,
      incluye_envio = p_incluye_envio,
      costo_envio = p_costo_envio,
      total = p_total,
      tipo_cambio = p_tipo_cambio,
      fecha_actualizacion = NOW(),
      productos = p_productos
    WHERE cotizacion_id = p_cotizacion_id;
    
    -- Commit the transaction
    RETURN TRUE;
  EXCEPTION
    WHEN OTHERS THEN
      -- Rollback the transaction
      RAISE EXCEPTION 'Error updating cotizacion: %', SQLERRM;
      RETURN FALSE;
  END;
END;
$$ LANGUAGE plpgsql; 
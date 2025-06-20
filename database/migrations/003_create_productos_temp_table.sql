-- Create temporal table for productos upload
CREATE TABLE productos_temp (
    temp_id SERIAL PRIMARY KEY,
    nombre TEXT NOT NULL,
    producto_id INTEGER, -- Will map to the final producto_id
    tipo_ceramica TEXT,
    precio DECIMAL(10, 2) NOT NULL,
    sku TEXT,
    capacidad INTEGER,
    unidad TEXT,
    tipo_producto TEXT,
    colores TEXT,
    descripcion TEXT,
    cantidad_inventario INTEGER DEFAULT 0,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    processed BOOLEAN DEFAULT FALSE
);

-- Add indexes for performance
CREATE INDEX idx_productos_temp_sku ON productos_temp(sku);
CREATE INDEX idx_productos_temp_tipo_producto ON productos_temp(tipo_producto);
CREATE INDEX idx_productos_temp_processed ON productos_temp(processed);

-- Add comments for clarity
COMMENT ON TABLE productos_temp IS 'Temporal table for uploading and processing productos before inserting into main productos table';
COMMENT ON COLUMN productos_temp.producto_id IS 'Will be assigned during processing based on existing productos';
COMMENT ON COLUMN productos_temp.sku IS 'Will be auto-generated based on tipo_producto (FK-### for Catálogo, FKP-### for Personalizado)';
COMMENT ON COLUMN productos_temp.processed IS 'Indicates if this record has been processed and moved to productos table'; 
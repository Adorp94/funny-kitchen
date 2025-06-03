-- Create mesas_moldes table to store information about production tables/stations
CREATE TABLE mesas_moldes (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    numero INTEGER NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create productos_en_mesa table to store which products are assigned to which mesas
CREATE TABLE productos_en_mesa (
    id SERIAL PRIMARY KEY,
    mesa_id INTEGER NOT NULL REFERENCES mesas_moldes(id) ON DELETE CASCADE,
    producto_id INTEGER NOT NULL REFERENCES productos(producto_id) ON DELETE CASCADE,
    cantidad_moldes INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(mesa_id, producto_id) -- Prevent duplicate products in the same mesa
);

-- Create indexes for better performance
CREATE INDEX idx_productos_en_mesa_mesa_id ON productos_en_mesa(mesa_id);
CREATE INDEX idx_productos_en_mesa_producto_id ON productos_en_mesa(producto_id);
CREATE INDEX idx_mesas_moldes_numero ON mesas_moldes(numero);

-- Add comments to tables
COMMENT ON TABLE mesas_moldes IS 'Production tables/stations for mold management';
COMMENT ON TABLE productos_en_mesa IS 'Products assigned to each production mesa with mold quantities';
COMMENT ON COLUMN productos_en_mesa.cantidad_moldes IS 'Number of molds assigned for this product on this mesa';

-- Add update trigger for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_mesas_moldes_updated_at BEFORE UPDATE ON mesas_moldes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_productos_en_mesa_updated_at BEFORE UPDATE ON productos_en_mesa
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 
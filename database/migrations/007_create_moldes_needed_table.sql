-- Create moldes_needed table for tracking which moldes are needed for cotizaciones
-- This table helps users know what moldes need to be added to mesas

CREATE TABLE IF NOT EXISTS moldes_needed (
    id SERIAL PRIMARY KEY,
    cotizacion_folio VARCHAR(50) NOT NULL,
    producto_nombre VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'needed',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    
    -- Ensure unique combination of cotizacion and product
    UNIQUE(cotizacion_folio, producto_nombre)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_moldes_needed_status ON moldes_needed(status);
CREATE INDEX IF NOT EXISTS idx_moldes_needed_cotizacion ON moldes_needed(cotizacion_folio);
CREATE INDEX IF NOT EXISTS idx_moldes_needed_created_at ON moldes_needed(created_at);

-- Add comments for documentation
COMMENT ON TABLE moldes_needed IS 'Tracks which moldes are needed for cotizaciones that have products without moldes available';
COMMENT ON COLUMN moldes_needed.cotizacion_folio IS 'Folio of the cotizacion that needs the molde';
COMMENT ON COLUMN moldes_needed.producto_nombre IS 'Name of the product that needs moldes';
COMMENT ON COLUMN moldes_needed.status IS 'Status: needed, resolved, cancelled';
COMMENT ON COLUMN moldes_needed.notes IS 'Additional notes about the molde requirement';
COMMENT ON COLUMN moldes_needed.resolved_at IS 'When the molde requirement was resolved';

-- Create view for easy querying of active moldes needed
CREATE OR REPLACE VIEW moldes_needed_active AS
SELECT 
    mn.id,
    mn.cotizacion_folio,
    mn.producto_nombre,
    mn.notes,
    mn.created_at,
    -- Calculate days since the request was made
    EXTRACT(DAY FROM (NOW() - mn.created_at)) as days_pending
FROM moldes_needed mn
WHERE mn.status = 'needed'
ORDER BY mn.created_at ASC;

COMMENT ON VIEW moldes_needed_active IS 'Shows active moldes needed requests ordered by creation date';
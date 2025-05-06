-- Create the production_queue table to track manufacturing status
CREATE TABLE production_queue (
    queue_id SERIAL PRIMARY KEY,
    cotizacion_producto_id INTEGER NOT NULL REFERENCES cotizacion_productos(cotizacion_producto_id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES productos(product_id), -- Corrected referenced table name
    qty_total INTEGER NOT NULL, -- Store the original quantity for this item
    qty_pendiente INTEGER NOT NULL, -- Remaining quantity to produce
    premium BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, -- Use the timestamp when the order item was created/added to queue
    eta_start_date DATE, -- Estimated start date of production for this item
    eta_end_date DATE, -- Estimated completion date (vaciado) for this item
    status VARCHAR(20) NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'in_progress', 'done', 'cancelled')) -- Production status
);

-- Add indexes for performance
CREATE INDEX idx_production_queue_status ON production_queue(status);
CREATE INDEX idx_production_queue_created_at ON production_queue(created_at);
CREATE INDEX idx_production_queue_cotizacion_producto_id ON production_queue(cotizacion_producto_id);

-- Add comments for clarity
COMMENT ON TABLE production_queue IS 'Tracks individual order items through the production process.';
COMMENT ON COLUMN production_queue.cotizacion_producto_id IS 'Link to the specific item in the cotizacion.';
COMMENT ON COLUMN production_queue.qty_pendiente IS 'Quantity remaining to be produced for this specific item.';
COMMENT ON COLUMN production_queue.created_at IS 'Timestamp used for production prioritization (FIFO).';
COMMENT ON COLUMN production_queue.eta_start_date IS 'Calculated start date based on queue and capacity.';
COMMENT ON COLUMN production_queue.eta_end_date IS 'Calculated end date for the vaciado stage.';

-- Optional: Add an estimated delivery date field to the main cotizaciones table
-- Adjust or remove if you already have a similar field.
ALTER TABLE cotizaciones
ADD COLUMN estimated_delivery_date DATE;

COMMENT ON COLUMN cotizaciones.estimated_delivery_date IS 'Overall estimated delivery date for the entire order (likely based on the latest eta_end_date + post-processing + shipping).'; 
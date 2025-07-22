-- Add box counts and comments to production_allocations for empaque stage
-- This allows tracking small boxes, large boxes, and comments for packaging

ALTER TABLE production_allocations 
ADD COLUMN cajas_chicas INTEGER DEFAULT 0,
ADD COLUMN cajas_grandes INTEGER DEFAULT 0,
ADD COLUMN comentarios_empaque TEXT;

-- Add indexes for better performance on the new columns
CREATE INDEX IF NOT EXISTS idx_production_allocations_cajas ON production_allocations(cajas_chicas, cajas_grandes) 
WHERE stage = 'empaque';

-- Add check constraints to ensure non-negative box counts
ALTER TABLE production_allocations 
ADD CONSTRAINT check_cajas_chicas_non_negative CHECK (cajas_chicas >= 0),
ADD CONSTRAINT check_cajas_grandes_non_negative CHECK (cajas_grandes >= 0);
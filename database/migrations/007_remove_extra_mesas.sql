-- Migration: Remove extra mesas to keep only 4 (MESA 1-4)
-- This will remove MESA 5, 6, 7, 8, 9, 10
-- The ON DELETE CASCADE will automatically remove all productos_en_mesa records

-- First, let's see what we're about to delete (for logging purposes)
-- Note: In production, you might want to backup this data first

-- Delete mesas with id > 4 (keeping only MESA 1-4)
DELETE FROM mesas_moldes 
WHERE id > 4;

-- Optional: Reset the sequence to continue from 5 if needed in the future
SELECT setval('mesas_moldes_id_seq', 4, true);

-- Add a comment about this change
COMMENT ON TABLE mesas_moldes IS 'Production tables/stations for mold management - Reduced to 4 mesas only';
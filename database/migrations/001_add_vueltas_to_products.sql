-- Add vueltas_max_dia column to productos table
ALTER TABLE productos
ADD COLUMN vueltas_max_dia INTEGER NOT NULL DEFAULT 1;

-- Optional: Add a check constraint if vueltas should be within a specific range (e.g., 1 to 4)
ALTER TABLE productos
ADD CONSTRAINT check_vueltas_range CHECK (vueltas_max_dia >= 1 AND vueltas_max_dia <= 4);

-- Add comment to the column for clarity
COMMENT ON COLUMN productos.vueltas_max_dia IS 'Maximum number of production cycles (vueltas) this product''s mold can handle per day.'; 
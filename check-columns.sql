-- Check column names in cotizaciones table
SELECT column_name FROM information_schema.columns WHERE table_name = 'cotizaciones' ORDER BY ordinal_position;

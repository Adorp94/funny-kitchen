-- Update cotizacion_estado enum to include 'cerrada'
ALTER TYPE public.cotizacion_estado ADD VALUE IF NOT EXISTS 'cerrada';

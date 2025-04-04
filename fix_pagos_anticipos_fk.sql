-- SQL to drop the duplicate foreign key constraints for pagos_anticipos
ALTER TABLE public.pagos_anticipos DROP CONSTRAINT IF EXISTS pagos_anticipos_cotizacion_id_fkey;
ALTER TABLE public.pagos_anticipos DROP CONSTRAINT IF EXISTS fk_cotizacion;

-- SQL to add back a single foreign key constraint
ALTER TABLE public.pagos_anticipos ADD CONSTRAINT pagos_anticipos_cotizacion_id_fkey FOREIGN KEY (cotizacion_id) REFERENCES public.cotizaciones (cotizacion_id) ON DELETE CASCADE;

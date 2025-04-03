-- SQL to drop the duplicate foreign key constraints
ALTER TABLE public.cotizacion_productos DROP CONSTRAINT IF EXISTS fk_producto;
ALTER TABLE public.cotizacion_productos DROP CONSTRAINT IF EXISTS cotizacion_productos_producto_id_fkey;

-- SQL to add back a single foreign key constraint
ALTER TABLE public.cotizacion_productos ADD CONSTRAINT cotizacion_productos_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES public.productos (producto_id) ON DELETE RESTRICT;

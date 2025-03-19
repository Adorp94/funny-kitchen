-- Create enums
CREATE TYPE "moneda" AS ENUM ('MXN', 'USD');
CREATE TYPE "estado_cotizacion" AS ENUM ('pendiente', 'aprobada', 'rechazada', 'expirada');

-- Create clientes table
CREATE TABLE IF NOT EXISTS "clientes" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  "nombre" VARCHAR(255) NOT NULL,
  "email" VARCHAR(255),
  "telefono" VARCHAR(50) NOT NULL,
  "empresa" VARCHAR(255),
  "direccion" TEXT
);

-- Create cotizaciones table
CREATE TABLE IF NOT EXISTS "cotizaciones" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  "titulo" VARCHAR(255) NOT NULL,
  "cliente_id" UUID NOT NULL REFERENCES "clientes"("id") ON DELETE CASCADE,
  "fecha_emision" TIMESTAMP WITH TIME ZONE NOT NULL,
  "fecha_vencimiento" TIMESTAMP WITH TIME ZONE NOT NULL,
  "observaciones" TEXT,
  "tipo_cambio" NUMERIC(10, 2) NOT NULL,
  "estado" "estado_cotizacion" NOT NULL DEFAULT 'pendiente'
);

-- Create productos table
CREATE TABLE IF NOT EXISTS "productos" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "cotizacion_id" UUID NOT NULL REFERENCES "cotizaciones"("id") ON DELETE CASCADE,
  "nombre" VARCHAR(255) NOT NULL,
  "descripcion" TEXT,
  "cantidad" INTEGER NOT NULL,
  "precio_unitario" NUMERIC(10, 2) NOT NULL,
  "moneda" "moneda" NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "clientes_nombre_idx" ON "clientes"("nombre");
CREATE INDEX IF NOT EXISTS "cotizaciones_cliente_id_idx" ON "cotizaciones"("cliente_id");
CREATE INDEX IF NOT EXISTS "cotizaciones_estado_idx" ON "cotizaciones"("estado");
CREATE INDEX IF NOT EXISTS "productos_cotizacion_id_idx" ON "productos"("cotizacion_id");
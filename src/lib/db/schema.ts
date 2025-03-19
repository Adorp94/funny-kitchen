import { integer, pgTable, serial, text, decimal, timestamp } from 'drizzle-orm/pg-core';

export const cotizaciones = pgTable('cotizaciones', {
  cotizacion_id: serial('cotizacion_id').primaryKey(),
  cliente_id: integer('cliente_id').notNull(),
  vendedor_id: integer('vendedor_id').notNull(),
  fecha_cotizacion: timestamp('fecha_cotizacion', { mode: 'string' }).notNull(),
  moneda: text('moneda').notNull(),
  tipo_cambio: decimal('tipo_cambio', { precision: 10, scale: 2 }).notNull(),
  iva: decimal('iva', { precision: 10, scale: 2 }).notNull(),
  tipo_cuenta: text('tipo_cuenta').notNull(),
  descuento_total: decimal('descuento_total', { precision: 10, scale: 2 }).notNull(),
  precio_total: decimal('precio_total', { precision: 10, scale: 2 }).notNull(),
  tiempo_estimado: text('tiempo_estimado').notNull(),
  estatus: text('estatus').notNull(),
  envio: decimal('envio', { precision: 10, scale: 2 }),
  monto_broker: decimal('monto_broker', { precision: 10, scale: 2 }),
  estatus_pago: text('estatus_pago')
});

export const clientes = pgTable('clientes', {
  cliente_id: serial('cliente_id').primaryKey(),
  nombre: text('nombre').notNull(),
  celular: text('celular').notNull(),
  correo: text('correo'),
  razon_social: text('razon_social'),
  rfc: text('rfc'),
  tipo_cliente: text('tipo_cliente'),
  lead: text('lead'),
  direccion_envio: text('direccion_envio'),
  recibe: text('recibe'),
  atencion: text('atencion')
});

export const productos = pgTable('productos', {
  producto_id: serial('producto_id').primaryKey(),
  sku: text('sku'),
  nombre: text('nombre').notNull(),
  tipo_ceramica: text('tipo_ceramica'),
  tipo_producto: text('tipo_producto'),
  descripcion: text('descripcion'),
  colores: text('colores'),
  capacidad: integer('capacidad').notNull(),
  unidad: text('unidad').notNull(),
  precio: decimal('precio', { precision: 10, scale: 2 }).notNull(),
  cantidad_inventario: integer('cantidad_inventario')
});

export const prodsxcotizacion = pgTable('prodsxcotizacion', {
  prodsxc_id: serial('prodsxc_id').primaryKey(),
  cotizacion_id: integer('cotizacion_id').notNull(),
  producto_id: integer('producto_id').notNull(),
  colores: text('colores'),
  descuento: decimal('descuento', { precision: 10, scale: 2 }).notNull(),
  cantidad: integer('cantidad').notNull(),
  precio_final: decimal('precio_final', { precision: 10, scale: 2 }).notNull(),
  acabado: text('acabado'),
  descripcion: text('descripcion'),
  cantidad_etiquetas: integer('cantidad_etiquetas'),
  pu_etiqueta: decimal('pu_etiqueta', { precision: 10, scale: 2 })
});

export const prodsxcot_temp = pgTable('prodsxcot_temp', {
  prodsxc_id: serial('prodsxc_id').primaryKey(),
  cotizacion_id: integer('cotizacion_id').notNull(),
  item: integer('item').notNull(),
  cantidad: integer('cantidad').notNull(),
  descuento: decimal('descuento', { precision: 10, scale: 2 }).notNull(),
  precio_final: decimal('precio_final', { precision: 10, scale: 2 }).notNull(),
  producto_id: integer('producto_id').notNull(),
  nombre: text('nombre'),
  capacidad: integer('capacidad'),
  unidad: text('unidad'),
  colores: text('colores'),
  acabado: text('acabado'),
  descripcion: text('descripcion'),
  cantidad_etiquetas: integer('cantidad_etiquetas'),
  pu_etiqueta: decimal('pu_etiqueta', { precision: 10, scale: 2 })
});

export const colores = pgTable('colores', {
  color_id: serial('color_id').primaryKey(),
  color: text('color').notNull()
});

export const vendedores = pgTable('vendedores', {
  vendedor_id: serial('vendedor_id').primaryKey(),
  nombre: text('nombre').notNull(),
  apellidos: text('apellidos').notNull(),
  correo: text('correo').notNull(),
  telefono: text('telefono').notNull()
});
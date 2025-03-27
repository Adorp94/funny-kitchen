# Funny Kitchen

Una aplicación web para la creación de cotizaciones de cocina y muebles. Esta aplicación proporciona las características esenciales para generar cotizaciones profesionales rápidamente.

## Características

- ✅ **Gestión completa de clientes**: Captura información detallada del cliente con validación de campos y búsqueda de clientes existentes utilizando Supabase.
- ✅ **Gestión de productos**: Agrega y administra productos con cantidad, precio y cálculo automático de subtotales.
- ✅ **Soporte multi-moneda**: Trabaja con precios en MXN o USD según tus necesidades.
- ✅ **Generación de PDF**: Genera cotizaciones profesionales en formato PDF, listas para enviar a tus clientes o imprimir.
- ✅ **Persistencia de datos**: Los datos se guardan en Supabase y temporalmente en el navegador usando sessionStorage.
- ✅ **Diseño responsivo**: Interfaz moderna adaptada a dispositivos móviles y escritorio.

## Configuración Inicial

Para ejecutar este proyecto localmente:

1. Clona el repositorio
2. Crea un archivo `.env.local` en la raíz con las siguientes variables:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```
3. Instala las dependencias:
   ```bash
   npm install
   ```
4. Inicia el servidor de desarrollo:
   ```bash
   npm run dev
   ```

La aplicación estará disponible en [http://localhost:3000](http://localhost:3000).

## Estructura de Base de Datos

La aplicación utiliza Supabase como backend con las siguientes tablas:

### Tabla de Clientes
```sql
create table public.clientes (
  cliente_id integer not null,
  nombre text null,
  celular text null,
  correo text null,
  razon_social text null,
  rfc text null,
  tipo_cliente text null,
  lead text null,
  direccion_envio text null,
  recibe text null,
  atencion text null,
  constraint clientes_pkey primary key (cliente_id)
);
```

## Despliegue en Vercel

### Opción 1: Desplegar desde la Interfaz Web

1. Crea una cuenta en [Vercel](https://vercel.com)
2. Conecta Vercel con tu cuenta de GitHub
3. Importa este repositorio en Vercel
4. Configura las variables de entorno para Supabase
5. Despliega la aplicación automáticamente

### Opción 2: Desplegar usando Vercel CLI

1. Instala Vercel CLI:
   ```
   npm i -g vercel
   ```

2. Inicia sesión en Vercel:
   ```
   vercel login
   ```

3. Despliega el proyecto (desde la raíz del proyecto):
   ```
   vercel
   ```

## Estructura del Proyecto

- **app/**: Páginas de la aplicación
  - **page.tsx**: Página principal
  - **nueva-cotizacion/page.tsx**: Formulario para crear nuevas cotizaciones
  - **ver-cotizacion/page.tsx**: Vista previa de cotización en PDF

- **components/**: Componentes reutilizables
  - **layout/**: Componentes de estructura
  - **ui/**: Componentes de interfaz de usuario 
  - **cotizacion/**: Componentes específicos para cotizaciones
    - **cliente-form.tsx**: Formulario de datos del cliente con validación
    - **producto-simplificado.tsx**: Formulario para agregar productos
    - **lista-productos.tsx**: Tabla para visualizar y administrar productos
    - **pdf-cotizacion.tsx**: Componente para visualizar y generar PDF

- **contexts/**: Gestión de estado
  - **productos-context.tsx**: Contexto para la gestión de productos

- **services/**: Servicios de la aplicación
  - **pdf-service.ts**: Servicio para la generación de PDFs

## Flujo de Trabajo

1. Busca un cliente existente o ingresa la información de un nuevo cliente
2. Agrega productos a la cotización con cantidad y precio
3. Visualiza el resumen de la cotización
4. Genera un PDF profesional de la cotización
5. Descarga o imprime la cotización

## Próximas Características

- 🔄 Gestión completa de productos con catálogo
- 🔄 Sistema completo de cotizaciones con historial
- 🔄 Personalización de plantillas PDF
- 🔄 Autenticación de usuarios

---

Desarrollado con Next.js 14, Tailwind CSS, Supabase y jsPDF.

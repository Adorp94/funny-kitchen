# Funny Kitchen Simplified

Una aplicación web optimizada para la creación de cotizaciones de cocina y muebles. Esta versión simplificada proporciona las características esenciales para generar cotizaciones profesionales rápidamente.

## Características

- ✅ **Formulario de cliente validado**: Captura información del cliente con validación de campos para asegurar datos correctos.
- ✅ **Gestión de productos**: Agrega y administra productos con cantidad, precio y cálculo automático de subtotales.
- ✅ **Soporte multi-moneda**: Trabaja con precios en MXN o USD según tus necesidades.
- ✅ **Generación de PDF**: Genera cotizaciones profesionales en formato PDF, listas para enviar a tus clientes o imprimir.
- ✅ **Persistencia de datos**: Los datos se guardan temporalmente en el navegador usando sessionStorage.
- ✅ **Diseño responsivo**: Interfaz moderna adaptada a dispositivos móviles y escritorio.

## Desarrollo Local

Para ejecutar este proyecto localmente:

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev
```

La aplicación estará disponible en [http://localhost:3000](http://localhost:3000).

## Despliegue en Vercel

### Opción 1: Desplegar desde la Interfaz Web

1. Crea una cuenta en [Vercel](https://vercel.com)
2. Conecta Vercel con tu cuenta de GitHub
3. Importa este repositorio en Vercel
4. Despliega la aplicación automáticamente

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

1. Ingresa la información del cliente con validación de campos
2. Agrega productos a la cotización con cantidad y precio
3. Visualiza el resumen de la cotización
4. Genera un PDF profesional de la cotización
5. Descarga o imprime la cotización

## Próximas Características

- 🔄 Conexión con base de datos para almacenamiento permanente
- 🔄 Gestión completa de productos con catálogo
- 🔄 Sistema completo de cotizaciones con historial
- 🔄 Personalización de plantillas PDF
- 🔄 Autenticación de usuarios

---

Desarrollado con Next.js 14, Tailwind CSS y jsPDF.

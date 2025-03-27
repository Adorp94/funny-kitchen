# Funny Kitchen Simplified

Versión simplificada de la aplicación de cotizaciones Funny Kitchen para demostración y despliegue en Vercel.

## Características

- Formulario básico de creación de cotizaciones
- Persistencia de datos entre navegación con sessionStorage
- Diseño moderno y responsivo
- Simplificado para demostración y testeo

## Desarrollo Local

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev
```

## Despliegue en Vercel

Este proyecto está optimizado para ser desplegado en Vercel. Sigue estos pasos para desplegarlo:

1. Crea una cuenta en [Vercel](https://vercel.com) si no tienes una
2. Instala la CLI de Vercel: `npm install -g vercel`
3. Ejecuta el comando `vercel login` y sigue las instrucciones
4. En la raíz del proyecto, ejecuta `vercel` para desplegar
5. Sigue las instrucciones de la CLI para completar el despliegue

Alternativamente, puedes usar el botón "New Project" en el dashboard de Vercel e importar este repositorio desde GitHub.

## Estructura del Proyecto

- `src/app/` - Páginas de la aplicación
- `src/components/` - Componentes reutilizables
- `src/components/cotizacion/` - Componentes específicos para cotizaciones
- `src/components/ui/` - Componentes de UI básicos

## Próximos Pasos

Esta versión simplificada es el primer paso hacia una aplicación completa. Las próximas fases incluirán:

1. Conectividad con base de datos
2. Gestión de productos
3. Sistema completo de cotizaciones
4. Generación de PDFs
5. Autenticación de usuarios

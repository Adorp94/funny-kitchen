{
  items: [
    {
      title: "Cotizaciones",
      href: "/dashboard/cotizaciones",
      icon: <LayoutGrid className="w-5 h-5" />,
      submenu: [
        {
          title: "Todas las cotizaciones",
          href: "/dashboard/cotizaciones",
        },
        {
          title: "Nueva cotización",
          href: "/dashboard/cotizaciones/nueva",
        },
      ],
    },
    {
      title: "Finanzas",
      href: "/dashboard/finanzas",
      icon: <DollarSign className="w-5 h-5" />,
      submenu: [
        {
          title: "Registro financiero",
          href: "/dashboard/finanzas",
        },
      ],
    },
    // ... other items ...
  ],
} 
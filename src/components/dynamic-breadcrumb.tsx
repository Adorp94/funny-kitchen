"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

interface BreadcrumbConfig {
  [key: string]: {
    title: string;
    href?: string;
  };
}

const breadcrumbConfig: BreadcrumbConfig = {
  "/": { title: "Inicio", href: "/" },
  "/dashboard": { title: "Dashboard", href: "/dashboard" },
  "/dashboard/cotizaciones": { title: "Cotizaciones", href: "/dashboard/cotizaciones" },
  "/dashboard/finanzas": { title: "Finanzas", href: "/dashboard/finanzas" },
  "/produccion": { title: "Producción", href: "/produccion" },
  "/nueva-cotizacion": { title: "Nueva Cotización", href: "/nueva-cotizacion" },
  "/ver-cotizacion": { title: "Ver Cotización", href: "/ver-cotizacion" },
  "/cotizaciones": { title: "Cotizaciones", href: "/cotizaciones" },
  // Dynamic routes patterns
  "edit": { title: "Editar" },
  "pdf": { title: "PDF" },
};

export function DynamicBreadcrumb() {
  const pathname = usePathname();
  
  // Generate breadcrumb items from pathname
  const generateBreadcrumbs = () => {
    const segments = pathname.split("/").filter(Boolean);
    const breadcrumbs: Array<{ title: string; href?: string; isLast: boolean }> = [];
    
    // If we're on dashboard, just show Dashboard
    if (pathname === "/dashboard") {
      breadcrumbs.push({
        title: "Dashboard",
        href: undefined,
        isLast: true
      });
      return breadcrumbs;
    }
    
    // For non-dashboard pages, build breadcrumbs
    let currentPath = "";
    
    segments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      const isLast = index === segments.length - 1;
      
      // Check if this is a dynamic route (contains only numbers)
      const isId = /^\d+$/.test(segment);
      
      if (isId) {
        // For ID segments, show "Detalle" or the previous segment type
        const prevSegment = segments[index - 1];
        if (prevSegment === "cotizaciones") {
          breadcrumbs.push({
            title: `Cotización #${segment}`,
            href: isLast ? undefined : currentPath,
            isLast
          });
        } else {
          breadcrumbs.push({
            title: `ID: ${segment}`,
            href: isLast ? undefined : currentPath,
            isLast
          });
        }
      } else {
        // Regular segments
        const config = breadcrumbConfig[currentPath] || breadcrumbConfig[segment];
        
        if (config) {
          breadcrumbs.push({
            title: config.title,
            href: isLast ? undefined : (config.href || currentPath),
            isLast
          });
        } else {
          // Fallback for unknown segments
          const title = segment
            .split("-")
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ");
          
          breadcrumbs.push({
            title,
            href: isLast ? undefined : currentPath,
            isLast
          });
        }
      }
    });
    
    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();

  // Don't show breadcrumbs on home page
  if (pathname === "/") {
    return null;
  }

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {breadcrumbs.map((breadcrumb, index) => (
          <div key={index} className="flex items-center">
            <BreadcrumbItem>
              {breadcrumb.isLast ? (
                <BreadcrumbPage className="text-sm">
                  {breadcrumb.title}
                </BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link href={breadcrumb.href || "#"} className="text-sm">
                    {breadcrumb.title}
                  </Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
            {!breadcrumb.isLast && (
              <BreadcrumbSeparator className="ml-2 mr-2" />
            )}
          </div>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
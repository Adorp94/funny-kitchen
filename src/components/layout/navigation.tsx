"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, ClipboardList, ChefHat, Users, Settings, Plus, DollarSign } from "lucide-react";
import { Tooltip } from "@/components/ui/tooltip";

const navigation = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Cotizaciones",
    href: "/dashboard/cotizaciones",
    icon: ClipboardList,
  },
  {
    name: "Finanzas",
    href: "/dashboard/finanzas",
    icon: DollarSign,
  },
  // Productos and Clientes modules temporarily disabled
  // {
  //   name: "Productos",
  //   href: "/dashboard/productos",
  //   icon: ChefHat,
  // },
  // {
  //   name: "Clientes",
  //   href: "/dashboard/clientes",
  //   icon: Users,
  // },
  {
    name: "Configuración",
    href: "/dashboard/configuracion",
    icon: Settings,
  },
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col h-full space-y-2 py-2">
      <div className="flex flex-col flex-grow space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href || 
                          (item.href !== "/" && pathname.startsWith(item.href));
          
          return (
            <Tooltip key={item.name} content={item.name} side="right">
              <Link
                href={item.href}
                className={cn(
                  "flex items-center px-2 py-2 text-sm font-medium rounded-md",
                  "transition-colors duration-150 ease-in-out",
                  isActive
                    ? "bg-teal-50 text-teal-500"
                    : "text-gray-700 hover:bg-gray-100"
                )}
              >
                <item.icon className={cn("h-5 w-5", isActive ? "text-teal-500" : "text-gray-400")} />
                <span className="ml-3 hidden lg:inline">{item.name}</span>
              </Link>
            </Tooltip>
          );
        })}
      </div>
      
      <div className="pt-2 border-t border-gray-200">
        <Tooltip content="Nueva cotización" side="right">
          <Link 
            href="/dashboard/cotizaciones/nueva"
            className="inline-flex items-center justify-center w-full rounded-md font-medium bg-teal-500 text-white hover:bg-teal-600 h-10 px-4 py-2 transition-colors"
          >
            <Plus className="h-4 w-4 lg:mr-2" />
            <span className="hidden lg:inline">Nueva cotización</span>
          </Link>
        </Tooltip>
      </div>
    </nav>
  );
}
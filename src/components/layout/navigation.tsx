"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, ClipboardList, ChefHat, Users, Settings } from "lucide-react";

const navigation = [
  {
    name: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    name: "Cotizaciones",
    href: "/cotizaciones",
    icon: ClipboardList,
  },
  {
    name: "Productos",
    href: "/productos",
    icon: ChefHat,
  },
  {
    name: "Clientes",
    href: "/clientes",
    icon: Users,
  },
  {
    name: "Configuración",
    href: "/configuracion",
    icon: Settings,
  },
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col space-y-1">
      {navigation.map((item) => {
        const isActive = pathname === item.href || 
                        (item.href !== "/" && pathname.startsWith(item.href));
        
        return (
          <Link
            key={item.name}
            href={item.href}
            className={cn(
              "flex items-center px-3 py-2 text-sm font-medium rounded-md",
              isActive
                ? "bg-primary/10 text-primary"
                : "text-gray-700 hover:bg-gray-100"
            )}
          >
            <item.icon className={cn("mr-3 h-5 w-5", isActive ? "text-primary" : "text-gray-400")} />
            {item.name}
          </Link>
        );
      })}
      
      <div className="pt-6">
        <Button asChild variant="default" className="w-full justify-start">
          <Link href="/nueva-cotizacion">
            <ClipboardList className="mr-2 h-4 w-4" />
            Nueva cotización
          </Link>
        </Button>
      </div>
    </nav>
  );
}
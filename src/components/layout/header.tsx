"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Menu, User, LogOut } from "lucide-react";

interface HeaderProps {
  toggleSidebar?: () => void;
  isMobile?: boolean;
}

export function Header({ toggleSidebar, isMobile = false }: HeaderProps) {
  const pathname = usePathname();
  
  // Path titles mapping
  const pathTitles: Record<string, string> = {
    "/": "Dashboard",
    "/cotizaciones": "Cotizaciones",
    "/nueva-cotizacion": "Nueva cotización",
    "/productos": "Productos",
    "/clientes": "Clientes",
    "/configuracion": "Configuración",
  };
  
  // Get correct title based on current path
  const getPageTitle = () => {
    if (pathname in pathTitles) {
      return pathTitles[pathname];
    }
    
    if (pathname.startsWith("/cotizaciones/")) {
      return "Detalle de cotización";
    }
    
    return "Funny Kitchen";
  };

  return (
    <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-4 lg:px-6">
      <div className="flex items-center">
        {isMobile && (
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="mr-2 lg:hidden"
          >
            <Menu className="h-6 w-6" />
            <span className="sr-only">Toggle menu</span>
          </Button>
        )}
        
        <div className="flex items-center">
          <Link href="/" className="flex items-center">
            <Image
              src="/logo.png"
              alt="Funny Kitchen"
              width={40}
              height={40}
              className="mr-2"
            />
            <span className="font-bold text-lg hidden sm:inline">Funny Kitchen</span>
          </Link>
          
          <div className="hidden md:flex items-center ml-6">
            <span className="text-gray-400 mx-2">/</span>
            <h1 className="text-lg font-medium">{getPageTitle()}</h1>
          </div>
        </div>
      </div>
      
      <div className="flex items-center">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
              <User className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="flex items-center justify-start gap-2 p-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                <User className="h-4 w-4 text-primary" />
              </div>
              <div className="flex flex-col space-y-0.5">
                <p className="text-sm font-medium">Admin</p>
                <p className="text-xs text-gray-500">admin@funnykitchen.mx</p>
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/configuracion" className="cursor-pointer w-full">
                Configuración
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <LogOut className="mr-2 h-4 w-4" /> 
              <span>Cerrar sesión</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { usePermissions } from '@/hooks/use-permissions';
import {
  LayoutDashboard,
  FileText,
  Factory,
  DollarSign,
  Package,
  Settings,
  ChevronUp,
  User2,
  LogOut
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Navigation groups with permission requirements
const navigationGroups = [
  {
    label: "General",
    items: [
      {
        title: "Dashboard",
        url: "/dashboard",
        icon: LayoutDashboard,
        permission: "dashboard",
      },
    ],
  },
  {
    label: "Operaciones",
    items: [
      {
        title: "Cotizaciones",
        url: "/dashboard/cotizaciones",
        icon: FileText,
        permission: "cotizaciones",
      },
      {
        title: "Producción",
        url: "/produccion",
        icon: Factory,
        permission: "produccion",
      },
    ],
  },
  {
    label: "Gestión",
    items: [
      {
        title: "Finanzas",
        url: "/dashboard/finanzas",
        icon: DollarSign,
        permission: "finanzas",
      },
    ],
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const { hasAccess, isAdmin } = usePermissions();

  return (
    <Sidebar variant="inset">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <Package className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Funny Kitchen</span>
                  <span className="truncate text-xs">Sistema de Producción</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      
      <SidebarContent>
        {navigationGroups.map((group) => {
          // Filter items based on user permissions
          const accessibleItems = group.items.filter(item => 
            hasAccess(item.permission)
          );
          
          // Don't render empty groups
          if (accessibleItems.length === 0) return null;
          
          return (
            <SidebarGroup key={group.label}>
              <SidebarGroupLabel className="text-xs">{group.label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {accessibleItems.map((item) => {
                    const isActive = pathname === item.url || pathname.startsWith(item.url + '/');
                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton 
                          asChild 
                          isActive={isActive}
                          tooltip={item.title}
                        >
                          <Link href={item.url}>
                            <item.icon className="size-4" />
                            <span className="text-sm">{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )
        })}
      </SidebarContent>
      
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                    <User2 className="size-4" />
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">
                      {user?.user_metadata?.full_name || 'Usuario'}
                    </span>
                    <span className="truncate text-xs">
                      {user?.email || 'usuario@funnykitchen.com'}
                    </span>
                  </div>
                  <ChevronUp className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-popper-anchor-width] min-w-56 rounded-lg"
                side="top"
                align="end"
                sideOffset={4}
              >
                {isAdmin() && (
                  <>
                    <DropdownMenuItem className="text-sm" asChild>
                      <Link href="/admin">
                        <Settings className="mr-2 size-4" />
                        <span>Configuración</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem 
                  className="text-sm cursor-pointer"
                  onClick={() => signOut()}
                >
                  <LogOut className="mr-2 size-4" />
                  <span>Cerrar sesión</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
} 
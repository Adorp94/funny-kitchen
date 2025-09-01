"use client";

import { usePermissions } from "@/hooks/use-permissions";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredModule?: string;
  requireAdmin?: boolean;
  requireSuperAdmin?: boolean;
}

export function ProtectedRoute({ 
  children, 
  requiredModule, 
  requireAdmin = false, 
  requireSuperAdmin = false 
}: ProtectedRouteProps) {
  const { hasAccess, isAdmin, isSuperAdmin, loading } = usePermissions();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    // Check super admin requirement
    if (requireSuperAdmin && !isSuperAdmin()) {
      router.push("/dashboard");
      return;
    }

    // Check admin requirement
    if (requireAdmin && !isAdmin()) {
      router.push("/dashboard");
      return;
    }

    // Check module-specific access
    if (requiredModule && !hasAccess(requiredModule)) {
      router.push("/dashboard");
      return;
    }
  }, [loading, hasAccess, isAdmin, isSuperAdmin, requiredModule, requireAdmin, requireSuperAdmin, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Verificando permisos...</p>
        </div>
      </div>
    );
  }

  // Check permissions after loading
  if (requireSuperAdmin && !isSuperAdmin()) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Acceso Denegado</h2>
          <p className="text-muted-foreground">No tienes permisos de super administrador para acceder a esta página.</p>
        </div>
      </div>
    );
  }

  if (requireAdmin && !isAdmin()) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Acceso Denegado</h2>
          <p className="text-muted-foreground">No tienes permisos de administrador para acceder a esta página.</p>
        </div>
      </div>
    );
  }

  if (requiredModule && !hasAccess(requiredModule)) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Acceso Denegado</h2>
          <p className="text-muted-foreground">No tienes acceso a este módulo del sistema.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
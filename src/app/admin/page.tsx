"use client";

import { UserManagement } from "@/components/admin/user-management";
import { ProtectedRoute } from "@/components/protected-route";

export default function AdminPage() {
  return (
    <ProtectedRoute requireAdmin={true}>
      <div className="p-6 max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">Configuración del Sistema</h1>
          <p className="text-muted-foreground">
            Gestiona usuarios y permisos de acceso al sistema
          </p>
        </div>
        
        <UserManagement />
      </div>
    </ProtectedRoute>
  );
}
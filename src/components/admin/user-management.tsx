"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, Plus, Save, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { createUserWithInvite, deleteUserAccount } from "@/app/actions/admin-actions";
import { toast } from "sonner";

interface UserProfile {
  id: string;
  email: string;
  role: "super_admin" | "admin" | "user";
  permissions: {
    dashboard?: boolean;
    cotizaciones?: boolean;
    produccion?: boolean;
    finanzas?: boolean;
    admin?: boolean;
  };
  user_id?: string;
}

interface NewUser {
  email: string;
  role: "admin" | "user";
  permissions: {
    dashboard: boolean;
    cotizaciones: boolean;
    produccion: boolean;
    finanzas: boolean;
    admin: boolean;
  };
}

const modules = [
  { key: "dashboard", label: "Dashboard", description: "Vista general del sistema" },
  { key: "cotizaciones", label: "Cotizaciones", description: "Gestión de cotizaciones y clientes" },
  { key: "produccion", label: "Producción", description: "Sistema de producción y cola" },
  { key: "finanzas", label: "Finanzas", description: "Gestión financiera y cuentas" },
  { key: "admin", label: "Administración", description: "Gestión de usuarios y configuración" }
];

export function UserManagement() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState<NewUser>({
    email: "",
    role: "user",
    permissions: {
      dashboard: true,
      cotizaciones: false,
      produccion: false,
      finanzas: false,
      admin: false
    }
  });

  const supabase = createClient();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Error al cargar usuarios");
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async () => {
    if (!newUser.email) {
      toast.error("El email es requerido");
      return;
    }

    try {
      const result = await createUserWithInvite({
        email: newUser.email,
        role: newUser.role,
        permissions: newUser.permissions
      });

      if (!result.success) {
        toast.error(result.error || "Error al agregar usuario");
        return;
      }

      toast.success("Usuario creado exitosamente. Se ha enviado un email de confirmación.");
      setShowAddUser(false);
      setNewUser({
        email: "",
        role: "user",
        permissions: {
          dashboard: true,
          cotizaciones: false,
          produccion: false,
          finanzas: false,
          admin: false
        }
      });
      fetchUsers();
    } catch (error) {
      console.error("Error adding user:", error);
      toast.error("Error al agregar usuario");
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("¿Estás seguro de que quieres eliminar este usuario?")) {
      return;
    }

    try {
      const result = await deleteUserAccount(userId);

      if (!result.success) {
        toast.error(result.error || "Error al eliminar usuario");
        return;
      }

      toast.success("Usuario eliminado exitosamente");
      fetchUsers();
    } catch (error) {
      console.error("Error deleting user:", error);
      toast.error("Error al eliminar usuario");
    }
  };

  const handleUpdatePermissions = async (userId: string, permissions: any) => {
    try {
      const { error } = await supabase
        .from("user_profiles")
        .update({ permissions, updated_at: new Date().toISOString() })
        .eq("id", userId);

      if (error) throw error;

      toast.success("Permisos actualizados exitosamente");
      fetchUsers();
    } catch (error) {
      console.error("Error updating permissions:", error);
      toast.error("Error al actualizar permisos");
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "super_admin": return "default";
      case "admin": return "secondary";
      case "user": return "outline";
      default: return "outline";
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "super_admin": return "Super Admin";
      case "admin": return "Admin";
      case "user": return "Usuario";
      default: return role;
    }
  };

  if (loading) {
    return <div className="text-center py-8">Cargando usuarios...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Add User Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Gestión de Usuarios</CardTitle>
            <CardDescription>
              Agrega usuarios autorizados y configura sus permisos de acceso
            </CardDescription>
          </div>
          <Button 
            onClick={() => setShowAddUser(true)} 
            disabled={showAddUser}
          >
            <Plus className="w-4 h-4 mr-2" />
            Agregar Usuario
          </Button>
        </CardHeader>
        
        {showAddUser && (
          <CardContent className="border-t">
            <div className="space-y-4 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    placeholder="usuario@ejemplo.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Rol</Label>
                  <select
                    id="role"
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value as "admin" | "user" })}
                    className="w-full px-3 py-2 border border-input rounded-md bg-background"
                  >
                    <option value="user">Usuario</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
              
              <div className="space-y-3">
                <Label>Permisos de Acceso</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {modules.map((module) => (
                    <div key={module.key} className="flex items-start space-x-3">
                      <Checkbox
                        id={`new-${module.key}`}
                        checked={newUser.permissions[module.key as keyof typeof newUser.permissions]}
                        onCheckedChange={(checked) =>
                          setNewUser({
                            ...newUser,
                            permissions: {
                              ...newUser.permissions,
                              [module.key]: !!checked
                            }
                          })
                        }
                      />
                      <div className="space-y-1">
                        <Label htmlFor={`new-${module.key}`} className="font-medium">
                          {module.label}
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          {module.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button onClick={handleAddUser}>
                  <Save className="w-4 h-4 mr-2" />
                  Guardar Usuario
                </Button>
                <Button variant="outline" onClick={() => setShowAddUser(false)}>
                  <X className="w-4 h-4 mr-2" />
                  Cancelar
                </Button>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Users List */}
      <div className="space-y-4">
        {users.map((user) => (
          <Card key={user.id}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold">{user.email}</h3>
                    <Badge variant={getRoleBadgeVariant(user.role)}>
                      {getRoleLabel(user.role)}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Acceso a módulos:</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {modules.map((module) => (
                        <div key={module.key} className="flex items-center space-x-2">
                          <Checkbox
                            id={`${user.id}-${module.key}`}
                            checked={user.permissions[module.key as keyof typeof user.permissions] || false}
                            disabled={user.role === "super_admin"}
                            onCheckedChange={(checked) => {
                              const updatedPermissions = {
                                ...user.permissions,
                                [module.key]: !!checked
                              };
                              handleUpdatePermissions(user.id, updatedPermissions);
                            }}
                          />
                          <Label htmlFor={`${user.id}-${module.key}`} className="text-sm">
                            {module.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                
                {user.role !== "super_admin" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteUser(user.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {users.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No hay usuarios registrados
        </div>
      )}
    </div>
  );
}
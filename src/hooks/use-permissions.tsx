"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { createClient } from "@/lib/supabase/client";

interface UserPermissions {
  role: string;
  permissions: {
    dashboard?: boolean;
    cotizaciones?: boolean;
    produccion?: boolean;
    finanzas?: boolean;
    admin?: boolean;
  };
}

export function usePermissions() {
  const { user, loading: authLoading } = useAuth();
  const [permissions, setPermissions] = useState<UserPermissions | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || authLoading) {
      setLoading(authLoading);
      return;
    }

    const fetchPermissions = async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("user_profiles")
          .select("role, permissions")
          .eq("email", user.email)
          .maybeSingle(); // Use maybeSingle instead of single to handle no rows

        if (error) {
          console.error("Error fetching permissions:", error);
          // Default permissions for users not in the system
          setPermissions({
            role: "user",
            permissions: { dashboard: true } // Give basic dashboard access
          });
          return;
        }

        // If no user profile found, create default permissions
        if (!data) {
          setPermissions({
            role: "user",
            permissions: { dashboard: true } // Give basic dashboard access
          });
          return;
        }

        setPermissions({
          role: data.role,
          permissions: data.permissions || { dashboard: true }
        });
      } catch (error) {
        console.error("Error in fetchPermissions:", error);
        setPermissions({
          role: "user",
          permissions: { dashboard: true } // Give basic dashboard access
        });
      } finally {
        setLoading(false);
      }
    };

    // Only fetch if we don't already have permissions to prevent loops
    if (!permissions) {
      fetchPermissions();
    }
  }, [user, authLoading, permissions]);

  const hasAccess = (module: string): boolean => {
    if (!permissions) return false;
    
    // Super admin has access to everything
    if (permissions.role === "super_admin") return true;
    
    // Check specific permission
    return permissions.permissions[module as keyof typeof permissions.permissions] || false;
  };

  const isAdmin = (): boolean => {
    return permissions?.role === "admin" || permissions?.role === "super_admin";
  };

  const isSuperAdmin = (): boolean => {
    return permissions?.role === "super_admin";
  };

  return {
    permissions,
    loading: loading || authLoading,
    hasAccess,
    isAdmin,
    isSuperAdmin
  };
}
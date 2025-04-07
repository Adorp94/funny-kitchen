"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LogOut, Loader2 } from "lucide-react";
import { useAuth0 } from "@auth0/auth0-react";

export default function LogoutButton({ variant = "default" }: { variant?: "default" | "destructive" | "outline" | "ghost" }) {  
  const { logout } = useAuth0();
  const [loading, setLoading] = useState(false);
  
  const handleLogout = async () => {
    try {
      setLoading(true);
      console.log("[Logout] Starting logout process...");
      
      // Use Auth0's logout to handle everything - only logout from the application, not identity providers
      await logout({
        logoutParams: {
          returnTo: window.location.origin
        }
      });
    } catch (error) {
      console.error("[Logout] Auth0 logout error:", error);
      setLoading(false);
      
      // Fallback to manual redirect if Auth0 logout fails
      window.location.href = '/';
    }
  };
  
  return (
    <Button 
      variant={variant}
      className={variant === "default" ? "bg-red-500 hover:bg-red-600 text-white" : ""}
      onClick={handleLogout}
      disabled={loading}
    >
      {loading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <LogOut className="mr-2 h-4 w-4" />
      )}
      <span className="whitespace-nowrap">
        {loading ? "Cerrando..." : "Cerrar Sesión"}
      </span>
    </Button>
  );
}
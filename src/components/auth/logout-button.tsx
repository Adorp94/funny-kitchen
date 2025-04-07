"use client";

import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export default function LogoutButton({ variant = "default" }: { variant?: "default" | "destructive" | "outline" | "ghost" }) {
  const handleLogout = () => {
    // Redirect to the logout endpoint with returnTo parameter
    window.location.href = '/api/auth/logout?returnTo=/';
  };
  
  return (
    <Button 
      variant={variant}
      className={variant === "default" ? "bg-red-500 hover:bg-red-600 text-white" : ""}
      onClick={handleLogout}
    >
      <LogOut className="mr-2 h-4 w-4" />
      <span className="whitespace-nowrap">Cerrar Sesión</span>
    </Button>
  );
}
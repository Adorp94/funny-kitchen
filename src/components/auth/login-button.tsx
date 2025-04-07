"use client";

import { Button } from "@/components/ui/button";
import { LogIn } from "lucide-react";

export default function LoginButton() {
  const handleLogin = () => {
    // Redirect to Auth0 login with returnTo set to dashboard
    window.location.href = '/api/auth/login?returnTo=/dashboard';
  };
  
  return (
    <Button 
      className="bg-emerald-600 hover:bg-emerald-700 text-white"
      onClick={handleLogin}
    >
      <LogIn className="mr-2 h-4 w-4" />
      <span className="whitespace-nowrap">Iniciar Sesión</span>
    </Button>
  );
} 
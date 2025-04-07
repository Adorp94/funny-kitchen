"use client";

import { Button } from "@/components/ui/button";
import { LogIn } from "lucide-react";
import { useAuth0 } from "@auth0/auth0-react";

export default function LoginButton() {
  const { loginWithRedirect } = useAuth0();
  
  return (
    <Button 
      className="bg-emerald-600 hover:bg-emerald-700 text-white"
      onClick={() => loginWithRedirect()}
    >
      <LogIn className="mr-2 h-4 w-4" />
      <span className="whitespace-nowrap">Iniciar Sesión</span>
    </Button>
  );
} 
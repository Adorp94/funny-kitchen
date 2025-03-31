"use client";

import { Button } from "@/components/ui/button";
import { LogIn } from "lucide-react";

export default function LoginButton() {
  return (
    <Button 
      className="bg-emerald-600 hover:bg-emerald-700 text-white"
      onClick={() => window.location.href = '/api/auth/login'}
    >
      <LogIn className="mr-2 h-4 w-4" />
      <span className="whitespace-nowrap">Iniciar Sesión</span>
    </Button>
  );
} 
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LogIn, Loader2 } from "lucide-react";
import { useAuth0 } from "@auth0/auth0-react";

export default function LoginButton() {
  const { loginWithRedirect } = useAuth0();
  const [loading, setLoading] = useState(false);
  
  const handleLogin = async () => {
    try {
      setLoading(true);
      console.log("Starting login process...");
      
      await loginWithRedirect({
        authorizationParams: {
          redirect_uri: window.location.origin,
        }
      });
    } catch (error) {
      console.error("Login error:", error);
      setLoading(false);
    }
  };
  
  return (
    <Button 
      className="bg-emerald-600 hover:bg-emerald-700 text-white"
      onClick={handleLogin}
      disabled={loading}
    >
      {loading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <LogIn className="mr-2 h-4 w-4" />
      )}
      <span className="whitespace-nowrap">
        {loading ? "Iniciando..." : "Iniciar Sesión"}
      </span>
    </Button>
  );
} 
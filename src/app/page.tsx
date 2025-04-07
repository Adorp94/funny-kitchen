"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useEffect } from "react";
import { ArrowRight } from "lucide-react";
import Image from "next/image";

export default function SignInPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  // Function to redirect to Auth0 login
  const handleSignIn = async () => {
    setLoading(true);
    window.location.href = '/api/auth/login';
  };
  
  return (
    <div className="flex items-center justify-center h-screen bg-white px-4">
      <div className="w-full max-w-md">
        {/* Logo and title */}
        <div className="flex flex-col items-center text-center mb-10">
          <Image 
            src="/logo.png" 
            alt="Funny Kitchen Logo" 
            width={120} 
            height={36} 
            className="h-12 object-contain mb-8" 
          />
          <h1 className="text-3xl font-medium text-gray-900">Welcome to Funny Kitchen</h1>
          <p className="mt-3 text-gray-500">Sign in to manage your business efficiently</p>
        </div>
        
        {/* Sign in buttons */}
        <div className="bg-white rounded-xl">
          <Button 
            onClick={handleSignIn}
            className="w-full h-12 bg-gray-900 hover:bg-gray-800 text-white rounded-lg font-medium transition-colors duration-200"
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white mr-2"></div>
                Signing in...
              </span>
            ) : (
              <span className="flex items-center justify-center">
                Sign in with Auth0
                <ArrowRight className="ml-2 h-4 w-4" />
              </span>
            )}
          </Button>
        </div>
        
        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-sm text-gray-500">
            By continuing, you agree to our{' '}
            <a href="/terms" className="text-gray-900 hover:underline">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="/privacy" className="text-gray-900 hover:underline">
              Privacy Policy
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
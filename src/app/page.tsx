"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ArrowRight } from "lucide-react";
import Image from "next/image";

export default function SignInPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  // Function to redirect to Auth0 login
  const handleSignIn = async () => {
    setLoading(true);
    window.location.href = '/api/auth/login?returnTo=/dashboard';
  };
  
  // Function to redirect to Google login specifically
  const handleGoogleSignIn = async () => {
    setLoading(true);
    // The connection parameter might need to be passed differently depending on your Auth0 version
    window.location.href = '/api/auth/login?connection=google-oauth2&returnTo=/dashboard';
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
        <div className="bg-white rounded-xl space-y-6">
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
                Sign in with Email
                <ArrowRight className="ml-2 h-4 w-4" />
              </span>
            )}
          </Button>
          
          <div className="flex items-center">
            <Separator className="flex-grow bg-gray-200" />
            <span className="px-4 text-sm text-gray-500">or</span>
            <Separator className="flex-grow bg-gray-200" />
          </div>
          
          <Button 
            onClick={handleGoogleSignIn}
            variant="outline"
            className="w-full h-12 border border-gray-300 hover:bg-gray-50 rounded-lg font-medium transition-colors duration-200"
            disabled={loading}
          >
            <svg className="h-5 w-5 mr-3" viewBox="0 0 24 24">
              <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
                <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z"/>
                <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z"/>
                <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z"/>
                <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z"/>
              </g>
            </svg>
            Sign in with Google
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
"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function TestPage() {
  const [mounted, setMounted] = useState(false);
  const [environment, setEnvironment] = useState<Record<string, string>>({});

  useEffect(() => {
    setMounted(true);
    
    // Collect environment info (safe to expose)
    setEnvironment({
      nextPublicAuthDomain: process.env.NEXT_PUBLIC_AUTH0_DOMAIN || "not set",
      clientId: process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID ? "defined" : "not set",
      nodeEnv: process.env.NODE_ENV || "not set",
      url: typeof window !== 'undefined' ? window.location.href : "SSR",
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : "SSR"
    });
  }, []);

  if (!mounted) return <div>Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold mb-4">Test Page</h1>
        <p className="mb-4">
          This is a test page to verify that the basic React rendering is working correctly.
          If you can see this page, then Next.js and React are functioning properly.
        </p>
        
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">Environment Information</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto">
            {JSON.stringify(environment, null, 2)}
          </pre>
        </div>
        
        <div className="space-x-4">
          <Button
            onClick={() => window.location.href = '/'}
            variant="outline"
          >
            Go to Home
          </Button>
          
          <Button onClick={() => alert('UI is working!')}>
            Test JS Interaction
          </Button>
        </div>
      </div>
    </div>
  );
} 
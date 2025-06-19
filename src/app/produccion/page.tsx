"use client";

import React, { useState, useCallback } from 'react';
import { TestingListing } from "@/components/testing/testing-listing";
import { Button } from '@/components/ui/button';
import { RefreshCw, Upload, Factory } from 'lucide-react';
import { toast } from "sonner";

export default function ProduccionPage() {
  const [loading, setLoading] = useState<boolean>(false);

  const handleRefresh = useCallback(() => {
    setLoading(true);
    // This will trigger a refresh in the child component
    setTimeout(() => setLoading(false), 1000);
  }, []);

  return (
    <div className="container mx-auto py-2">
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center space-x-2">
          <Factory className="h-5 w-5 text-gray-600" />
          <h1 className="text-lg font-semibold">Producción - Gestión Integral</h1>
        </div>
        <div className="flex gap-1">
          <Button 
            onClick={handleRefresh} 
            disabled={loading}
            variant="outline"
            size="sm"
            className="h-7 px-2 text-xs"
          >
            <RefreshCw className={`mr-1 h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
          <Button 
            variant="default"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => toast.info("Función de subida por implementar")}
          >
            <Upload className="mr-1 h-3 w-3" />
            Subir Datos
          </Button>
        </div>
      </div>

      <TestingListing key={loading ? Date.now() : 'stable'} />
    </div>
  );
} 
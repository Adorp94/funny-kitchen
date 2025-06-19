"use client";

import React from 'react';
import { TestingListing } from "@/components/testing/testing-listing";
import { MoldesActivos } from "@/components/produccion/moldes-activos";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Factory, Wrench, BarChart3 } from 'lucide-react';

export default function ProduccionPage() {

  return (
    <div className="container mx-auto py-2">
      <div className="flex items-center space-x-2 mb-2">
        <Factory className="h-5 w-5 text-gray-600" />
        <h1 className="text-lg font-semibold">Producción - Gestión Integral</h1>
      </div>

      <Tabs defaultValue="planificacion" className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-8 text-xs">
          <TabsTrigger value="planificacion" className="flex items-center gap-1 text-xs py-1">
            <BarChart3 className="h-3 w-3" />
            Planificación
          </TabsTrigger>
          <TabsTrigger value="moldes" className="flex items-center gap-1 text-xs py-1">
            <Wrench className="h-3 w-3" />
            Moldes Activos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="planificacion" className="mt-2">
          <TestingListing />
        </TabsContent>

        <TabsContent value="moldes" className="mt-2">
          <MoldesActivos />
        </TabsContent>
      </Tabs>
    </div>
  );
} 
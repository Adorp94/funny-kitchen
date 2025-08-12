"use client";

import React from 'react';
import { TestingListing } from "@/components/testing/testing-listing";
import { MoldesActivos } from "@/components/produccion/moldes-activos";
import { InventarioSection } from "@/components/produccion/inventario-section";
import { PedidosSection } from "@/components/produccion/pedidos-section";
import { ClientesActivosSection } from "@/components/produccion/clientes-activos-section";
import { ProduccionActivaSection } from "@/components/produccion/produccion-activa-section";
import { EnviosSection } from "@/components/produccion/envios-section";
import { ProductionActiveListing } from "@/components/testing/production-active-listing";
import { ReviewSectionOptimized } from "@/components/produccion/review-section-optimized";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Factory, Wrench, Package, Users, ClipboardList, Activity, Eye, Truck, Archive } from 'lucide-react';

export default function ProduccionPage() {

  return (
    <div className="space-y-6">
      {/* Clean Header */}
      <div className="space-y-1">
        <h1 className="text-xl font-semibold text-foreground flex items-center">
          <Factory className="mr-2 h-4 w-4 text-muted-foreground" />
          Producción
        </h1>
        <p className="text-sm text-muted-foreground">
          Gestiona pedidos, producción activa y moldes disponibles.
        </p>
      </div>

      <Tabs defaultValue="pedidos" className="w-full">
        <div className="border-b border-border/50">
          <TabsList className="grid w-full grid-cols-6 h-10 bg-background/50 border-0 rounded-none p-0">
            <TabsTrigger 
              value="pedidos" 
              className="flex items-center gap-1.5 text-xs font-medium py-2.5 px-3 rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-blue-50/50 data-[state=active]:text-blue-700 hover:bg-muted/30 transition-colors"
            >
              <ClipboardList className="h-3.5 w-3.5" />
              Pedidos
            </TabsTrigger>
            <TabsTrigger 
              value="produccion-activa" 
              className="flex items-center gap-1.5 text-xs font-medium py-2.5 px-3 rounded-none border-b-2 border-transparent data-[state=active]:border-green-500 data-[state=active]:bg-green-50/50 data-[state=active]:text-green-700 hover:bg-muted/30 transition-colors"
            >
              <Activity className="h-3.5 w-3.5" />
              Bitácora
            </TabsTrigger>
            <TabsTrigger 
              value="clientes-activos" 
              className="flex items-center gap-1.5 text-xs font-medium py-2.5 px-3 rounded-none border-b-2 border-transparent data-[state=active]:border-purple-500 data-[state=active]:bg-purple-50/50 data-[state=active]:text-purple-700 hover:bg-muted/30 transition-colors"
            >
              <Users className="h-3.5 w-3.5" />
              Producción Activa
            </TabsTrigger>
            <TabsTrigger 
              value="moldes" 
              className="flex items-center gap-1.5 text-xs font-medium py-2.5 px-3 rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:bg-orange-50/50 data-[state=active]:text-orange-700 hover:bg-muted/30 transition-colors"
            >
              <Wrench className="h-3.5 w-3.5" />
              Moldes Activos
            </TabsTrigger>
            <TabsTrigger 
              value="inventario" 
              className="flex items-center gap-1.5 text-xs font-medium py-2.5 px-3 rounded-none border-b-2 border-transparent data-[state=active]:border-slate-500 data-[state=active]:bg-slate-50/50 data-[state=active]:text-slate-700 hover:bg-muted/30 transition-colors"
            >
              <Archive className="h-3.5 w-3.5" />
              Moldes
            </TabsTrigger>
            {/* Hidden Revisar Tab */}
            {/* <TabsTrigger 
              value="revisar" 
              className="flex items-center gap-1.5 text-xs font-medium py-2.5 px-3 rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-500 data-[state=active]:bg-indigo-50/50 data-[state=active]:text-indigo-700 hover:bg-muted/30 transition-colors"
            >
              <Eye className="h-3.5 w-3.5" />
              Revisar
            </TabsTrigger> */}
            <TabsTrigger 
              value="envios" 
              className="flex items-center gap-1.5 text-xs font-medium py-2.5 px-3 rounded-none border-b-2 border-transparent data-[state=active]:border-teal-500 data-[state=active]:bg-teal-50/50 data-[state=active]:text-teal-700 hover:bg-muted/30 transition-colors"
            >
              <Truck className="h-3.5 w-3.5" />
              Envíos
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="pedidos" className="mt-6">
          <PedidosSection />
        </TabsContent>

        <TabsContent value="produccion-activa" className="mt-6">
          <ProductionActiveListing />
        </TabsContent>

        <TabsContent value="clientes-activos" className="mt-6">
          <ProduccionActivaSection />
        </TabsContent>

        <TabsContent value="moldes" className="mt-6">
          <MoldesActivos />
        </TabsContent>

        <TabsContent value="inventario" className="mt-6">
          <InventarioSection />
        </TabsContent>

        {/* Hidden Revisar Section - Keep code but make unreachable */}
        {/* <TabsContent value="revisar" className="mt-6">
          <ReviewSectionOptimized />
        </TabsContent> */}

        <TabsContent value="envios" className="mt-6">
          <EnviosSection />
        </TabsContent>
      </Tabs>
    </div>
  );
} 
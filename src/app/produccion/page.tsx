"use client";

import React from 'react';
import { TestingListing } from "@/components/testing/testing-listing";
import { MoldesActivos } from "@/components/produccion/moldes-activos";
import { PedidosSection } from "@/components/produccion/pedidos-section";
import { ClientesActivosSection } from "@/components/produccion/clientes-activos-section";
import { ProductionActiveListing } from "@/components/testing/production-active-listing";
import { ReviewSection } from "@/components/produccion/review-section";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Factory, Wrench, Package, Users, ClipboardList, Activity, Eye } from 'lucide-react';

export default function ProduccionPage() {

  return (
    <div className="container mx-auto py-2">
      <div className="flex items-center space-x-2 mb-2">
        <Factory className="h-5 w-5 text-gray-600" />
        <h1 className="text-lg font-semibold">Producción - Gestión Integral</h1>
      </div>

      <Tabs defaultValue="pedidos" className="w-full">
        <TabsList className="grid w-full grid-cols-5 h-8 text-xs">
          <TabsTrigger value="pedidos" className="flex items-center gap-1 text-xs py-1">
            <ClipboardList className="h-3 w-3" />
            Pedidos
          </TabsTrigger>
          <TabsTrigger value="produccion-activa" className="flex items-center gap-1 text-xs py-1">
            <Activity className="h-3 w-3" />
            Producción Activa
          </TabsTrigger>
          <TabsTrigger value="clientes-activos" className="flex items-center gap-1 text-xs py-1">
            <Users className="h-3 w-3" />
            Clientes Activos
          </TabsTrigger>
          <TabsTrigger value="moldes" className="flex items-center gap-1 text-xs py-1">
            <Wrench className="h-3 w-3" />
            Moldes Activos
          </TabsTrigger>
          <TabsTrigger value="revisar" className="flex items-center gap-1 text-xs py-1">
            <Eye className="h-3 w-3" />
            Revisar
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pedidos" className="mt-2">
          <PedidosSection />
        </TabsContent>

        <TabsContent value="produccion-activa" className="mt-2">
          <ProductionActiveListing />
        </TabsContent>

        <TabsContent value="clientes-activos" className="mt-2">
          <ClientesActivosSection />
        </TabsContent>

        <TabsContent value="moldes" className="mt-2">
          <MoldesActivos />
        </TabsContent>

        <TabsContent value="revisar" className="mt-2">
          <ReviewSection />
        </TabsContent>
      </Tabs>
    </div>
  );
} 
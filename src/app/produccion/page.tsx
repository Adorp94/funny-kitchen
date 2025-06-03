"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { getColumns, ProductionQueueItem } from "@/components/produccion/columns";
import { DataTable } from "@/components/produccion/data-table";
import { MoldesActivos } from "@/components/produccion/moldes-activos";
import { ProductionListing } from "@/components/produccion/production-listing";
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RefreshCw, Calculator, ClipboardList, Wrench, FileText } from 'lucide-react';
import { toast } from "sonner";

// Mock API call - replace with actual fetch
async function getData(): Promise<ProductionQueueItem[]> {
    console.log("Fetching production queue data...");
    // TODO: Implement actual API call to GET /api/production/queue
    // Add filtering, sorting, pagination parameters as needed
    try {
        const response = await fetch('/api/production/queue'); 
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({})); // Try to get error details
            console.error(`API Error Response: ${response.status}`, errorData);
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log("Data received from API:", data);
        // Ensure the response has the expected structure
        return data.queueItems || []; 
    } catch (error) {
        console.error("Failed to fetch production queue data:", error);
        // Re-throw the error so the calling component knows about it
        throw new Error("Error al cargar la cola de producción.");
    }
}

export default function ProduccionPage() {
  const [data, setData] = useState<ProductionQueueItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [recalculating, setRecalculating] = useState<boolean>(false);

  const fetchData = useCallback(async () => {
    console.log("ProduccionPage: fetchData triggered");
    setLoading(true);
    setError(null);
    try {
      const result = await getData();
      setData(result);
    } catch (err: any) {
       console.error("Error in fetchData callback:", err); 
       const errorMsg = err.message || "Error desconocido al cargar la cola de producción.";
       setError(errorMsg);
       toast.error("Error al cargar datos", {
           description: errorMsg,
       });
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRecalculate = useCallback(async () => {
    console.log("ProduccionPage: handleRecalculate triggered");
    setRecalculating(true);
    try {
      const response = await fetch('/api/production/queue/recalculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(`Recalculate API Error Response: ${response.status}`, errorData);
        throw new Error(errorData.error || 'Error al recalcular la cola de producción');
      }

      const result = await response.json();
      console.log("Recalculation successful:", result);
      
      toast.success("Éxito", {
        description: "Cola de producción recalculada correctamente. Las fechas estimadas han sido actualizadas.",
      });

      // Refresh data after successful recalculation
      await fetchData();

    } catch (err: any) {
      console.error("Failed to recalculate queue:", err);
      const errorMsg = err.message || "No se pudo recalcular la cola de producción.";
      toast.error("Error al recalcular", {
        description: errorMsg,
      });
    } finally {
      setRecalculating(false);
    }
  }, [fetchData]);

  const handleStatusUpdate = useCallback(async (queueId: number, newStatus: string) => {
      console.log(`ProduccionPage: handleStatusUpdate called for ${queueId} to ${newStatus}`);
      try {
          const response = await fetch('/api/production/queue', {
              method: 'PATCH',
              headers: {
                  'Content-Type': 'application/json',
              },
              body: JSON.stringify({ queue_id: queueId, status: newStatus }),
          });

          if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
              console.error(`API PATCH Error Response: ${response.status}`, errorData);
              throw new Error(errorData.error || `Error al actualizar estado (HTTP ${response.status})`);
          }

          const result = await response.json();
          console.log("Status update successful:", result);
          toast.success("Éxito", {
              description: `Estado del item ${queueId} actualizado a ${newStatus}.`,
          });

          // Refresh data after successful update
          await fetchData();

      } catch (err: any) {
          console.error("Failed to update status:", err);
          const errorMsg = err.message || "No se pudo actualizar el estado.";
          toast.error("Error al actualizar", {
               description: errorMsg,
           });
      }
  }, [fetchData]);

  // Define a custom error type or a specific error message prefix
  const MOLD_VALIDATION_ERROR_PREFIX = "MoldValidationError:";

  const handleAssignedMoldsChange = useCallback(async (queueId: number, newMolds: number) => {
    console.log(`ProduccionPage: handleAssignedMoldsChange called for queueId ${queueId} to ${newMolds} molds`);
    // No need to find originalMoldsValue here, cell will manage its own state for revert

    try {
      const response = await fetch('/api/production/queue', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ queue_id: queueId, assigned_molds: newMolds }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Error desconocido del servidor." }));
        console.error(`API PATCH (Molds) Error Response: ${response.status}`, errorData); // This log is fine for dev
        
        if (errorData.error && typeof errorData.error === 'string' && errorData.error.includes("no puede exceder los moldes disponibles")) {
            toast.warning("Entrada Inválida", {
                description: errorData.error,
            });
            // Throw a specific error that the cell can catch to revert its state
            throw new Error(MOLD_VALIDATION_ERROR_PREFIX + errorData.error); 
        } else {
            // For other errors, throw to be caught by the generic error handler below
            throw new Error(errorData.error || `Error al actualizar moldes asignados (HTTP ${response.status})`);
        }
        // No 'return;' needed here as we are throwing in all !response.ok cases
      }

      const result = await response.json();
      console.log("Assigned molds update successful:", result);
      toast.success("Éxito", {
        description: `Moldes asignados para el item ${queueId} actualizados a ${newMolds}. La cola se recalculará.`,
      });

      // Refresh data after successful update (recalculation happens server-side)
      await fetchData();

    } catch (err: any) {
      // This catch block will now also catch the MOLD_VALIDATION_ERROR_PREFIX
      // We only want to show a generic error toast if it's NOT our specific validation error.
      if (err.message && err.message.startsWith(MOLD_VALIDATION_ERROR_PREFIX)) {
        // Log for debugging, but the specific toast was already shown and cell should revert.
        console.log("Caught mold validation error in page handler, cell is responsible for reverting its input.");
      } else {
        console.error("Failed to update assigned molds (generic error):", err);
        const errorMsg = err.message || "No se pudo actualizar los moldes asignados.";
        toast.error("Error al actualizar moldes", {
          description: errorMsg,
        });
      }
    }
  }, [fetchData]);

  // Define columns using the function, passing the handler and refetch
  const columns = useMemo(() => getColumns(handleStatusUpdate, handleAssignedMoldsChange, fetchData), [handleStatusUpdate, handleAssignedMoldsChange, fetchData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Gestión de Producción</h1>
      </div>

      <Tabs defaultValue="gestion" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="gestion" className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            Gestión de Producción
          </TabsTrigger>
          <TabsTrigger value="listado" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Listado de Producción
          </TabsTrigger>
          <TabsTrigger value="moldes" className="flex items-center gap-2">
            <Wrench className="h-4 w-4" />
            Moldes Activos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="gestion" className="mt-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Cola de Producción</h2>
            <div className="flex gap-2">
              <Button 
                onClick={handleRecalculate} 
                disabled={recalculating || loading}
                variant="outline"
              >
                <Calculator className={`mr-2 h-4 w-4 ${recalculating ? 'animate-spin' : ''}`} />
                {recalculating ? 'Recalculando...' : 'Recalcular Cola'}
              </Button>
              <Button onClick={fetchData} disabled={loading}>
                  <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  Actualizar
              </Button>
            </div>
          </div>
          {loading && <p className="text-center py-4">Cargando datos...</p>}
          {error && <p className="text-red-500 text-center py-4">{error}</p>}
          {!loading && !error && (
            <div className="overflow-x-auto">
               <DataTable columns={columns} data={data} />
            </div>
          )}
        </TabsContent>

        <TabsContent value="listado" className="mt-6">
          <ProductionListing />
        </TabsContent>

        <TabsContent value="moldes" className="mt-6">
          <MoldesActivos />
        </TabsContent>
      </Tabs>
    </div>
  );
} 
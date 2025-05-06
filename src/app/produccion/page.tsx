"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { getColumns, ProductionQueueItem } from "@/components/produccion/columns";
import { DataTable } from "@/components/produccion/data-table";
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
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

  // Define columns using the function, passing the handler
  const columns = useMemo(() => getColumns(handleStatusUpdate), [handleStatusUpdate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-bold">Gestión de Producción</h1>
        <Button onClick={fetchData} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
        </Button>
      </div>
      {loading && <p className="text-center py-4">Cargando datos...</p>}
      {error && <p className="text-red-500 text-center py-4">{error}</p>}
      {!loading && !error && (
         <DataTable columns={columns} data={data} />
      )}
    </div>
  );
} 
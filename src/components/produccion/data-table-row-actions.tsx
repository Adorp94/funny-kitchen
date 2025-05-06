"use client"

import { DotsHorizontalIcon } from "@radix-ui/react-icons"
import { Row } from "@tanstack/react-table"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner";
import { ProductionQueueItem } from "./columns"; // Import the type

interface DataTableRowActionsProps<TData extends ProductionQueueItem> {
  row: Row<TData>
  refetchData: () => void;
}

// Define valid next statuses based on current status
const possibleNextStatuses: Record<string, string[]> = {
  queued: ['in_progress', 'cancelled'],
  in_progress: ['done', 'cancelled'],
  done: [], // Cannot change from done via this menu
  cancelled: [] // Cannot change from cancelled via this menu
};

const statusLabels: Record<string, string> = {
    queued: "Marcar En Cola",
    in_progress: "Marcar En Progreso",
    done: "Marcar Terminado",
    cancelled: "Marcar Cancelado"
}

export function DataTableRowActions<TData extends ProductionQueueItem>({
  row,
  refetchData
}: DataTableRowActionsProps<TData>) {
  const item = row.original;
  const [isUpdating, setIsUpdating] = useState(false);

  const handleStatusChange = async (newStatus: string) => {
    if (item.status === newStatus || isUpdating) return;
    setIsUpdating(true);
    const toastId = toast.loading(`Cambiando estado a ${newStatus}...`);

    try {
      // Use the specific PATCH endpoint: /api/production/queue/[id]
      const response = await fetch(`/api/production/queue/${item.queue_id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al actualizar estado');
      }

      toast.success("Estado actualizado correctamente.", { id: toastId });
      refetchData(); // Refresh the table data
    } catch (error) {
      console.error("Failed to update status:", error);
      toast.error(error instanceof Error ? error.message : "Error desconocido", { id: toastId });
    } finally {
      setIsUpdating(false);
    }
  };

  const allowedStatuses = possibleNextStatuses[item.status] || [];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex h-8 w-8 p-0 data-[state=open]:bg-muted"
          disabled={isUpdating}
        >
          <DotsHorizontalIcon className="h-4 w-4" />
          <span className="sr-only">Abrir menú</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[160px]">
        <DropdownMenuLabel>Acciones</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => navigator.clipboard.writeText(item.queue_id.toString())}>
          Copiar ID Cola
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Cambiar Estado</DropdownMenuLabel>
        {allowedStatuses.length > 0 ? (
            allowedStatuses.map(statusKey => (
                 <DropdownMenuItem
                     key={statusKey}
                     onClick={() => handleStatusChange(statusKey)}
                     disabled={isUpdating}
                 >
                     {statusLabels[statusKey] || statusKey}
                 </DropdownMenuItem>
            ))
        ) : (
             <DropdownMenuItem disabled>No hay acciones</DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
} 
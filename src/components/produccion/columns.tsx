"use client"

import { ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown, MoreHorizontal, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { useState } from 'react'

// Define the shape of the data we expect for a production queue item
// This should include joined data from related tables
export type ProductionQueueItem = {
  queue_id: number;
  cotizacion_id: number | null; // from joined cotizacion
  folio: string | null; // from joined cotizacion
  cliente_nombre: string | null; // from joined cliente
  producto_id: number | null; // from joined producto
  producto_nombre: string | null; // from joined producto
  qty_total: number;
  qty_pendiente: number;
  status: "queued" | "in_progress" | "done" | "cancelled";
  premium: boolean;
  created_at: string; // ISO String
  eta_start_date: string | null; // YYYY-MM-DD String
  eta_end_date: string | null; // YYYY-MM-DD String
  vueltas_max_dia: number;
}

// Define status mapping for display
const statusMap: { [key: string]: { text: string; className: string } } = {
    queued: { text: "En Cola", className: "bg-gray-200 text-gray-800" },
    in_progress: { text: "En Progreso", className: "bg-blue-200 text-blue-800" },
    done: { text: "Terminado", className: "bg-green-200 text-green-800" },
    cancelled: { text: "Cancelado", className: "bg-red-200 text-red-800" },
};


// Make columns a function that accepts the callback
export const getColumns = (onStatusChange: (queueId: number, newStatus: string) => Promise<void>): ColumnDef<ProductionQueueItem>[] => [
    {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && "indeterminate")
            }
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
          />
        ),
        enableSorting: false,
        enableHiding: false,
      },
  {
    accessorKey: "queue_id",
    header: "ID Cola",
  },
  {
    accessorKey: "folio",
    header: "Folio Cotización",
  },
  {
    accessorKey: "cliente_nombre",
    header: "Cliente",
  },
  {
    accessorKey: "producto_nombre",
    header: "Producto",
  },
  {
    accessorKey: "qty_total",
    header: "Qty Total",
  },
  {
    accessorKey: "qty_pendiente",
    header: "Qty Pendiente",
  },
  {
    accessorKey: "status",
    header: "Estado",
    cell: ({ row }) => {
        const status = row.getValue("status") as string;
        const statusInfo = statusMap[status] || { text: status, className: "bg-gray-100 text-gray-800" };
        return <Badge variant="outline" className={statusInfo.className}>{statusInfo.text}</Badge>;
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id))
      },
  },
  {
    accessorKey: "premium",
    header: "Premium",
    cell: ({ row }) => {
      return row.getValue("premium") ? "Sí" : "No";
    },
  },
  {
    accessorKey: "eta_start_date",
    header: ({
      column,
    }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Inicio Estimado
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
  },
  {
    accessorKey: "eta_end_date",
    header: ({
      column,
    }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Fin Estimado (Vaciado)
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const item = row.original
      const queueId = item.queue_id
      const [isUpdating, setIsUpdating] = useState(false);

      const handleStatusClick = async (newStatus: string) => {
          if (item.status === newStatus || isUpdating) return;
          setIsUpdating(true);
          try {
             console.log(`Calling onStatusChange for ${queueId} to ${newStatus}`);
            await onStatusChange(queueId, newStatus);
          } catch (error) {
             console.error(`Failed to update status for ${queueId}:`, error);
          } finally {
             setIsUpdating(false);
          }
      };
 
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0" disabled={isUpdating}>
              <span className="sr-only">Open menu</span>
              {isUpdating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => navigator.clipboard.writeText(queueId.toString())} disabled={isUpdating}>
              Copiar ID Cola
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Cambiar Estado</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => handleStatusClick('queued')} disabled={item.status === 'queued' || isUpdating}>Marcar En Cola</DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleStatusClick('in_progress')} disabled={item.status === 'in_progress' || isUpdating}>Marcar En Progreso</DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleStatusClick('done')} disabled={item.status === 'done' || isUpdating}>Marcar Terminado</DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleStatusClick('cancelled')} disabled={item.status === 'cancelled' || isUpdating}>Marcar Cancelado</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
] 
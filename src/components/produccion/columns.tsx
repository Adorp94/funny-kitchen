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
import { DataTableColumnHeader } from "@/components/ui/data-table/data-table-column-header"
import { DataTableRowActions } from "./data-table-row-actions"
import { format } from 'date-fns'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

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
  vueltas_max_dia: number; // This might become less relevant or represent max possible for product type
  moldes_disponibles: number; // This is total for product type, used as max for assigned_molds
  assigned_molds: number; // New: Molds assigned to this specific queue item
  vaciado_duration_days: number | null;
}

// Define status mapping for display
const statusMap: { [key: string]: { text: string; className: string } } = {
    queued: { text: "En Cola", className: "bg-gray-200 text-gray-800" },
    in_progress: { text: "En Progreso", className: "bg-blue-200 text-blue-800" },
    done: { text: "Terminado", className: "bg-green-200 text-green-800" },
    cancelled: { text: "Cancelado", className: "bg-red-200 text-red-800" },
};

// Helper to format dates nicely, handling nulls
const formatDateCell = (dateString: string | null | undefined): string => {
  if (!dateString) return "N/A";
  try {
    return format(new Date(dateString), 'dd/MM/yyyy');
  } catch (error) {
    return "Invalid Date";
  }
};

// Make columns a function that accepts the callback
export const getColumns = (
  onStatusChange: (queueId: number, newStatus: string) => Promise<void>,
  onAssignedMoldsChange: (queueId: number, newMolds: number) => Promise<void>,
  refetchData: () => void
): ColumnDef<ProductionQueueItem>[] => [
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
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="ID Cola" />
    ),
    cell: ({ row }) => <div className="text-right font-mono text-sm">{row.getValue("queue_id")}</div>,
    enableSorting: true,
    enableHiding: true,
  },
  {
    accessorKey: "folio",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Folio Cot." />
    ),
    cell: ({ row }) => <div className="min-w-[100px]">{row.getValue("folio")}</div>,
  },
  {
    accessorKey: "cliente_nombre",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Cliente" />
    ),
    cell: ({ row }) => <div className="min-w-[120px]">{row.getValue("cliente_nombre")}</div>,
  },
  {
    accessorKey: "producto_nombre",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Producto" />
    ),
    cell: ({ row }) => {
      const item = row.original;
      const productoNombre = item.producto_nombre ?? 'N/A';
      return (
        <div className="min-w-[150px] font-medium">
          {productoNombre}
        </div>
      );
    },
  },
  {
    accessorKey: "qty_total",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Cant." />
    ),
    cell: ({ row }) => <div className="text-right">{row.getValue("qty_total")}</div>,
    enableSorting: true,
  },
  {
    accessorKey: "qty_pendiente",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Pend." />
    ),
    cell: ({ row }) => <div className="text-right">{row.getValue("qty_pendiente")}</div>,
    enableSorting: true,
  },
  {
    accessorKey: "assigned_molds",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Moldes Asig." />
    ),
    cell: ({ row }) => {
      const item = row.original;
      // Using React.useState for inline editing of assigned_molds
      const [currentMolds, setCurrentMolds] = useState<number | string>(item.assigned_molds ?? '');
      const [isLoading, setIsLoading] = useState(false);

      const handleMoldsInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setCurrentMolds(event.target.value);
      };

      const handleMoldsSave = async () => {
        const newMoldsValue = Number(currentMolds);
        if (currentMolds === '' || isNaN(newMoldsValue) || newMoldsValue <= 0) {
          // Revert to original value or show error and revert
          setCurrentMolds(item.assigned_molds);
          // TODO: Consider showing a toast notification for invalid input
          return;
        }

        if (newMoldsValue !== item.assigned_molds) {
          setIsLoading(true);
          try {
            await onAssignedMoldsChange(item.queue_id, newMoldsValue);
            // refetchData(); // Parent component will call refetchData
          } catch (error) {
            console.error("Failed to update molds:", error);
            setCurrentMolds(item.assigned_molds); // Revert on error
            // TODO: Consider showing a toast notification for the error
          } finally {
            setIsLoading(false);
          }
        }
      };

      return (
        <input
          type="number"
          value={currentMolds}
          onChange={handleMoldsInputChange}
          onBlur={handleMoldsSave} // Save on blur
          onKeyDown={(e) => { if (e.key === 'Enter') handleMoldsSave(); }} // Save on Enter
          className="w-20 text-right p-1 border rounded-md focus:ring-2 focus:ring-blue-500"
          min="1"
          disabled={isLoading}
          // Max validation against product.moldes_disponibles should ideally be handled
          // by the API, but can also be added here if that data is easily available.
        />
      );
    },
    enableSorting: false, // Usually, don't sort by an input field
  },
  {
    accessorKey: "status",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
       let variant: "default" | "secondary" | "outline" | "destructive" = "default";
       if (status === 'in_progress') variant = 'secondary';
       else if (status === 'done') variant = 'default'; // Or success if you add it
       else if (status === 'cancelled') variant = 'destructive';
       else if (status === 'queued') variant = 'outline';

      return (
        <div className="flex justify-center">
          <Badge variant={variant}>{status}</Badge>
        </div>
      )
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    },
  },
  {
    accessorKey: "premium",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Premium" />
    ),
    cell: ({ row }) => (
      <div className="text-center">
        {row.getValue("premium") ? <Badge variant="outline">Sí</Badge> : 'No'}
      </div>
    ),
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    },
  },
  {
    accessorKey: "vaciado_duration_days",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Días Prod. (Calc)" />
    ),
    cell: ({ row }) => {
      const days = row.getValue("vaciado_duration_days") as number | null;
      return <div className="text-right">{days ?? '-'}</div>;
    },
    enableSorting: true,
  },
  {
    accessorKey: "eta_start_date",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="ETA Inicio" />
    ),
    cell: ({ row }) => <div className="text-center">{formatDateCell(row.getValue("eta_start_date"))}</div>,
    enableSorting: true,
  },
  {
    accessorKey: "eta_end_date",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="ETA Fin Vac." />
    ),
    cell: ({ row }) => <div className="text-center">{formatDateCell(row.getValue("eta_end_date"))}</div>,
    enableSorting: true,
  },
  {
    accessorKey: "created_at",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Creado" />
    ),
    cell: ({ row }) => <div className="text-center">{formatDateCell(row.getValue("created_at"))}</div>,
    enableSorting: true,
  },
  {
    id: "actions",
    cell: ({ row }) => <div className="flex justify-center"><DataTableRowActions row={row} refetchData={refetchData} /></div>,
  },
] 
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
  vueltas_max_dia: number;
  moldes_disponibles: number;
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
export const getColumns = (onStatusChange: (queueId: number, newStatus: string) => Promise<void>, refetchData: () => void): ColumnDef<ProductionQueueItem>[] => [
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
      const moldes = item.moldes_disponibles ?? 'N/A';
      const vueltas = item.vueltas_max_dia ?? 'N/A';

      return (
        <TooltipProvider delayDuration={100}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="min-w-[150px] font-medium cursor-help">
                {productoNombre}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Moldes Disp: {moldes}</p>
              <p>Vueltas/Día: {vueltas}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
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
      <DataTableColumnHeader column={column} title="Días Vaciado" />
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
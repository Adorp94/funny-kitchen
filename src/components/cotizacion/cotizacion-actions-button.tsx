"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  CreditCard, 
  Receipt, 
  DollarSign, 
  Wallet, 
  FileEdit, 
  MoreVertical, 
  Download,
  Loader2,
  Edit
} from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { CotizacionStatusModal } from './cotizacion-status-modal';
import { toast } from "sonner";
import { getCotizacionDetails } from '@/app/actions/cotizacion-actions';
import { useRouter } from 'next/navigation';
import { PDFService } from '@/services/pdf-service';
import { supabase } from '@/lib/supabase/client';
import { formatDate } from '@/lib/utils';

interface Cotizacion {
  cotizacion_id: number;
  folio: string;
  fecha_creacion: string;
  estado: string;
  cliente: {
    nombre: string;
    celular?: string;
    correo?: string;
  };
  moneda: string;
  total: number;
  total_mxn?: number;
  estatus_pago?: string;
  iva?: boolean;
  monto_iva?: number;
  incluye_envio?: boolean;
  costo_envio?: number;
  tipo_cambio?: number;
}

interface PaymentFormData {
  monto: number;
  metodo_pago: string;
  porcentaje: number;
  notas: string;
}

interface CotizacionActionsButtonProps {
  cotizacion: Cotizacion;
  onStatusChanged?: () => void;
  buttonSize?: "sm" | "icon" | "default" | "lg";
}

// Function to determine if status can be changed
const canChangeStatus = (currentStatus: string): boolean => {
  return currentStatus?.toLowerCase() === 'pendiente';
};

export function CotizacionActionsButton({ cotizacion, onStatusChanged, buttonSize = "sm" }: CotizacionActionsButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [detailedCotizacion, setDetailedCotizacion] = useState<any>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const router = useRouter();
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);

  const handleOpenModal = async () => {
    setIsLoadingDetails(true);
    try {
      const result = await getCotizacionDetails(cotizacion.cotizacion_id);
      if (result.success) {
        setDetailedCotizacion(result.data);
        setIsModalOpen(true);
      } else {
        toast.error("No se pudo cargar la información de la cotización", { description: result.error });
      }
    } catch (error: any) {
      toast.error("Error al cargar la cotización", { description: error.message });
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleEditCotizacion = () => {
    router.push(`/dashboard/cotizaciones/${cotizacion.cotizacion_id}/edit`);
  };

  const handleDownloadPDF = async () => {
    if (!cotizacion || !cotizacion.cotizacion_id) {
      toast.error("No se puede descargar el PDF", { description: "Falta información de la cotización." });
      return;
    }
    
    setIsDownloading(true);
    const toastId = toast.loading("Preparando descarga...");
    
    try {
      let dataToUse = detailedCotizacion; // Use already fetched details if available
      
      // Fetch details if not already loaded
      if (!dataToUse) {
        toast.info("Cargando detalles de la cotización...", { id: toastId });
        const result = await getCotizacionDetails(cotizacion.cotizacion_id);
        if (result.success) {
          dataToUse = result.data;
          // Optionally store fetched details if needed elsewhere
          // setDetailedCotizacion(result.data); 
        } else {
          throw new Error(result.error || "No se pudieron cargar los detalles para el PDF.");
        }
      }
      
      // Now dataToUse should have the full cotizacion details
      if (!dataToUse || !dataToUse.cliente) {
         throw new Error("Faltan datos de la cotización para generar el PDF.");
      }
      
      toast.info("Generando PDF...", { id: toastId });
      
      // Call the correct PDFService function
      await PDFService.generateReactPDF(
        dataToUse.cliente, 
        dataToUse.folio, 
        dataToUse, // Pass the full cotizacion object
        { download: true } // Ensure it triggers download
      );
      
      toast.success("PDF descargado exitosamente", { id: toastId });
    } catch (error: any) {
      console.error("Error downloading PDF:", error);
      toast.error("Error al descargar el PDF", { id: toastId, description: error.message || "Ocurrió un error inesperado." });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleModalSubmit = async (
    cotizacionId: number,
    newStatus: string,
    _fecha: Date,
    paymentData?: PaymentFormData
  ) => {
    const toastId = toast.loading(`Actualizando estado a "${newStatus}"...`);
    try {
      // Prepare the request body
      const requestBody: { newStatus: string; paymentData?: PaymentFormData } = {
        newStatus: newStatus,
      };
      if (paymentData) {
        requestBody.paymentData = paymentData;
      }

      console.log(`[ActionBtn] Calling API POST /api/cotizaciones/${cotizacionId}/status with body:`, requestBody);

      // Call the API endpoint instead of RPC
      const response = await fetch(`/api/cotizaciones/${cotizacionId}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();

      if (!response.ok) {
        // Use error message from API response if available
        throw new Error(result.error || `Error del servidor: ${response.status}`);
      }

      // Handle successful response
      toast.success(`Estado de ${cotizacion.folio} actualizado a "${newStatus}".`, { 
          id: toastId,
          description: result.estimatedDeliveryDate 
            ? `Fecha estimada de entrega: ${formatDate(result.estimatedDeliveryDate)}` 
            : result.message // Show other messages from API if no ETA
      });
      
      // Close modal and refresh data via callback
      setIsStatusModalOpen(false); // Close the modal on success
      if (onStatusChanged) {
        onStatusChanged(); // Trigger data refresh
      }
      
      return true; // Indicate success

    } catch (error: any) {
      console.error("CotizacionActionsButton: Error updating status via API:", error);
      toast.error(`Error al actualizar estado`, { 
          id: toastId, 
          description: error.message || "Ocurrió un error inesperado."
      });
      return false; // Indicate failure
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size={buttonSize === "sm" ? "icon-sm" : "icon"}
            className="h-8 w-8 p-0 data-[state=open]:bg-muted"
            disabled={isLoadingDetails || isDownloading}
          >
            {isLoadingDetails || isDownloading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <MoreVertical className="h-4 w-4" />
            )}
            <span className="sr-only">Abrir menú</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleEditCotizacion}>
            <FileEdit className="mr-2 h-4 w-4" />
            Editar
          </DropdownMenuItem>
          
          <DropdownMenuItem 
            onClick={() => setIsStatusModalOpen(true)}
            disabled={!canChangeStatus(cotizacion.estado)}
            className="cursor-pointer"
          >
            <Edit className="mr-2 h-4 w-4" />
            <span>Cambiar Estado</span>
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={handleDownloadPDF} disabled={isDownloading}>
            {isDownloading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Descargar PDF
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      
      {isStatusModalOpen && (
        <CotizacionStatusModal
          isOpen={isStatusModalOpen}
          onClose={() => setIsStatusModalOpen(false)}
          cotizacion={{
            cotizacion_id: cotizacion.cotizacion_id,
            folio: cotizacion.folio,
            moneda: cotizacion.moneda,
            total: cotizacion.total
          }} 
          onStatusChange={handleModalSubmit}
        />
      )}
    </>
  );
}

export default CotizacionActionsButton; 
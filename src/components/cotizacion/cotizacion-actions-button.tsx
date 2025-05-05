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
import { updateCotizacionStatus, getCotizacionDetails } from '@/app/actions/cotizacion-actions';
import { useRouter } from 'next/navigation';
import { PDFService } from '@/services/pdf-service';
import { supabase } from '@/lib/supabase/client';

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

// Helper function to handle status change (RPC call)
const handleStatusChange = async (
  cotizacion: Cotizacion, // Pass the full cotizacion object
  newStatus: string,
  fecha: Date, 
  paymentData?: PaymentFormData
) => {
  const fechaISO = fecha.toISOString().split('T')[0];
  const cotizacionId = cotizacion.cotizacion_id; 

  try {
    let rpcResult;
    let rpcName = ''; // Define variables to hold RPC details
    let rpcParams: any = {};

    if (newStatus === 'producción') {
      if (!paymentData) throw new Error("Datos de anticipo requeridos para producción.");
      rpcName = 'aprobar_cotizacion_a_produccion';
      rpcParams = {
        p_cotizacion_id: cotizacionId,
        p_monto_anticipo: paymentData.monto,
        p_metodo_pago: paymentData.metodo_pago,
        p_moneda: cotizacion.moneda, 
        p_tipo_cambio: cotizacion.moneda === 'USD' ? cotizacion.tipo_cambio : null,
        p_fecha_cambio: fechaISO
      };
    } else if (newStatus === 'enviar_inventario') { // ADDED Handling for enviar_inventario
      if (!paymentData) throw new Error("Datos de anticipo requeridos para enviar de inventario.");
      rpcName = 'enviar_cotizacion_de_inventario'; // Use the correct RPC function name
      rpcParams = {
        p_cotizacion_id: cotizacionId,
        p_monto_anticipo: paymentData.monto,
        p_metodo_pago: paymentData.metodo_pago,
        p_moneda: cotizacion.moneda, 
        p_tipo_cambio: cotizacion.moneda === 'USD' ? cotizacion.tipo_cambio : null, 
        p_fecha_cambio: fechaISO
      };
    } else if (newStatus === 'rechazada') {
      rpcName = 'rechazar_cotizacion';
      rpcParams = {
        p_cotizacion_id: cotizacionId,
        p_fecha_cambio: fechaISO
      };
    } else {
      // This error was being thrown because 'enviar_inventario' wasn't handled
      throw new Error(`Estado "${newStatus}" no manejado.`); 
    }

    // Execute the determined RPC call
    console.log(`[ActionBtn] Calling ${rpcName} with params:`, rpcParams);
    const { data, error } = await supabase.rpc(rpcName, rpcParams);
    if (error) throw error;
    rpcResult = data;

    if (rpcResult === true) {
      return true;
    } else {
      throw new Error("La operación falló en la base de datos (RPC devolvió false).");
    }

  } catch (error: any) {
    // This catch block logs the raw error and re-throws a new error with the message
    console.error("Error during status change process (raw error object):", error);
    // const messageFromServer = error?.message || JSON.stringify(error);
    //  const errorMessage = messageFromServer.includes(':')
    //    ? messageFromServer.split(':').pop().trim()
    //    : messageFromServer;
    // Re-throwing just the message might be causing the strange "\"rechazada\"" error if the original error object was unusual
    // Let's try re-throwing the original error object to preserve its structure
    // throw new Error(errorMessage); // Original re-throw
    throw error; // Re-throw the original error
  }
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
    fecha: Date,
    paymentData?: PaymentFormData
  ) => {
    try {
      const success = await handleStatusChange(cotizacion, newStatus, fecha, paymentData);
      if (success) {
        toast.success(`Estado de ${cotizacion.folio} actualizado.`);
        onStatusChanged();
      }
      return success;
    } catch (error: any) {
      console.error("CotizacionActionsButton: Error updating status:", error.message);
      toast.error(`Error al actualizar estado: "${error.message}"`);
      return false;
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setDetailedCotizacion(null);
    if (onStatusChanged) {
      setTimeout(() => {
        onStatusChanged();
      }, 300);
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
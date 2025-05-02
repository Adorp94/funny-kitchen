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
  Loader2
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

export function CotizacionActionsButton({ cotizacion, onStatusChanged, buttonSize = "sm" }: CotizacionActionsButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [detailedCotizacion, setDetailedCotizacion] = useState<any>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const router = useRouter();

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
    router.push(`/dashboard/cotizaciones/${cotizacion.cotizacion_id}`);
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

  const handleStatusChange = async (cotizacionId: number, newStatus: string, paymentData?: PaymentFormData) => {
    try {
      console.log('CotizacionActionsButton: handleStatusChange called with', { cotizacionId, newStatus, paymentData });
      const numericCotizacionId = typeof cotizacionId === 'string' ? parseInt(cotizacionId) : cotizacionId;
      if (isNaN(numericCotizacionId)) {
        throw new Error('ID de cotización inválido');
      }
      let processedPaymentData = undefined;
      if (paymentData) {
        processedPaymentData = {
          ...paymentData,
          monto: Number(paymentData.monto), 
          porcentaje: Number(paymentData.porcentaje), 
        };
      }
      const result = await updateCotizacionStatus(numericCotizacionId, newStatus, processedPaymentData);
      console.log('CotizacionActionsButton: Status update result:', result);
      if (result.success) {
        if (onStatusChanged) {
          console.log('CotizacionActionsButton: Calling onStatusChanged callback');
          onStatusChanged();
        }
        return true;
      } else {
        console.error('CotizacionActionsButton: Error updating status:', result.error);
        toast.error("No se pudo actualizar el estado", { description: result.error });
        return false;
      }
    } catch (error: any) {
      console.error('CotizacionActionsButton: Unexpected error in handleStatusChange:', error);
      toast.error("Error desconocido", { description: error.message });
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
            Ver / Editar
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={handleOpenModal} disabled={isLoadingDetails}>
            <DollarSign className="mr-2 h-4 w-4" />
            Procesar / Estado
          </DropdownMenuItem>
          
          <DropdownMenuSeparator /> 

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
      
      <CotizacionStatusModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        cotizacion={detailedCotizacion}
        onStatusChange={handleStatusChange}
      />
    </>
  );
}

export default CotizacionActionsButton; 
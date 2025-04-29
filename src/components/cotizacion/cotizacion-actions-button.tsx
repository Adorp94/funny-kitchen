"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CreditCard, Receipt, DollarSign, Wallet, FileEdit } from 'lucide-react';
import { CotizacionStatusModal } from './cotizacion-status-modal';
import { toast } from "sonner";
import { updateCotizacionStatus, getCotizacionDetails } from '@/app/actions/cotizacion-actions';
import { useRouter } from 'next/navigation';

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
}

export function CotizacionActionsButton({ cotizacion, onStatusChanged }: CotizacionActionsButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [detailedCotizacion, setDetailedCotizacion] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleOpenModal = async () => {
    setIsLoading(true);
    
    try {
      const result = await getCotizacionDetails(cotizacion.cotizacion_id);
      
      if (result.success) {
        setDetailedCotizacion(result.data);
        setIsModalOpen(true);
      } else {
        toast("No se pudo cargar la información de la cotización", {
          variant: "destructive"
        });
      }
    } catch (error) {
      toast("Error al cargar la cotización", {
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async (cotizacionId: number, newStatus: string, paymentData?: PaymentFormData) => {
    try {
      console.log('CotizacionActionsButton: handleStatusChange called with', { cotizacionId, newStatus, paymentData });
      
      // Ensure cotizacionId is a number
      const numericCotizacionId = typeof cotizacionId === 'string' ? parseInt(cotizacionId) : cotizacionId;
      
      if (isNaN(numericCotizacionId)) {
        throw new Error('ID de cotización inválido');
      }
      
      // Prepare payment data if provided
      let processedPaymentData = undefined;
      if (paymentData) {
        processedPaymentData = {
          ...paymentData,
          monto: Number(paymentData.monto), // Ensure numeric value
          porcentaje: Number(paymentData.porcentaje), // Ensure numeric value
        };
      }
      
      // Call the server action with the properly processed data
      const result = await updateCotizacionStatus(numericCotizacionId, newStatus, processedPaymentData);
      console.log('CotizacionActionsButton: Status update result:', result);
      
      if (result.success) {
        // Update the local state if needed
        if (onStatusChanged) {
          console.log('CotizacionActionsButton: Calling onStatusChanged callback');
          onStatusChanged();
        }
        
        // Return success to close the modal
        return true;
      } else {
        console.error('CotizacionActionsButton: Error updating status:', result.error);
        toast("No se pudo actualizar el estado de la cotización", {
          variant: "destructive"
        });
        return false;
      }
    } catch (error) {
      console.error('CotizacionActionsButton: Unexpected error in handleStatusChange:', error);
      toast("Error desconocido", {
        variant: "destructive"
      });
      return false;
    }
  };

  const handleCloseModal = () => {
    // Close the modal
    setIsModalOpen(false);
    setDetailedCotizacion(null);
    
    // Refresh the data if needed
    if (onStatusChanged) {
      // Wait a short moment before refreshing to ensure server changes are reflected
      setTimeout(() => {
        onStatusChanged();
      }, 300);
    }
  };

  const handleEditCotizacion = () => {
    router.push(`/dashboard/cotizaciones/${cotizacion.cotizacion_id}/edit`);
  };

  return (
    <div className="flex gap-2">
      {cotizacion.estado === 'pendiente' && (
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleEditCotizacion}
          className="h-8 w-8 p-0 flex items-center justify-center text-blue-600 border-blue-200 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300"
          title="Editar cotización"
        >
          <FileEdit className="h-4 w-4" />
        </Button>
      )}
      
      <Button 
        variant="outline" 
        size="sm" 
        onClick={handleOpenModal}
        disabled={isLoading}
        className="h-8 w-8 p-0 flex items-center justify-center text-emerald-600 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300"
        title="Procesar pago / Cambiar estado"
      >
        {isLoading ? (
          <span className="h-4 w-4 animate-spin rounded-full border-b-2 border-emerald-600"></span>
        ) : (
          <DollarSign className="h-4 w-4" />
        )}
      </Button>
      
      <CotizacionStatusModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        cotizacion={detailedCotizacion}
        onStatusChange={handleStatusChange}
      />
    </div>
  );
}

export default CotizacionActionsButton; 
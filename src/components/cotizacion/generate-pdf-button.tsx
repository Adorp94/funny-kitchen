'use client'

import { useState } from 'react'
import { Button } from '../ui/button'
import { Loader2, FileText } from 'lucide-react'
import { generateAndSaveQuotePDF } from '@/app/actions/generate-pdf'
import { useToast } from '@/components/ui/use-toast'

interface GeneratePDFButtonProps {
  cotizacionId: number
  clienteId: string
  clienteNombre: string
  clienteTelefono: string
  clienteAtencion?: string
  vendedorNombre: string
  vendedorTelefono: string
  vendedorCorreo: string
  productos: Array<{
    id: string
    descripcion: string
    precio_unitario: number
    cantidad: number
    precio_total: number
    color?: string
    descuento?: number
  }>
  moneda: 'Pesos' | 'Dólares'
  descuento: number
  envio: number
  valor_iva: '16%' | '0%'
  tiempo_entrega: string
  datos_bancarios: {
    titular: string
    cuenta: string
    clabe: string
  }
}

export default function GeneratePDFButton({
  cotizacionId,
  clienteId,
  clienteNombre,
  clienteTelefono,
  clienteAtencion,
  vendedorNombre,
  vendedorTelefono,
  vendedorCorreo,
  productos,
  moneda,
  descuento,
  envio,
  valor_iva,
  tiempo_entrega,
  datos_bancarios
}: GeneratePDFButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const handleGeneratePDF = async () => {
    if (productos.length === 0) {
      toast({
        title: 'Error',
        description: 'No se puede generar la cotización sin productos',
        variant: 'destructive',
      })
      return
    }

    try {
      setIsLoading(true)
      
      const result = await generateAndSaveQuotePDF({
        cotizacionId,
        cliente: {
          id: clienteId,
          nombre: clienteNombre,
          telefono: clienteTelefono,
          atencion: clienteAtencion,
        },
        vendedor: {
          nombre: vendedorNombre,
          telefono: vendedorTelefono,
          correo: vendedorCorreo,
        },
        productos,
        moneda,
        descuento,
        envio,
        valor_iva,
        tiempo_entrega,
        datos_bancarios,
      })

      if (result.success && result.pdfUrl) {
        // Open the PDF in a new window
        window.open(result.pdfUrl, '_blank')
        
        toast({
          title: 'PDF generado correctamente',
          description: 'Se ha abierto el PDF en una nueva ventana',
        })
      } else {
        throw new Error(result.error || 'Error al generar el PDF')
      }
    } catch (error) {
      console.error('Error generando PDF:', error)
      toast({
        title: 'Error',
        description: (error as Error).message || 'Ocurrió un error al generar el PDF',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      onClick={handleGeneratePDF}
      disabled={isLoading}
      className="bg-indigo-600 hover:bg-indigo-700"
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Generando PDF...
        </>
      ) : (
        <>
          <FileText className="mr-2 h-4 w-4" />
          Generar PDF
        </>
      )}
    </Button>
  )
} 
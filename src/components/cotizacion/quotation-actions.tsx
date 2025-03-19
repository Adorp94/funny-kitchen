'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import GeneratePDFButton from './generate-pdf-button'
import { Button } from '../ui/button'
import { Loader2, Save } from 'lucide-react'
import { useToast } from '../ui/use-toast'

interface Product {
  id: string
  descripcion: string
  precio_unitario: number
  cantidad: number
  precio_total: number
  color?: string
  descuento?: number
}

interface QuotationActionsProps {
  cotizacionId: number
  clienteId: string
  productos: Product[]
  descuento: number
  envio: number
  moneda: 'Pesos' | 'Dólares'
  valor_iva: '16%' | '0%'
  tiempo_entrega: string
}

export default function QuotationActions({
  cotizacionId,
  clienteId,
  productos,
  descuento,
  envio,
  moneda,
  valor_iva,
  tiempo_entrega,
}: QuotationActionsProps) {
  const [isSaving, setIsSaving] = useState(false)
  const [clienteData, setClienteData] = useState<{
    nombre: string
    telefono: string
    atencion?: string
  } | null>(null)
  const [vendedorData, setVendedorData] = useState<{
    nombre: string
    telefono: string
    correo: string
  } | null>(null)
  const [datosBancarios, setDatosBancarios] = useState<{
    titular: string
    cuenta: string
    clabe: string
  }>({
    titular: 'PABLO ANAYA',
    cuenta: '0123456789',
    clabe: '012345678901234567',
  })
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)

  // Fetch client data
  useEffect(() => {
    const fetchClienteData = async () => {
      if (!clienteId) return
      
      try {
        const { data, error } = await supabase
          .from('clientes')
          .select('nombre, telefono, atencion')
          .eq('id', clienteId)
          .single()
        
        if (error) throw error
        
        if (data) {
          setClienteData({
            nombre: data.nombre,
            telefono: data.telefono || '',
            atencion: data.atencion,
          })
        }
      } catch (error) {
        console.error('Error fetching client data:', error)
      }
    }
    
    fetchClienteData()
  }, [clienteId])
  
  // Fetch vendor data (for the current user)
  useEffect(() => {
    const fetchVendedorData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        
        if (user) {
          const { data, error } = await supabase
            .from('usuarios')
            .select('nombre, telefono, email')
            .eq('id', user.id)
            .single()
          
          if (error) throw error
          
          if (data) {
            setVendedorData({
              nombre: data.nombre || user.email?.split('@')[0] || 'Vendedor',
              telefono: data.telefono || '',
              correo: data.email || user.email || '',
            })
          } else {
            // Fallback to default values if no user data
            setVendedorData({
              nombre: user.email?.split('@')[0] || 'Vendedor',
              telefono: '',
              correo: user.email || '',
            })
          }
        }
      } catch (error) {
        console.error('Error fetching vendor data:', error)
        // Set default values
        setVendedorData({
          nombre: 'Vendedor',
          telefono: '',
          correo: '',
        })
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchVendedorData()
  }, [])
  
  // Save quotation to database
  const saveQuotation = async () => {
    try {
      setIsSaving(true)
      
      // Calculate totals
      const subtotal = productos.reduce((acc, product) => acc + product.precio_total, 0)
      const baseConDescuento = subtotal - descuento
      const ivaAmount = valor_iva === '16%' && moneda !== 'Dólares' ? baseConDescuento * 0.16 : 0
      const total = baseConDescuento + ivaAmount + envio
      
      // Save or update the quotation
      const { error } = await supabase
        .from('cotizaciones')
        .update({
          cliente_id: clienteId,
          productos: productos,
          subtotal,
          descuento,
          iva: ivaAmount,
          envio,
          total,
          moneda,
          valor_iva,
          tiempo_entrega,
          updated_at: new Date().toISOString(),
        })
        .eq('id', cotizacionId)
      
      if (error) throw error
      
      toast({
        title: 'Guardado exitoso',
        description: 'La cotización se ha guardado correctamente',
      })
    } catch (error) {
      console.error('Error saving quotation:', error)
      toast({
        title: 'Error',
        description: 'Ocurrió un error al guardar la cotización',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }
  
  if (isLoading) {
    return (
      <div className="flex justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }
  
  return (
    <div className="flex gap-2 mt-4">
      <Button
        onClick={saveQuotation}
        disabled={isSaving || !clienteData || !vendedorData || productos.length === 0}
        className="bg-green-600 hover:bg-green-700"
      >
        {isSaving ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Guardando...
          </>
        ) : (
          <>
            <Save className="mr-2 h-4 w-4" />
            Guardar
          </>
        )}
      </Button>
      
      {clienteData && vendedorData && (
        <GeneratePDFButton
          cotizacionId={cotizacionId}
          clienteId={clienteId}
          clienteNombre={clienteData.nombre}
          clienteTelefono={clienteData.telefono}
          clienteAtencion={clienteData.atencion}
          vendedorNombre={vendedorData.nombre}
          vendedorTelefono={vendedorData.telefono}
          vendedorCorreo={vendedorData.correo}
          productos={productos}
          moneda={moneda}
          descuento={descuento}
          envio={envio}
          valor_iva={valor_iva}
          tiempo_entrega={tiempo_entrega}
          datos_bancarios={datosBancarios}
        />
      )}
    </div>
  )
} 
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { Loader2, FileText } from 'lucide-react'

interface QuotationActionsProps {
  cotizacionId: number;
  hasExistingPdf: boolean;
  onPdfGenerated?: (pdfUrl: string) => void;
}

export default function QuotationActions({ 
  cotizacionId, 
  hasExistingPdf,
  onPdfGenerated 
}: QuotationActionsProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const { toast } = useToast()

  const handleGeneratePdf = async () => {
    try {
      setIsGenerating(true)
      
      const response = await fetch(`/api/cotizaciones/${cotizacionId}/pdf`, {
        method: 'POST',
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate PDF')
      }
      
      const data = await response.json()
      
      toast({
        title: "PDF Generado",
        description: "El PDF ha sido generado y guardado correctamente.",
      })
      
      // Call the callback with the PDF URL if provided
      if (onPdfGenerated && data.pdfUrl) {
        onPdfGenerated(data.pdfUrl)
      }
      
      // Optionally open the PDF in a new tab
      if (data.pdfUrl) {
        window.open(data.pdfUrl, '_blank')
      }
    } catch (error) {
      console.error('Error generating PDF:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Ocurrió un error al generar el PDF",
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
    }
  }
  
  return (
    <div className="flex gap-2">
      <Button 
        onClick={handleGeneratePdf} 
        disabled={isGenerating}
        variant="outline"
        id="generate-pdf-button"
      >
        {isGenerating ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Generando...
          </>
        ) : (
          <>
            <FileText className="mr-2 h-4 w-4" />
            {hasExistingPdf ? 'Regenerar PDF' : 'Generar PDF'}
          </>
        )}
      </Button>
    </div>
  )
} 
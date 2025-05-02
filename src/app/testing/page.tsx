"use client";

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle2, Loader2, Trash2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function TestingDeletePage() {
  const [cotizacionId, setCotizacionId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleDelete = async () => {
    setMessage(null);
    const id = parseInt(cotizacionId, 10);

    if (isNaN(id) || id <= 0) {
      setMessage({ type: 'error', text: 'Por favor, ingresa un ID de Cotización válido.' });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/testing/delete-cotizacion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cotizacion_id: id }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Ocurrió un error desconocido');
      }

      setMessage({ type: 'success', text: result.message });
      setCotizacionId(''); // Clear input on success

    } catch (error: any) {
      console.error("Deletion error:", error);
      setMessage({ type: 'error', text: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 flex justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
             <Trash2 className="h-5 w-5 text-destructive" />
             Borrar Cotización (Modo Seguro)
          </CardTitle>
          <CardDescription>
            Ingresa el ID de la cotización que deseas eliminar permanentemente.
            Esto eliminará la cotización, sus productos asociados y reseteará las secuencias de IDs.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cotizacionId">ID de Cotización a Eliminar</Label>
            <Input
              id="cotizacionId"
              type="number"
              placeholder="Ej: 123"
              value={cotizacionId}
              onChange={(e) => setCotizacionId(e.target.value)}
              disabled={isLoading}
            />
          </div>

          {message && (
             <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
               {message.type === 'error' ? <AlertCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
               <AlertTitle>{message.type === 'error' ? 'Error' : 'Éxito'}</AlertTitle>
               <AlertDescription>{message.text}</AlertDescription>
             </Alert>
           )}

        </CardContent>
        <CardFooter>
          <Button
            onClick={handleDelete}
            disabled={isLoading || !cotizacionId}
            className="w-full"
            variant="destructive"
          >
            {isLoading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Eliminando...</>
            ) : (
              <><Trash2 className="mr-2 h-4 w-4" /> Confirmar Eliminación</>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
} 
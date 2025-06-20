import { useState, useCallback } from 'react';

interface ProductionBalance {
  producto_id: number;
  producto_nombre: string;
  pedidos: number;
  por_detallar: number;
  detallado: number;
  sancocho: number;
  terminado: number;
  piezas_en_proceso: number;
  faltan_sobran: number; // This is the balance we want to show
  sku?: string;
}

export function useProductionBalance() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getProductionBalance = useCallback(async (productoId: number): Promise<ProductionBalance | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/production-active');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch production data: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (!result.data) {
        throw new Error('No production data received');
      }
      
      // Find the specific product in the production data
      const productBalance = result.data.find((item: ProductionBalance) => 
        item.producto_id === productoId
      );
      
      return productBalance || null;
    } catch (err) {
      console.log('Error fetching production balance:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch production balance');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const getBalanceStatus = (balance: number): 'deficit' | 'surplus' | 'balanced' => {
    if (balance < 0) return 'deficit';
    if (balance > 0) return 'surplus';
    return 'balanced';
  };

  const getBalanceDisplay = (balance: number): string => {
    if (balance === 0) return 'Balanceado';
    if (balance > 0) return `Superávit: +${balance}`;
    return `Déficit: ${balance}`;
  };

  const getBalanceColor = (balance: number): string => {
    if (balance < 0) return 'text-red-600';
    if (balance > 0) return 'text-green-600';
    return 'text-gray-600';
  };

  return {
    getProductionBalance,
    getBalanceStatus,
    getBalanceDisplay,
    getBalanceColor,
    loading,
    error
  };
} 
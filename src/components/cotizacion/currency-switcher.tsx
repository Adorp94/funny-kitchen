"use client";

import { DollarSign, Coins } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip } from '@/components/ui/tooltip';
import { useCart } from '@/contexts/cart-context';

export function CurrencySwitcher() {
  const { currency, setCurrency } = useCart();
  
  const toggleCurrency = () => {
    setCurrency(currency === 'MXN' ? 'USD' : 'MXN');
  };

  return (
    <Tooltip content={`Cambiar a ${currency === 'MXN' ? 'USD' : 'MXN'}`} side="left">
      <Button
        onClick={toggleCurrency}
        variant="outline"
        size="icon"
        className={`h-9 w-9 rounded-full ${
          currency === 'USD' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-green-50 text-green-700 border-green-200'
        }`}
      >
        {currency === 'USD' ? (
          <DollarSign className="h-4 w-4" />
        ) : (
          <Coins className="h-4 w-4" />
        )}
      </Button>
    </Tooltip>
  );
} 
import { useState, useEffect } from 'react';

interface BanxicoResponse {
  bmx: {
    series: Array<{
      idSerie: string;
      titulo: string;
      datos: Array<{
        fecha: string;
        dato: string;
      }>;
    }>;
  };
}

export function useExchangeRate() {
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);
  const [baseRate, setBaseRate] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const MARKUP = 1.5;

  useEffect(() => {
    const fetchExchangeRate = async () => {
      try {
        console.log('Fetching exchange rate from Banxico API...');
        
        // Set fallback values to use in case of error
        const fallbackRate = 20.4003;
        const fallbackDate = '28/06/2024';
        
        try {
          // Use server-side API route as a proxy to fetch Banxico data
          // This avoids CORS issues in the browser
          const response = await fetch('/api/exchange-rate');
          
          if (!response.ok) {
            throw new Error(`Failed to fetch exchange rate: ${response.status} ${response.statusText}`);
          }
          
          const data = await response.json();
          
          if (!data.success) {
            throw new Error(data.error || 'API returned unsuccessful response');
          }
          
          const rate = data.rate;
          const date = data.date;
          
          if (!rate || isNaN(parseFloat(rate))) {
            throw new Error('Invalid exchange rate value received');
          }
          
          // Save the base rate
          const parsedRate = parseFloat(rate);
          setBaseRate(parsedRate);
          
          // Calculate rate with markup
          const rateWithMarkup = parsedRate + MARKUP;
          setExchangeRate(rateWithMarkup);
          setLastUpdated(date || fallbackDate);
          
          console.log('Successfully fetched exchange rate:', parsedRate, 'with markup:', rateWithMarkup);
          console.log('Last updated date:', date);
        } catch (apiError) {
          console.error('Error fetching exchange rate, using fallback values:', apiError);
          setError(apiError instanceof Error ? apiError.message : 'Failed to fetch exchange rate');
          
          // Use fallback values
          setBaseRate(fallbackRate);
          setExchangeRate(fallbackRate + MARKUP);
          setLastUpdated(fallbackDate);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchExchangeRate();
  }, []);

  // Fixed function to handle the date format from Banxico
  const formatDate = (dateStr: string): string => {
    try {
      // Handle the date format from Banxico (dd/mm/yyyy)
      const [day, month, year] = dateStr.split('/');
      return new Date(`${year}-${month}-${day}`).toLocaleDateString();
    } catch (e) {
      console.error('Error formatting date:', e);
      return dateStr; // Return the original string if parsing fails
    }
  };

  const convertMXNtoUSD = (amountMXN: number): number => {
    if (!exchangeRate) return amountMXN;
    return Number((amountMXN / exchangeRate).toFixed(2));
  };

  const convertUSDtoMXN = (amountUSD: number): number => {
    if (!exchangeRate) return amountUSD;
    return Number((amountUSD * exchangeRate).toFixed(2));
  };

  const formatExchangeRateInfo = (): string => {
    if (!exchangeRate || !baseRate) return '';
    return `1 USD = ${exchangeRate.toFixed(2)} MXN (Base: ${baseRate.toFixed(2)} + ${MARKUP.toFixed(2)})`;
  };

  return {
    exchangeRate,
    baseRate,
    loading,
    error,
    lastUpdated,
    formatDate,
    convertMXNtoUSD,
    convertUSDtoMXN,
    formatExchangeRateInfo
  };
} 
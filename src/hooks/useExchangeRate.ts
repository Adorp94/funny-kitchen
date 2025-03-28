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
        console.log('Fetching exchange rate from Banxico...');
        
        const response = await fetch(
          'https://www.banxico.org.mx/SieAPIRest/service/v1/series/SF43718/datos/oportuno',
          {
            headers: {
              'Bmx-Token': '66c15536eef14c33ee04957d8ac9fc8fc7c6a3fa819c6fc4d3d6515448f14433'
            }
          }
        );

        console.log('Banxico API response status:', response.status);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch exchange rate: ${response.status} ${response.statusText}`);
        }

        // Get the response as text first to validate
        const responseText = await response.text();
        console.log('Raw API response:', responseText);
        
        // Then parse the JSON
        let data: BanxicoResponse;
        try {
          data = JSON.parse(responseText);
        } catch (jsonError) {
          console.error('Failed to parse JSON response:', jsonError);
          throw new Error('Invalid JSON response from API');
        }
        
        // Validate the data structure
        if (!data.bmx?.series?.[0]?.datos?.[0]?.dato) {
          console.error('Invalid data structure:', data);
          throw new Error('Invalid API response format');
        }

        const latestData = data.bmx.series[0].datos[0];
        console.log('Latest data:', latestData);
        
        const rate = parseFloat(latestData.dato);
        
        if (isNaN(rate)) {
          throw new Error('Invalid exchange rate value');
        }

        // Save the base rate
        setBaseRate(rate);
        
        // Add markup to the exchange rate
        const rateWithMarkup = rate + MARKUP;
        setExchangeRate(rateWithMarkup);
        setLastUpdated(latestData.fecha);
        console.log('Successfully fetched exchange rate:', rate, 'with markup:', rateWithMarkup);
        console.log('Last updated date:', latestData.fecha);
      } catch (err) {
        console.error('Error fetching exchange rate:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch exchange rate');
        
        // Set fallback values for development
        const fallbackRate = 20.4003; // From the last successful API call
        setBaseRate(fallbackRate);
        setExchangeRate(fallbackRate + MARKUP);
        setLastUpdated('28/03/2025'); // Fallback date
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
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // URLs for Banxico API to get exchange rates
    const usdUrl = 'https://www.banxico.org.mx/SieAPIRest/service/v1/series/SF43718/datos/oportuno'; // USD to MXN
    const eurUrl = 'https://www.banxico.org.mx/SieAPIRest/service/v1/series/SF46410/datos/oportuno'; // EUR to MXN
    
    // Token provided by the user
    const token = '66c15536eef14c33ee04957d8ac9fc8fc7c6a3fa819c6fc4d3d6515448f14433';
    
    const headers = {
      'Bmx-Token': token
    };
    
    // Fetch both USD and EUR rates in parallel
    const [usdResponse, eurResponse] = await Promise.all([
      fetch(usdUrl, { headers, cache: 'no-store' }),
      fetch(eurUrl, { headers, cache: 'no-store' })
    ]);
    
    if (!usdResponse.ok || !eurResponse.ok) {
      throw new Error(`Banxico API error: USD ${usdResponse.status}, EUR ${eurResponse.status}`);
    }
    
    const [usdData, eurData] = await Promise.all([
      usdResponse.json(),
      eurResponse.json()
    ]);
    
    // Extract USD rate and date
    const usdSeriesData = usdData?.bmx?.series?.[0]?.datos?.[0];
    if (!usdSeriesData || !usdSeriesData.dato) {
      throw new Error('Invalid USD response from Banxico API');
    }
    
    // Extract EUR rate and date
    const eurSeriesData = eurData?.bmx?.series?.[0]?.datos?.[0];
    if (!eurSeriesData || !eurSeriesData.dato) {
      throw new Error('Invalid EUR response from Banxico API');
    }
    
    const usdRate = parseFloat(usdSeriesData.dato);
    const eurRate = parseFloat(eurSeriesData.dato);
    const date = usdSeriesData.fecha; // Both should have the same date
    
    return NextResponse.json({
      success: true,
      rates: {
        USD: usdRate,
        EUR: eurRate
      },
      date: date
    });
  } catch (error) {
    console.error('Error fetching exchange rates from Banxico:', error);
    
    // Fallback rates if the API call fails
    const fallbackRates = {
      USD: 20.4003,
      EUR: 22.1500
    };
    const fallbackDate = '28/06/2024';
    
    return NextResponse.json({
      success: false,
      rates: fallbackRates,
      date: fallbackDate,
      error: 'Failed to fetch from Banxico API, using fallback rates'
    });
  }
} 
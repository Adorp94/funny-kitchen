import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // URL for Banxico API to get the USD to MXN exchange rate
    const url = 'https://www.banxico.org.mx/SieAPIRest/service/v1/series/SF43718/datos/oportuno';
    
    // Token provided by the user
    const token = '66c15536eef14c33ee04957d8ac9fc8fc7c6a3fa819c6fc4d3d6515448f14433';
    
    const response = await fetch(url, {
      headers: {
        'Bmx-Token': token
      }
    });
    
    if (!response.ok) {
      throw new Error(`Banxico API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Extract the exchange rate and date from the response
    const seriesData = data?.bmx?.series?.[0]?.datos?.[0];
    
    if (!seriesData || !seriesData.dato) {
      throw new Error('Invalid response from Banxico API');
    }
    
    const exchangeRate = parseFloat(seriesData.dato);
    const date = seriesData.fecha;
    
    // Add a small business margin to the exchange rate (5%)
    const rateWithMargin = exchangeRate + (exchangeRate * 0.05);
    
    return NextResponse.json({
      raw: data,
      exchangeRate: rateWithMargin,
      date: date,
    });
  } catch (error) {
    console.error('Error fetching exchange rate from Banxico:', error);
    
    // Fallback to a default exchange rate if the API call fails
    const fallbackRate = 18.5;
    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0];
    
    return NextResponse.json({
      exchangeRate: fallbackRate,
      date: formattedDate,
      error: 'Failed to fetch from Banxico API, using fallback rate',
    });
  }
}
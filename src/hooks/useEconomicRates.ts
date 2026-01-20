import { useQuery } from '@tanstack/react-query';

interface BCBSeriesResponse {
  valor: string;
  data: string;
}

// Fetch CDI rate from Brazilian Central Bank API
async function fetchCDIRate(): Promise<number> {
  try {
    // Series 4389: CDI daily rate
    const response = await fetch(
      'https://api.bcb.gov.br/dados/serie/bcdata.sgs.4389/dados/ultimos/1?formato=json'
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch CDI rate');
    }
    
    const data: BCBSeriesResponse[] = await response.json();
    
    if (data && data.length > 0) {
      // Convert daily rate to annual rate
      const dailyRate = parseFloat(data[0].valor.replace(',', '.'));
      const annualRate = (Math.pow(1 + dailyRate / 100, 252) - 1) * 100;
      return annualRate;
    }
    
    throw new Error('No data returned');
  } catch (error) {
    console.warn('Failed to fetch CDI rate, using fallback:', error);
    return 10.65; // Fallback CDI rate
  }
}

// Fetch SELIC rate from Brazilian Central Bank API
async function fetchSELICRate(): Promise<number> {
  try {
    // Series 432: SELIC target rate
    const response = await fetch(
      'https://api.bcb.gov.br/dados/serie/bcdata.sgs.432/dados/ultimos/1?formato=json'
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch SELIC rate');
    }
    
    const data: BCBSeriesResponse[] = await response.json();
    
    if (data && data.length > 0) {
      return parseFloat(data[0].valor.replace(',', '.'));
    }
    
    throw new Error('No data returned');
  } catch (error) {
    console.warn('Failed to fetch SELIC rate, using fallback:', error);
    return 10.50; // Fallback SELIC rate
  }
}

// Fetch IPCA rate from Brazilian Central Bank API
async function fetchIPCARate(): Promise<number> {
  try {
    // Series 433: IPCA accumulated 12 months
    const response = await fetch(
      'https://api.bcb.gov.br/dados/serie/bcdata.sgs.13522/dados/ultimos/1?formato=json'
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch IPCA rate');
    }
    
    const data: BCBSeriesResponse[] = await response.json();
    
    if (data && data.length > 0) {
      return parseFloat(data[0].valor.replace(',', '.'));
    }
    
    throw new Error('No data returned');
  } catch (error) {
    console.warn('Failed to fetch IPCA rate, using fallback:', error);
    return 4.5; // Fallback IPCA rate
  }
}

export interface EconomicRates {
  cdi: number;
  selic: number;
  ipca: number;
  lastUpdated: Date;
}

async function fetchAllRates(): Promise<EconomicRates> {
  const [cdi, selic, ipca] = await Promise.all([
    fetchCDIRate(),
    fetchSELICRate(),
    fetchIPCARate(),
  ]);
  
  return {
    cdi,
    selic,
    ipca,
    lastUpdated: new Date(),
  };
}

export function useEconomicRates() {
  return useQuery({
    queryKey: ['economic-rates'],
    queryFn: fetchAllRates,
    staleTime: 1000 * 60 * 60, // 1 hour
    gcTime: 1000 * 60 * 60 * 24, // 24 hours (formerly cacheTime)
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    retry: 2,
  });
}

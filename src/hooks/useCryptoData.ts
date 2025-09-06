import { useState, useEffect } from 'react';
import { CryptoData } from '@/types/crypto';

const COINGECKO_API = 'https://api.coingecko.com/api/v3';

// Default crypto list
const DEFAULT_CRYPTOS = [
  'bitcoin',
  'ethereum', 
  'binancecoin',
  'solana',
  'ripple',
  'cardano',
  'dogecoin',
  'polygon',
  'chainlink',
  'litecoin'
];

export const useCryptoData = (cryptoIds: string[] = DEFAULT_CRYPTOS) => {
  const [cryptoData, setCryptoData] = useState<CryptoData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchCryptoData = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${COINGECKO_API}/simple/price?ids=${cryptoIds.join(',')}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true&include_24hr_vol=true&include_last_updated_at=true`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch crypto data');
      }
      
      const data = await response.json();
      
      // Transform the data to match our interface
      const transformedData: CryptoData[] = cryptoIds.map(id => {
        const coinData = data[id];
        return {
          id,
          symbol: id === 'binancecoin' ? 'BNB' : 
                 id === 'bitcoin' ? 'BTC' :
                 id === 'ethereum' ? 'ETH' :
                 id === 'solana' ? 'SOL' :
                 id === 'ripple' ? 'XRP' :
                 id === 'cardano' ? 'ADA' :
                 id === 'dogecoin' ? 'DOGE' :
                 id === 'polygon' ? 'MATIC' :
                 id === 'chainlink' ? 'LINK' :
                 id === 'litecoin' ? 'LTC' :
                 id.toUpperCase(),
          name: id === 'binancecoin' ? 'Binance Coin' :
                id === 'bitcoin' ? 'Bitcoin' :
                id === 'ethereum' ? 'Ethereum' :
                id === 'solana' ? 'Solana' :
                id === 'ripple' ? 'XRP' :
                id === 'cardano' ? 'Cardano' :
                id === 'dogecoin' ? 'Dogecoin' :
                id === 'polygon' ? 'Polygon' :
                id === 'chainlink' ? 'Chainlink' :
                id === 'litecoin' ? 'Litecoin' :
                id.charAt(0).toUpperCase() + id.slice(1),
          current_price: coinData?.usd || 0,
          price_change_percentage_24h: coinData?.usd_24h_change || 0,
          market_cap: coinData?.usd_market_cap || 0,
          total_volume: coinData?.usd_24h_vol || 0,
          last_updated: new Date().toISOString(),
        };
      });
      
      setCryptoData(transformedData);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching crypto data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCryptoData();
    
    // Update every 60 seconds
    const interval = setInterval(fetchCryptoData, 60000);
    
    return () => clearInterval(interval);
  }, [cryptoIds.join(',')]);

  return {
    cryptoData,
    loading,
    error,
    lastUpdated,
    refetch: fetchCryptoData
  };
};
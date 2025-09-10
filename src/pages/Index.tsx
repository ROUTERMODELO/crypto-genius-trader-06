import { useState, useMemo, useEffect } from 'react';
import { useCryptoData } from '@/hooks/useCryptoData';
import { usePortfolio } from '@/hooks/usePortfolio';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Header } from '@/components/Header';
import { CryptoCard } from '@/components/CryptoCard';
import { Portfolio } from '@/components/Portfolio';
import { ProfitLossAnalysis } from '@/components/ProfitLossAnalysis';
import { TransactionHistory } from '@/components/TransactionHistory';
import { SellModal } from '@/components/SellModal';
import { CryptoData, PortfolioAsset, PortfolioSummary } from '@/types/crypto';

const Index = () => {
  const { cryptoData, loading: cryptoLoading, lastUpdated } = useCryptoData();
  const { user } = useAuth();
  const { 
    balance, 
    assets, 
    transactions, 
    loading: portfolioLoading, 
    updateBalance, 
    buyAsset, 
    sellAsset, 
    updateAssetPrices 
  } = usePortfolio();
  
  const [sellModalOpen, setSellModalOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<PortfolioAsset | null>(null);

  // Update asset prices when crypto data changes
  useEffect(() => {
    if (cryptoData.length > 0) {
      updateAssetPrices(cryptoData);
    }
  }, [cryptoData, updateAssetPrices]);

  // Find best buy opportunity (highest drop in 24h)
  const bestBuyOpportunity = useMemo(() => {
    if (cryptoData.length === 0) return null;
    return cryptoData.reduce((lowest, current) => 
      current.price_change_percentage_24h < lowest.price_change_percentage_24h ? current : lowest
    );
  }, [cryptoData]);

  // Find best sell opportunity (highest profit percentage among owned assets)
  const bestSellOpportunity = useMemo(() => {
    if (assets.length === 0) return null;
    
    const profitableAssets = assets.filter(asset => {
      const currentValue = asset.quantity * asset.currentPrice;
      const pnl = currentValue - asset.totalInvested;
      return pnl > 0;
    });

    if (profitableAssets.length === 0) return null;

    const bestPerformer = profitableAssets.reduce((best, current) => {
      const bestPnl = ((best.quantity * best.currentPrice) - best.totalInvested) / best.totalInvested;
      const currentPnl = ((current.quantity * current.currentPrice) - current.totalInvested) / current.totalInvested;
      return currentPnl > bestPnl ? current : best;
    });

    return bestPerformer.symbol;
  }, [assets]);

  // Sort crypto data to prioritize best sell opportunities at the top
  const sortedCryptoData = useMemo(() => {
    if (!cryptoData.length) return [];
    
    return [...cryptoData].sort((a, b) => {
      // Check if user owns these assets
      const aOwned = assets.some(asset => asset.symbol === a.symbol);
      const bOwned = assets.some(asset => asset.symbol === b.symbol);
      
      // If both are owned or both not owned, maintain original order
      if (aOwned === bOwned) return 0;
      
      // Prioritize owned assets (potential sell opportunities) at the top
      return aOwned ? -1 : 1;
    });
  }, [cryptoData, assets]);

  // Calculate portfolio summary
  const portfolioSummary = useMemo((): PortfolioSummary => {
    const totalInvested = assets.reduce((sum, asset) => sum + asset.totalInvested, 0);
    const currentValue = assets.reduce((sum, asset) => sum + (asset.quantity * asset.currentPrice), 0);
    const totalValue = balance + currentValue;
    const totalPnL = currentValue - totalInvested;
    const totalPnLPercentage = totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0;

    // Calculate 24h change based on current prices vs purchase prices
    const change24h = assets.reduce((sum, asset) => {
      const pnl = (asset.quantity * asset.currentPrice) - asset.totalInvested;
      return sum + pnl;
    }, 0);
    
    const change24hPercentage = totalInvested > 0 ? (change24h / totalInvested) * 100 : 0;

    return {
      totalValue,
      totalInvested,
      totalPnL,
      totalPnLPercentage,
      change24h,
      change24hPercentage
    };
  }, [assets, balance]);

  const handleBuy = async (crypto: CryptoData, amount: number) => {
    console.log('handleBuy called with:', { crypto: crypto.symbol, amount });
    
    if (balance < amount || amount <= 0) {
      console.log('Buy cancelled: insufficient balance or invalid amount');
      return;
    }

    const quantity = amount / crypto.current_price;
    console.log('Calculated quantity:', quantity);
    await buyAsset(crypto.symbol, crypto.name, quantity, crypto.current_price, amount);
  };

  const handleSellAsset = (asset: PortfolioAsset) => {
    setSelectedAsset(asset);
    setSellModalOpen(true);
  };

  const handleSellConfirm = async (quantity: number) => {
    if (!selectedAsset) return;
    await sellAsset(selectedAsset.symbol, selectedAsset.name, quantity, selectedAsset.currentPrice);
    setSellModalOpen(false);
    setSelectedAsset(null);
  };

  if (cryptoLoading || portfolioLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">
            {cryptoLoading ? 'Carregando dados das criptomoedas...' : 'Carregando portfólio...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <Header 
          lastUpdated={lastUpdated}
          user={user}
        />
        
        <main className="container mx-auto px-4 py-6 space-y-8">
          {/* Crypto Cards Grid */}
          <section>
            <h2 className="text-2xl font-bold mb-6">Criptomoedas</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {sortedCryptoData.map((crypto) => {
                const isOwned = assets.some(asset => asset.symbol === crypto.symbol);
                return (
                  <CryptoCard
                    key={crypto.id}
                    crypto={crypto}
                    isBestBuy={crypto.id === bestBuyOpportunity?.id}
                    isBestSell={isOwned && crypto.symbol === bestSellOpportunity}
                    onBuy={handleBuy}
                    balance={balance}
                  />
                );
              })}
            </div>
          </section>

          {/* Portfolio Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <ProfitLossAnalysis summary={portfolioSummary} />
            <Portfolio
              balance={balance}
              assets={assets}
              bestSellAsset={bestSellOpportunity}
              onBalanceUpdate={updateBalance}
              onSellAsset={handleSellAsset}
            />
          </div>

          {/* Transaction History */}
          <TransactionHistory transactions={transactions} />
        </main>

        <SellModal
          isOpen={sellModalOpen}
          asset={selectedAsset}
          onClose={() => setSellModalOpen(false)}
          onConfirm={handleSellConfirm}
        />
      </div>
    </ProtectedRoute>
  );
};

export default Index;

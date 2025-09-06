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

  // Find best sell opportunity (highest gain in 24h among owned assets)
  const bestSellOpportunity = useMemo(() => {
    if (assets.length === 0 || cryptoData.length === 0) return null;
    
    const ownedCryptos = assets.map(asset => {
      const cryptoInfo = cryptoData.find(c => c.symbol === asset.symbol);
      return {
        ...asset,
        change24h: cryptoInfo?.price_change_percentage_24h || 0
      };
    });

    const bestPerformer = ownedCryptos.reduce((best, current) => 
      current.change24h > best.change24h ? current : best
    );

    return bestPerformer.change24h > 0 ? bestPerformer.symbol : null;
  }, [assets, cryptoData]);

  // Calculate portfolio summary
  const portfolioSummary = useMemo((): PortfolioSummary => {
    const totalInvested = assets.reduce((sum, asset) => sum + asset.totalInvested, 0);
    const currentValue = assets.reduce((sum, asset) => sum + (asset.quantity * asset.currentPrice), 0);
    const totalValue = balance + currentValue;
    const totalPnL = currentValue - totalInvested;
    const totalPnLPercentage = totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0;

    // Calculate 24h change (simplified - would need historical data for accuracy)
    const change24h = assets.reduce((sum, asset) => {
      const cryptoInfo = cryptoData.find(c => c.symbol === asset.symbol);
      const change = cryptoInfo ? (asset.quantity * asset.currentPrice * cryptoInfo.price_change_percentage_24h) / 100 : 0;
      return sum + change;
    }, 0);
    
    const change24hPercentage = currentValue > 0 ? (change24h / currentValue) * 100 : 0;

    return {
      totalValue,
      totalInvested,
      totalPnL,
      totalPnLPercentage,
      change24h,
      change24hPercentage
    };
  }, [assets, balance, cryptoData]);

  const handleBuy = async (crypto: CryptoData) => {
    const buyAmount = 10; // Fixed $10 buy amount
    const netAmount = buyAmount - (buyAmount * 0.001); // 0.1% fee
    
    if (balance < buyAmount) {
      return;
    }

    const quantity = netAmount / crypto.current_price;
    await buyAsset(crypto.symbol, crypto.name, quantity, crypto.current_price, buyAmount);
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
              {cryptoData.map((crypto) => (
                <CryptoCard
                  key={crypto.id}
                  crypto={crypto}
                  isBestBuy={crypto.id === bestBuyOpportunity?.id}
                  onBuy={handleBuy}
                />
              ))}
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

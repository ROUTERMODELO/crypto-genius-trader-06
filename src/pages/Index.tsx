import { useState, useMemo } from 'react';
import { useCryptoData } from '@/hooks/useCryptoData';
import { Header } from '@/components/Header';
import { CryptoCard } from '@/components/CryptoCard';
import { Portfolio } from '@/components/Portfolio';
import { ProfitLossAnalysis } from '@/components/ProfitLossAnalysis';
import { TransactionHistory } from '@/components/TransactionHistory';
import { SellModal } from '@/components/SellModal';
import { CryptoData, PortfolioAsset, Transaction, PortfolioSummary } from '@/types/crypto';
import { useToast } from '@/hooks/use-toast';

const Index = () => {
  const { cryptoData, loading, lastUpdated } = useCryptoData();
  const { toast } = useToast();

  // Portfolio state
  const [balance, setBalance] = useState(100);
  const [assets, setAssets] = useState<PortfolioAsset[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [sellModalOpen, setSellModalOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<PortfolioAsset | null>(null);

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

  // Update asset prices when crypto data changes
  useState(() => {
    setAssets(prevAssets => 
      prevAssets.map(asset => {
        const cryptoInfo = cryptoData.find(c => c.symbol === asset.symbol);
        return cryptoInfo ? { ...asset, currentPrice: cryptoInfo.current_price } : asset;
      })
    );
  });

  const handleBuy = (crypto: CryptoData) => {
    const buyAmount = 10; // Fixed $10 buy amount
    const fee = buyAmount * 0.001; // 0.1% fee
    const netAmount = buyAmount - fee;
    
    if (balance < buyAmount) {
      toast({
        title: "Saldo insuficiente",
        description: "Você não tem saldo suficiente para esta compra.",
        variant: "destructive",
      });
      return;
    }

    const quantity = netAmount / crypto.current_price;
    
    setBalance(prev => prev - buyAmount);
    
    setAssets(prev => {
      const existingAsset = prev.find(asset => asset.symbol === crypto.symbol);
      if (existingAsset) {
        const newQuantity = existingAsset.quantity + quantity;
        const newTotalInvested = existingAsset.totalInvested + buyAmount;
        const newAveragePrice = newTotalInvested / newQuantity;
        
        return prev.map(asset => 
          asset.symbol === crypto.symbol
            ? { 
                ...asset, 
                quantity: newQuantity,
                averagePrice: newAveragePrice,
                totalInvested: newTotalInvested,
                currentPrice: crypto.current_price
              }
            : asset
        );
      } else {
        return [...prev, {
          symbol: crypto.symbol,
          name: crypto.name,
          quantity,
          averagePrice: crypto.current_price,
          currentPrice: crypto.current_price,
          totalInvested: buyAmount
        }];
      }
    });

    const transaction: Transaction = {
      id: Date.now().toString(),
      type: 'buy',
      symbol: crypto.symbol,
      name: crypto.name,
      quantity,
      price: crypto.current_price,
      total: buyAmount,
      fee,
      timestamp: new Date()
    };

    setTransactions(prev => [transaction, ...prev]);

    toast({
      title: "Compra realizada!",
      description: `Você comprou $${buyAmount} de ${crypto.symbol}`,
    });
  };

  const handleSellAsset = (asset: PortfolioAsset) => {
    setSelectedAsset(asset);
    setSellModalOpen(true);
  };

  const handleSellConfirm = (quantity: number) => {
    if (!selectedAsset) return;

    const grossValue = quantity * selectedAsset.currentPrice;
    const fee = grossValue * 0.001; // 0.1% fee
    const netValue = grossValue - fee;

    setBalance(prev => prev + netValue);

    setAssets(prev => {
      const updatedAssets = prev.map(asset => {
        if (asset.symbol === selectedAsset.symbol) {
          const newQuantity = asset.quantity - quantity;
          if (newQuantity <= 0) {
            return null; // Will be filtered out
          }
          const soldPortion = quantity / asset.quantity;
          const newTotalInvested = asset.totalInvested * (1 - soldPortion);
          
          return {
            ...asset,
            quantity: newQuantity,
            totalInvested: newTotalInvested
          };
        }
        return asset;
      }).filter(Boolean) as PortfolioAsset[];
      
      return updatedAssets;
    });

    const transaction: Transaction = {
      id: Date.now().toString(),
      type: 'sell',
      symbol: selectedAsset.symbol,
      name: selectedAsset.name,
      quantity,
      price: selectedAsset.currentPrice,
      total: grossValue,
      fee,
      timestamp: new Date()
    };

    setTransactions(prev => [transaction, ...prev]);

    toast({
      title: "Venda realizada!",
      description: `Você vendeu ${quantity.toFixed(6)} ${selectedAsset.symbol} por $${netValue.toFixed(2)}`,
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando dados das criptomoedas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header 
        lastUpdated={lastUpdated}
        onSettingsClick={() => {}} // TODO: Implement settings modal
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
            onBalanceUpdate={setBalance}
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
  );
};

export default Index;

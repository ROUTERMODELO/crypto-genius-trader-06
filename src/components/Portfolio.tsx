import { Wallet, Edit3, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PortfolioAsset } from '@/types/crypto';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface PortfolioProps {
  balance: number;
  assets: PortfolioAsset[];
  bestSellAsset?: string;
  onBalanceUpdate: (newBalance: number) => void;
  onSellAsset: (asset: PortfolioAsset) => void;
}

export const Portfolio = ({ 
  balance, 
  assets, 
  bestSellAsset, 
  onBalanceUpdate, 
  onSellAsset 
}: PortfolioProps) => {
  const [isEditingBalance, setIsEditingBalance] = useState(false);
  const [balanceInput, setBalanceInput] = useState(balance.toString());

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatPercentage = (percentage: number) => {
    return `${percentage >= 0 ? '+' : ''}${percentage.toFixed(2)}%`;
  };

  const getTotalPortfolioValue = () => {
    const assetsValue = assets.reduce((total, asset) => 
      total + (asset.quantity * asset.currentPrice), 0
    );
    return balance + assetsValue;
  };

  const handleBalanceSubmit = () => {
    const newBalance = parseFloat(balanceInput);
    if (!isNaN(newBalance) && newBalance >= 0) {
      onBalanceUpdate(newBalance);
    } else {
      setBalanceInput(balance.toString());
    }
    setIsEditingBalance(false);
  };

  return (
    <div className="space-y-6">
      {/* Portfolio Summary */}
      <Card className="card-shadow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Meu Portfólio
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Valor Total Estimado</p>
              <p className="text-2xl font-bold text-foreground">
                {formatCurrency(getTotalPortfolioValue())}
              </p>
            </div>
            
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm text-muted-foreground">Saldo Base (USD)</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditingBalance(true)}
                  className="h-6 w-6 p-0"
                >
                  <Edit3 className="h-3 w-3" />
                </Button>
              </div>
              {isEditingBalance ? (
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={balanceInput}
                    onChange={(e) => setBalanceInput(e.target.value)}
                    onBlur={handleBalanceSubmit}
                    onKeyDown={(e) => e.key === 'Enter' && handleBalanceSubmit()}
                    className="h-8"
                    autoFocus
                  />
                </div>
              ) : (
                <p className="text-xl font-bold text-foreground">
                  {formatCurrency(balance)}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Assets List */}
      <Card className="card-shadow">
        <CardHeader>
          <CardTitle>Meus Ativos</CardTitle>
        </CardHeader>
        <CardContent>
          {assets.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Nenhum ativo comprado ainda.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {assets.map((asset) => {
                const currentValue = asset.quantity * asset.currentPrice;
                const pnl = currentValue - asset.totalInvested;
                const pnlPercentage = (pnl / asset.totalInvested) * 100;
                const isProfit = pnl >= 0;
                const isBestSell = bestSellAsset === asset.symbol;

                return (
                  <div
                    key={asset.symbol}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg border transition-all",
                      isBestSell && "success-glow border-success"
                    )}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">{asset.symbol}</h4>
                        {isBestSell && (
                          <div className="bg-success text-success-foreground px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                            <TrendingUp className="h-3 w-3" />
                            MELHOR VENDA
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {asset.quantity.toFixed(6)} × {formatCurrency(asset.currentPrice)}
                      </p>
                    </div>
                    
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(currentValue)}</p>
                      <p className={cn(
                        "text-sm font-medium",
                        isProfit ? "text-success" : "text-destructive"
                      )}>
                        {formatCurrency(pnl)} ({formatPercentage(pnlPercentage)})
                      </p>
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onSellAsset(asset)}
                      className="ml-3"
                    >
                      Vender
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
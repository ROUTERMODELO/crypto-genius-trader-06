import { TrendingUp, TrendingDown, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { CryptoData } from '@/types/crypto';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface CryptoCardProps {
  crypto: CryptoData;
  isBestBuy?: boolean;
  isBestSell?: boolean;
  onBuy: (crypto: CryptoData, amount: number) => void;
  balance: number;
}

export const CryptoCard = ({ crypto, isBestBuy, isBestSell, onBuy, balance }: CryptoCardProps) => {
  const [buyAmount, setBuyAmount] = useState('10');
  const [showBuyInput, setShowBuyInput] = useState(false);
  const isPositive = crypto.price_change_percentage_24h >= 0;
  
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: price < 1 ? 6 : 2,
    }).format(price);
  };

  const formatPercentage = (percentage: number) => {
    return `${percentage >= 0 ? '+' : ''}${percentage.toFixed(2)}%`;
  };

  const handleBuyClick = () => {
    if (showBuyInput) {
      const amount = parseFloat(buyAmount);
      if (amount > 0 && amount <= balance) {
        onBuy(crypto, amount);
        setShowBuyInput(false);
        setBuyAmount('10');
      }
    } else {
      setShowBuyInput(true);
    }
  };

  return (
    <Card 
      className={cn(
        "card-shadow transition-all duration-300 hover:scale-105",
        isBestBuy && "crypto-glow border-primary",
        isBestSell && "crypto-glow border-success"
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-semibold text-foreground">{crypto.name}</h3>
            <p className="text-sm text-muted-foreground font-mono font-bold">
              {crypto.symbol}
            </p>
          </div>
          {isBestBuy && (
            <div className="bg-primary text-primary-foreground px-2 py-1 rounded-full text-xs font-medium">
              MELHOR COMPRA
            </div>
          )}
          {isBestSell && (
            <div className="bg-success text-success-foreground px-2 py-1 rounded-full text-xs font-medium">
              MELHOR VENDA
            </div>
          )}
        </div>
        
        <div className="space-y-2">
          <div className="text-lg font-bold text-foreground">
            {formatPrice(crypto.current_price)}
          </div>
          
          <div className={cn(
            "flex items-center gap-1 text-sm font-medium",
            isPositive ? "text-success" : "text-destructive"
          )}>
            {isPositive ? (
              <TrendingUp className="h-4 w-4" />
            ) : (
              <TrendingDown className="h-4 w-4" />
            )}
            {formatPercentage(crypto.price_change_percentage_24h)}
          </div>
        </div>

        <div className="mt-4 space-y-2">
          {showBuyInput && (
            <div className="flex gap-2">
              <Input
                type="number"
                value={buyAmount}
                onChange={(e) => setBuyAmount(e.target.value)}
                placeholder="Valor em USD"
                className="text-sm"
                min="1"
                max={balance}
              />
            </div>
          )}
          <Button 
            onClick={handleBuyClick}
            className={cn(
              "w-full transition-all",
              isBestBuy 
                ? "gradient-primary hover:opacity-90" 
                : "bg-primary hover:bg-primary/90"
            )}
            size="sm"
            disabled={showBuyInput && (parseFloat(buyAmount) <= 0 || parseFloat(buyAmount) > balance)}
          >
            <ShoppingCart className="h-4 w-4 mr-2" />
            {showBuyInput ? 'Confirmar' : 'Comprar'}
            {isBestBuy && !showBuyInput && ' Agora'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
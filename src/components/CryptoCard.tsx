import { TrendingUp, TrendingDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CryptoData } from '@/types/crypto';
import { cn } from '@/lib/utils';

interface CryptoCardProps {
  crypto: CryptoData;
  isBestBuy?: boolean;
  onBuy: (crypto: CryptoData) => void;
}

export const CryptoCard = ({ crypto, isBestBuy, onBuy }: CryptoCardProps) => {
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

  return (
    <Card 
      className={cn(
        "card-shadow transition-all duration-300 hover:scale-105",
        isBestBuy && "crypto-glow border-primary"
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

        {isBestBuy && (
          <Button 
            onClick={() => onBuy(crypto)}
            className="w-full mt-4 gradient-primary hover:opacity-90 transition-opacity"
            size="sm"
          >
            Comprar Agora
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
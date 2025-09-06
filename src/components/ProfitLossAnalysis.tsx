import { TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PortfolioSummary } from '@/types/crypto';
import { cn } from '@/lib/utils';

interface ProfitLossAnalysisProps {
  summary: PortfolioSummary;
}

export const ProfitLossAnalysis = ({ summary }: ProfitLossAnalysisProps) => {
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

  const isProfitPositive = summary.totalPnL >= 0;
  const is24hPositive = summary.change24h >= 0;

  return (
    <Card className="card-shadow">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Evolução de Lucros
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Total P&L */}
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Lucro/Prejuízo Total</p>
            <div className={cn(
              "text-2xl font-bold flex items-center gap-2",
              isProfitPositive ? "text-success" : "text-destructive"
            )}>
              {isProfitPositive ? (
                <TrendingUp className="h-6 w-6" />
              ) : (
                <TrendingDown className="h-6 w-6" />
              )}
              {formatCurrency(summary.totalPnL)}
            </div>
            <p className={cn(
              "text-sm font-medium",
              isProfitPositive ? "text-success" : "text-destructive"
            )}>
              {formatPercentage(summary.totalPnLPercentage)}
            </p>
          </div>

          {/* 24h Change */}
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Mudança em 24h</p>
            <div className={cn(
              "text-2xl font-bold flex items-center gap-2",
              is24hPositive ? "text-success" : "text-destructive"
            )}>
              {is24hPositive ? (
                <TrendingUp className="h-6 w-6" />
              ) : (
                <TrendingDown className="h-6 w-6" />
              )}
              {formatCurrency(summary.change24h)}
            </div>
            <p className={cn(
              "text-sm font-medium",
              is24hPositive ? "text-success" : "text-destructive"
            )}>
              {formatPercentage(summary.change24hPercentage)}
            </p>
          </div>
        </div>

        <div className="mt-4 p-3 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">
            Compre ativos para ver a evolução dos seus lucros.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
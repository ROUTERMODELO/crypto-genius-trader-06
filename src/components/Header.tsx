import { TrendingUp, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HeaderProps {
  lastUpdated: Date | null;
  onSettingsClick: () => void;
}

export const Header = ({ lastUpdated, onSettingsClick }: HeaderProps) => {
  const formatLastUpdated = (date: Date | null) => {
    if (!date) return '';
    return date.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-sm">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold text-foreground">CriptoTracker</h1>
        </div>
        
        <div className="flex items-center gap-4">
          {lastUpdated && (
            <div className="text-sm text-muted-foreground">
              Última atualização: {formatLastUpdated(lastUpdated)}
            </div>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={onSettingsClick}
            className="text-muted-foreground hover:text-foreground"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
};
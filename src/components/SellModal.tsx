import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PortfolioAsset } from '@/types/crypto';

interface SellModalProps {
  isOpen: boolean;
  asset: PortfolioAsset | null;
  onClose: () => void;
  onConfirm: (quantity: number) => void;
}

export const SellModal = ({ isOpen, asset, onClose, onConfirm }: SellModalProps) => {
  const [quantity, setQuantity] = useState('');
  
  if (!asset) return null;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const quantityValue = parseFloat(quantity) || 0;
  const isValidQuantity = quantityValue > 0 && quantityValue <= asset.quantity;
  const grossValue = quantityValue * asset.currentPrice;
  const fee = grossValue * 0.001; // 0.1% fee
  const netValue = grossValue - fee;

  const handlePercentageClick = (percentage: number) => {
    const calculatedQuantity = asset.quantity * (percentage / 100);
    setQuantity(calculatedQuantity.toString());
  };

  const handleConfirm = () => {
    if (isValidQuantity) {
      onConfirm(quantityValue);
      setQuantity('');
      onClose();
    }
  };

  const handleClose = () => {
    setQuantity('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            Vender {asset.symbol}
            <Button variant="ghost" size="sm" onClick={handleClose}>
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-2">
              Quantidade disponível: {asset.quantity.toFixed(6)} {asset.symbol}
            </p>
            <p className="text-sm text-muted-foreground mb-3">
              Preço atual: {formatCurrency(asset.currentPrice)}
            </p>
            
            <Input
              type="number"
              placeholder="Quantidade a vender"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              max={asset.quantity}
              step="any"
            />
            
            <div className="flex gap-2 mt-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handlePercentageClick(25)}
              >
                25%
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handlePercentageClick(50)}
              >
                50%
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handlePercentageClick(100)}
              >
                100%
              </Button>
            </div>
          </div>

          {quantityValue > 0 && (
            <div className="space-y-2 p-3 bg-muted rounded-lg">
              <h4 className="font-semibold">Resumo da Venda</h4>
              <div className="flex justify-between text-sm">
                <span>Valor bruto:</span>
                <span>{formatCurrency(grossValue)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Taxa (0.1%):</span>
                <span>-{formatCurrency(fee)}</span>
              </div>
              <div className="flex justify-between font-semibold border-t pt-2">
                <span>Valor líquido:</span>
                <span>{formatCurrency(netValue)}</span>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose} className="flex-1">
              Cancelar
            </Button>
            <Button 
              onClick={handleConfirm}
              disabled={!isValidQuantity}
              className="flex-1"
            >
              Confirmar Venda
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
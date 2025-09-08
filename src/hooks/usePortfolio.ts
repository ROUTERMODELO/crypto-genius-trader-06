import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { PortfolioAsset, Transaction } from '@/types/crypto';

export const usePortfolio = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [portfolioId, setPortfolioId] = useState<string | null>(null);
  const [balance, setBalance] = useState(100);
  const [assets, setAssets] = useState<PortfolioAsset[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Initialize portfolio
  useEffect(() => {
    if (user) {
      initializePortfolio();
    } else {
      // Reset data when user logs out
      setPortfolioId(null);
      setBalance(100);
      setAssets([]);
      setTransactions([]);
      setLoading(false);
    }
  }, [user]);

  const initializePortfolio = async () => {
    try {
      setLoading(true);
      
      // Get or create user profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user!.id)
        .maybeSingle();

      if (profileError && profileError.code !== 'PGRST116') {
        throw profileError;
      }

      if (!profile) {
        // Create profile
        const { error: createProfileError } = await supabase
          .from('profiles')
          .insert([{ id: user!.id, email: user!.email }]);

        if (createProfileError) throw createProfileError;
      }

      // Get or create portfolio
      const { data: portfolio, error: portfolioError } = await supabase
        .from('portfolios')
        .select('*')
        .eq('user_id', user!.id)
        .maybeSingle();

      if (portfolioError && portfolioError.code !== 'PGRST116') {
        throw portfolioError;
      }

      let currentPortfolioId: string;

      if (!portfolio) {
        // Create portfolio
        const { data: newPortfolio, error: createPortfolioError } = await supabase
          .from('portfolios')
          .insert([{ user_id: user!.id, base_balance: 100 }])
          .select()
          .single();

        if (createPortfolioError) throw createPortfolioError;
        currentPortfolioId = newPortfolio.id;
        setBalance(100);
      } else {
        currentPortfolioId = portfolio.id;
        setBalance(Number(portfolio.base_balance));
      }

      setPortfolioId(currentPortfolioId);

      // Load assets and transactions
      await Promise.all([
        loadAssets(currentPortfolioId),
        loadTransactions(currentPortfolioId)
      ]);

    } catch (error) {
      console.error('Error initializing portfolio:', error);
      toast({
        title: "Erro ao carregar portfólio",
        description: "Não foi possível carregar seus dados.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadAssets = async (portfolioId: string) => {
    const { data, error } = await supabase
      .from('portfolio_assets')
      .select('*')
      .eq('portfolio_id', portfolioId);

    if (error) throw error;

    const formattedAssets: PortfolioAsset[] = data.map(asset => ({
      id: asset.id,
      symbol: asset.symbol,
      name: asset.name || '',
      quantity: Number(asset.quantity),
      purchasePrice: Number(asset.average_price),
      currentPrice: Number(asset.current_price),
      totalInvested: Number(asset.total_invested),
      purchaseDate: new Date(asset.updated_at)
    }));

    setAssets(formattedAssets);
  };

  const loadTransactions = async (portfolioId: string) => {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('portfolio_id', portfolioId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const formattedTransactions: Transaction[] = data.map(tx => ({
      id: tx.id,
      type: tx.type as 'buy' | 'sell',
      symbol: tx.symbol,
      name: tx.name || '',
      quantity: Number(tx.quantity),
      price: Number(tx.price),
      total: Number(tx.total),
      fee: Number(tx.fee),
      timestamp: new Date(tx.created_at)
    }));

    setTransactions(formattedTransactions);
  };

  const updateBalance = async (newBalance: number) => {
    if (!portfolioId) return;

    try {
      const { error } = await supabase
        .from('portfolios')
        .update({ base_balance: newBalance })
        .eq('id', portfolioId);

      if (error) throw error;
      setBalance(newBalance);
    } catch (error) {
      console.error('Error updating balance:', error);
      toast({
        title: "Erro ao atualizar saldo",
        description: "Não foi possível salvar o novo saldo.",
        variant: "destructive",
      });
    }
  };

  const buyAsset = async (symbol: string, name: string, quantity: number, price: number, total: number) => {
    if (!portfolioId) return;

    console.log('buyAsset called with:', { symbol, name, quantity, price, total });

    try {
      const fee = total * 0.001;
      const netAmount = total - fee;

      // Create transaction
      const { data: transaction, error: transactionError } = await supabase
        .from('transactions')
        .insert([{
          portfolio_id: portfolioId,
          type: 'buy',
          symbol,
          name,
          quantity,
          price,
          total,
          fee
        }])
        .select()
        .single();

      if (transactionError) throw transactionError;

      // Check if asset already exists for this portfolio
      const { data: existingAsset } = await supabase
        .from('portfolio_assets')
        .select('*')
        .eq('portfolio_id', portfolioId)
        .eq('symbol', symbol)
        .maybeSingle();

      if (existingAsset) {
        // Update existing asset
        console.log('Updating existing asset:', existingAsset.id);
        const newQuantity = Number(existingAsset.quantity) + quantity;
        const newTotalInvested = Number(existingAsset.total_invested) + total;
        const newAveragePrice = newTotalInvested / newQuantity;

        const { error: updateError } = await supabase
          .from('portfolio_assets')
          .update({
            quantity: newQuantity,
            total_invested: newTotalInvested,
            average_price: newAveragePrice,
            current_price: price
          })
          .eq('id', existingAsset.id);

        if (updateError) {
          console.error('Error updating asset:', updateError);
          throw updateError;
        }
        console.log('Asset updated successfully');
      } else {
        // Create new asset
        console.log('Creating new asset for symbol:', symbol);
        const { data: newAsset, error: createError } = await supabase
          .from('portfolio_assets')
          .insert({
            portfolio_id: portfolioId,
            symbol,
            name,
            quantity,
            average_price: price,
            current_price: price,
            total_invested: total
          })
          .select()
          .single();

        if (createError) {
          console.error('Error creating asset:', createError);
          throw createError;
        }
        console.log('New asset created:', newAsset);
      }

      console.log('Asset operation completed successfully, updating balance...');

      // Update balance in database
      const { error: balanceError } = await supabase
        .from('portfolios')
        .update({ base_balance: balance - total })
        .eq('id', portfolioId);

      if (balanceError) {
        console.error('Error updating balance:', balanceError);
        throw balanceError;
      }

      // Update local balance
      setBalance(balance - total);

      console.log('Balance updated successfully, reloading portfolio data...');

      // Reload data to reflect changes
      await Promise.all([
        loadAssets(portfolioId),
        loadTransactions(portfolioId)
      ]);

      console.log('Portfolio data reloaded successfully');

      toast({
        title: "Compra realizada!",
        description: `Você comprou $${total} de ${symbol}`,
      });

    } catch (error) {
      console.error('Error buying asset:', error);
      toast({
        title: "Erro na compra",
        description: "Não foi possível realizar a compra.",
        variant: "destructive",
      });
    }
  };

  const sellAsset = async (symbol: string, name: string, quantity: number, price: number) => {
    if (!portfolioId) return;

    try {
      const total = quantity * price;
      const fee = total * 0.001;
      const netAmount = total - fee;

      // Create transaction
      const { error: transactionError } = await supabase
        .from('transactions')
        .insert([{
          portfolio_id: portfolioId,
          type: 'sell',
          symbol,
          name,
          quantity,
          price,
          total,
          fee
        }]);

      if (transactionError) throw transactionError;

      // Update asset
      const { data: existingAsset, error: assetFetchError } = await supabase
        .from('portfolio_assets')
        .select('*')
        .eq('portfolio_id', portfolioId)
        .eq('symbol', symbol)
        .single();

      if (assetFetchError) throw assetFetchError;

      const newQuantity = Number(existingAsset.quantity) - quantity;
      
      if (newQuantity <= 0) {
        // Remove asset completely
        const { error: deleteError } = await supabase
          .from('portfolio_assets')
          .delete()
          .eq('id', existingAsset.id);

        if (deleteError) throw deleteError;
      } else {
        // Update asset quantity and total invested
        const soldPortion = quantity / Number(existingAsset.quantity);
        const newTotalInvested = Number(existingAsset.total_invested) * (1 - soldPortion);

        const { error: updateError } = await supabase
          .from('portfolio_assets')
          .update({
            quantity: newQuantity,
            total_invested: newTotalInvested,
            current_price: price
          })
          .eq('id', existingAsset.id);

        if (updateError) throw updateError;
      }

      // Update balance in database
      const { error: balanceError } = await supabase
        .from('portfolios')
        .update({ base_balance: balance + netAmount })
        .eq('id', portfolioId);

      if (balanceError) throw balanceError;
      
      // Update local balance
      setBalance(balance + netAmount);

      // Reload data
      await Promise.all([
        loadAssets(portfolioId),
        loadTransactions(portfolioId)
      ]);

      toast({
        title: "Venda realizada!",
        description: `Você vendeu ${quantity.toFixed(6)} ${symbol} por $${netAmount.toFixed(2)}`,
      });

    } catch (error) {
      console.error('Error selling asset:', error);
      toast({
        title: "Erro na venda",
        description: "Não foi possível realizar a venda.",
        variant: "destructive",
      });
    }
  };

  const updateAssetPrices = async (cryptoData: any[]) => {
    if (!portfolioId) return;
    
    setAssets(prevAssets => 
      prevAssets.map(asset => {
        const cryptoInfo = cryptoData.find(c => c.symbol === asset.symbol);
        return cryptoInfo ? { ...asset, currentPrice: cryptoInfo.current_price } : asset;
      })
    );

    // Update current prices in database
    for (const crypto of cryptoData) {
      await supabase
        .from('portfolio_assets')
        .update({ current_price: crypto.current_price })
        .eq('portfolio_id', portfolioId)
        .eq('symbol', crypto.symbol);
    }
  };

  return {
    balance,
    assets,
    transactions,
    loading,
    updateBalance,
    buyAsset,
    sellAsset,
    updateAssetPrices
  };
};
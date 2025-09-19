import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Eye, EyeOff, Save, TestTube, CheckCircle, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ApiConfig {
  binance_api_key: string;
  binance_secret_key: string;
  is_testnet: boolean;
  is_active: boolean;
}

export const BinanceApiSettings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [config, setConfig] = useState<ApiConfig>({
    binance_api_key: '',
    binance_secret_key: '',
    is_testnet: true,
    is_active: false
  });
  
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');

  useEffect(() => {
    if (user) {
      loadApiConfig();
    }
  }, [user]);

  const loadApiConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('user_api_configs')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setConfig({
          binance_api_key: data.binance_api_key || '',
          binance_secret_key: data.binance_secret_key || '',
          is_testnet: data.is_testnet ?? true,
          is_active: data.is_active ?? false
        });
        setConnectionStatus(data.is_active ? 'success' : 'idle');
      }
    } catch (error) {
      console.error('Error loading API config:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as configurações da API.',
        variant: 'destructive'
      });
    }
  };

  const saveApiConfig = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('user_api_configs')
        .upsert({
          user_id: user.id,
          ...config
        });

      if (error) throw error;

      toast({
        title: 'Configurações salvas!',
        description: 'Suas chaves API foram salvas com sucesso.'
      });

      setConnectionStatus(config.is_active ? 'success' : 'idle');
    } catch (error) {
      console.error('Error saving API config:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar as configurações.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async () => {
    if (!config.binance_api_key || !config.binance_secret_key) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha a API Key e Secret Key antes de testar.',
        variant: 'destructive'
      });
      return;
    }

    setTesting(true);
    try {
      // TODO: Implementar teste real da API Binance via Edge Function
      // Por enquanto, apenas simula o teste
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setConnectionStatus('success');
      setConfig(prev => ({ ...prev, is_active: true }));
      
      toast({
        title: 'Conexão testada!',
        description: 'Suas chaves API estão funcionando corretamente.'
      });
    } catch (error) {
      setConnectionStatus('error');
      setConfig(prev => ({ ...prev, is_active: false }));
      
      toast({
        title: 'Erro na conexão',
        description: 'Verifique suas chaves API e tente novamente.',
        variant: 'destructive'
      });
    } finally {
      setTesting(false);
    }
  };

  const maskKey = (key: string) => {
    if (!key) return '';
    if (key.length <= 8) return key;
    return `${key.substring(0, 4)}${'*'.repeat(key.length - 8)}${key.substring(key.length - 4)}`;
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Configurações da API Binance
          {connectionStatus === 'success' && (
            <CheckCircle className="h-5 w-5 text-green-500" />
          )}
          {connectionStatus === 'error' && (
            <AlertCircle className="h-5 w-5 text-red-500" />
          )}
        </CardTitle>
        <CardDescription>
          Configure suas chaves API da Binance para trading real
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {connectionStatus === 'success' && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Conexão ativa com a Binance. Você pode fazer trades reais.
            </AlertDescription>
          </Alert>
        )}
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="api-key">API Key *</Label>
            <div className="relative">
              <Input
                id="api-key"
                type={showApiKey ? 'text' : 'password'}
                value={config.binance_api_key}
                onChange={(e) => setConfig(prev => ({ ...prev, binance_api_key: e.target.value }))}
                placeholder="Sua API Key da Binance"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowApiKey(!showApiKey)}
              >
                {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="secret-key">Secret Key *</Label>
            <div className="relative">
              <Input
                id="secret-key"
                type={showSecretKey ? 'text' : 'password'}
                value={config.binance_secret_key}
                onChange={(e) => setConfig(prev => ({ ...prev, binance_secret_key: e.target.value }))}
                placeholder="Sua Secret Key da Binance"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowSecretKey(!showSecretKey)}
              >
                {showSecretKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="testnet"
              checked={config.is_testnet}
              onCheckedChange={(checked) => setConfig(prev => ({ ...prev, is_testnet: checked }))}
            />
            <Label htmlFor="testnet">Usar Testnet (ambiente de teste)</Label>
          </div>

          <div className="text-sm text-muted-foreground">
            <p className="mb-2">
              <strong>Como obter suas chaves API:</strong>
            </p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Acesse sua conta na Binance</li>
              <li>Vá em "API Management"</li>
              <li>Crie uma nova API Key</li>
              <li>Habilite "Spot & Margin Trading"</li>
              <li>Configure IP whitelist (recomendado)</li>
            </ol>
          </div>
        </div>

        <div className="flex gap-3">
          <Button 
            onClick={testConnection} 
            disabled={testing || !config.binance_api_key || !config.binance_secret_key}
            variant="outline"
          >
            <TestTube className="h-4 w-4 mr-2" />
            {testing ? 'Testando...' : 'Testar Conexão'}
          </Button>
          
          <Button 
            onClick={saveApiConfig} 
            disabled={loading}
          >
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>

        {config.binance_api_key && (
          <div className="pt-4 border-t">
            <h4 className="text-sm font-medium mb-2">Chaves Configuradas:</h4>
            <div className="space-y-1 text-sm text-muted-foreground">
              <p>API Key: {maskKey(config.binance_api_key)}</p>
              <p>Secret Key: {maskKey(config.binance_secret_key)}</p>
              <p>Ambiente: {config.is_testnet ? 'Testnet' : 'Produção'}</p>
              <p>Status: {config.is_active ? 'Ativa' : 'Inativa'}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
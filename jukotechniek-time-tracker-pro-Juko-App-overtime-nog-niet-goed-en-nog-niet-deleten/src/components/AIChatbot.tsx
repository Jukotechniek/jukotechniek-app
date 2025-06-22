import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Send, Bot, User, Settings } from 'lucide-react';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: string;
}

interface AIConfig {
  id: string;
  webhook_url: string | null;
  is_enabled: boolean;
}

const AIChatbot: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      text: 'Hallo! Ik ben je AI-assistent. Hoe kan ik je vandaag helpen?',
      isUser: false,
      timestamp: new Date().toISOString(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [aiConfig, setAiConfig] = useState<AIConfig | null>(null);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [loadingConfig, setLoadingConfig] = useState(false);

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (isAdmin) fetchAIConfig();
  }, [isAdmin]);

  const fetchAIConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_assistant_config')
        .select('*')
        .single();
      if (!error && data) {
        setAiConfig(data);
        setWebhookUrl(data.webhook_url || '');
      }
    } catch {
      toast({ title: 'Error', description: 'Kon AI-configuratie niet ophalen', variant: 'destructive' });
    }
  };

  const saveAIConfig = async () => {
    if (!isAdmin) return;
    setLoadingConfig(true);
    const configData = { webhook_url: webhookUrl, is_enabled: true, created_by: user?.id };
    let error;
    if (aiConfig) {
      ({ error } = await supabase.from('ai_assistant_config').update(configData).eq('id', aiConfig.id));
    } else {
      ({ error } = await supabase.from('ai_assistant_config').insert([configData]));
    }
    if (error)
      toast({ title: 'Error', description: 'Kon AI-configuratie niet opslaan', variant: 'destructive' });
    else {
      toast({ title: 'Success', description: 'AI-configuratie succesvol opgeslagen' });
      fetchAIConfig();
      setShowConfig(false);
    }
    setLoadingConfig(false);
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || !user) return;
    const userMsg: Message = {
      id: Date.now().toString(),
      text: inputMessage.trim(),
      isUser: true,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    if (!aiConfig?.webhook_url || !aiConfig.is_enabled) {
      toast({ title: 'Error', description: 'AI niet geconfigureerd', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    try {
      const resp = await fetch(aiConfig.webhook_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userMsg),
      });
      const data = await resp.json();
      const botMsg: Message = {
        id: Date.now().toString(),
        text: data.text,
        isUser: false,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch {
      toast({ title: 'Error', description: 'Bericht versturen mislukt', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">AI Assistent</h1>
            <p className="text-gray-600">
              {isAdmin ? 'Configureer en chat met AI-assistent' : 'Chat met AI-assistent'}
            </p>
          </div>
          {isAdmin && (
            <Button onClick={() => setShowConfig(!showConfig)} variant="outline" className="border-red-600 text-red-600 hover:bg-red-50">
              <Settings className="h-4 w-4 mr-2" />
              {showConfig ? 'Sluiten' : 'Configureren'}
            </Button>
          )}
        </div>

        {/* Config Panel */}
        {isAdmin && showConfig && (
          <Card className="bg-white mb-6 shadow-sm">
            <CardHeader>
              <CardTitle>AI Assistent Configuratie</CardTitle>
            </CardHeader>
            <CardContent>
              <Label htmlFor="webhookUrl">Webhook URL</Label>
              <Input
                id="webhookUrl"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://jouw-n8n-endpoint"
                className="mb-4 focus:ring-red-500 focus:border-red-500"
              />
              <Button onClick={saveAIConfig} disabled={loadingConfig} className="bg-red-600 hover:bg-red-700 text-white">
                {loadingConfig ? 'Opslaan...' : 'Opslaan'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Chat */}
        <Card className="bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Bot className="h-5 w-5 mr-2 text-red-600" /> Chat
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="h-96 overflow-y-auto p-4 space-y-4">
              {messages.map((m) => (
                <div key={m.id} className={`flex ${m.isUser ? 'justify-end' : 'justify-start'}`}>
                  <div className={`px-4 py-2 rounded-lg max-w-md ${m.isUser ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-900'}`}>
                    <div className="flex items-start space-x-2">
                      {m.isUser ? <User className="h-4 w-4 mt-0.5" /> : <Bot className="h-4 w-4 mt-0.5 text-red-600" />}
                      <div>
                        <p className="text-sm">{m.text}</p>
                        <p className="text-xs mt-1 text-gray-500">
                          {new Date(m.timestamp).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="px-4 py-2 rounded-lg bg-gray-100">
                    <div className="flex items-center space-x-1">
                      <Bot className="h-4 w-4 text-red-600" />
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="border-t p-4">
              <div className="flex space-x-2">
                <Input
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Typ je bericht..."
                  disabled={isLoading}
                  className="flex-1 focus:ring-red-500 focus:border-red-500"
                />
                <Button onClick={sendMessage} disabled={isLoading || !inputMessage.trim()} className="bg-red-600 hover:bg-red-700 text-white">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Live Indicator */}
        <div className="mt-4 flex items-center justify-end">
          <span
            className={`h-2 w-2 rounded-full ${aiConfig?.is_enabled ? 'bg-green-500' : 'bg-red-500'}`}
          ></span>
          <span className="ml-2 text-sm font-medium">
            {aiConfig?.is_enabled ? 'Live' : 'Offline'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default AIChatbot;


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
  timestamp: Date;
}

interface AIConfig {
  id: string;
  webhook_url: string | null;
  is_enabled: boolean;
}

const AIChatbot = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Hallo! Ik ben je AI-assistent. Hoe kan ik je vandaag helpen?',
      isUser: false,
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [aiConfig, setAiConfig] = useState<AIConfig | null>(null);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [isChatbotOnline, setIsChatbotOnline] = useState<boolean | null>(null);

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (isAdmin) {
      fetchAIConfig();
    }
  }, [isAdmin]);

  const fetchAIConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_assistant_config')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching AI config:', error);
        return;
      }

      if (data) {
        setAiConfig(data);
        setWebhookUrl(data.webhook_url || '');
        checkChatbotStatus(data.webhook_url);
      }
    } catch (error) {
      console.error('Error fetching AI config:', error);
    }
  };

  const checkChatbotStatus = async (url: string | null) => {
    if (!url) {
      setIsChatbotOnline(null);
      return;
    }
    try {
      const res = await fetch(url, { method: 'HEAD' });
      setIsChatbotOnline(res.ok);
    } catch (error) {
      console.error('Error checking chatbot status:', error);
      setIsChatbotOnline(false);
    }
  };

  const saveAIConfig = async () => {
    if (!isAdmin) return;

    setLoadingConfig(true);
    try {
      const configData = {
        webhook_url: webhookUrl,
        is_enabled: true,
        created_by: user?.id
      };

      let error;
      if (aiConfig) {
        const { error: updateError } = await supabase
          .from('ai_assistant_config')
          .update(configData)
          .eq('id', aiConfig.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('ai_assistant_config')
          .insert([configData]);
        error = insertError;
      }

      if (error) {
        console.error('Error saving AI config:', error);
        toast({
          title: "Error",
          description: "Failed to save AI configuration",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Success",
        description: "AI configuration saved successfully"
      });

      fetchAIConfig();
      checkChatbotStatus(webhookUrl);
      setShowConfig(false);
    } catch (error) {
      console.error('Error saving AI config:', error);
      toast({
        title: "Error",
        description: "Failed to save AI configuration",
        variant: "destructive"
      });
    } finally {
      setLoadingConfig(false);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputMessage,
      isUser: true,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    await checkChatbotStatus(aiConfig?.webhook_url || null);

    try {
      // Check if AI is configured and enabled
      if (!aiConfig?.webhook_url || !aiConfig.is_enabled) {
        const botMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: 'AI-assistent is momenteel niet geconfigureerd. Neem contact op met uw beheerder.',
          isUser: false,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, botMessage]);
        return;
      }

      // Send message to webhook and use the response
      const response = await fetch(aiConfig.webhook_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: inputMessage,
          userId: user?.id,
          userName: user?.fullName,
          timestamp: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error('Chatbot gaf een foutmelding');
      }

      const data = await response.json();
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: data.response || data.message || 'Geen antwoord ontvangen.',
        isUser: false,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botMessage]);

    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: isChatbotOnline === false
          ? 'De chatbot is momenteel offline.'
          : 'Sorry, er ging iets mis bij het versturen van je bericht. Probeer het later opnieuw.',
        isUser: false,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
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
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">AI Assistent</h1>
            <p className="text-gray-600">
              {isAdmin ? 'Configureer en chat met de AI-assistent' : 'Chat met de AI-assistent'}
            </p>
          </div>
          {isAdmin && (
            <Button
              onClick={() => setShowConfig(!showConfig)}
              variant="outline"
              className="border-red-600 text-red-600 hover:bg-red-50"
            >
              <Settings className="h-4 w-4 mr-2" />
              {showConfig ? 'Sluiten' : 'Configureren'}
            </Button>
          )}
        </div>

        {/* Admin Configuration Panel */}
        {isAdmin && showConfig && (
          <Card className="bg-white mb-6 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900">
                AI Assistent Configuratie
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="webhookUrl">Webhook URL</Label>
                  <Input
                    id="webhookUrl"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    placeholder="https://hooks.zapier.com/hooks/catch/..."
                    className="focus:ring-red-500 focus:border-red-500"
                  />
                  <p className="text-sm text-gray-600">
                    Configureer een Zapier webhook of andere service om berichten te ontvangen
                  </p>
                </div>
                <div className="flex space-x-2">
                  <Button
                    onClick={saveAIConfig}
                    disabled={loadingConfig}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    {loadingConfig ? 'Opslaan...' : 'Configuratie Opslaan'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Chat Interface */}
        <Card className="bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900 flex items-center">
              <Bot className="h-5 w-5 mr-2 text-red-600" />
              Chat met AI Assistent
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {/* Messages */}
            <div className="h-96 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      message.isUser
                        ? 'bg-red-600 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <div className="flex items-start space-x-2">
                      {!message.isUser && <Bot className="h-4 w-4 mt-0.5 text-red-600" />}
                      {message.isUser && <User className="h-4 w-4 mt-0.5" />}
                      <div>
                        <p className="text-sm">{message.text}</p>
                        <p className={`text-xs mt-1 ${
                          message.isUser ? 'text-red-200' : 'text-gray-500'
                        }`}>
                          {message.timestamp.toLocaleTimeString('nl-NL', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="max-w-xs lg:max-w-md px-4 py-2 rounded-lg bg-gray-100">
                    <div className="flex items-center space-x-2">
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

            {/* Input */}
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
                <Button
                  onClick={sendMessage}
                  disabled={isLoading || !inputMessage.trim()}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Status */}
        {!isAdmin && (
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-600">
              AI-status: {aiConfig?.is_enabled ? (
                isChatbotOnline ? (
                  <span className="text-green-600 font-medium">Online</span>
                ) : (
                  <span className="text-yellow-600 font-medium">Offline</span>
                )
              ) : (
                <span className="text-red-600 font-medium">Niet geconfigureerd</span>
              )}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIChatbot;

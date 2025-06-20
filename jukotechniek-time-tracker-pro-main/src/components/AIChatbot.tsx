
import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
}

const AIChatbot = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: 'Hallo! Ik ben je JukoTechniek AI-assistent. Ik kan je helpen met vragen over werkuren, projecten, klanten en andere bedrijfsgerelateerde onderwerpen. Hoe kan ik je vandaag helpen?',
      isUser: false,
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [n8nWebhookUrl, setN8nWebhookUrl] = useState('');
  const [isConfigured, setIsConfigured] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Check if webhook URL is saved in localStorage
    const savedWebhookUrl = localStorage.getItem('n8n_webhook_url');
    if (savedWebhookUrl) {
      setN8nWebhookUrl(savedWebhookUrl);
      setIsConfigured(true);
    }
  }, []);

  const handleConfigureWebhook = () => {
    if (!n8nWebhookUrl.trim()) {
      toast({
        title: "Error",
        description: "Voer een geldige n8n webhook URL in",
        variant: "destructive"
      });
      return;
    }

    // Validate URL format
    try {
      new URL(n8nWebhookUrl);
    } catch {
      toast({
        title: "Error",
        description: "Ongeldige URL format",
        variant: "destructive"
      });
      return;
    }

    localStorage.setItem('n8n_webhook_url', n8nWebhookUrl);
    setIsConfigured(true);
    toast({
      title: "Success",
      description: "n8n webhook succesvol geconfigureerd"
    });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isLoading) return;

    if (!isConfigured) {
      toast({
        title: "Error",
        description: "Configureer eerst de n8n webhook URL",
        variant: "destructive"
      });
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputMessage,
      isUser: true,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      console.log('Sending message to n8n webhook:', n8nWebhookUrl);
      
      const response = await fetch(n8nWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: inputMessage,
          userId: user?.id,
          userName: user?.fullName || user?.username,
          timestamp: new Date().toISOString(),
          context: 'jukotechniek_work_hours'
        })
      });

      let aiResponse = '';
      
      if (response.ok) {
        const data = await response.json();
        aiResponse = data.response || data.message || 'Ik heb je bericht ontvangen, maar kon geen antwoord genereren.';
      } else {
        console.error('n8n webhook error:', response.status, response.statusText);
        aiResponse = 'Sorry, ik ondervind momenteel technische problemen met de AI service. Probeer het later opnieuw.';
      }

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: aiResponse,
        isUser: false,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error calling n8n webhook:', error);
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: 'Sorry, ik kon geen verbinding maken met de AI service. Controleer je internetverbinding en probeer het opnieuw.',
        isUser: false,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMessage]);
      
      toast({
        title: 'Error',
        description: 'Er ging iets mis bij het versturen van je bericht. Probeer het opnieuw.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: '1',
        content: 'Hallo! Ik ben je JukoTechniek AI-assistent. Ik kan je helpen met vragen over werkuren, projecten, klanten en andere bedrijfsgerelateerde onderwerpen. Hoe kan ik je vandaag helpen?',
        isUser: false,
        timestamp: new Date()
      }
    ]);
  };

  const resetConfiguration = () => {
    localStorage.removeItem('n8n_webhook_url');
    setN8nWebhookUrl('');
    setIsConfigured(false);
    toast({
      title: "Success",
      description: "Webhook configuratie gereset"
    });
  };

  if (!isConfigured) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">AI Assistent Configuratie</h1>
            <p className="text-gray-600">Configureer je n8n webhook URL om de AI assistent te gebruiken</p>
          </div>

          <Card className="bg-white max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900">
                🔧 n8n Webhook Setup
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label htmlFor="webhook-url" className="block text-sm font-medium text-gray-700 mb-2">
                  n8n Webhook URL
                </label>
                <Input
                  id="webhook-url"
                  type="url"
                  value={n8nWebhookUrl}
                  onChange={(e) => setN8nWebhookUrl(e.target.value)}
                  placeholder="https://your-n8n-instance.com/webhook/ai-chat"
                  className="focus:ring-red-500 focus:border-red-500"
                />
              </div>
              
              <div className="text-sm text-gray-600">
                <p className="mb-2">Instructies:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Maak een n8n workflow met een webhook trigger</li>
                  <li>Voeg AI nodes toe (zoals OpenAI ChatGPT)</li>
                  <li>Configureer de response om een 'response' veld terug te sturen</li>
                  <li>Kopieer de webhook URL hierboven</li>
                </ol>
              </div>

              <Button 
                onClick={handleConfigureWebhook}
                className="w-full bg-red-600 hover:bg-red-700 text-white"
              >
                Configureer Webhook
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">AI Assistent</h1>
            <p className="text-gray-600">Stel vragen over werkuren, projecten en meer</p>
          </div>
          <div className="flex space-x-2">
            <Button
              onClick={resetConfiguration}
              variant="outline"
              className="border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              ⚙️ Reconfigure
            </Button>
            <Button
              onClick={clearChat}
              variant="outline"
              className="border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              🗑️ Chat Wissen
            </Button>
          </div>
        </div>

        <Card className="bg-white h-[600px] flex flex-col">
          <CardHeader className="border-b border-gray-200">
            <CardTitle className="text-lg font-semibold text-gray-900 flex items-center justify-between">
              <span>🤖 JukoTechniek AI Assistent</span>
              <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                ✓ n8n Connected
              </span>
            </CardTitle>
          </CardHeader>
          
          <CardContent className="flex-1 overflow-hidden p-0">
            <div className="h-full flex flex-col">
              {/* Messages Container */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      <p className={`text-xs mt-1 ${
                        message.isUser ? 'text-red-100' : 'text-gray-500'
                      }`}>
                        {message.timestamp.toLocaleTimeString('nl-NL', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                ))}
                
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 text-gray-900 max-w-xs lg:max-w-md px-4 py-2 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                        <p className="text-sm">AI denkt na...</p>
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>

              {/* Input Form */}
              <div className="border-t border-gray-200 p-4">
                <form onSubmit={handleSendMessage} className="flex space-x-2">
                  <Input
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="Typ je vraag hier..."
                    disabled={isLoading}
                    className="flex-1 focus:ring-red-500 focus:border-red-500"
                  />
                  <Button
                    type="submit"
                    disabled={isLoading || !inputMessage.trim()}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    ➤
                  </Button>
                </form>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AIChatbot;

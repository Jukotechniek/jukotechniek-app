
import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
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
      content: 'Hallo! Ik ben je JukoTechniek AI-assistent. Ik kan je helpen met vragen over werkuren, projecten en andere bedrijfsgerelateerde onderwerpen. Hoe kan ik je vandaag helpen?',
      isUser: false,
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isLoading) return;

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
      // Call the AI webhook function
      const { data, error } = await supabase.functions.invoke('ai-chat-webhook', {
        body: {
          message: inputMessage,
          userId: user?.id,
          context: 'jukotechniek_work_hours'
        }
      });

      if (error) {
        throw error;
      }

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: data.response || 'Sorry, ik kon geen antwoord genereren. Probeer het opnieuw.',
        isUser: false,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error calling AI webhook:', error);
      toast({
        title: 'Error',
        description: 'Er ging iets mis bij het versturen van je bericht. Probeer het opnieuw.',
        variant: 'destructive'
      });

      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: 'Sorry, ik ondervind momenteel technische problemen. Probeer het later opnieuw.',
        isUser: false,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: '1',
        content: 'Hallo! Ik ben je JukoTechniek AI-assistent. Ik kan je helpen met vragen over werkuren, projecten en andere bedrijfsgerelateerde onderwerpen. Hoe kan ik je vandaag helpen?',
        isUser: false,
        timestamp: new Date()
      }
    ]);
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">AI Assistent</h1>
            <p className="text-gray-600">Stel vragen over werkuren, projecten en meer</p>
          </div>
          <Button
            onClick={clearChat}
            variant="outline"
            className="border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            🗑️ Chat Wissen
          </Button>
        </div>

        <Card className="bg-white h-[600px] flex flex-col">
          <CardHeader className="border-b border-gray-200">
            <CardTitle className="text-lg font-semibold text-gray-900 flex items-center">
              🤖 JukoTechniek AI Assistent
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
                      <p className="text-sm">{message.content}</p>
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

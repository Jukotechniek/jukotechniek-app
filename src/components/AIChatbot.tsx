import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Send, Bot, User, Settings } from 'lucide-react';
import { PageLayout } from '@/components/ui/page-layout';
import {
  Dialog,
  DialogTrigger,
  DialogContent
} from '@/components/ui/dialog';
import type { Database, Tables } from '@/integrations/supabase/types';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: string;
  table?: Record<string, string>[];
  images?: string[];
  files?: { name: string; url: string }[];
}

interface AIConfig {
  id: string;
  webhook_url: string | null;
  report_webhook_url: string | null;
  is_enabled: boolean;
  type: string | null;
}

const AIChatbot: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([{
    id: 'welcome',
    text: 'Hallo! Ik ben Juko Bot. Hoe kan ik je helpen vandaag?',
    isUser: false,
    timestamp: new Date().toISOString(),
  }]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [aiConfig, setAiConfig] = useState<AIConfig | null>(null);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [reportWebhookUrl, setReportWebhookUrl] = useState('');
  const [loadingConfig, setLoadingConfig] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    
    // Haal altijd de hoogste session counter op uit de database
    const getNextSessionId = async () => {
      try {
        // Zoek naar bestaande session IDs voor deze gebruiker
        const { data: existingSessions } = await supabase
          .from('n8n_chat_histories')
          .select('session_id')
          .like('session_id', `${user.id}-%`);

        let nextCounter = 1;
        if (existingSessions && existingSessions.length > 0) {
          // Haal alle unieke session IDs op en vind de hoogste counter
          const sessionCounters = existingSessions
            .map(session => {
              const match = session.session_id?.match(/-(\d+)$/);
              return match ? parseInt(match[1], 10) : 0;
            })
            .filter(counter => counter > 0);
          
          if (sessionCounters.length > 0) {
            nextCounter = Math.max(...sessionCounters) + 1;
          }
        }

        const id = `${user.id}-${nextCounter}`;
        sessionStorage.setItem('jukobot_session_id', id);
        setSessionId(id);
        console.log('DEBUG user.id:', user.id, 'session_id:', id);
      } catch (error) {
        console.error('Error getting session ID:', error);
        // Fallback naar localStorage als database niet werkt
        const counterKey = `jukobot_session_counter_${user.id}`;
        let counter = parseInt(localStorage.getItem(counterKey) || '0', 10);
        counter += 1;
        localStorage.setItem(counterKey, counter.toString());
        const id = `${user.id}-${counter}`;
        sessionStorage.setItem('jukobot_session_id', id);
        setSessionId(id);
      }
    };

    // Genereer altijd een nieuwe session ID wanneer je naar de chatbot komt
    getNextSessionId();
  }, [user?.id]);

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    fetchAIConfig();
  }, []);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  const fetchAIConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_assistant_config')
        .select('*')
        .eq('type', 'chatbot')
        .single();
      if (!error && data) {
        setAiConfig(data as AIConfig);
        setWebhookUrl((data as AIConfig).webhook_url || '');
        setReportWebhookUrl((data as AIConfig).report_webhook_url || '');
      }
    } catch {
      toast({ title: 'Error', description: 'Kon AI-configuratie niet ophalen', variant: 'destructive' });
    }
  };

  const saveAIConfig = async () => {
    if (!isAdmin) return;
    setLoadingConfig(true);
    const configData = {
      webhook_url: webhookUrl,
      report_webhook_url: reportWebhookUrl,
      is_enabled: true,
      created_by: user?.id,
      type: 'chatbot',
    };
    let error;
    if (aiConfig) {
      ({ error } = await supabase
        .from('ai_assistant_config')
        .update(configData as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .eq('id', aiConfig.id));
    } else {
      ({ error } = await supabase
        .from('ai_assistant_config')
        .insert([configData as any])); // eslint-disable-line @typescript-eslint/no-explicit-any
    }
    if (error) {
      toast({ title: 'Error', description: 'Kon AI-configuratie niet opslaan', variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'AI-configuratie succesvol opgeslagen' });
      fetchAIConfig();
      setShowConfig(false);
    }
    setLoadingConfig(false);
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || !sessionId) return;
    if (!aiConfig?.webhook_url) {
      toast({ title: 'Error', description: 'AI niet (goed) geconfigureerd', variant: 'destructive' });
      return;
    }

    // userMsg zonder id voor de webhook
    const userMsg = {
      text: inputMessage.trim(),
      isUser: true,
      timestamp: new Date().toISOString(),
      session_id: sessionId,
    };
    // Voor de lokale state wel een id toevoegen
    setMessages((prev) => [...prev, { ...userMsg, id: Date.now().toString() }]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const resp = await fetch(aiConfig.webhook_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userMsg),
      });
      
      let data = await resp.json();
      
      // Als de response een array is, neem het eerste item
      if (Array.isArray(data)) {
        data = data[0];
      }

      const botMsg: Message = {
        id: Date.now().toString(),
        text: data.text,
        table: data.table || undefined,
        images: data.images || [],
        files: data.files || [],
        isUser: false,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (error) {
      console.error('Error sending message:', error);
      toast({ title: 'Error', description: 'Bericht versturen mislukt', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const reportMessage = async (messageId: string) => {
    if (!aiConfig?.report_webhook_url) {
      toast({
        title: 'Error',
        description: 'Report webhook niet geconfigureerd',
        variant: 'destructive',
      });
      return;
    }
    const reportedMessage = messages.find((m) => m.id === messageId);
    if (!reportedMessage) return;
    try {
      await fetch(aiConfig.report_webhook_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          user_id: user?.id,
          reported_message: reportedMessage,
          conversation: messages,
        }),
      });
      toast({
        title: 'Gemeld',
        description: 'Het bericht is gemeld aan de beheerder',
      });
    } catch {
      toast({
        title: 'Error',
        description: 'Kon bericht niet melden',
        variant: 'destructive',
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <PageLayout title="Juko Bot" subtitle="Chat voor assistentie, machine locaties en manuals">
      <div className="flex flex-col h-[calc(100vh-80px)] max-h-[100dvh] w-full bg-gray-50 rounded-lg shadow-md overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center px-4 py-3 border-b bg-white">
          <div className="flex items-center space-x-3">
            <Bot className="h-5 w-5 text-red-600" />
            <span className="text-lg font-semibold">Juko Bot</span>
            <span className={`h-2 w-2 rounded-full ${aiConfig?.is_enabled ? 'bg-green-500' : 'bg-red-500'}`}></span>
            <span className="text-xs font-medium text-gray-600">
              {aiConfig?.is_enabled ? 'Live' : 'Offline'}
            </span>
          </div>
          {isAdmin && (
            <Button onClick={() => setShowConfig(!showConfig)} variant="outline" className="border-red-600 text-red-600 hover:bg-red-50">
              <Settings className="h-4 w-4 mr-2" />
              {showConfig ? 'Sluiten' : 'Config'}
            </Button>
          )}
        </div>

        {/* Config */}
        {isAdmin && showConfig && (
          <Card className="bg-white mb-2 shadow-sm border-none">
            <CardHeader><CardTitle>AI Configuratie</CardTitle></CardHeader>
            <CardContent>
              <Label htmlFor="webhookUrl">Webhook URL</Label>
              <Input
                id="webhookUrl"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://jouw-n8n-endpoint"
                className="mb-4 focus:ring-red-500 focus:border-red-500"
              />
              <Label htmlFor="reportWebhookUrl">Report Webhook URL</Label>
              <Input
                id="reportWebhookUrl"
                value={reportWebhookUrl}
                onChange={(e) => setReportWebhookUrl(e.target.value)}
                placeholder="https://jouw-report-endpoint"
                className="mb-4 focus:ring-red-500 focus:border-red-500"
              />
              <Button onClick={saveAIConfig} disabled={loadingConfig} className="bg-red-600 hover:bg-red-700 text-white">
                {loadingConfig ? 'Opslaan...' : 'Opslaan'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Chat area */}
        <div className="flex-1 overflow-y-auto px-2 md:px-4 py-4 space-y-4 bg-gray-50" style={{ minHeight: 0 }}>
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.isUser ? 'justify-end' : 'justify-start'}`}>
              <div className={`px-4 py-2 rounded-2xl shadow-sm max-w-[90vw] md:max-w-2xl ${m.isUser ? 'bg-red-600 text-white' : 'bg-white text-gray-900 border border-gray-200'}`}>
                <div className="flex items-start space-x-2">
                  {m.isUser ? <User className="h-4 w-4 mt-0.5 flex-shrink-0" /> : <Bot className="h-4 w-4 mt-0.5 text-red-600 flex-shrink-0" />}
                  <div className="min-w-0 flex-1">
                    <div className="text-base break-words space-y-2">
                      <p>{m.text}</p>

                      {/* Inline afbeeldingen met modal en button voor mobiel */}
                      {m.images?.map((src, idx) => (
                        <Dialog key={idx}>
                          <DialogTrigger asChild>
                            <button
                              type="button"
                              style={{ padding: 0, border: 'none', background: 'none' }}
                              className="block"
                            >
                              <img
                                src={src}
                                alt={`image-${idx}`}
                                className="mt-2 max-w-full rounded border cursor-zoom-in hover:opacity-90 transition"
                              />
                            </button>
                          </DialogTrigger>
                          <DialogContent className="max-w-3xl p-0 overflow-hidden flex items-center justify-center">
                            <img src={src} alt={`preview-${idx}`} className="w-full h-auto object-contain" />
                          </DialogContent>
                        </Dialog>
                      ))}

                      {/* Downloadbare bestanden */}
                      {m.files?.map((file, idx) => (
                        <a
                          key={idx}
                          href={file.url}
                          download
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block mt-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition"
                        >
                          📎 {file.name}
                        </a>
                      ))}

                      {/* Tabellen */}
                      {m.table && m.table.length > 0 && (
                        <div className="overflow-x-auto mt-2">
                          <table className="min-w-full text-xs border border-gray-300">
                            <thead className="bg-gray-100">
                              <tr>
                                {Object.keys(m.table[0]).map((col) => (
                                  <th key={col} className="px-2 py-1 border font-bold text-left">{col}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {m.table.map((row, rowIndex) => (
                                <tr key={rowIndex}>
                                  {Object.values(row).map((val, i) => (
                                    <td key={i} className="px-2 py-1 border">{val}</td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                    <p className="text-xs mt-1 text-gray-400 text-right">
                      {new Date(m.timestamp).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    {!m.isUser && (
                      <div className="text-right mt-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs text-gray-500 hover:text-red-600"
                          onClick={() => reportMessage(m.id)}
                        >
                          Rapporteer fout antwoord
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="px-4 py-2 rounded-2xl bg-white border border-gray-200 shadow-sm">
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
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t p-2 md:p-4 bg-white sticky bottom-0 w-full z-10">
          <form className="flex w-full space-x-2" onSubmit={e => { e.preventDefault(); sendMessage(); }}>
            <Input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Typ je bericht..."
              disabled={isLoading || !sessionId}
              className="flex-1 focus:ring-red-500 focus:border-red-500 text-base"
              autoComplete="off"
            />
            <Button type="submit" disabled={isLoading || !inputMessage.trim() || !sessionId} className="bg-red-600 hover:bg-red-700 text-white px-3">
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
    </PageLayout>
  );
};

export default AIChatbot;
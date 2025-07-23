import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableHead, TableBody, TableRow, TableCell, TableHeader } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import TechnicianFilter from './TechnicianFilter';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { ChatHistory } from '@/types/chatHistory';

interface Technician { id: string; full_name: string; }

const ChatHistoryPage: React.FC = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatHistory[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [selectedTech, setSelectedTech] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const fetchTechnicians = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('role', 'technician')
      .order('full_name');
    if (!error && data) setTechnicians(data);
  };

  const fetchMessages = async () => {
    setLoading(true);
    // TODO: Regenerate Supabase types so n8n_chat_histories is included in Database
    let query = (supabase as any)
      .from('n8n_chat_histories')
      .select('*')
      .order('id', { ascending: false });

    if (selectedTech !== 'all') {
      query = query.eq('session_id', selectedTech);
    }
    // No date filtering since there is no created_at column

    const { data, error } = await query;
    if (!error && data) setMessages(data as ChatHistory[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchTechnicians();
  }, []);

  useEffect(() => {
    fetchMessages();
  }, [selectedTech, selectedDate]);

  if (user?.role !== 'admin') {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Geen toegang</h1>
          <p className="text-gray-600 mt-2">Alleen admins hebben toegang tot deze pagina.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Chatgeschiedenis</h1>
          <p className="text-gray-600">Overzicht van verzonden berichten naar de AI chatbot</p>
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <TechnicianFilter
            technicians={technicians.map(t => ({ id: t.id, name: t.full_name }))}
            selectedTechnician={selectedTech}
            onTechnicianChange={setSelectedTech}
          />
          <div>
            <label htmlFor="historyDate" className="block text-sm font-medium text-gray-700 mb-1">Datum</label>
            <Input
              id="historyDate"
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="w-40"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
          </div>
        ) : (
          <Card className="bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900">Berichten</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Datum</TableHead>
                    <TableHead>Monteur</TableHead>
                    <TableHead>Bericht</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {messages.map(msg => (
                    <TableRow key={msg.id}>
                      <TableCell>{msg.id}</TableCell>
                      <TableCell>{technicians.find(t => t.id === msg.session_id)?.full_name || msg.session_id}</TableCell>
                      <TableCell className="whitespace-pre-wrap">{typeof msg.message === 'object' ? msg.message.content : String(msg.message)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ChatHistoryPage;

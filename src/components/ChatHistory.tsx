import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableHead, TableBody, TableRow, TableCell, TableHeader } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import TechnicianFilter from './TechnicianFilter';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { ChatHistory } from '@/types/chatHistory';

interface Technician { id: string; full_name: string; role: string; }

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
      .select('id, full_name, role')
      .in('role', ['technician', 'opdrachtgever', 'admin'])
      .order('full_name');
    if (!error && data) setTechnicians(data);
  };

  const fetchMessages = async () => {
    setLoading(true);
    // TODO: Regenerate Supabase types so n8n_chat_histories is included in Database
    let query = (supabase as any)
      .from('n8n_chat_histories')
      .select('id, session_id, message, created_at')
      .order('created_at', { ascending: false });

    if (selectedTech !== 'all') {
      // session_id format is "userId-sessionCounter", so we need to filter by userId prefix
      query = query.like('session_id', `${selectedTech}-%`);
    }

    if (selectedDate) {
      const start = new Date(selectedDate);
      const end = new Date(selectedDate);
      end.setDate(end.getDate() + 1);
      query = query.gte('created_at', start.toISOString()).lt('created_at', end.toISOString());
    }

    const { data, error } = await query;
    if (!error && data) {
      console.log('Chat messages data:', data); // Debug log
      setMessages(data as ChatHistory[]);
    } else {
      console.error('Error fetching messages:', error);
    }
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
          <p className="text-gray-600">Overzicht van verzonden berichten naar de AI chatbot van alle gebruikers</p>
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <TechnicianFilter
            technicians={technicians.map(t => ({ id: t.id, name: `${t.full_name} (${t.role === 'technician' ? 'Monteur' : t.role === 'opdrachtgever' ? 'Opdrachtgever' : 'Admin'})` }))}
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
                    <TableHead>Gebruiker</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Bericht</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {messages.map(msg => {
                    // Extract user ID from session_id (format: "userId-sessionCounter")
                    // Remove the session counter part (everything after the last dash)
                    const lastDashIndex = msg.session_id.lastIndexOf('-');
                    const userId = lastDashIndex !== -1 ? msg.session_id.substring(0, lastDashIndex) : msg.session_id;
                    
                    const user = technicians.find(t => t.id === userId);
                    const userName = user ? `${user.full_name} (${user.role === 'technician' ? 'Monteur' : user.role === 'opdrachtgever' ? 'Opdrachtgever' : 'Admin'})` : userId;
                    const role = typeof msg.message === 'object' && 'role' in msg.message ? (msg.message.role === 'assistant' ? 'Bot' : msg.message.role) : '';
                    
                    // Fix date display - use created_at if available, otherwise try to format the id as a date
                    let dateDisplay = '';
                    if ((msg as any).created_at) {
                      dateDisplay = new Date((msg as any).created_at).toLocaleString('nl-NL', { 
                        dateStyle: 'short', 
                        timeStyle: 'short' 
                      });
                    } else if (typeof msg.id === 'number' && msg.id > 1000000000000) {
                      // If id is a timestamp, convert it to a date
                      dateDisplay = new Date(msg.id).toLocaleString('nl-NL', { 
                        dateStyle: 'short', 
                        timeStyle: 'short' 
                      });
                    } else {
                      dateDisplay = `ID: ${msg.id}`;
                    }
                    
                    return (
                      <TableRow key={msg.id}>
                        <TableCell>{dateDisplay}</TableCell>
                        <TableCell>{userName}</TableCell>
                        <TableCell>{role}</TableCell>
                        <TableCell className="whitespace-pre-wrap">{typeof msg.message === 'object' ? msg.message.content : String(msg.message)}</TableCell>
                      </TableRow>
                    );
                  })}
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

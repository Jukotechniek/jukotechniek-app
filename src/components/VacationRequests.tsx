import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { VacationRequest } from '@/types/vacation';

const VacationRequests: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState<VacationRequest[]>([]);
  const [selectedRange, setSelectedRange] = useState<{ from: Date; to?: Date }>();
  const [loading, setLoading] = useState(true);
  const isAdmin = user?.role === 'admin';

  const fetchRequests = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('vacation_requests')
      .select('*, profiles!vacation_requests_technician_id_fkey(full_name)')
      .order('start_date');
    if (error) console.error(error);
    const formatted = (data || []).map(r => ({
      id: r.id,
      technicianId: r.technician_id,
      technicianName: r.profiles?.full_name || '',
      startDate: r.start_date,
      endDate: r.end_date,
      status: (r.status as VacationRequest['status']) || 'pending',
      approvedBy: r.approved_by,
    }));
    setRequests(formatted);
    setLoading(false);
  };

  useEffect(() => { fetchRequests(); }, []);

  const submitRequest = async () => {
    if (!selectedRange?.from || !selectedRange.to) return;
    const { error } = await supabase.from('vacation_requests').insert([
      {
        technician_id: user?.id,
        start_date: selectedRange.from.toISOString().split('T')[0],
        end_date: selectedRange.to.toISOString().split('T')[0],
        status: 'pending',
      },
    ]);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    try {
      await supabase.functions.invoke('vacation-request-email', {
        body: {
          technicianId: user?.id,
          startDate: selectedRange.from.toISOString(),
          endDate: selectedRange.to.toISOString(),
        },
      });
    } catch (err) {
      console.error('Email function error', err);
    }
    toast({ title: 'Aanvraag verstuurd', description: 'Je vrije dag is aangevraagd' });
    setSelectedRange(undefined);
    fetchRequests();
  };

  const updateStatus = async (id: string, status: 'approved' | 'denied') => {
    const { error } = await supabase
      .from('vacation_requests')
      .update({ status, approved_by: user?.id })
      .eq('id', id);
    if (error) console.error(error);
    fetchRequests();
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-3xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Vrije dag aanvragen</CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar mode="range" selected={selectedRange} onSelect={setSelectedRange} />
            <Button onClick={submitRequest} className="mt-4 bg-red-600 hover:bg-red-700 text-white">
              Aanvragen
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Vakantie aanvragen</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p>Loading...</p>
            ) : (
              <ul className="space-y-2">
                {requests.map(r => (
                  <li key={r.id} className="flex justify-between border-b pb-1">
                    <span>
                      {r.technicianName} {r.startDate} - {r.endDate} ({r.status})
                    </span>
                    {isAdmin && r.status === 'pending' && (
                      <span className="space-x-1">
                        <Button size="sm" onClick={() => updateStatus(r.id, 'approved')}>Akkoord</Button>
                        <Button size="sm" variant="outline" onClick={() => updateStatus(r.id, 'denied')}>Weiger</Button>
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default VacationRequests;

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
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [loading, setLoading] = useState(false);
  const isAdmin = user?.role === 'admin';

  // Fetch bestaande aanvragen
  const fetchRequests = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('vacation_requests')
      .select('*, profiles!vacation_requests_technician_id_fkey(full_name)')
      .order('start_date', { ascending: true });
    if (error) {
      console.error(error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setRequests(
        (data || []).map(r => ({
          id: r.id,
          technicianId: r.technician_id,
          technicianName: r.profiles?.full_name || '',
          startDate: r.start_date,
          endDate: r.end_date,
          status: (r.status as VacationRequest['status']) || 'pending',
          approvedBy: r.approved_by,
        }))
      );
    }
    setLoading(false);
  };

  useEffect(() => { fetchRequests(); }, []);

  // Voeg vakantie dagen toe
  const submitVacation = async () => {
    if (!user || selectedDates.length === 0) return;
    setLoading(true);

    const payload = selectedDates.map(d => ({
      technician_id: user.id,
      start_date: d.toISOString().slice(0, 10),
      end_date:   d.toISOString().slice(0, 10),
      status: 'pending',
    }));

    const { error } = await supabase
      .from('vacation_requests')
      .insert(payload);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Vakantie toegevoegd', description: 'Je aanvraag is opgeslagen.' });
      setSelectedDates([]);
      fetchRequests();
    }

    setLoading(false);
  };

  // Admin: update status
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
        {/* Vakantie aanvragen: multiple-dag selectie */}
        <Card>
          <CardHeader>
            <CardTitle>Vakantie aanvragen</CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="multiple"
              selected={selectedDates}
              onSelect={setSelectedDates}
              disabled={loading}
            />
            <Button
              onClick={submitVacation}
              className="mt-4 bg-green-600 hover:bg-green-700 text-white"
              disabled={loading || selectedDates.length === 0}
            >
              Voeg vakantie toe
            </Button>
          </CardContent>
        </Card>

        {/* Overzicht aanvragen */}
        <Card>
          <CardHeader>
            <CardTitle>Ingediende vakanties</CardTitle>
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


import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { VacationRequest } from '@/types/vacation';
import { PageLayout } from '@/components/ui/page-layout';

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
    <PageLayout 
      title="Vakantie Aanvragen" 
      subtitle="Beheer vakantiedagen en vrije tijd aanvragen."
    >
      <div className="max-w-4xl mx-auto space-y-6">
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
              className="rounded-md border"
            />
            <Button
              onClick={submitVacation}
              className="mt-4 bg-red-600 hover:bg-red-700 text-white"
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
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600" />
              </div>
            ) : (
              <div className="space-y-3">
                {requests.map(r => (
                  <div key={r.id} className="flex flex-col md:flex-row md:justify-between border-b pb-3 last:border-b-0">
                    <div className="mb-2 md:mb-0">
                      <span className="font-medium">{r.technicianName}</span>
                      <div className="text-sm text-gray-600">
                        {r.startDate} - {r.endDate}
                      </div>
                      <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                        r.status === 'approved' ? 'bg-green-100 text-green-800' :
                        r.status === 'denied' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {r.status === 'approved' ? 'Goedgekeurd' : 
                         r.status === 'denied' ? 'Afgewezen' : 'In behandeling'}
                      </span>
                    </div>
                    {isAdmin && r.status === 'pending' && (
                      <div className="flex space-x-2">
                        <Button 
                          size="sm" 
                          onClick={() => updateStatus(r.id, 'approved')}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          Akkoord
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => updateStatus(r.id, 'denied')}
                          className="border-red-600 text-red-600 hover:bg-red-50"
                        >
                          Weiger
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
                {requests.length === 0 && (
                  <p className="text-gray-500 text-center py-8">Geen vakantieaanvragen gevonden.</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
};

export default VacationRequests;

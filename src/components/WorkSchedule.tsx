import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { VacationRequest } from '@/types/vacation';
import TechnicianFilter from './TechnicianFilter';
import { isSameDay, eachDayOfInterval } from 'date-fns';

interface Technician { id: string; full_name: string; }

const WorkSchedulePage: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [selectedTech, setSelectedTech] = useState<string>('');
  const [workDays, setWorkDays] = useState<Date[]>([]);
  const [vacationDates, setVacationDates] = useState<Date[]>([]);
  const [requests, setRequests] = useState<VacationRequest[]>([]);
  const [selectedRange, setSelectedRange] = useState<{ from: Date; to?: Date }>();

  const isPlanner = user?.role === 'admin' || user?.role === 'opdrachtgever';
  const isAdmin = user?.role === 'admin';

  const fetchTechnicians = async () => {
    const { data } = await supabase.from('profiles').select('id, full_name');
    setTechnicians(data || []);
    if (!selectedTech && user) setSelectedTech(user.id);
  };

  const fetchSchedule = async (techId: string) => {
    const { data } = await supabase
      .from('work_schedules')
      .select('*')
      .eq('technician_id', techId);
    const dates = (data || [])
      .filter((d) => d.is_working)
      .map((d) => new Date(d.date));
    setWorkDays(dates);
  };

  const fetchRequests = async () => {
    let query = supabase
      .from('vacation_requests')
      .select('*, profiles!vacation_requests_technician_id_fkey(full_name)')
      .order('start_date');

    if (!isAdmin) {
      query = query.eq('technician_id', user?.id || '');
    } else if (selectedTech && selectedTech !== 'all') {
      query = query.eq('technician_id', selectedTech);
    }
    const { data } = await query;
    const formatted = (data || []).map((r) => ({
      id: r.id,
      technicianId: r.technician_id,
      technicianName: r.profiles?.full_name || '',
      startDate: r.start_date,
      endDate: r.end_date,
      status: (r.status as VacationRequest['status']) || 'pending',
      approvedBy: r.approved_by,
    }));
    setRequests(formatted);
    const dates: Date[] = [];
    formatted.forEach((r) => {
      const rangeDays = eachDayOfInterval({
        start: new Date(r.startDate),
        end: new Date(r.endDate),
      });
      dates.push(...rangeDays);
    });
    setVacationDates(dates);
  };

  useEffect(() => {
    fetchTechnicians();
  }, []);

  useEffect(() => {
    if (selectedTech) {
      fetchSchedule(selectedTech);
      fetchRequests();
    }
  }, [selectedTech]);

  const saveSchedule = async () => {
    if (!isPlanner) return;
    await supabase.from('work_schedules').delete().eq('technician_id', selectedTech);
    const inserts = workDays.map((d) => ({
      technician_id: selectedTech,
      date: d.toISOString().split('T')[0],
      is_working: true,
    }));
    const { error } = await supabase.from('work_schedules').insert(inserts);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else toast({ title: 'Opgeslagen', description: 'Planning bijgewerkt' });
  };

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
        {isPlanner && (
          <TechnicianFilter
            technicians={technicians.map(t => ({ id: t.id, name: t.full_name }))}
            selectedTechnician={selectedTech}
            onTechnicianChange={setSelectedTech}
          />
        )}
        <Card>
          <CardHeader>
            <CardTitle>Agenda</CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode={isPlanner ? 'single' : 'range'}
              selected={isPlanner ? undefined : selectedRange}
              onSelect={isPlanner ? undefined : setSelectedRange}
              onDayClick={isPlanner ? (day) => {
                setWorkDays((prev) => {
                  const exists = prev.some((d) => isSameDay(d, day));
                  return exists ? prev.filter((d) => !isSameDay(d, day)) : [...prev, day];
                });
              } : undefined}
              modifiers={{ working: workDays, vacation: vacationDates }}
              modifiersClassNames={{
                working: 'bg-green-200 text-green-800',
                vacation: 'bg-red-200 text-red-800',
              }}
            />
            {!isPlanner && (
              <Button onClick={submitRequest} className="mt-4 bg-red-600 hover:bg-red-700 text-white">Aanvragen</Button>
            )}
            {isPlanner && (
              <Button onClick={saveSchedule} className="mt-4 bg-red-600 hover:bg-red-700 text-white">Opslaan</Button>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Aanvragen</CardTitle>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default WorkSchedulePage;

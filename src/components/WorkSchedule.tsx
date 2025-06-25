import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { VacationRequest } from '@/types/vacation';
import TechnicianFilter from './TechnicianFilter';

interface Technician { id: string; full_name: string; }

const WorkSchedulePage: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [selectedTech, setSelectedTech] = useState<string>('');
  const [days, setDays] = useState<Date[]>([]);
  const [showLarge, setShowLarge] = useState(false);
  const [showRequest, setShowRequest] = useState(false);
  const [allSchedules, setAllSchedules] = useState<Record<string, Date[]>>({});
  const colors = ['bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500', 'bg-pink-500', 'bg-orange-500'];
  const techColors: Record<string, string> = {};
  const [requests, setRequests] = useState<VacationRequest[]>([]);
  const [selectedRange, setSelectedRange] = useState<{ from: Date; to?: Date }>();
  const [requestTab, setRequestTab] = useState<'pending' | 'approved' | 'denied'>('pending');

  const isPlanner = user?.role === 'admin' || user?.role === 'opdrachtgever';
  const isAdmin = user?.role === 'admin';

  const fetchTechnicians = async () => {
    const { data } = await supabase.from('profiles').select('id, full_name');
    const list = data || [];
    list.forEach((t, idx) => {
      techColors[t.id] = colors[idx % colors.length];
    });
    setTechnicians(list);
    if (!selectedTech && user) setSelectedTech(isPlanner ? 'all' : user.id);
  };

  const fetchSchedule = async (techId: string) => {
    if (techId === 'all') {
      const { data } = await supabase.from('work_schedules').select('*');
      const map: Record<string, Date[]> = {};
      (data || [])
        .filter(d => d.is_working)
        .forEach(d => {
          if (!map[d.technician_id]) map[d.technician_id] = [];
          map[d.technician_id].push(new Date(d.date));
        });
      setAllSchedules(map);
      setDays([]);
      return;
    }
    const { data } = await supabase
      .from('work_schedules')
      .select('*')
      .eq('technician_id', techId);
    const dates = (data || [])
      .filter(d => d.is_working)
      .map(d => new Date(d.date));
    setDays(dates);
    setAllSchedules({});
  };

  const fetchRequests = async () => {
    let query = supabase
      .from('vacation_requests')
      .select('*, profiles!vacation_requests_technician_id_fkey(full_name)')
      .order('start_date');

    if (!isAdmin) {
      query = query.eq('technician_id', user?.id || '');
    }
    const { data } = await query;
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
  };

  useEffect(() => {
    fetchTechnicians();
    if (isPlanner) fetchRequests();
  }, []);

  useEffect(() => {
    if (selectedTech) fetchSchedule(selectedTech);
  }, [selectedTech]);

  const vacationDates = requests
    .filter(
      r =>
        r.status !== 'denied' &&
        (selectedTech === 'all' || r.technicianId === selectedTech)
    )
    .flatMap(r => {
      const start = new Date(r.startDate);
      const end = new Date(r.endDate);
      const dates: Date[] = [];
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        dates.push(new Date(d));
      }
      return dates;
    });

  const saveSchedule = async () => {
    if (!isPlanner) return;
    await supabase
      .from('work_schedules')
      .delete()
      .eq('technician_id', selectedTech);
    const inserts = days.map(d => ({
      technician_id: selectedTech,
      date: d.toISOString().split('T')[0],
      is_working: true,
    }));
    const { error } = await supabase
      .from('work_schedules')
      .insert(inserts);
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
    setShowRequest(false);
    fetchRequests();
  };

  const updateStatus = async (id: string, status: 'approved' | 'denied') => {
    const { error } = await supabase
      .from('vacation_requests')
      .update({ status, approved_by: user?.id })
      .eq('id', id);
    if (error) {
      console.error(error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    toast({
      title: 'Bijgewerkt',
      description: `Aanvraag ${status === 'approved' ? 'goedgekeurd' : 'geweigerd'}`
    });
    setRequestTab(status);
    fetchRequests();
  };

  const deleteRequest = async (id: string) => {
    const { error } = await supabase.from('vacation_requests').delete().eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Verwijderd', description: 'Aanvraag verwijderd' });
    }
    fetchRequests();
  };

  const calendarModifiers: Record<string, Date[]> = { vacation: vacationDates };
  const modifierClasses: Record<string, string> = { vacation: 'bg-red-500 text-white' };
  if (selectedTech === 'all') {
    Object.entries(allSchedules).forEach(([id, list]) => {
      calendarModifiers[id] = list;
      modifierClasses[id] = `${techColors[id]} text-white`;
    });
  } else {
    calendarModifiers['work'] = days;
    modifierClasses['work'] = 'bg-green-500 text-white';
  }

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
              mode="multiple"
              selected={selectedTech === 'all' ? undefined : days}
              onSelect={selectedTech === 'all' ? undefined : isPlanner ? setDays : undefined}
              modifiers={calendarModifiers}
              modifiersClassNames={modifierClasses}
              classNames={{ day_selected: 'bg-green-500 text-white hov

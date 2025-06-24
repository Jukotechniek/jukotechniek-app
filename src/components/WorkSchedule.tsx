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
  const [allSchedules, setAllSchedules] = useState<Record<string, Date[]>>({});
  const colors = ['bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500', 'bg-pink-500', 'bg-orange-500'];
  const techColors: Record<string, string> = {};
  const [requests, setRequests] = useState<VacationRequest[]>([]);
  const [selectedRange, setSelectedRange] = useState<{ from: Date; to?: Date }>();
  const [requestTab, setRequestTab] = useState<'pending' | 'approved'>('pending');

  const isPlanner = user?.role === 'admin' || user?.role === 'opdrachtgever';
  const isAdmin = user?.role === 'admin';

  const fetchTechnicians = async () => {
    const { data } = await supabase.from('profiles').select('id, full_name');
    const list = data || [];
    list.forEach((t, idx) => {
      techColors[t.id] = colors[idx % colors.length];
    });
    setTechnicians(list);
    if (!selectedTech && user) setSelectedTech(user.id);
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
    .filter(r => r.status !== 'denied')
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
              classNames={{ day_selected: 'bg-green-500 text-white hover:bg-green-600' }}
            />
            {isPlanner && (
              <Button onClick={saveSchedule} className="mt-4 bg-red-600 hover:bg-red-700 text-white">
                Opslaan
              </Button>
            )}
            <Dialog open={showLarge} onOpenChange={setShowLarge}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="ml-2">
                  Vergroot
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-none w-screen h-screen">
                <Calendar
                  mode="multiple"
                  selected={selectedTech === 'all' ? undefined : days}
                  onSelect={selectedTech === 'all' ? undefined : isPlanner ? setDays : undefined}
                  modifiers={calendarModifiers}
                  modifiersClassNames={modifierClasses}
                  classNames={{ day_selected: 'bg-green-500 text-white hover:bg-green-600' }}
                />
              </DialogContent>
            </Dialog>
            <div className="mt-4 flex flex-wrap gap-4 text-sm">
              {selectedTech === 'all'
                ? technicians.map(t => (
                    <div key={t.id} className="flex items-center space-x-1">
                      <span className={`w-3 h-3 inline-block ${techColors[t.id]}`}></span>
                      <span>{t.full_name}</span>
                    </div>
                  ))
                : (
                    <>
                      <div className="flex items-center space-x-1">
                        <span className="w-3 h-3 bg-green-500 inline-block" />
                        <span>Werkdag</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <span className="w-3 h-3 bg-red-500 inline-block" />
                        <span>Vrij</span>
                      </div>
                    </>
                  )}
            </div>
          </CardContent>
        </Card>


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
            <CardTitle>Aanvragen</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={requestTab} onValueChange={setRequestTab} className="w-full">
              <TabsList>
                <TabsTrigger value="pending">Pending</TabsTrigger>
                <TabsTrigger value="approved">Goedgekeurd</TabsTrigger>
              </TabsList>
              <TabsContent value="pending">
                <ul className="space-y-2">
                  {requests.filter(r => r.status === 'pending').map(r => (
                    <li key={r.id} className="flex justify-between border-b pb-1">
                      <span>
                        {r.technicianName} {r.startDate} - {r.endDate} ({r.status})
                      </span>
                      {isAdmin && (
                        <span className="space-x-1">
                          <Button size="sm" onClick={async () => updateStatus(r.id, 'approved')}>Akkoord</Button>
                          <Button size="sm" variant="outline" onClick={async () => updateStatus(r.id, 'denied')}>Weiger</Button>
                        </span>
                      )}
                    </li>
                  ))}
                  {requests.filter(r => r.status === 'pending').length === 0 && (
                    <li className="text-center text-gray-500 py-4">Geen aanvragen gevonden</li>
                  )}
                </ul>
              </TabsContent>
              <TabsContent value="approved">
                <ul className="space-y-2">
                  {requests.filter(r => r.status === 'approved').map(r => (
                    <li key={r.id} className="flex justify-between border-b pb-1">
                      <span>
                        {r.technicianName} {r.startDate} - {r.endDate}
                      </span>
                    </li>
                  ))}
                  {requests.filter(r => r.status === 'approved').length === 0 && (
                    <li className="text-center text-gray-500 py-4">Geen aanvragen gevonden</li>
                  )}
                </ul>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default WorkSchedulePage;

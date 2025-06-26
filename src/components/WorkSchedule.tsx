import React, { useEffect, useState } from 'react';
import type { DateRange } from 'react-day-picker';
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

interface Technician {
  id: string;
  full_name: string;
}

type RequestTab = 'pending' | 'approved' | 'denied';
type Modifiers = Record<string, Date[]>;
type ModifierClasses = Record<string, string>;

const WorkSchedulePage: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [selectedTech, setSelectedTech] = useState<string>('all');
  const [workDays, setWorkDays] = useState<Date[]>([]);
  const [allSchedules, setAllSchedules] = useState<Modifiers>({});

  const [requests, setRequests] = useState<VacationRequest[]>([]);
  const [requestTab, setRequestTab] = useState<RequestTab>('pending');

  const [fullscreen, setFullscreen] = useState(false);

  // Voor “Vakantie toevoegen” dialog
  const [vacationRange, setVacationRange] = useState<DateRange | undefined>(undefined);
  const [isVacDialogOpen, setVacDialogOpen] = useState(false);

  const isPlanner = user?.role === 'admin' || user?.role === 'opdrachtgever';
  const isAdmin = user?.role === 'admin';

  // Colors voor overzicht in 'all' view
  const colors = [
    'bg-blue-500',
    'bg-green-500',
    'bg-yellow-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-orange-500',
  ];
  const techColors: Record<string, string> = {};

  // --- FETCHERS ---
  const fetchTechnicians = async () => {
    const { data } = await supabase.from('profiles').select('id, full_name');
    const list = data || [];
    const merged = [{ id: 'all', full_name: 'Alle monteurs' }, ...list];
    merged.forEach((t, i) => {
      if (t.id !== 'all') techColors[t.id] = colors[i % colors.length];
    });
    setTechnicians(merged);
  };

  const fetchSchedule = async (techId: string) => {
    if (techId === 'all') {
      const { data } = await supabase.from('work_schedules').select('*');
      const map: Modifiers = {};
      (data || [])
        .filter(d => d.is_working)
        .forEach(d => {
          map[d.technician_id] = map[d.technician_id] || [];
          map[d.technician_id].push(new Date(d.date));
        });
      setAllSchedules(map);
      setWorkDays([]);
    } else {
      const { data } = await supabase
        .from('work_schedules')
        .select('*')
        .eq('technician_id', techId);
      setWorkDays(
        (data || [])
          .filter(d => d.is_working)
          .map(d => new Date(d.date))
      );
      setAllSchedules({});
    }
  };

  const fetchRequests = async () => {
    let q = supabase
      .from('vacation_requests')
      .select('*, profiles!vacation_requests_technician_id_fkey(full_name)')
      .order('start_date');
    if (!isAdmin) q = q.eq('technician_id', user?.id || '');
    const { data } = await q;
    setRequests(
      (data || []).map(r => ({
        id: r.id,
        technicianId: r.technician_id,
        technicianName: r.profiles?.full_name || '',
        startDate: r.start_date,
        endDate: r.end_date,
        status: r.status as VacationRequest['status'],
        approvedBy: r.approved_by,
      }))
    );
  };

  useEffect(() => {
    fetchTechnicians();
    fetchRequests();
  }, []);

  useEffect(() => {
    if (selectedTech) fetchSchedule(selectedTech);
  }, [selectedTech]);

  // --- GEACCEPTEERDE VAKANTIEDAGEN voor kalender
  const vacationDays = requests
    .filter(r => r.status === 'approved')
    .flatMap(r => {
      const s = new Date(r.startDate),
        e = new Date(r.endDate),
        arr: Date[] = [];
      for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
        arr.push(new Date(d));
      }
      return arr;
    });

  // --- SAVE WORKDAYS ---
  const saveWorkDays = async () => {
    if (!isPlanner || selectedTech === 'all') return;
    await supabase.from('work_schedules').delete().eq('technician_id', selectedTech);
    const inserts = workDays.map(d => ({
      technician_id: selectedTech,
      date: d.toISOString().slice(0, 10),
      is_working: true,
    }));
    const { error } = await supabase.from('work_schedules').insert(inserts);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Werkdagen opgeslagen' });
    }
    fetchSchedule(selectedTech);
  };

  // --- QUICK FILL MON-FRI huidige maand ---
  const fillWorkDays = () => {
    const days: Date[] = [];
    const now = new Date(),
      year = now.getFullYear(),
      month = now.getMonth();
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      if (d.getDay() > 0 && d.getDay() < 6) days.push(new Date(d));
    }
    setWorkDays(days);
  };

  // --- ADD VACATION REQUEST ---
  const addVacation = async () => {
    if (!isPlanner || selectedTech === 'all' || !vacationRange?.from || !vacationRange.to) return;
    const start = vacationRange.from.toISOString().slice(0, 10);
    const end = vacationRange.to.toISOString().slice(0, 10);
    const { error } = await supabase.from('vacation_requests').insert([
      {
        technician_id: selectedTech,
        start_date: start,
        end_date: end,
        status: 'pending',
      },
    ]);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Vakantie aangevraagd' });
      setVacDialogOpen(false);
      setVacationRange(undefined);
      fetchRequests();
    }
  };

  // --- APPROVE / DENY REQUEST ---
  const updateStatus = async (id: string, status: 'approved' | 'denied') => {
    const { error } = await supabase
      .from('vacation_requests')
      .update({ status, approved_by: user?.id })
      .eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: status === 'approved' ? 'Goedgekeurd' : 'Afgewezen' });
    fetchRequests();
    fetchSchedule(selectedTech);
  };

  // --- CALENDAR modifiers & classes ---
  const modifiers: Modifiers = {
    work: workDays,
    vacation: vacationDays,
    ...allSchedules,
  };
  const classes: ModifierClasses = {
    work: 'bg-red-500 text-white',
    vacation: 'bg-green-500 text-white',
  };
  Object.keys(allSchedules).forEach(id => {
    classes[id] = techColors[id] + ' text-white';
  });

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-3xl mx-auto space-y-6">
        <TechnicianFilter
          technicians={technicians.map(t => ({ id: t.id, name: t.full_name }))}
          selectedTechnician={selectedTech}
          onTechnicianChange={setSelectedTech}
        />

        <Card>
          <CardHeader>
            <CardTitle>Agenda</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Calendar
                mode="multiple"
                selected={selectedTech === 'all' ? undefined : workDays}
                onSelect={v => {
                  if (isPlanner && selectedTech !== 'all') {
                    setWorkDays(v as Date[]);
                  }
                }}
                modifiers={modifiers}
                modifiersClassNames={classes}
                classNames={{ day_selected: 'ring-2 ring-offset-2 ring-gray-500' }}
              />
              <div className="absolute top-2 right-2">
                <Button variant="ghost" size="sm" onClick={() => setFullscreen(true)}>
                  Fullscreen
                </Button>
              </div>
              {fullscreen && (
                <div className="fixed inset-0 bg-white z-50 flex flex-col">
                  <div className="flex justify-end p-4">
                    <Button variant="ghost" onClick={() => setFullscreen(false)}>
                      ✕
                    </Button>
                  </div>
                  <div className="flex-1 overflow-auto p-6">
                    <Calendar
                      mode="multiple"
                      selected={selectedTech === 'all' ? undefined : workDays}
                      modifiers={modifiers}
                      modifiersClassNames={classes}
                      classNames={{ day_selected: 'ring-2 ring-offset-2 ring-gray-500' }}
                    />
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Legenda */}
        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          <div className="flex items-center space-x-1">
            <span className="w-3 h-3 bg-red-500 inline-block" />
            <span>Werkdag</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="w-3 h-3 bg-green-500 inline-block" />
            <span>Vakantie</span>
          </div>
          {selectedTech === 'all' &&
            technicians
              .filter(t => t.id !== 'all')
              .map(t => (
                <div key={t.id} className="flex items-center space-x-1">
                  <span className={`w-3 h-3 inline-block ${techColors[t.id]}`} />
                  <span>{t.full_name}</span>
                </div>
              ))}
        </div>

        {isPlanner && selectedTech !== 'all' && (
          <div className="flex gap-2">
            <Button onClick={fillWorkDays}>Vul werkdagen</Button>
            <Button onClick={saveWorkDays}>Opslaan werkdagen</Button>

            {/* Vakantie toevoegen */}
            <Dialog open={isVacDialogOpen} onOpenChange={setVacDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">Vakantie toevoegen</Button>
              </DialogTrigger>
              <DialogContent className="space-y-4">
                <h3 className="text-lg font-medium">Vakantie aanvragen</h3>
                <Calendar
                  mode="range"
                  selected={vacationRange}
                  onSelect={setVacationRange}
                />
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setVacDialogOpen(false)}>
                    Sluiten
                  </Button>
                  <Button
                    onClick={addVacation}
                    disabled={!(vacationRange?.from && vacationRange.to)}
                  >
                    Sla vakantie op
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Aanvragen</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={requestTab} onValueChange={v => setRequestTab(v as RequestTab)}>
              <TabsList>
                <TabsTrigger value="pending">Pending</TabsTrigger>
                <TabsTrigger value="approved">Goedgekeurd</TabsTrigger>
                <TabsTrigger value="denied">Afgekeurd</TabsTrigger>
              </TabsList>

              <TabsContent value="pending">
                {requests
                  .filter(r => r.status === 'pending')
                  .map(r => (
                    <div key={r.id} className="flex justify-between items-center mb-2">
                      <span>
                        {r.technicianName} {r.startDate} - {r.endDate}
                      </span>
                      {isAdmin && (
                        <div className="space-x-2">
                          <Button size="sm" onClick={() => updateStatus(r.id, 'approved')}>
                            Akkoord
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateStatus(r.id, 'denied')}
                          >
                            Weiger
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
              </TabsContent>

              <TabsContent value="approved">
                {requests
                  .filter(r => r.status === 'approved')
                  .map(r => (
                    <div key={r.id}>
                      {r.technicianName} {r.startDate} - {r.endDate}
                    </div>
                  ))}
              </TabsContent>

              <TabsContent value="denied">
                {requests
                  .filter(r => r.status === 'denied')
                  .map(r => (
                    <div key={r.id}>
                      {r.technicianName} {r.startDate} - {r.endDate}
                    </div>
                  ))}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default WorkSchedulePage;

/*
  **LET OP**: Pas in je Supabase-schema de unieke constraint op `work_schedules`
  aan zodat de primary key uit `(technician_id, date)` bestaat in plaats van alleen `technician_id`.
  Anders loop je tegen “duplicate key value violates unique constraint” aan.
*/

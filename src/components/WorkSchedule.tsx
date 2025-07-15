import React, { useEffect, useState } from 'react';
import type { DateRange, DayProps } from 'react-day-picker';
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

interface Technician { id: string; full_name: string }
type RequestTab = 'pending' | 'approved' | 'denied';
type Modifiers = Record<string, Date[]>;
type ModifierClasses = Record<string, string>;

// Format a Date to "YYYY-MM-DD" local string
function formatDateLocal(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

const WorkSchedulePage: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const role = user?.role?.toLowerCase() || '';
  const isPlanner = ['admin', 'opdrachtgever', 'administrator'].includes(role);
  const isAdmin = ['admin', 'administrator'].includes(role);

  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [selectedTech, setSelectedTech] = useState<string>('all');
  const [workDays, setWorkDays] = useState<Date[]>([]);
  const [allSchedules, setAllSchedules] = useState<Modifiers>({});
  const [techColors, setTechColors] = useState<Record<string, string>>({});
  const [requests, setRequests] = useState<VacationRequest[]>([]);
  const [requestTab, setRequestTab] = useState<RequestTab>('pending');
  const [vacationRange, setVacationRange] = useState<DateRange | undefined>(undefined);
  const [isVacDialogOpen, setVacDialogOpen] = useState(false);
  const [displayedMonth, setDisplayedMonth] = useState<Date>(new Date());

  // Build approved-vacation map per technician
  const vacSchedules: Modifiers = {};
  requests
    .filter(r => r.status === 'approved')
    .forEach(r => {
      const from = new Date(r.startDate);
      const to = new Date(r.endDate);
      for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
        vacSchedules[r.technicianId] = vacSchedules[r.technicianId] || [];
        vacSchedules[r.technicianId].push(new Date(d));
      }
    });

  // Color palette
  const colors = ['#3b82f6', '#ec4899', '#f59e0b', '#8b5cf6', '#10b981', '#f97316'];

  // Restrict non-planners to their own schedule
  useEffect(() => {
    if (!isPlanner && user?.id) {
      setSelectedTech(user.id);
    }
  }, [isPlanner, user]);

  // Fetch technicians & assign colors
  async function fetchTechnicians() {
    const { data } = await supabase.from('profiles').select('id, full_name');
    const list = data || [];

    // 1) Raw: alle technici uit de DB, of alleen de ingelogde tech als geen planner
    const raw = isPlanner
      ? list
      : list.filter(t => t.id === user?.id);

    // 2) Dedupe op id, mocht de DB duplicates bevatten
    const unique = raw.filter((t, i, arr) => arr.findIndex(x => x.id === t.id) === i);

    // 3) Kleuren toewijzen (skip 'all' want de filter voegt dat zelf)
    const cmap: Record<string, string> = {};
    unique.forEach((t, i) => {
      cmap[t.id] = colors[i % colors.length];
    });

    setTechnicians(unique);
    setTechColors(cmap);
  }

  // Fetch work schedules
  async function fetchSchedule(techId: string) {
    if (techId === 'all') {
      const { data } = await supabase.from('work_schedules').select('*');
      const map: Modifiers = {};
      (data || [])
        .filter(r => r.is_working)
        .forEach(r => {
          map[r.technician_id] = map[r.technician_id] || [];
          map[r.technician_id].push(new Date(r.date));
        });
      setAllSchedules(map);
      setWorkDays([]);
    } else {
      const { data } = await supabase
        .from('work_schedules')
        .select('*')
        .eq('technician_id', techId);
      setWorkDays((data || []).filter(r => r.is_working).map(r => new Date(r.date)));
      setAllSchedules({});
    }
  }

  // Fetch vacation requests
  async function fetchRequests() {
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
        approvedBy: (r as any).approved_by,
      }))
    );
  }

  useEffect(() => {
    fetchTechnicians();
    fetchRequests();
  }, []);

  useEffect(() => {
    if (selectedTech) fetchSchedule(selectedTech);
  }, [selectedTech]);

  // Vacation days for selected tech
  const currentVacDays = selectedTech === 'all' ? [] : vacSchedules[selectedTech] || [];

  // Custom day cell for "Alle monteurs" view
  const CustomDay = ({ date, ...props }: DayProps) => {
    const ds = date.toDateString();
    const workTechs = Object.entries(allSchedules)
      .filter(([, dates]) => dates.some(d => d.toDateString() === ds))
      .map(([id]) => id);
    const vacTechs = Object.entries(vacSchedules)
      .filter(([, dates]) => dates.some(d => d.toDateString() === ds))
      .map(([id]) => id);
    return (
      <button {...props} className="relative p-1 text-center">
        <span>{date.getDate()}</span>
        {workTechs.length > 0 && (
          <div className="absolute top-1 left-0 right-0 flex justify-center space-x-0.5">
            {workTechs.map(id => (
              <span
                key={id}
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: techColors[id] }}
                title={`${technicians.find(t => t.id === id)?.full_name} werkt`}
              />
            ))}
          </div>
        )}
        {vacTechs.length > 0 && (
          <div className="absolute bottom-1 left-0 right-0 flex justify-center space-x-0.5">
            {vacTechs.map(id => (
              <span
                key={id}
                className="w-2.5 h-2.5 rounded-full opacity-80"
                style={{ backgroundColor: techColors[id] }}
                title={`${technicians.find(t => t.id === id)?.full_name} vrij`}
              />
            ))}
          </div>
        )}
      </button>
    );
  };

  // Save work days
  async function saveWorkDays() {
    if (selectedTech === 'all') return;
    await supabase.from('work_schedules').delete().eq('technician_id', selectedTech);
    const inserts = workDays.map(d => ({
      technician_id: selectedTech,
      date: formatDateLocal(d),
      is_working: true,
    }));
    const { error } = await supabase.from('work_schedules').insert(inserts);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Werkdagen opgeslagen' });
      fetchSchedule(selectedTech);
    }
  }

  // Delete work days for opened month
  async function deleteWorkDays() {
    const month = displayedMonth;
    const startOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
    const endOfMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0);
    const startStr = formatDateLocal(startOfMonth);
    const endStr = formatDateLocal(endOfMonth);

    let builder = supabase.from('work_schedules').delete();
    if (selectedTech !== 'all') {
      builder = builder.eq('technician_id', selectedTech);
    }
    const { error } = await builder.gte('date', startStr).lte('date', endStr);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({
        title:
          selectedTech === 'all'
            ? 'Werkdagen deze maand verwijderd voor alle monteurs'
            : 'Werkdagen deze maand verwijderd',
      });
      fetchSchedule(selectedTech);
    }
  }

  // Fill Mon–Fri work days for displayed month
  function fillWorkDays() {
    if (selectedTech === 'all') return;
    const days: Date[] = [];
    const m = displayedMonth.getMonth();
    const y = displayedMonth.getFullYear();
    for (let d = new Date(y, m, 1); d <= new Date(y, m + 1, 0); d.setDate(d.getDate() + 1)) {
      if (d.getDay() > 0 && d.getDay() < 6) days.push(new Date(d));
    }
    setWorkDays(days);
  }

  // Add vacation request
  async function addVacation() {
    if (selectedTech === 'all' || !vacationRange?.from || !vacationRange.to) return;
    const start = formatDateLocal(vacationRange.from);
    const end = formatDateLocal(vacationRange.to);
    const { error } = await supabase.from('vacation_requests').insert([
      { technician_id: selectedTech, start_date: start, end_date: end, status: 'pending' },
    ]);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Vakantie aangevraagd' });
      setVacDialogOpen(false);
      setVacationRange(undefined);
      fetchRequests();
    }
  }

  // Update request status
  async function updateStatus(id: string, status: 'approved' | 'denied') {
    await supabase
      .from('vacation_requests')
      .update({ status, approved_by: user?.id })
      .eq('id', id);
    toast({ title: status === 'approved' ? 'Goedgekeurd' : 'Afgewezen' });
    fetchRequests();
    fetchSchedule(selectedTech);
  }

  // Delete vacation request
  async function deleteVacation(id: string) {
    await supabase.from('vacation_requests').delete().eq('id', id);
    toast({ title: 'Aanvraag verwijderd' });
    fetchRequests();
    fetchSchedule(selectedTech);
  }

  // Combine modifiers & styles
  const modifiers: Modifiers = {
    work: workDays,
    vacation: selectedTech === 'all' ? [] : currentVacDays,
    ...allSchedules,
  };
  const classes: ModifierClasses = {
    work: 'bg-red-500 text-white',
    vacation: 'bg-green-500 text-white',
    ...techColors,
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

        {/* Agenda */}
        <Card>
          <CardHeader>
            <CardTitle>Agenda</CardTitle>
          </CardHeader>
          <CardContent className="overflow-visible">
            <Calendar
              mode="multiple"
              month={displayedMonth}
              onMonthChange={setDisplayedMonth}
              selected={selectedTech === 'all' ? undefined : workDays}
              onDayClick={(date, modifiers) => {
                // Ensure single click selects even for outside days
                if (selectedTech === 'all') return;
                if (modifiers.outside) {
                  setDisplayedMonth(date);
                }
                const dateStr = date.toDateString();
                const isSelected = workDays.some(d => d.toDateString() === dateStr);
                if (isSelected) {
                  setWorkDays(prev => prev.filter(d => d.toDateString() !== dateStr));
                } else {
                  setWorkDays(prev => [...prev, date]);
                }
              }}
              modifiers={modifiers}
              modifiersClassNames={classes}
              components={selectedTech === 'all' ? { Day: CustomDay } : {}}
              classNames={{ day_selected: 'ring-2 ring-offset-2 ring-gray-500' }}
            />

            {selectedTech !== 'all' && (
              <div className="mt-2 flex flex-wrap gap-2">
                <Button onClick={fillWorkDays}>Vul werkdagen</Button>
                <Button onClick={saveWorkDays}>Opslaan werkdagen</Button>
                <Button variant="destructive" onClick={deleteWorkDays}>
                  Verwijder werkdagen
                </Button>
                <Dialog open={isVacDialogOpen} onOpenChange={setVacDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline">Vakantie toevoegen</Button>
                  </DialogTrigger>
                  <DialogContent className="space-y-4">
                    <h3 className="text-lg font-medium">Vakantie aanvragen</h3>
                    <Calendar mode="range" selected={vacationRange} onSelect={setVacationRange} />
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
            technicians.map(t => (
              <div key={t.id} className="flex items-center space-x-1">
                <span
                  className="w-3 h-3 inline-block"
                  style={{ backgroundColor: techColors[t.id] }}
                />
                <span>{t.full_name}</span>
              </div>
            ))}
        </div>

        {/* Aanvragen */}
        <Card>
          <CardHeader>
            <CardTitle>Aanvragen</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={requestTab} onValueChange={v => setRequestTab(v as RequestTab)}>
              <TabsList>
                <TabsTrigger value="pending">In Afwachting</TabsTrigger>
                <TabsTrigger value="approved">Goedgekeurd</TabsTrigger>
                <TabsTrigger value="denied">Afgekeurd</TabsTrigger>
              </TabsList>

              <TabsContent value="pending">
                {requests
                  .filter(r => r.status === 'pending')
                  .map(r => (
                    <div key={r.id} className="flex justify-between items-center mb-2">
                      <span>
                        {r.technicianName} {r.startDate} – {r.endDate}
                      </span>
                      <div className="space-x-2">
                        {isAdmin && (
                          <>
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
                          </>
                        )}
                        {(isAdmin || r.technicianId === user?.id) && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deleteVacation(r.id)}
                          >
                            Verwijder
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
              </TabsContent>

              <TabsContent value="approved">
                {requests
                  .filter(r => r.status === 'approved')
                  .map(r => (
                    <div key={r.id} className="flex justify-between items-center mb-2">
                      <span>
                        {r.technicianName} {r.startDate} – {r.endDate}
                      </span>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteVacation(r.id)}
                      >
                        Verwijder
                      </Button>
                    </div>
                  ))}
              </TabsContent>

              <TabsContent value="denied">
                {requests
                  .filter(r => r.status === 'denied')
                  .map(r => (
                    <div key={r.id} className="flex justify-between items-center mb-2">
                      <span>
                        {r.technicianName} {r.startDate} – {r.endDate}
                      </span>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteVacation(r.id)}
                      >
                        Verwijder
                      </Button>
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

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { WorkSchedule } from '@/types/schedule';
import TechnicianFilter from './TechnicianFilter';

interface Technician { id: string; full_name: string; }

const WorkSchedulePage: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [selectedTech, setSelectedTech] = useState<string>('');
  const [days, setDays] = useState<Date[]>([]);

  const isPlanner = user?.role === 'admin' || user?.role === 'opdrachtgever';

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
    const dates = (data || []).filter(d => d.is_working).map(d => new Date(d.date));
    setDays(dates);
  };

  useEffect(() => { fetchTechnicians(); }, []);
  useEffect(() => { if (selectedTech) fetchSchedule(selectedTech); }, [selectedTech]);

  const saveSchedule = async () => {
    if (!isPlanner) return;
    await supabase.from('work_schedules').delete().eq('technician_id', selectedTech);
    const inserts = days.map(d => ({
      technician_id: selectedTech,
      date: d.toISOString().split('T')[0],
      is_working: true,
    }));
    const { error } = await supabase.from('work_schedules').insert(inserts);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else toast({ title: 'Opgeslagen', description: 'Planning bijgewerkt' });
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
            <CardTitle>Weekplanning</CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar mode="multiple" selected={days} onSelect={setDays} />
            {isPlanner && (
              <Button onClick={saveSchedule} className="mt-4 bg-red-600 hover:bg-red-700 text-white">Save</Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default WorkSchedulePage;

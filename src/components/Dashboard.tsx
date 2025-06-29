import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { TechnicianSummary } from '@/types/workHours';
import { formatDutchDate } from '@/utils/overtimeCalculations';
import TechnicianFilter from './TechnicianFilter';

const COLORS = ['#dc2626', '#991b1b', '#7f1d1d', '#450a0a'];

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [rawWorkHours, setRawWorkHours] = useState<any[]>([]);
  const [rawRates, setRawRates] = useState<any[]>([]);
  const [technicianData, setTechnicianData] = useState<TechnicianSummary[]>([]);
  const [weeklyData, setWeeklyData] = useState<any[]>([]);
  const [selectedTechnician, setSelectedTechnician] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  // Nieuw voor maandselectie & “alles weergeven”
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7)); // 'YYYY-MM' of '' = alles
  const [monthlyHours, setMonthlyHours] = useState<number>(0);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
  if (!rawWorkHours.length) return;

  let filtered = rawWorkHours;

  // —————— 1) Technicus-filter (admin vs user) ——————
  if (isAdmin) {
    if (selectedTechnician !== 'all') {
      filtered = filtered.filter(e => e.technician_id === selectedTechnician);
    }
  } else {
    // jouw bestaande non-admin filter op eigen user.id
    if (selectedMonth) {
      const [y, m] = selectedMonth.split('-').map(n => parseInt(n, 10));
      filtered = filtered.filter(e => {
        const d = new Date(e.date);
        return (
          e.technician_id === user?.id &&
          d.getFullYear() === y &&
          d.getMonth() + 1 === m
        );
      });
    } else {
      filtered = filtered.filter(e => e.technician_id === user?.id);
    }
    const uren = filtered.reduce((sum, e) => sum + Number(e.hours_worked || 0), 0);
    setMonthlyHours(uren);
  }

  // —————— 2) Maand-filter voor admin toevoegen ——————
  if (isAdmin && selectedMonth) {
    const [year, month] = selectedMonth.split('-').map(n => parseInt(n, 10));
    filtered = filtered.filter(e => {
      const d = new Date(e.date);
      return d.getFullYear() === year && d.getMonth() + 1 === month;
    });
  }

  // —————— verwerk en zet state ——————
  setTechnicianData(processTechnicianData(filtered, rawRates));
  setWeeklyData(processWeeklyData(filtered));
}, [rawWorkHours, rawRates, selectedTechnician, selectedMonth, isAdmin]);


  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const { data: workHours, error: hoursError } = await supabase
        .from('work_hours')
        .select(`
          *,
          customers(name),
          profiles!work_hours_technician_id_fkey(full_name)
        `);
      if (hoursError) throw hoursError;

      const { data: rates, error: ratesError } = await supabase
        .from('technician_rates')
        .select('*');
      if (ratesError) console.error(ratesError);

      setRawWorkHours(workHours || []);
      setRawRates(rates || []);
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const processTechnicianData = (workHours: any[], rates: any[]): TechnicianSummary[] => {
    const techMap = new Map<string, any>();
    const rateMap = new Map<string, { hourly: number; billable: number }>();
    rates.forEach(r => {
      rateMap.set(r.technician_id, {
        hourly: Number(r.hourly_rate || 0),
        billable: Number(r.billable_rate || 0),
      });
    });

    workHours.forEach(entry => {
      const id = entry.technician_id;
      const name = entry.profiles?.full_name || 'Unknown';
      if (!techMap.has(id)) {
        techMap.set(id, {
          technicianId: id,
          technicianName: name,
          totalHours: 0,
          regularHours: 0,
          overtimeHours: 0,
          weekendHours: 0,
          sundayHours: 0,
          daysWorked: 0,
          lastWorked: entry.date,
          entries: [] as any[],
          profit: 0,
          revenue: 0,
          costs: 0
        });
      }
      const s = techMap.get(id);
      const hrs = Number(entry.hours_worked || 0);
      const reg = Number(entry.regular_hours || 0);
      const ot  = Number(entry.overtime_hours || 0);
      const wk  = Number(entry.weekend_hours || 0);
      const su  = Number(entry.sunday_hours || 0);
      const rate = rateMap.get(id) || { hourly: 0, billable: 0 };

      let rev = 0, cost = 0;
      if (su > 0) { rev += su * rate.billable * 2; cost += su * rate.hourly * 2; }
      if (wk > 0) { rev += wk * rate.billable * 1.5; cost += wk * rate.hourly * 1.5; }
      if (ot > 0) { rev += ot * rate.billable * 1.25; cost += ot * rate.hourly * 1.25; }
      if (reg> 0) { rev += reg * rate.billable; cost += reg * rate.hourly; }
      const profit = rev - cost;

      s.totalHours     += hrs;
      s.regularHours   += reg;
      s.overtimeHours  += ot;
      s.weekendHours   += wk;
      s.sundayHours    += su;
      s.profit         += profit;
      s.revenue        += rev;
      s.costs          += cost;
      s.entries.push(entry);
      if (entry.date > s.lastWorked) s.lastWorked = entry.date;
    });

    techMap.forEach(s => {
      s.daysWorked = new Set(s.entries.map((e: any) => e.date)).size;
      delete s.entries;
    });

    return Array.from(techMap.values()).sort((a,b)=> b.totalHours - a.totalHours);
  };

  const processWeeklyData = (workHours: any[]) => {
    const weekMap = new Map<string, { week: string; hours: number }>();
    workHours.forEach(e => {
      const d = new Date(e.date);
      const ws = new Date(d);
      ws.setDate(d.getDate() - d.getDay());
      const key = ws.toISOString().split('T')[0];
      if (!weekMap.has(key)) weekMap.set(key, { week: `Week ${formatDutchDate(key)}`, hours: 0 });
      weekMap.get(key)!.hours += Number(e.hours_worked || 0);
    });
    return Array
      .from(weekMap.values())
      .sort((a,b)=> new Date(a.week.split(' ')[1]).getTime() - new Date(b.week.split(' ')[1]).getTime())
      .slice(-8);
  };

  const formatCurrency = (amt: number) =>
    new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(amt);

  const totalHours     = technicianData.reduce((s, t) => s + t.totalHours, 0);
  const totalDays      = technicianData.reduce((s, t) => s + t.daysWorked, 0);
  const avgHoursPerDay = totalDays > 0 ? (totalHours/totalDays).toFixed(1) : '0';
  const displayData    = isAdmin
    ? technicianData
    : technicianData.filter(t => t.technicianId === user?.id);
  const availableTechnicians = technicianData.map(t => ({ id: t.technicianId, name: t.technicianName }));

  if (loading) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600" />
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
       <div className="mb-4 flex items-center space-x-6">
  {/* 1. Technician dropdown (admin én user nodig?) */}
  {isAdmin && (
    <TechnicianFilter
      technicians={availableTechnicians}
      selectedTechnician={selectedTechnician}
      onTechnicianChange={setSelectedTechnician}
    />
  )}

  {/* 2. Maand-picker + “Alles weergeven” */}
  <div className="flex items-center space-x-2">
    <label htmlFor="monthPicker" className="text-gray-600">Select month:</label>
    <input
      id="monthPicker"
      type="month"
      value={selectedMonth}
      onChange={e => setSelectedMonth(e.target.value)}
      className="border rounded p-1"
    />
    <button
      onClick={() => setSelectedMonth('')}
      className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
    >
      Alles weergeven
    </button>
  </div>
</div>

        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Dashboard — {isAdmin ? 'Admin View' : 'Personal View'}
          </h1>
          <p className="text-gray-600">
            {isAdmin
              ? 'Complete overzicht van alle technici en performance metrics'
              : 'Jouw persoonlijke werkstatistieken en performance'}
          </p>
        </header>

        {/* Key Metrics */}
        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${isAdmin ? '4' : '3'} gap-6 mb-8`}>
          <Card><CardContent>
            <p className="text-sm text-gray-600">Totale uren</p>
            <p className="text-2xl font-bold">{totalHours.toFixed(1)}h</p>
          </CardContent></Card>

          {isAdmin && (
            <Card><CardContent>
              <p className="text-sm text-gray-600">Totale omzet</p>
              <p className="text-2xl font-bold">{formatCurrency(technicianData.reduce((s,t)=>s+t.revenue,0))}</p>
            </CardContent></Card>
          )}

          {isAdmin && (
            <Card><CardContent>
              <p className="text-sm text-gray-600">Totale winst</p>
              <p className="text-2xl font-bold">{formatCurrency(technicianData.reduce((s,t)=>s+t.profit,0))}</p>
            </CardContent></Card>
          )}

          <Card><CardContent>
            <p className="text-sm text-gray-600">Gemiddelde uren/dag</p>
            <p className="text-2xl font-bold">{avgHoursPerDay}h</p>
          </CardContent></Card>

          {!isAdmin && (
            <Card><CardContent>
              <p className="text-sm text-gray-600">
                {selectedMonth ? `Hours in ${selectedMonth}` : 'Hours totaal'}
              </p>
              <p className="text-2xl font-bold">{monthlyHours.toFixed(1)}h</p>
            </CardContent></Card>
          )}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <Card><CardHeader><CardTitle>Wekelijkse uren</CardTitle></CardHeader><CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="hours" fill={COLORS[0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent></Card>

          {isAdmin && (
            <Card><CardHeader><CardTitle>Winstverdeling</CardTitle></CardHeader><CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={displayData.filter(t=>t.profit>0).slice(0,4)}
                    dataKey="profit"
                    cx="50%" cy="50%" outerRadius={80}
                    label={({ technicianName, profit })=>`${technicianName}: ${formatCurrency(profit)}`}
                  >
                    {displayData.filter(t=>t.profit>0).slice(0,4).map((e,i)=>(<Cell key={i} fill={COLORS[i%COLORS.length]} />))}
                  </Pie>
                  <Tooltip formatter={v=>formatCurrency(Number(v))} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent></Card>
          )}
        </div>

        {/* Overtime Breakdown (Admin) */}
        {isAdmin && (
          <Card className="mb-8"><CardHeader><CardTitle>Overtime per monteur (125%, 150%, 200%)</CardTitle></CardHeader><CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={technicianData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="technicianName" />
                <YAxis />
                <Tooltip formatter={v=>`${v}h`} />
                <Legend />
                <Bar dataKey="overtimeHours" fill={COLORS[1]} name="Overtime 125%" />
                <Bar dataKey="weekendHours" fill={COLORS[2]} name="Weekend 150%" />
                <Bar dataKey="sundayHours" fill={COLORS[3]} name="Sunday 200%" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent></Card>
        )}

        {/* Admin Performance Table */}
        {isAdmin && (
          <Card><CardHeader><CardTitle>Monteur Prestatie Overzicht</CardTitle></CardHeader><CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b">
                    <th>Monteur</th><th>Totaal Uren</th><th>Dagen Gewerkt</th>
                    <th>Omzet</th><th>Kosten</th><th>Winst</th><th>Margin %</th><th>Laatste Werkdag</th>
                  </tr>
                </thead>
                <tbody>
                  {displayData.map(t => {
                    const margin = t.revenue>0?((t.profit/t.revenue)*100).toFixed(1):'0';
                    return (
                      <tr key={t.technicianId} className="border-b hover:bg-gray-50">
                        <td>{t.technicianName}</td>
                        <td>{t.totalHours.toFixed(1)}h</td>
                        <td>{t.daysWorked}</td>
                        <td>{formatCurrency(t.revenue)}</td>
                        <td>{formatCurrency(t.costs)}</td>
                        <td className={t.profit>=0?'text-green-600':'text-red-600'}>
                          {formatCurrency(t.profit)}
                        </td>
                        <td className={parseFloat(margin)>=0?'text-green-600':'text-red-600'}>
                          {margin}% 
                        </td>
                        <td>{new Date(t.lastWorked).toLocaleDateString('nl-NL')}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent></Card>
        )}
      </div>
    </div>
  );
};

export default Dashboard;

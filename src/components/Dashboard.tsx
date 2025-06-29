import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
  LineChart,
  Line,
} from 'recharts';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { TechnicianSummary } from '@/types/workHours';
import { formatDutchDate } from '@/utils/overtimeCalculations';
import TechnicianFilter from './TechnicianFilter';

const COLORS = ['#dc2626', '#991b1b', '#7f1d1d', '#450a0a', '#f59e42', '#8b5cf6'];

function getInitials(name = '') {
  return name.split(' ').map(part => part[0]).join('').toUpperCase();
}
const ProgressBar = ({ value, max, color = '#dc2626' }) => (
  <div className="w-full bg-gray-200 rounded-full h-2 mt-1 mb-2">
    <div
      className="h-2 rounded-full transition-all"
      style={{ width: `${max ? Math.min(100, (value / max) * 100) : 0}%`, background: color }}
    ></div>
  </div>
);

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [rawWorkHours, setRawWorkHours] = useState<any[]>([]);
  const [rawRates, setRawRates] = useState<any[]>([]);
  const [technicianData, setTechnicianData] = useState<TechnicianSummary[]>([]);
  const [weeklyData, setWeeklyData] = useState<any[]>([]);
  const [weeklyAdminData, setWeeklyAdminData] = useState<any[]>([]);
  const [selectedTechnician, setSelectedTechnician] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [monthlyHours, setMonthlyHours] = useState<number>(0);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    if (!rawWorkHours.length) return;
    let filtered = rawWorkHours;

    if (isAdmin) {
      if (selectedTechnician !== 'all') {
        filtered = filtered.filter(e => e.technician_id === selectedTechnician);
      }
    } else {
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
    if (isAdmin && selectedMonth) {
      const [year, month] = selectedMonth.split('-').map(n => parseInt(n, 10));
      filtered = filtered.filter(e => {
        const d = new Date(e.date);
        return d.getFullYear() === year && d.getMonth() + 1 === month;
      });
    }
    setTechnicianData(processTechnicianData(filtered, rawRates));
    setWeeklyData(processWeeklyData(filtered, isAdmin ? null : user?.id));
    if (isAdmin) setWeeklyAdminData(processWeeklyData(rawWorkHours));
  }, [rawWorkHours, rawRates, selectedTechnician, selectedMonth, isAdmin, user?.id]);

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
          costs: 0,
        });
      }
      const s = techMap.get(id);
      const hrs = Number(entry.hours_worked || 0);
      const reg = Number(entry.regular_hours || 0);
      const ot = Number(entry.overtime_hours || 0);
      const wk = Number(entry.weekend_hours || 0);
      const su = Number(entry.sunday_hours || 0);
      const rate = rateMap.get(id) || { hourly: 0, billable: 0 };

      let rev = 0,
        cost = 0;
      if (su > 0) {
        rev += su * rate.billable * 2;
        cost += su * rate.hourly * 2;
      }
      if (wk > 0) {
        rev += wk * rate.billable * 1.5;
        cost += wk * rate.hourly * 1.5;
      }
      if (ot > 0) {
        rev += ot * rate.billable * 1.25;
        cost += ot * rate.hourly * 1.25;
      }
      if (reg > 0) {
        rev += reg * rate.billable;
        cost += reg * rate.hourly;
      }
      const profit = rev - cost;

      s.totalHours += hrs;
      s.regularHours += reg;
      s.overtimeHours += ot;
      s.weekendHours += wk;
      s.sundayHours += su;
      s.profit += profit;
      s.revenue += rev;
      s.costs += cost;
      s.entries.push(entry);
      if (entry.date > s.lastWorked) s.lastWorked = entry.date;
    });

    techMap.forEach(s => {
      s.daysWorked = new Set(s.entries.map((e: any) => e.date)).size;
      delete s.entries;
    });

    return Array.from(techMap.values()).sort((a, b) => b.totalHours - a.totalHours);
  };

  // Deze filtert indien nodig op userId (voor monteurs)
  const processWeeklyData = (workHours: any[], filterUserId: string | null = null) => {
    const weekMap = new Map<string, { week: string; uren: number }>();
    workHours
      .filter(e => !filterUserId || e.technician_id === filterUserId)
      .forEach(e => {
        const d = new Date(e.date);
        const ws = new Date(d);
        ws.setDate(d.getDate() - d.getDay());
        const key = ws.toISOString().split('T')[0];
        if (!weekMap.has(key)) weekMap.set(key, { week: `Week ${formatDutchDate(key)}`, uren: 0 });
        weekMap.get(key)!.uren += Number(e.hours_worked || 0);
      });
    return Array.from(weekMap.values())
      .sort((a, b) => new Date(a.week.split(' ')[1]).getTime() - new Date(b.week.split(' ')[1]).getTime())
      .slice(-8);
  };

  const formatCurrency = (amt: number) =>
    new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(amt);

  const totalHours = technicianData.reduce((s, t) => s + t.totalHours, 0);
  const totalDays = technicianData.reduce((s, t) => s + t.daysWorked, 0);
  const avgHoursPerDay = totalDays > 0 ? (totalHours / totalDays).toFixed(1) : '0';
  const displayData = isAdmin
    ? technicianData
    : technicianData.filter(t => t.technicianId === user?.id);
  const availableTechnicians = technicianData.map(t => ({
    id: t.technicianId,
    name: t.technicianName,
  }));

  const maxHours = Math.max(...displayData.map(t => t.totalHours));
  const maxProfit = Math.max(...displayData.map(t => t.profit));

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
        {/* Filters */}
        <div className="mb-4 flex flex-col md:flex-row md:items-center md:space-x-6 space-y-3 md:space-y-0">
          {isAdmin && (
            <div>
              <TechnicianFilter
                technicians={availableTechnicians}
                selectedTechnician={selectedTechnician}
                onTechnicianChange={setSelectedTechnician}
              />
            </div>
          )}
          <div className="flex items-center space-x-2">
            <label htmlFor="monthPicker" className="text-gray-600 whitespace-nowrap">
              Select month:
            </label>
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
          <Card>
            <CardContent>
              <p className="text-sm text-gray-600">Totale uren</p>
              <p className="text-2xl font-bold">{totalHours.toFixed(1)}h</p>
            </CardContent>
          </Card>
          {isAdmin && (
            <Card>
              <CardContent>
                <p className="text-sm text-gray-600">Totale omzet</p>
                <p className="text-2xl font-bold">{formatCurrency(technicianData.reduce((s, t) => s + t.revenue, 0))}</p>
              </CardContent>
            </Card>
          )}
          {isAdmin && (
            <Card>
              <CardContent>
                <p className="text-sm text-gray-600">Totale winst</p>
                <p className="text-2xl font-bold">{formatCurrency(technicianData.reduce((s, t) => s + t.profit, 0))}</p>
              </CardContent>
            </Card>
          )}
          <Card>
            <CardContent>
              <p className="text-sm text-gray-600">Gemiddelde uren/dag</p>
              <p className="text-2xl font-bold">{avgHoursPerDay}h</p>
            </CardContent>
          </Card>
          {!isAdmin && (
            <Card>
              <CardContent>
                <p className="text-sm text-gray-600">
                  {selectedMonth ? `Hours in ${selectedMonth}` : 'Hours totaal'}
                </p>
                <p className="text-2xl font-bold">{monthlyHours.toFixed(1)}h</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* ADMIN: Extra grafieken */}
        {isAdmin ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-8 mb-8">
            {/* Wekelijkse uren (alle technici, lijn & area voor trend) */}
            <Card>
              <CardHeader>
                <CardTitle>Wekelijkse uren (trend)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={weeklyAdminData}>
                    <defs>
                      <linearGradient id="colorArea" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#dc2626" stopOpacity={0.7} />
                        <stop offset="95%" stopColor="#dc2626" stopOpacity={0.15} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="week" fontSize={13} />
                    <YAxis fontSize={13} />
                    <CartesianGrid strokeDasharray="3 3" />
                    <RechartTooltip />
                    <Area type="monotone" dataKey="uren" stroke="#dc2626" fill="url(#colorArea)" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            {/* BarChart: Wekelijkse uren (vergelijking) */}
            <Card>
              <CardHeader>
                <CardTitle>Wekelijkse uren (bar)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={weeklyAdminData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="week" fontSize={13} />
                    <YAxis fontSize={13} />
                    <RechartTooltip />
                    <Bar dataKey="uren" fill="#dc2626" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            {/* PieChart: Winstverdeling */}
            <Card>
              <CardHeader>
                <CardTitle>Winstverdeling</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={displayData.filter(t => t.profit > 0).slice(0, 5)}
                      dataKey="profit"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ technicianName, profit }) => `${technicianName}: ${formatCurrency(profit)}`}
                    >
                      {displayData
                        .filter(t => t.profit > 0)
                        .slice(0, 5)
                        .map((e, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                    </Pie>
                    <RechartTooltip formatter={v => formatCurrency(Number(v))} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            {/* Overtime Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Overtime per monteur (125%, 150%, 200%)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={technicianData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="technicianName" />
                    <YAxis />
                    <RechartTooltip formatter={v => `${v}h`} />
                    <Legend />
                    <Bar dataKey="overtimeHours" fill={COLORS[1]} name="Overtime 125%" />
                    <Bar dataKey="weekendHours" fill={COLORS[2]} name="Weekend 150%" />
                    <Bar dataKey="sundayHours" fill={COLORS[3]} name="Sunday 200%" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        ) : (
          // MONTEUR: Alleen hun eigen uren in een grafiek
          <Card className="mb-8">
  <CardHeader>
    <CardTitle>Jouw gewerkte uren per week</CardTitle>
  </CardHeader>
  <CardContent>
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={weeklyData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="week" fontSize={13} />
        <YAxis fontSize={13} />
        <RechartTooltip />
        <Bar
          dataKey="uren"
          fill="#dc2626"
          radius={[8, 8, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  </CardContent>
</Card>

        )}

        {/* Admin: Performance cards/table */}
        {isAdmin && (
          <Card className="mb-10">
            <CardHeader>
              <CardTitle>Monteur Prestatie Overzicht</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Desktop: modern grid */}
              <div className="hidden md:grid grid-cols-1 gap-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                  {displayData.map((t, i) => {
                    const margin = t.revenue > 0 ? ((t.profit / t.revenue) * 100).toFixed(1) : '0';
                    return (
                      <div
                        key={t.technicianId}
                        className={`flex flex-col bg-white rounded-2xl shadow-xl border border-gray-200 hover:shadow-2xl transition-shadow p-5 relative`}
                      >
                        <div className="flex items-center mb-2">
                          <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-full text-red-700 text-xl font-bold mr-3 shadow">
                            {getInitials(t.technicianName)}
                          </div>
                          <div className="flex-1">
                            <span className="block font-semibold text-lg text-gray-900">{t.technicianName}</span>
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-lg ml-1">{t.daysWorked} dagen</span>
                          </div>
                          {t.totalHours === maxHours && (
                            <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-lg font-semibold shadow">
                              Top uren
                            </span>
                          )}
                          {t.profit === maxProfit && (
                            <span className="ml-2 text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-lg font-semibold shadow">
                              Top winst
                            </span>
                          )}
                        </div>
                        <ProgressBar value={t.totalHours} max={maxHours} color="#dc2626" />
                        <div className="grid grid-cols-2 gap-3 mt-1 mb-3">
                          <div>
                            <div className="text-xs text-gray-400 mb-1">Totaal uren</div>
                            <div className="font-bold">{t.totalHours.toFixed(1)}h</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-400 mb-1">Laatste Werkdag</div>
                            <div>{new Date(t.lastWorked).toLocaleDateString('nl-NL')}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-400 mb-1">Omzet</div>
                            <div className="font-semibold">{formatCurrency(t.revenue)}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-400 mb-1">Kosten</div>
                            <div className="font-semibold">{formatCurrency(t.costs)}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-400 mb-1">Winst</div>
                            <div className={`font-bold ${t.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatCurrency(t.profit)}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-400 mb-1">Margin %</div>
                            <div className={`font-bold ${parseFloat(margin) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {margin}%
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              {/* Mobiel: cards */}
              <div className="space-y-4 md:hidden">
                {displayData.map((t, i) => {
                  const margin = t.revenue > 0 ? ((t.profit / t.revenue) * 100).toFixed(1) : '0';
                  return (
                    <div
                      key={t.technicianId}
                      className={`rounded-2xl shadow-md border p-4 bg-white flex flex-col gap-2 ${
                        i % 2 === 0 ? 'border-l-4 border-red-600' : 'border-l-4 border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-bold text-lg text-gray-900">{t.technicianName}</span>
                        <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-500">
                          {t.daysWorked} dagen
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <div className="flex flex-col items-start">
                          <span className="text-xs text-gray-400">Totaal uren</span>
                          <span className="font-semibold">{t.totalHours.toFixed(1)}h</span>
                        </div>
                        <div className="flex flex-col items-start">
                          <span className="text-xs text-gray-400">Omzet</span>
                          <span className="font-semibold">{formatCurrency(t.revenue)}</span>
                        </div>
                        <div className="flex flex-col items-start">
                          <span className="text-xs text-gray-400">Kosten</span>
                          <span className="font-semibold">{formatCurrency(t.costs)}</span>
                        </div>
                        <div className="flex flex-col items-start">
                          <span className="text-xs text-gray-400">Winst</span>
                          <span className={`font-bold ${t.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency(t.profit)}
                          </span>
                        </div>
                        <div className="flex flex-col items-start">
                          <span className="text-xs text-gray-400">Margin %</span>
                          <span className={`font-bold ${parseFloat(margin) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {margin}%
                          </span>
                        </div>
                        <div className="flex flex-col items-start">
                          <span className="text-xs text-gray-400">Laatste Werkdag</span>
                          <span className="font-semibold">{new Date(t.lastWorked).toLocaleDateString('nl-NL')}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Dashboard;

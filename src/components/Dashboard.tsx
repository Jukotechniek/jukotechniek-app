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
import { Project } from '@/types/projects';

const COLORS = ['#2563eb', '#dc2626', '#991b1b', '#fbbf24', '#8b5cf6', '#059669'];

function getInitials(name = '') {
  return name.split(' ').map(part => part[0]).join('').toUpperCase();
}

const ZakelijkUren = ({ value }) => (
  <span className="font-mono tabular-nums">{value.toFixed(2)}u</span>
);
const ZakelijkEuro = ({ value }) => (
  <span className="font-mono tabular-nums">
    {new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(value)}
  </span>
);
const ZakelijkDagen = ({ value }) => (
  <span className="font-mono tabular-nums">{value}</span>
);
const ProgressBar = ({ value, max, color = '#dc2626' }) => (
  <div className="w-full bg-gray-200 rounded-full h-2 mt-1 mb-2">
    <div
      className="h-2 rounded-full transition-all"
      style={{ width: `${max ? Math.min(100, (value / max) * 100) : 0}%`, background: color }}
    ></div>
  </div>
);

const Badge = ({ children, color = "bg-gray-100", text = "text-gray-800" }) => (
  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${color} ${text} ml-1`}>
    {children}
  </span>
);

const Dashboard = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isOpdrachtgever = user?.role === 'opdrachtgever';

  const [rawWorkHours, setRawWorkHours] = useState([]);
  const [rawRates, setRawRates] = useState([]);
  const [travelRates, setTravelRates] = useState([]);
  const [technicianData, setTechnicianData] = useState([]);
  const [weeklyData, setWeeklyData] = useState([]);
  const [weeklyAdminData, setWeeklyAdminData] = useState([]);
  const [selectedTechnician, setSelectedTechnician] = useState('all');
  const [loading, setLoading] = useState(true);

  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [monthlyHours, setMonthlyHours] = useState(0);

  // --- Project stats for opdrachtgever ---
  const [projectStats, setProjectStats] = useState<{ perWeek: any[]; perStatus: any[]; counts: Record<string, number> }>({ perWeek: [], perStatus: [], counts: { 'completed': 0, 'in-progress': 0, 'needs-review': 0 } });
  useEffect(() => {
    if (!isOpdrachtgever || !user?.customer) return;
    async function fetchProjectStats() {
      let query = supabase
        .from('projects')
        .select('id, date, status')
        .eq('customer_id', user.customer);
      if (selectedMonth) {
        const [y, m] = selectedMonth.split('-').map(Number);
        const monthStart = new Date(y, m - 1, 1);
        const monthEnd = new Date(y, m, 0, 23, 59, 59, 999);
        query = query.gte('date', monthStart.toISOString().slice(0, 10)).lte('date', monthEnd.toISOString().slice(0, 10));
      }
      const { data: projects, error } = await query;
      if (error) return;
      // Group by week
      const weekMap = new Map<string, number>();
      const statusMap = { 'completed': 0, 'in-progress': 0, 'needs-review': 0 };
      (projects || []).forEach((p: any) => {
        const d = new Date(p.date);
        const ws = new Date(d);
        ws.setDate(d.getDate() - d.getDay());
        const weekKey = ws.toISOString().slice(0, 10);
        weekMap.set(weekKey, (weekMap.get(weekKey) || 0) + 1);
        statusMap[p.status] = (statusMap[p.status] || 0) + 1;
      });
      // Prepare for recharts
      const perWeek = Array.from(weekMap.entries()).map(([week, count]) => ({ week, count })).sort((a, b) => a.week.localeCompare(b.week));
      const perStatus = Object.entries(statusMap).map(([status, value]) => ({ status, value }));
      setProjectStats({ perWeek, perStatus, counts: statusMap });
    }
    fetchProjectStats();
  }, [isOpdrachtgever, user?.customer, selectedMonth]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    if (!rawWorkHours.length) return;
    // Only include verified hours for all calculations
    const verifiedHours = rawWorkHours.filter(e => e.manual_verified === true);
    let filtered = verifiedHours;

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
    setTechnicianData(processTechnicianData(filtered, rawRates, travelRates));
    setWeeklyData(processWeeklyData(filtered, isAdmin ? null : user?.id));
    if (isAdmin) setWeeklyAdminData(processWeeklyData(verifiedHours));
  }, [rawWorkHours, rawRates, travelRates, selectedTechnician, selectedMonth, isAdmin, user?.id]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch both webhook hours and manual work hours
      const { data: webhookHours, error: webhookError } = await supabase
        .from('webhook_hours')
        .select(`
          *,
          profiles!webhook_hours_technician_id_fkey(full_name)
        `);
      if (webhookError) console.error(webhookError);

      const { data: workHours, error: hoursError } = await supabase
        .from('work_hours')
        .select(`
          *,
          customers(name),
          profiles!work_hours_technician_id_fkey(full_name)
        `);
      if (hoursError) console.error(hoursError);

      // Transform webhook hours to match work_hours format
      const transformedWebhookHours = (webhookHours || []).map(wh => ({
        ...wh,
        customer_id: null, // webhook doesn't have customer info
        hours_worked: wh.hours_worked,
        regular_hours: wh.hours_worked, // treat all webhook hours as regular for now
        overtime_hours: 0,
        weekend_hours: 0,
        sunday_hours: 0,
        is_weekend: false,
        is_sunday: false,
        is_manual_entry: false,
        travel_expense_to_technician: 0,
        travel_expense_from_client: 0,
        created_at: wh.created_at,
        created_by: null,
        start_time: wh.webhook_start,
        end_time: wh.webhook_end,
        manual_verified: wh.webhook_verified,
        description: 'Webhook uren',
        technician_id: wh.technician_id,
        date: wh.date,
        profiles: wh.profiles
      }));

      // Combine and prioritize: use webhook hours if available, otherwise use manual hours
      const combinedHours = [];
      const webhookDates = new Set();
      
      // Add all webhook hours first and track their dates per technician
      transformedWebhookHours.forEach(wh => {
        combinedHours.push(wh);
        webhookDates.add(`${wh.technician_id}_${wh.date}`);
      });
      
      // Add manual hours only for dates/technicians that don't have webhook hours
      (workHours || []).forEach(wh => {
        const key = `${wh.technician_id}_${wh.date}`;
        if (!webhookDates.has(key)) {
          combinedHours.push(wh);
        }
      });

      const { data: rates, error: ratesError } = await supabase
        .from('technician_rates')
        .select('*');
      if (ratesError) console.error(ratesError);

      // travel rates per monteur/klant
      const { data: travelRatesData, error: travelRatesError } = await supabase
        .from('customer_technician_rates')
        .select('*');
      if (travelRatesError) console.error(travelRatesError);

      setRawWorkHours(combinedHours);
      setRawRates(rates || []);
      setTravelRates(travelRatesData || []);
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  // === STACKED weeklyData (per soort uren) ===
  const processWeeklyData = (workHours, filterUserId = null) => {
    const weekMap = new Map();
    workHours
      .filter(e => !filterUserId || e.technician_id === filterUserId)
      .forEach(e => {
        const d = new Date(e.date);
        const ws = new Date(d);
        ws.setDate(d.getDate() - d.getDay());
        const key = ws.toISOString().split('T')[0];
        if (!weekMap.has(key)) {
          weekMap.set(key, {
            week: `Week ${formatDutchDate(key)}`,
            regularHours: 0,
            overtimeHours: 0,
            weekendHours: 0,
            sundayHours: 0,
            allHours: 0,
          });
        }
        weekMap.get(key).regularHours += Number(e.regular_hours || 0);
        weekMap.get(key).overtimeHours += Number(e.overtime_hours || 0);
        weekMap.get(key).weekendHours += Number(e.weekend_hours || 0);
        weekMap.get(key).sundayHours += Number(e.sunday_hours || 0);
        weekMap.get(key).allHours += Number(e.hours_worked || 0);
      });
    return Array.from(weekMap.values()).slice(-8);
  };

  // --- bestaande functies ---
  const processTechnicianData = (workHours, rates, travelRates) => {
    const techMap = new Map();
    const rateMap = new Map();
    rates.forEach(r => {
      const hourly = Number(r.hourly_rate || 0);
      rateMap.set(r.technician_id, {
        hourly,
        billable: Number(r.billable_rate || 0),
        saturday: Number(r.saturday_rate ?? hourly * 1.5),
        sunday: Number(r.sunday_rate ?? hourly * 2),
      });
    });

    // Map van klant+monteur naar reiskosten
    const travelMap = new Map();
    travelRates.forEach(tr => {
      travelMap.set(
        `${tr.customer_id}_${tr.technician_id}`,
        {
          toTech: Number(tr.travel_expense_to_technician || 0),
          fromClient: Number(tr.travel_expense_from_client || 0),
        }
      );
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
          entries: [],
          profit: 0,
          revenue: 0,
          costs: 0,
        });
      }
      const s = techMap.get(id);

      const reg = Number(entry.regular_hours || 0);
      const ot = Number(entry.overtime_hours || 0);
      const wk = Number(entry.weekend_hours || 0);
      const su = Number(entry.sunday_hours || 0);

      const billedHours = Number(entry.billed_hours ?? reg + ot + wk + su);
      const actualHours = Number(entry.hours_worked ?? reg + ot + wk + su);

      // Tarieven
      const rate = rateMap.get(id) || { hourly: 0, billable: 0, saturday: 0, sunday: 0 };

      let rev = 0, cost = 0;

      // Only calculate revenue if hours are verified (webhook_verified = true)
      const isVerified = entry.manual_verified === true;
      
      if (isVerified) {
        if (su > 0) {
          rev += su * rate.billable * 2;
          cost += su * rate.sunday;
        }
        if (wk > 0) {
          rev += wk * rate.billable * 1.5;
          cost += wk * rate.saturday;
        }
        if (ot > 0) {
          rev += ot * rate.billable * 1.25;
          cost += ot * rate.hourly * 1.25;
        }
        if (reg > 0) {
          rev += reg * rate.billable;
          cost += reg * rate.hourly;
        }
      } else {
        // Still calculate costs even if not verified
        if (su > 0) cost += su * rate.sunday;
        if (wk > 0) cost += wk * rate.saturday;
        if (ot > 0) cost += ot * rate.hourly * 1.25;
        if (reg > 0) cost += reg * rate.hourly;
      }

      if (isVerified && billedHours > actualHours) {
        rev += (billedHours - actualHours) * rate.billable;
      }

      const customerId = entry.customer_id;
      const travelKey = `${customerId}_${id}`;
      const travel = travelMap.get(travelKey) || { toTech: 0, fromClient: 0 };

      if (isVerified && travel.fromClient > 0) {
        rev += travel.fromClient;
      }
      if (travel.toTech > 0) {
        cost += travel.toTech;
      }

      const profit = rev - cost;
      const hrs = actualHours;
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
      s.daysWorked = new Set(s.entries.map((e) => e.date)).size;
      delete s.entries;
    });

    return Array.from(techMap.values()).sort((a, b) => b.totalHours - a.totalHours);
  };

  // --------------- UI / Layout ---------------
  const totalHours = technicianData.reduce((s, t) => s + t.totalHours, 0);
  const totalDays = technicianData.reduce((s, t) => s + t.daysWorked, 0);
  const avgHoursPerDay = totalDays > 0 ? (totalHours / totalDays) : 0;
  const displayData = isAdmin
    ? technicianData
    : technicianData.filter(t => t.technicianId === user?.id);
  const availableTechnicians = technicianData.map(t => ({
    id: t.technicianId,
    name: t.technicianName,
  }));

  const maxHours = Math.max(...displayData.map(t => t.totalHours));
  const maxProfit = Math.max(...displayData.map(t => t.profit));

  // Dutch status labels for opdrachtgever
  const STATUS_LABELS_NL: Record<string, string> = {
    'in-progress': 'Bezig',
    'completed': 'Afgerond',
    'needs-review': 'Ter review',
  };

  if (loading) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600" />
      </div>
    );
  }

  return (
    <div className="p-2 md:p-6 bg-gradient-to-br from-white via-gray-100 to-red-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Filters */}
        <div className="mb-4 flex flex-col md:flex-row md:items-center md:space-x-6 space-y-2 md:space-y-0">
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
            <label htmlFor="monthPicker" className="text-gray-600 whitespace-nowrap text-xs md:text-base">
              Selecteer maand:
            </label>
            <input
              id="monthPicker"
              type="month"
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="border rounded px-1 py-1 text-xs md:text-base focus:ring-2 focus:ring-red-500"
            />
            <button
              onClick={() => setSelectedMonth('')}
              className="px-2 py-1 text-xs md:px-3 md:py-1 bg-red-600 text-white rounded hover:bg-red-700 transition"
            >
              Alles weergeven
            </button>
          </div>
        </div>
        <header className="mb-4 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-red-700 mb-1 md:mb-2 tracking-tight">
            Dashboard <span className="font-normal text-gray-700 text-base">{isAdmin ? '• Admin' : '• Persoonlijk'}</span>
          </h1>
          <p className="text-gray-600 text-sm md:text-base">
            {isAdmin
              ? 'Volledig overzicht van alle monteurs, uren, winst en omzet.'
              : 'Jouw persoonlijke werkstatistieken, grafieken en uren.'}
          </p>
        </header>

        {/* Key Metrics */}
        <div className={`grid grid-cols-2 gap-2 md:grid-cols-2 lg:grid-cols-${isAdmin ? '4' : '3'} md:gap-6 mb-4 md:mb-8`}>
          {/* Only show hours cards for admin/technician, not opdrachtgever */}
          {(!isOpdrachtgever) && (
            <>
              <Card className="shadow-lg border-2 border-gray-200 bg-white/90 hover:bg-gray-50 transition-all">
                <CardContent className="px-2 py-3 md:px-4 md:py-6">
                  <p className="text-xs md:text-sm text-gray-600">Totale uren</p>
                  <p className="text-2xl md:text-3xl font-bold text-gray-800"><ZakelijkUren value={totalHours} /></p>
                </CardContent>
              </Card>
              {isAdmin && (
                <Card className="shadow-lg border-2 border-gray-200 bg-white/90 hover:bg-gray-50 transition-all">
                  <CardContent className="px-2 py-3 md:px-4 md:py-6">
                    <p className="text-xs md:text-sm text-gray-600">Totale omzet</p>
                    <p className="text-2xl md:text-3xl font-bold text-gray-800"><ZakelijkEuro value={technicianData.reduce((s, t) => s + t.revenue, 0)} /></p>
                  </CardContent>
                </Card>
              )}
              {isAdmin && (
                <Card className="shadow-lg border-2 border-gray-200 bg-white/90 hover:bg-gray-50 transition-all">
                  <CardContent className="px-2 py-3 md:px-4 md:py-6">
                    <p className="text-xs md:text-sm text-gray-600">Totale winst</p>
                    <p className="text-2xl md:text-3xl font-bold text-gray-800"><ZakelijkEuro value={technicianData.reduce((s, t) => s + t.profit, 0)} /></p>
                  </CardContent>
                </Card>
              )}
              <Card className="shadow-lg border-2 border-gray-200 bg-white/90 hover:bg-gray-50 transition-all">
                <CardContent className="px-2 py-3 md:px-4 md:py-6">
                  <p className="text-xs md:text-sm text-gray-600">Gem. uren/dag</p>
                  <p className="text-2xl md:text-3xl font-bold text-gray-800"><ZakelijkUren value={avgHoursPerDay} /></p>
                </CardContent>
              </Card>
              {!isAdmin && (
                <Card className="shadow-lg border-2 border-gray-200 bg-white/90 hover:bg-gray-50 transition-all">
                  <CardContent className="px-2 py-3 md:px-4 md:py-6">
                    <p className="text-xs md:text-sm text-gray-600">
                      {selectedMonth ? `Uren in ${selectedMonth}` : 'Uren totaal'}
                    </p>
                    <p className="text-2xl md:text-3xl font-bold text-gray-800"><ZakelijkUren value={monthlyHours} /></p>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>

        {/* Grafieken */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-2 md:gap-8 mb-4 md:mb-8">
          {/* Opdrachtgever project status cards at the top, charts below */}
          {isOpdrachtgever && (
            <>
              {/* Status cards row */}
              <div className="flex flex-col md:flex-row justify-center items-center gap-2 md:gap-6 mb-6 mt-2 w-full">
                <Card className="shadow border border-gray-200 bg-white/95 transition-all w-full md:w-44">
                  <CardContent className="px-2 py-2 md:px-3 md:py-4 flex flex-col items-center">
                    <span className="text-xs md:text-sm text-gray-600">Afgerond</span>
                    <span className="text-xl md:text-2xl font-bold text-green-700">{projectStats.counts['completed']}</span>
                  </CardContent>
                </Card>
                <Card className="shadow border border-gray-200 bg-white/95 transition-all w-full md:w-44">
                  <CardContent className="px-2 py-2 md:px-3 md:py-4 flex flex-col items-center">
                    <span className="text-xs md:text-sm text-gray-600">Bezig</span>
                    <span className="text-xl md:text-2xl font-bold text-blue-700">{projectStats.counts['in-progress']}</span>
                  </CardContent>
                </Card>
                <Card className="shadow border border-gray-200 bg-white/95 transition-all w-full md:w-44">
                  <CardContent className="px-2 py-2 md:px-3 md:py-4 flex flex-col items-center">
                    <span className="text-xs md:text-sm text-gray-600">Ter review</span>
                    <span className="text-xl md:text-2xl font-bold text-yellow-600">{projectStats.counts['needs-review']}</span>
                  </CardContent>
                </Card>
              </div>
              {/* Charts row below cards, always below, never beside */}
              <div className="w-full">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                  <Card className="shadow border border-blue-200 bg-white/90 transition-all w-full">
                    <CardHeader className="px-2 py-2 md:px-3 md:py-2">
                      <CardTitle className="text-xs md:text-sm text-blue-700">Projecten per week</CardTitle>
                    </CardHeader>
                    <CardContent className="p-1 md:p-2 flex-1 w-full h-48 md:h-56 flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={projectStats.perWeek} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="week" fontSize={10} />
                          <YAxis fontSize={10} allowDecimals={false} />
                          <RechartTooltip />
                          <Legend />
                          <Line type="monotone" dataKey="count" name="Aantal projecten" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                  <Card className="shadow border border-green-200 bg-white/90 transition-all w-full">
                    <CardHeader className="px-2 py-2 md:px-3 md:py-2">
                      <CardTitle className="text-xs md:text-sm text-green-700">Projectstatus verdeling</CardTitle>
                    </CardHeader>
                    <CardContent className="p-1 md:p-2 flex-1 w-full h-48 md:h-56 flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={projectStats.perStatus}
                            dataKey="value"
                            nameKey="status"
                            cx="50%"
                            cy="50%"
                            outerRadius={50}
                            fill="#8884d8"
                            label={({ status, value }) => `${STATUS_LABELS_NL[status] || status}: ${value}`}
                          >
                            {projectStats.perStatus.map((entry, i) => (
                              <Cell key={i} fill={COLORS[i % COLORS.length]} />
                            ))}
                          </Pie>
                          <RechartTooltip formatter={(value, name, props) => [`${value}`, STATUS_LABELS_NL[props.payload.status] || props.payload.status]} />
                          <Legend formatter={status => STATUS_LABELS_NL[status] || status} wrapperStyle={{ fontSize: '11px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </>
          )}
          {/* Only show hours charts for admin/technician, not opdrachtgever */}
          {(!isOpdrachtgever) && (
            <Card className="shadow-lg bg-white/80 border border-red-200">
              <CardHeader className="px-2 py-3 md:px-4 md:py-4">
                <CardTitle className="text-sm md:text-base text-red-700">
                  {isAdmin ? 'Wekelijkse uren per monteur(s)' : 'Jouw gewerkte uren per week'}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-1 md:p-4">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={weeklyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="week" fontSize={11} />
                    <YAxis fontSize={11} />
                    <RechartTooltip />
                    <Legend />
                    {isAdmin ? (
                      <>
                        <Bar dataKey="regularHours" name="Normaal 100%" stackId="a" fill="#1e3a8a" />
                        <Bar dataKey="overtimeHours" name="Overtime 125%" stackId="a" fill="#2563eb" />
                        <Bar dataKey="weekendHours" name="Weekend 150%" stackId="a" fill="#60a5fa" />
                        <Bar dataKey="sundayHours" name="Sunday 200%" stackId="a" fill="#93c5fd" />
                      </>
                    ) : (
                      <Bar dataKey="allHours" name="Totaal uren" fill="#dc2626" />
                    )}
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Admin: Performance cards/table */}
        {isAdmin && (
          <Card className="mb-6 md:mb-10 shadow-xl border-2 border-gray-100 bg-white/95">
            <CardHeader>
              <CardTitle className="text-sm md:text-base text-red-700">Monteur Prestatie Overzicht</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="hidden md:grid grid-cols-1 gap-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                  {displayData.map((t, i) => {
                    const margin = t.revenue > 0 ? ((t.profit / t.revenue) * 100).toFixed(1) : '0';
                    return (
                      <div
                        key={t.technicianId}
                        className={`
                          flex flex-col bg-gradient-to-br from-white via-gray-50 to-gray-100
                          rounded-2xl shadow-2xl border-2 border-gray-200
                          hover:scale-[1.01] hover:shadow-gray-300
                          transition p-5 relative
                        `}
                      >
                        <div className="flex items-center mb-2">
                          <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-full text-red-700 text-xl font-bold mr-3 shadow">
                            {getInitials(t.technicianName)}
                          </div>
                          <div className="flex-1">
                            <span className="block font-semibold text-lg text-gray-900">{t.technicianName}</span>
                            <Badge color="bg-gray-100" text="text-gray-700"><ZakelijkDagen value={t.daysWorked} /> dagen</Badge>
                          </div>
                          {t.totalHours === maxHours && (
                            <Badge color="bg-green-50" text="text-green-700">Top uren</Badge>
                          )}
                          {t.profit === maxProfit && (
                            <Badge color="bg-yellow-50" text="text-yellow-700">Top winst</Badge>
                          )}
                        </div>
                        <ProgressBar value={t.totalHours} max={maxHours} color="#dc2626" />
                        <div className="grid grid-cols-2 gap-3 mt-1 mb-3">
                          <div>
                            <div className="text-xs text-gray-400 mb-1">Totaal uren</div>
                            <div className="font-bold"><ZakelijkUren value={t.totalHours} /></div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-400 mb-1">Laatste Werkdag</div>
                            <div>{new Date(t.lastWorked).toLocaleDateString('nl-NL')}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-400 mb-1">Omzet</div>
                            <div className="font-semibold text-gray-800"><ZakelijkEuro value={t.revenue} /></div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-400 mb-1">Kosten</div>
                            <div className="font-semibold text-gray-800"><ZakelijkEuro value={t.costs} /></div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-400 mb-1">Winst</div>
                            <div className={`font-bold ${t.profit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                              <ZakelijkEuro value={t.profit} />
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-400 mb-1">Margin %</div>
                            <div className={`font-bold ${parseFloat(margin) >= 0 ? 'text-green-700' : 'text-red-700'}`}>
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
              <div className="space-y-2 md:hidden">
                {displayData.map((t, i) => {
                  const margin = t.revenue > 0 ? ((t.profit / t.revenue) * 100).toFixed(1) : '0';
                  return (
                    <div
                      key={t.technicianId}
                      className={`
                        rounded-2xl shadow-md border p-3 bg-gradient-to-r
                        from-gray-50 via-white to-gray-50 flex flex-col gap-1
                        ${i % 2 === 0 ? 'border-l-4 border-red-600' : 'border-l-4 border-yellow-300'}
                      `}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-base text-gray-900">{t.technicianName}</span>
                        <Badge color="bg-gray-100" text="text-gray-700"><ZakelijkDagen value={t.daysWorked} /> dagen</Badge>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1">
                        <div className="flex flex-col items-start">
                          <span className="text-xs text-gray-400">Totaal uren</span>
                          <span className="font-semibold"><ZakelijkUren value={t.totalHours} /></span>
                        </div>
                        <div className="flex flex-col items-start">
                          <span className="text-xs text-gray-400">Omzet</span>
                          <span className="font-semibold text-gray-800"><ZakelijkEuro value={t.revenue} /></span>
                        </div>
                        <div className="flex flex-col items-start">
                          <span className="text-xs text-gray-400">Kosten</span>
                          <span className="font-semibold text-gray-800"><ZakelijkEuro value={t.costs} /></span>
                        </div>
                        <div className="flex flex-col items-start">
                          <span className="text-xs text-gray-400">Winst</span>
                          <span className={`font-bold ${t.profit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                            <ZakelijkEuro value={t.profit} />
                          </span>
                        </div>
                        <div className="flex flex-col items-start">
                          <span className="text-xs text-gray-400">Margin %</span>
                          <span className={`font-bold ${parseFloat(margin) >= 0 ? 'text-green-700' : 'text-red-700'}`}>
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

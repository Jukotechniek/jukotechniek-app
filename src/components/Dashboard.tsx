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
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';

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
    // For admin, always use verifiedHours for all analytics and charts
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

  // --- Updated processTechnicianData with webhook vs manual hours logic ---
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

      // For webhook hours: revenue based on webhook hours, costs based on manual hours
      // For manual hours: both revenue and costs based on manual hours
      const isWebhookEntry = !entry.is_manual_entry;
      const isVerified = entry.manual_verified === true;
      
      // Skip unverified entries
      if (!isVerified) return;

      const reg = Number(entry.regular_hours || 0);
      const ot = Number(entry.overtime_hours || 0);
      const wk = Number(entry.weekend_hours || 0);
      const su = Number(entry.sunday_hours || 0);
      const actualHours = Number(entry.hours_worked || 0);

      // Tarieven
      const rate = rateMap.get(id) || { hourly: 0, billable: 0, saturday: 0, sunday: 0 };

      let rev = 0, cost = 0;

      if (isWebhookEntry) {
        // Revenue calculation: use webhook hours (what we invoice to customer)
        // For webhook entries, treat all hours as regular billable hours
        rev += actualHours * rate.billable;
        
        // Cost calculation: use manual hours (what mechanics invoice to us)
        // Find corresponding manual entry for this date/technician
        const manualEntry = rawWorkHours.find(h => 
          h.technician_id === id && 
          h.date === entry.date && 
          h.is_manual_entry === true &&
          h.manual_verified === true
        );
        
        if (manualEntry) {
          const manualReg = Number(manualEntry.regular_hours || 0);
          const manualOt = Number(manualEntry.overtime_hours || 0);
          const manualWk = Number(manualEntry.weekend_hours || 0);
          const manualSu = Number(manualEntry.sunday_hours || 0);
          
          cost += manualSu * rate.sunday;
          cost += manualWk * rate.saturday;
          cost += manualOt * rate.hourly * 1.25;
          cost += manualReg * rate.hourly;
        } else {
          // Fallback: use webhook hours for costs if no manual entry
          cost += actualHours * rate.hourly;
        }
      } else {
        // Manual entry: calculate both revenue and costs based on manual hours
        rev += su * rate.billable * 2;
        rev += wk * rate.billable * 1.5;
        rev += ot * rate.billable * 1.25;
        rev += reg * rate.billable;
        
        cost += su * rate.sunday;
        cost += wk * rate.saturday;
        cost += ot * rate.hourly * 1.25;
        cost += reg * rate.hourly;
      }

      // Travel expenses
      const customerId = entry.customer_id;
      const travelKey = `${customerId}_${id}`;
      const travel = travelMap.get(travelKey) || { toTech: 0, fromClient: 0 };

      rev += travel.fromClient;
      cost += travel.toTech;

      const profit = rev - cost;
      s.totalHours += actualHours;
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

  // --- Custom omzet calculation for admin ---
  // REMOVE calculateAdminOmzet function and use technicianData.reduce for omzet

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
              {isAdmin && technicianData.reduce((s, t) => s + t.revenue, 0) > 0 && (
                <Card className="shadow-lg border-2 border-gray-200 bg-white/90 hover:bg-gray-50 transition-all">
                  <CardContent className="px-2 py-3 md:px-4 md:py-6">
                    <p className="text-xs md:text-sm text-gray-600">Totale omzet</p>
                    <p className="text-2xl md:text-3xl font-bold text-gray-800">
                      <ZakelijkEuro value={technicianData.reduce((s, t) => s + t.revenue, 0)} />
                    </p>
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

        {/* Charts for non-admin users */}
        {!isAdmin && !isOpdrachtgever && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-2 md:gap-8 mb-4 md:mb-8">
            <Card className="shadow-lg bg-white/80 border border-red-200">
              <CardHeader className="px-2 py-3 md:px-4 md:py-4">
                <CardTitle className="text-sm md:text-base text-red-700">
                  Jouw gewerkte uren per week
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
                    <Bar dataKey="allHours" name="Totaal uren" fill="#dc2626" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Opdrachtgever Charts */}
        {isOpdrachtgever && (
          <>
            {/* Status cards row */}
            <div className="flex flex-col md:flex-row justify-center items-center gap-2 md:gap-6 mb-8 mt-2 w-full">
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
            {/* Charts row below cards */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-2 md:gap-8 mb-4 md:mb-8">
              <Card className="shadow border border-blue-200 bg-white/90 transition-all">
                <CardHeader className="px-2 py-2 md:px-3 md:py-2">
                  <CardTitle className="text-xs md:text-sm text-blue-700">Projecten per week</CardTitle>
                </CardHeader>
                <CardContent className="p-1 md:p-2 flex-1 h-48 md:h-56 flex items-center justify-center">
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
              <Card className="shadow border border-green-200 bg-white/90 transition-all">
                <CardHeader className="px-2 py-2 md:px-3 md:py-2">
                  <CardTitle className="text-xs md:text-sm text-green-700">Projectstatus verdeling</CardTitle>
                </CardHeader>
                <CardContent className="p-1 md:p-2 flex-1 h-48 md:h-56 flex items-center justify-center">
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
          </>
        )}

        {/* Admin: 4 Charts Layout */}
        {isAdmin && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Chart 1: Revenue vs Costs */}
            <Card className="shadow-lg border-2 border-gray-200 bg-white/90">
              <CardHeader>
                <CardTitle className="text-red-700 flex items-center space-x-2">
                  <span>Omzet vs Kosten</span>
                  <Badge color="bg-red-100" text="text-red-800">Admin</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={technicianData.map(tech => ({
                      name: tech.technicianName.split(' ').map(n => n[0]).join(''),
                      omzet: tech.revenue,
                      kosten: tech.costs
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)"/>
                      <XAxis dataKey="name" className="text-xs" />
                      <YAxis className="text-xs" />
                      <RechartTooltip 
                        contentStyle={{ backgroundColor: 'white', border: '1px solid #ccc', borderRadius: '8px' }}
                        formatter={(value, name) => [<ZakelijkEuro value={value} />, name === 'omzet' ? 'Omzet' : 'Kosten']}
                      />
                      <Bar dataKey="omzet" fill="#059669" />
                      <Bar dataKey="kosten" fill="#dc2626" />
                      <Legend />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Chart 2: Profit Distribution */}
            <Card className="shadow-lg border-2 border-gray-200 bg-white/90">
              <CardHeader>
                <CardTitle className="text-red-700 flex items-center space-x-2">
                  <span>Winstverdeling</span>
                  <Badge color="bg-red-100" text="text-red-800">Admin</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={technicianData.map(tech => ({
                          name: tech.technicianName.split(' ').map(n => n[0]).join(''),
                          value: Math.max(0, tech.profit),
                          color: COLORS[technicianData.indexOf(tech) % COLORS.length]
                        }))}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {technicianData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartTooltip 
                        contentStyle={{ backgroundColor: 'white', border: '1px solid #ccc', borderRadius: '8px' }}
                        formatter={(value) => [<ZakelijkEuro value={value} />, 'Winst']}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Chart 3: Hours Distribution */}
            <Card className="shadow-lg border-2 border-gray-200 bg-white/90">
              <CardHeader>
                <CardTitle className="text-red-700 flex items-center space-x-2">
                  <span>Uren Verdeling</span>
                  <Badge color="bg-red-100" text="text-red-800">Admin</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={technicianData.map(tech => ({
                      name: tech.technicianName.split(' ').map(n => n[0]).join(''),
                      normaal: tech.regularHours,
                      overwerk: tech.overtimeHours,
                      weekend: tech.weekendHours,
                      zondag: tech.sundayHours
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)"/>
                      <XAxis dataKey="name" className="text-xs" />
                      <YAxis className="text-xs" />
                      <RechartTooltip 
                        contentStyle={{ backgroundColor: 'white', border: '1px solid #ccc', borderRadius: '8px' }}
                        formatter={(value) => [<ZakelijkUren value={value} />, '']}
                      />
                      <Bar dataKey="normaal" stackId="a" fill="#dc2626" />
                      <Bar dataKey="overwerk" stackId="a" fill="#991b1b" />
                      <Bar dataKey="weekend" stackId="a" fill="#fbbf24" />
                      <Bar dataKey="zondag" stackId="a" fill="#8b5cf6" />
                      <Legend />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Chart 4: Profit per Technician */}
            <Card className="shadow-lg border-2 border-gray-200 bg-white/90">
              <CardHeader>
                <CardTitle className="text-red-700 flex items-center space-x-2">
                  <span>Winst per Monteur</span>
                  <Badge color="bg-red-100" text="text-red-800">Admin</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={technicianData.map(tech => ({
                      name: tech.technicianName.split(' ').map(n => n[0]).join(''),
                      winst: tech.profit
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)"/>
                      <XAxis dataKey="name" className="text-xs" />
                      <YAxis className="text-xs" />
                      <RechartTooltip 
                        contentStyle={{ backgroundColor: 'white', border: '1px solid #ccc', borderRadius: '8px' }}
                        formatter={(value) => [<ZakelijkEuro value={value} />, 'Winst']}
                      />
                      <Bar dataKey="winst" fill="#2563eb" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Technician Overview - Always shown for verified hours only */}
        <Card className="shadow-lg border-2 border-gray-200 bg-white/90 mb-4 md:mb-8">
          <CardHeader>
            <CardTitle className="text-red-700 flex items-center space-x-2">
              <span>Monteur Overzicht</span>
              {isAdmin && (
                <Badge color="bg-red-100" text="text-red-800">Alleen geverifieerde uren</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 md:space-y-4">
              {displayData.map((tech) => (
                <div key={tech.technicianId} className="border border-gray-300 rounded-lg p-2 md:p-4 bg-gradient-to-r from-white to-gray-50 hover:shadow-md transition-all">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-2 md:space-y-0">
                    <div className="flex items-center space-x-2 md:space-x-3">
                      <div className="w-8 h-8 md:w-10 md:h-10 bg-red-600 rounded-full flex items-center justify-center text-white font-bold text-xs md:text-sm">
                        {getInitials(tech.technicianName)}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 text-sm md:text-base">{tech.technicianName}</h3>
                        <p className="text-xs md:text-sm text-gray-600">
                          <ZakelijkUren value={tech.totalHours} /> • <ZakelijkDagen value={tech.daysWorked} /> dagen
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:flex md:items-center md:space-x-4 gap-2 md:gap-0">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="text-center">
                              <p className="text-xs text-gray-500">Uren</p>
                              <p className="font-bold text-red-600 text-sm md:text-base">
                                <ZakelijkUren value={tech.totalHours} />
                              </p>
                              <ProgressBar value={tech.totalHours} max={maxHours} color="#dc2626" />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="text-xs">
                              <p>Normaal: <ZakelijkUren value={tech.regularHours} /></p>
                              <p>Overwerk: <ZakelijkUren value={tech.overtimeHours} /></p>
                              <p>Weekend: <ZakelijkUren value={tech.weekendHours} /></p>
                              <p>Zondag: <ZakelijkUren value={tech.sundayHours} /></p>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      {isAdmin && (
                        <>
                          <div className="text-center">
                            <p className="text-xs text-gray-500">Omzet</p>
                            <p className="font-bold text-green-600 text-sm md:text-base">
                              <ZakelijkEuro value={tech.revenue} />
                            </p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-gray-500">Kosten</p>
                            <p className="font-bold text-orange-600 text-sm md:text-base">
                              <ZakelijkEuro value={tech.costs} />
                            </p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-gray-500">Winst</p>
                            <p className="font-bold text-blue-600 text-sm md:text-base">
                              <ZakelijkEuro value={tech.profit} />
                            </p>
                            <ProgressBar value={tech.profit} max={maxProfit} color="#2563eb" />
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;

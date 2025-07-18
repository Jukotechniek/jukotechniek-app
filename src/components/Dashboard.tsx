import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
} from 'recharts';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { TechnicianSummary } from '@/types/workHours';
import { formatDutchDate } from '@/utils/overtimeCalculations';
import TechnicianFilter from './TechnicianFilter';

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
  const [selectedTechnicianDetails, setSelectedTechnicianDetails] = useState(null);
  const [detailedHours, setDetailedHours] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    if (!rawWorkHours.length) return;
    let filtered = rawWorkHours.filter(e => Boolean(e.manual_verified));

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
    if (isAdmin)
      setWeeklyAdminData(
        processWeeklyData(
          rawWorkHours.filter(e => Boolean(e.manual_verified))
        )
      );
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

      // Transform webhook hours to match work_hours format with proper overtime calculations
      const transformedWebhookHours = (webhookHours || []).map(wh => {
        const workDate = new Date(wh.date);
        const dayOfWeek = workDate.getDay();
        const isSunday = dayOfWeek === 0;
        const isWeekend = dayOfWeek === 6;
        
        let regularHours = 0;
        let overtimeHours = 0;
        let weekendHours = 0;
        let sundayHours = 0;
        
        const totalHours = Number(wh.hours_worked);
        
        if (isSunday) {
          sundayHours = totalHours;
        } else if (isWeekend) {
          weekendHours = totalHours;
        } else {
          // Weekday - calculate regular vs overtime (8 hours regular, rest overtime)
          if (totalHours <= 8) {
            regularHours = totalHours;
          } else {
            regularHours = 8;
            overtimeHours = totalHours - 8;
          }
        }
        
        return {
          ...wh,
          customer_id: null, // webhook doesn't have customer info
          hours_worked: totalHours,
          regular_hours: regularHours,
          overtime_hours: overtimeHours,
          weekend_hours: weekendHours,
          sunday_hours: sundayHours,
          is_weekend: isWeekend,
          is_sunday: isSunday,
          is_manual_entry: false,
          travel_expense_to_technician: 0,
          travel_expense_from_client: 0,
          created_at: wh.created_at,
          created_by: null,
          start_time: wh.webhook_start,
          end_time: wh.webhook_end,
          manual_verified: Boolean(wh.webhook_verified),
          description: 'Webhook uren',
          technician_id: wh.technician_id,
          date: wh.date,
          profiles: wh.profiles
        };
      });

      // Combine hours where verified entries take precedence
      const combinedMap = new Map<string, any>();

      // Start with manual hours
      (workHours || []).forEach(wh => {
        const key = `${wh.technician_id}_${wh.date}`;
        combinedMap.set(key, wh);
      });

      // Merge webhook hours, only overriding when verified or no manual entry
      transformedWebhookHours.forEach(wh => {
        const key = `${wh.technician_id}_${wh.date}`;
        const existing = combinedMap.get(key);
        if (!existing || Boolean(wh.webhook_verified) || !Boolean(existing.manual_verified)) {
          combinedMap.set(key, wh);
        }
      });

      const combinedHours = Array.from(combinedMap.values()).map(e => ({
        ...e,
        manual_verified: Boolean(e.manual_verified),
        webhook_verified: Boolean(e.webhook_verified)
      }));

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
  const fetchTechnicianDetails = async (technicianId) => {
    try {
      const { data: workHours, error } = await supabase
        .from('work_hours')
        .select(`
          *,
          customers(name),
          profiles!work_hours_technician_id_fkey(full_name)
        `)
        .eq('technician_id', technicianId)
        .eq('manual_verified', true)
        .order('date', { ascending: false });
      
      if (error) throw error;
      return workHours || [];
    } catch (err) {
      console.error('Error fetching technician details:', err);
      return [];
    }
  };

  const handleTechnicianClick = async (technician) => {
    const details = await fetchTechnicianDetails(technician.technicianId);
    setDetailedHours(details);
    setSelectedTechnicianDetails(technician);
  };

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
          travelCost: 0,
          travelRevenue: 0,
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

      // Only calculate revenue and costs if hours are verified
      const isVerified = Boolean(entry.manual_verified);

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
      }

      if (isVerified && billedHours > actualHours) {
        rev += (billedHours - actualHours) * rate.billable;
      }

      const customerId = entry.customer_id;
      const travelKey = `${customerId}_${id}`;
      const travel = travelMap.get(travelKey) || { toTech: 0, fromClient: 0 };

      if (isVerified && travel.fromClient > 0) {
        rev += travel.fromClient;
        s.travelRevenue += travel.fromClient;
      }
      if (isVerified && travel.toTech > 0) {
        cost += travel.toTech;
        s.travelCost += travel.toTech;
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
        </div>

        {/* Grafieken */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-2 md:gap-8 mb-4 md:mb-8">
          {/* --- WEEK (admin: stacked, monteur: normaal) --- */}
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

          {/* --- REST unchanged --- */}
          {isAdmin && (
            <>
              <Card className="shadow-lg bg-white/80 border border-red-200">
                <CardHeader className="px-2 py-3 md:px-4 md:py-4">
                  <CardTitle className="text-sm md:text-base text-blue-700">Wekelijkse uren (trend)</CardTitle>
                </CardHeader>
                <CardContent className="p-1 md:p-4">
                 <ResponsiveContainer width="100%" height={220}>
  <AreaChart data={weeklyAdminData}>
    <defs>
      <linearGradient id="colorArea" x1="0" y1="0" x2="0" y2="1">
        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.7} />
        <stop offset="95%" stopColor="#2563eb" stopOpacity={0.15} />
      </linearGradient>
    </defs>
    <XAxis dataKey="week" fontSize={11} />
    <YAxis fontSize={11} />
    <CartesianGrid strokeDasharray="3 3" />
    <RechartTooltip />
    <Area
      type="monotone"
      dataKey="allHours"     
      stroke="#2563eb"
      fill="url(#colorArea)"
      name="Totaal uren"
    />
       </AreaChart>
      </ResponsiveContainer>

                </CardContent>
              </Card>
              <Card className="shadow-lg bg-white/80 border border-yellow-200">
                <CardHeader className="px-2 py-3 md:px-4 md:py-4">
                  <CardTitle className="text-sm md:text-base text-yellow-600">Winstverdeling</CardTitle>
                </CardHeader>
                <CardContent className="p-1 md:p-4">
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={displayData.filter(t => t.profit > 0).slice(0, 5).map((t, i) => ({
                          ...t,
                          name: t.technicianName,
                          value: t.profit
                        }))}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={70}
                        fill="#8884d8"
                      >
                        {displayData
                          .filter(t => t.profit > 0)
                          .slice(0, 5)
                          .map((e, i) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                      </Pie>
                      <RechartTooltip 
                        formatter={(value) => [
                          new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(Number(value)),
                          'Winst'
                        ]}
                      />
                      <Legend wrapperStyle={{ fontSize: '12px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card className="shadow-lg bg-white/80 border border-green-200">
                <CardHeader className="px-2 py-3 md:px-4 md:py-4">
                  <CardTitle className="text-sm md:text-base text-green-700">Overtime per monteur (100%, 125%, 150%, 200%)</CardTitle>
                </CardHeader>
                <CardContent className="p-1 md:p-4">
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={technicianData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="technicianName" fontSize={11} />
                      <YAxis fontSize={11} />
                      <RechartTooltip formatter={v => `${Number(v).toFixed(2)}u`} />
                      <Legend />
                      <Bar dataKey="regularHours" fill="#1e3a8a" name="Normaal 100%" stackId="a" />
                      <Bar dataKey="overtimeHours" fill="#2563eb" name="Overtime 125%" stackId="a" />
                      <Bar dataKey="weekendHours" fill="#60a5fa" name="Weekend 150%" stackId="a" />
                      <Bar dataKey="sundayHours" fill="#93c5fd" name="Sunday 200%" stackId="a" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </>
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
                    const costBreakdown = `Normaal: €${(t.regularHours * (rawRates.find(r => r.technician_id === t.technicianId)?.hourly_rate || 0)).toFixed(2)} | Overtime: €${(t.overtimeHours * (rawRates.find(r => r.technician_id === t.technicianId)?.hourly_rate || 0) * 1.25).toFixed(2)} | Weekend: €${(t.weekendHours * (rawRates.find(r => r.technician_id === t.technicianId)?.saturday_rate || 0)).toFixed(2)} | Zondag: €${(t.sundayHours * (rawRates.find(r => r.technician_id === t.technicianId)?.sunday_rate || 0)).toFixed(2)} | Reiskosten: €${t.travelCost.toFixed(2)}`;
                    const revenueBreakdown = `Normaal: €${(t.regularHours * (rawRates.find(r => r.technician_id === t.technicianId)?.billable_rate || 0)).toFixed(2)} | Overtime: €${(t.overtimeHours * (rawRates.find(r => r.technician_id === t.technicianId)?.billable_rate || 0) * 1.25).toFixed(2)} | Weekend: €${(t.weekendHours * (rawRates.find(r => r.technician_id === t.technicianId)?.billable_rate || 0) * 1.5).toFixed(2)} | Zondag: €${(t.sundayHours * (rawRates.find(r => r.technician_id === t.technicianId)?.billable_rate || 0) * 2).toFixed(2)} | Reisopbrengst: €${t.travelRevenue.toFixed(2)}`;
                    
                    return (
                      <div
                        key={t.technicianId}
                        className={`
                          flex flex-col bg-gradient-to-br from-white via-gray-50 to-gray-100
                          rounded-2xl shadow-2xl border-2 border-gray-200
                          hover:scale-[1.01] hover:shadow-gray-300
                          transition p-5 relative cursor-pointer
                        `}
                        onClick={() => handleTechnicianClick(t)}
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
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div>
                                  <div className="text-xs text-gray-400 mb-1">Omzet</div>
                                  <div className="font-semibold text-gray-800"><ZakelijkEuro value={t.revenue} /></div>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-xs max-w-xs">{revenueBreakdown}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div>
                                  <div className="text-xs text-gray-400 mb-1">Kosten</div>
                                  <div className="font-semibold text-gray-800"><ZakelijkEuro value={t.costs} /></div>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-xs max-w-xs">{costBreakdown}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div>
                                  <div className="text-xs text-gray-400 mb-1">Reiskosten</div>
                                  <div className="font-semibold text-gray-800"><ZakelijkEuro value={t.travelCost} /></div>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-xs">Totale reiskosten betaald aan monteur: €{t.travelCost.toFixed(2)}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
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
                  const costBreakdown = `Normaal: €${(t.regularHours * (rawRates.find(r => r.technician_id === t.technicianId)?.hourly_rate || 0)).toFixed(2)} | Overtime: €${(t.overtimeHours * (rawRates.find(r => r.technician_id === t.technicianId)?.hourly_rate || 0) * 1.25).toFixed(2)} | Weekend: €${(t.weekendHours * (rawRates.find(r => r.technician_id === t.technicianId)?.saturday_rate || 0)).toFixed(2)} | Zondag: €${(t.sundayHours * (rawRates.find(r => r.technician_id === t.technicianId)?.sunday_rate || 0)).toFixed(2)} | Reiskosten: €${t.travelCost.toFixed(2)}`;
                  const revenueBreakdown = `Normaal: €${(t.regularHours * (rawRates.find(r => r.technician_id === t.technicianId)?.billable_rate || 0)).toFixed(2)} | Overtime: €${(t.overtimeHours * (rawRates.find(r => r.technician_id === t.technicianId)?.billable_rate || 0) * 1.25).toFixed(2)} | Weekend: €${(t.weekendHours * (rawRates.find(r => r.technician_id === t.technicianId)?.billable_rate || 0) * 1.5).toFixed(2)} | Zondag: €${(t.sundayHours * (rawRates.find(r => r.technician_id === t.technicianId)?.billable_rate || 0) * 2).toFixed(2)} | Reisopbrengst: €${t.travelRevenue.toFixed(2)}`;
                  
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
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex flex-col items-start">
                                <span className="text-xs text-gray-400">Omzet</span>
                                <span className="font-semibold text-gray-800"><ZakelijkEuro value={t.revenue} /></span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs max-w-xs">{revenueBreakdown}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex flex-col items-start">
                                <span className="text-xs text-gray-400">Kosten</span>
                                <span className="font-semibold text-gray-800"><ZakelijkEuro value={t.costs} /></span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs max-w-xs">{costBreakdown}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex flex-col items-start">
                                <span className="text-xs text-gray-400">Reiskosten</span>
                                <span className="font-semibold text-gray-800"><ZakelijkEuro value={t.travelCost} /></span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">Totale reiskosten betaald aan monteur: €{t.travelCost.toFixed(2)}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
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

        {/* Detail Dialog */}
        <Dialog open={!!selectedTechnicianDetails} onOpenChange={() => setSelectedTechnicianDetails(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Gedetailleerd overzicht - {selectedTechnicianDetails?.technicianName}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {detailedHours.map((entry, index) => {
                const rate = rawRates.find(r => r.technician_id === entry.technician_id) || {};
                const travelRate = travelRates.find(tr => 
                  tr.customer_id === entry.customer_id && tr.technician_id === entry.technician_id
                ) || {};
                
                const regularCost = (entry.regular_hours || 0) * (rate.hourly_rate || 0);
                const overtimeCost = (entry.overtime_hours || 0) * (rate.hourly_rate || 0) * 1.25;
                const weekendCost = (entry.weekend_hours || 0) * (rate.saturday_rate || rate.hourly_rate * 1.5 || 0);
                const sundayCost = (entry.sunday_hours || 0) * (rate.sunday_rate || rate.hourly_rate * 2 || 0);
                const travelCostEntry = travelRate.travel_expense_to_technician || 0;
                const totalCost = regularCost + overtimeCost + weekendCost + sundayCost + travelCostEntry;
                
                const regularRevenue = (entry.regular_hours || 0) * (rate.billable_rate || 0);
                const overtimeRevenue = (entry.overtime_hours || 0) * (rate.billable_rate || 0) * 1.25;
                const weekendRevenue = (entry.weekend_hours || 0) * (rate.billable_rate || 0) * 1.5;
                const sundayRevenue = (entry.sunday_hours || 0) * (rate.billable_rate || 0) * 2;
                const travelRevenue = travelRate.travel_expense_from_client || 0;
                const totalRevenue = regularRevenue + overtimeRevenue + weekendRevenue + sundayRevenue + travelRevenue;
                
                return (
                  <Card key={index} className="p-4 border-l-4 border-blue-500">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <h4 className="font-semibold text-lg">{new Date(entry.date).toLocaleDateString('nl-NL')}</h4>
                        <p className="text-sm text-gray-600">{entry.customers?.name || 'Geen klant'}</p>
                        <p className="text-sm text-gray-600">{entry.description || 'Geen beschrijving'}</p>
                        <p className="text-sm text-gray-600">
                          {entry.start_time && entry.end_time ? 
                            `${entry.start_time} - ${entry.end_time}` : 
                            'Geen tijden'
                          }
                        </p>
                      </div>
                      
                      <div>
                        <h5 className="font-medium mb-2">Uren Breakdown</h5>
                        {entry.regular_hours > 0 && (
                          <p className="text-xs">Normaal: {entry.regular_hours}u</p>
                        )}
                        {entry.overtime_hours > 0 && (
                          <p className="text-xs">Overtime: {entry.overtime_hours}u</p>
                        )}
                        {entry.weekend_hours > 0 && (
                          <p className="text-xs">Weekend: {entry.weekend_hours}u</p>
                        )}
                        {entry.sunday_hours > 0 && (
                          <p className="text-xs">Zondag: {entry.sunday_hours}u</p>
                        )}
                        <p className="text-sm font-semibold">Totaal: {entry.hours_worked}u</p>
                      </div>
                      
                      <div>
                        <h5 className="font-medium mb-2">Financieel</h5>
                        <div className="space-y-1">
                          <div className="text-xs">
                            <span className="text-green-600">Omzet: €{totalRevenue.toFixed(2)}</span>
                            {regularRevenue > 0 && <span className="block ml-2">• Normaal: €{regularRevenue.toFixed(2)}</span>}
                            {overtimeRevenue > 0 && <span className="block ml-2">• Overtime: €{overtimeRevenue.toFixed(2)}</span>}
                            {weekendRevenue > 0 && <span className="block ml-2">• Weekend: €{weekendRevenue.toFixed(2)}</span>}
                            {sundayRevenue > 0 && <span className="block ml-2">• Zondag: €{sundayRevenue.toFixed(2)}</span>}
                            {travelRevenue > 0 && <span className="block ml-2">• Reisopbrengst: €{travelRevenue.toFixed(2)}</span>}
                          </div>
                          <div className="text-xs">
                            <span className="text-red-600">Kosten: €{totalCost.toFixed(2)}</span>
                            {regularCost > 0 && <span className="block ml-2">• Normaal: €{regularCost.toFixed(2)}</span>}
                            {overtimeCost > 0 && <span className="block ml-2">• Overtime: €{overtimeCost.toFixed(2)}</span>}
                            {weekendCost > 0 && <span className="block ml-2">• Weekend: €{weekendCost.toFixed(2)}</span>}
                            {sundayCost > 0 && <span className="block ml-2">• Zondag: €{sundayCost.toFixed(2)}</span>}
                            {travelCostEntry > 0 && <span className="block ml-2">• Reiskosten: €{travelCostEntry.toFixed(2)}</span>}
                          </div>
                          <div className="text-sm font-semibold">
                            <span className={totalRevenue - totalCost >= 0 ? 'text-green-600' : 'text-red-600'}>
                              Winst: €{(totalRevenue - totalCost).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Dashboard;
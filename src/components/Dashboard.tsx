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
import type { WorkEntry } from '@/types/workHours';

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
  // Helper: maak platte array van travelRates
  const flatTravelRates = Array.isArray(travelRates)
    ? travelRates.flatMap(tr => Array.isArray(tr) ? tr : [tr])
    : [];
  const [technicianData, setTechnicianData] = useState([]);
  const [weeklyData, setWeeklyData] = useState([]);
  const [weeklyAdminData, setWeeklyAdminData] = useState([]);
  const [selectedTechnician, setSelectedTechnician] = useState('all');
  const [loading, setLoading] = useState(true);

  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [monthlyHours, setMonthlyHours] = useState(0);
  const [selectedTechnicianDetails, setSelectedTechnicianDetails] = useState(null);
  const [detailedHours, setDetailedHours] = useState([]);

  const [projectCounts, setProjectCounts] = useState({
    completed: 0,
    inProgress: 0,
    needsReview: 0,
  });

  const fetchProjectCounts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('projects').select('status');
      if (error) throw error;
      const counts = { completed: 0, inProgress: 0, needsReview: 0 };
      (data || []).forEach((p: any) => {
        if (p.status === 'completed') counts.completed += 1;
        else if (p.status === 'in-progress') counts.inProgress += 1;
        else if (p.status === 'needs-review') counts.needsReview += 1;
      });
      setProjectCounts(counts);
    } catch (err) {
      console.error('Error fetching project counts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpdrachtgever) {
      fetchProjectCounts();
    }
  }, [isOpdrachtgever]);

  useEffect(() => {
    if (!isOpdrachtgever && user) {
      fetchDashboardData();
    }
  }, [isOpdrachtgever, user]);
  

  useEffect(() => {
    if (!rawWorkHours.length) return;
    let filtered = rawWorkHours;
    if (isAdmin) {
      if (selectedTechnician !== 'all') {
        filtered = filtered.filter(e => e.technician_id === selectedTechnician);
      }
    } else {
      filtered = filtered.filter(e => e.technician_id === user?.id);
    }
    if (selectedMonth) {
      const [y, m] = selectedMonth.split('-').map(n => parseInt(n, 10));
      filtered = filtered.filter(e => {
        const d = new Date(e.date);
        return d.getFullYear() === y && d.getMonth() + 1 === m;
      });
    }
    if (!isAdmin) {
      const uren = filtered.reduce((sum, e) => sum + Number(e.hours_worked || 0), 0);
      setMonthlyHours(uren);
    }
    // Process data once and store in state
    const processedData = processTechnicianData(filtered, rawRates, travelRates, rawWorkHours);
    setTechnicianData(processedData);
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
      if (webhookHours && webhookHours.length > 0) {
      } else {
      }

      // Fetch work hours with role-based restrictions
      let workHours;
      let hoursError;
      
      if (user?.role === 'technician') {
        // For technicians: only fetch essential fields
        const { data, error } = await supabase
          .from('work_hours')
          .select(`
            id, date, start_time, end_time, hours_worked, description, customer_id, customers(name), technician_id, profiles!work_hours_technician_id_fkey(full_name)
          `);
        workHours = data;
        hoursError = error;
      } else {
        // For admins: fetch all fields
        const { data, error } = await supabase
          .from('work_hours')
          .select(`
            *,
            customers(name),
            profiles!work_hours_technician_id_fkey(full_name)
          `);
        workHours = data;
        hoursError = error;
      }
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
          customer_id: (wh as any).customer_id,
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
        // FIX: alleen toevoegen als er nog GEEN entry is (dus nooit manuele uren overschrijven)
        if (!existing) {
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

  const handleTechnicianClick = (technician) => {
    // Gebruik de gecombineerde rawWorkHours, gefilterd op monteur/maand en verified
    let details = rawWorkHours.filter(
      e => e.technician_id === technician.technicianId && e.manual_verified
    );
    if (selectedMonth) {
      const [y, m] = selectedMonth.split('-').map(n => parseInt(n, 10));
      details = details.filter(d => {
        const dt = new Date(d.date);
        return dt.getFullYear() === y && dt.getMonth() + 1 === m;
      });
    }
    setDetailedHours(details);
    setSelectedTechnicianDetails(technician);
  };

  const processTechnicianData = (workHours, rates, travelRates, allRawWorkHours) => {
    // Eerst filteren we de entries op basis van de geselecteerde filters
    const filteredEntries = (allRawWorkHours || []).filter(entry => {
      // Als er een geselecteerde monteur is, filter daarop
      if (selectedTechnician !== 'all' && entry.technician_id !== selectedTechnician) {
        return false;
      }
      
      // Als er een geselecteerde maand is, filter daarop
      if (selectedMonth) {
        const [y, m] = selectedMonth.split('-').map(n => parseInt(n, 10));
        const d = new Date(entry.date);
        if (d.getFullYear() !== y || d.getMonth() + 1 !== m) {
          return false;
        }
      }
      
      return true;
    });

    // Groepeer entries per monteur/dag/klant
    const entriesMap = {};
    filteredEntries.forEach(entry => {
      const key = `${entry.technician_id}_${entry.date}_${entry.customer_id}`;
      if (!entriesMap[key]) entriesMap[key] = [];
      entriesMap[key].push(entry);
    });

    // Kies voor elke groep de juiste entry (manueel heeft voorrang)
    const chosenEntries = [];
    Object.values(entriesMap).forEach((entries: any[]) => {
      const manualEntry = entries.find(e => e.is_manual_entry === true);
      if (manualEntry) {
        chosenEntries.push(manualEntry);
      } else {
        // Als er geen manuele entry is, neem de webhook entry
        const webhookEntry = entries.find(e => !e.is_manual_entry);
        if (webhookEntry) {
          chosenEntries.push(webhookEntry);
        }
      }
    });

    // Groepeer per monteur
    const techMap = new Map();
    const rateMap = new Map();
    
    // Zet alle tarieven in een map
    rates.forEach(r => {
      const hourly = Number(r.hourly_rate || 0);
      rateMap.set(r.technician_id, {
        hourly,
        billable: Number(r.billable_rate || 0),
        saturday: Number(r.saturday_rate ?? hourly * 1.5),
        sunday: Number(r.sunday_rate ?? hourly * 2),
      });
    });

    // Verwerk alle entries
    chosenEntries.forEach(entry => {
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
          daysWorked: new Set(),
          lastWorked: null,
          revenue: 0,
          costs: 0,
          travelCost: 0,
          travelRevenue: 0,
          profit: 0
        });
      }

      const tech = techMap.get(id);
      const rate = rateMap.get(id) || { hourly: 0, billable: 0, saturday: 0, sunday: 0 };

      // Update uren
      const regular = Number(entry.regular_hours || 0);
      const overtime = Number(entry.overtime_hours || 0);
      const weekend = Number(entry.weekend_hours || 0);
      const sunday = Number(entry.sunday_hours || 0);
      const total = Number(entry.hours_worked || 0);

      tech.regularHours += regular;
      tech.overtimeHours += overtime;
      tech.weekendHours += weekend;
      tech.sundayHours += sunday;
      tech.totalHours += total;
      tech.daysWorked.add(entry.date);
      
      if (!tech.lastWorked || entry.date > tech.lastWorked) {
        tech.lastWorked = entry.date;
      }

      // Bereken kosten alleen voor manuele entries
      if (entry.is_manual_entry === true) {
        const regularCost = regular * rate.hourly;
        const overtimeCost = overtime * rate.hourly * 1.25;
        const weekendCost = weekend * rate.saturday;
        const sundayCost = sunday * rate.sunday;
        const travelCost = Number(entry.travel_expense_to_technician || 0);

        tech.costs += regularCost + overtimeCost + weekendCost + sundayCost;
        tech.travelCost += travelCost;
      }

      // Bereken omzet voor alle entries
      const regularRevenue = regular * rate.billable;
      const overtimeRevenue = overtime * rate.billable * 1.25;
      const weekendRevenue = weekend * rate.billable * 1.5;
      const sundayRevenue = sunday * rate.billable * 2;

      tech.revenue += regularRevenue + overtimeRevenue + weekendRevenue + sundayRevenue;
    });

    // Verwerk reiskosten
    techMap.forEach((tech, techId) => {
      // Verzamel alle unieke klanten voor deze monteur
      const uniqueCustomers = new Set(
        chosenEntries
          .filter(e => e.technician_id === techId)
          .map(e => e.customer_id)
      );

      uniqueCustomers.forEach(customerId => {
        if (!customerId) return;

        const travel = travelRates.find(tr => 
          String(tr.customer_id) === String(customerId) && 
          String(tr.technician_id) === String(techId)
        );

        if (travel) {
          // Bereken unieke dagen per klant
          const daysPerCustomer = new Set(
            chosenEntries
              .filter(e => 
                e.technician_id === techId && 
                e.customer_id === customerId
              )
              .map(e => e.date)
          );

          const daysCount = daysPerCustomer.size;

          // Bereken reiskosten aan monteur voor manuele entries
          const manualDaysCount = new Set(
            chosenEntries
              .filter(e => 
                e.technician_id === techId && 
                e.customer_id === customerId &&
                e.is_manual_entry === true
              )
              .map(e => e.date)
          ).size;

          // Voeg reiskosten toe aan monteur voor manuele dagen
          if (manualDaysCount > 0) {
            tech.travelCost += manualDaysCount * Number(travel.travel_expense_to_technician || 0);
          }

          // Voeg reiskosten toe van klant voor alle dagen
          tech.travelRevenue += daysCount * Number(travel.travel_expense_from_client || 0);
        }
      });

      // Update final totals
      tech.costs += tech.travelCost;
      tech.revenue += tech.travelRevenue;
      tech.profit = tech.revenue - tech.costs;
      tech.daysWorked = tech.daysWorked.size;
    });

    return Array.from(techMap.values())
      .filter(t => t.totalHours > 0)
      .sort((a, b) => b.totalHours - a.totalHours);
  };

  // --------------- UI / Layout ---------------
  if (isOpdrachtgever) {
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
          <header className="mb-4 md:mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-red-700 mb-1 md:mb-2 tracking-tight">
              Dashboard <span className="font-normal text-gray-700 text-base">• Opdrachtgever</span>
            </h1>
            <p className="text-gray-600 text-sm md:text-base">Overzicht van jouw projecten.</p>
          </header>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-3 md:gap-6 mb-4 md:mb-8">
            <Card className="shadow-lg border-2 border-gray-200 bg-white/90 hover:bg-gray-50 transition-all">
              <CardContent className="px-2 py-3 md:px-4 md:py-6">
                <p className="text-xs md:text-sm text-gray-600">Voltooide projecten</p>
                <p className="text-2xl md:text-3xl font-bold text-gray-800">{projectCounts.completed}</p>
              </CardContent>
            </Card>
            <Card className="shadow-lg border-2 border-gray-200 bg-white/90 hover:bg-gray-50 transition-all">
              <CardContent className="px-2 py-3 md:px-4 md:py-6">
                <p className="text-xs md:text-sm text-gray-600">Projecten in behandeling</p>
                <p className="text-2xl md:text-3xl font-bold text-gray-800">{projectCounts.inProgress}</p>
              </CardContent>
            </Card>
            <Card className="shadow-lg border-2 border-gray-200 bg-white/90 hover:bg-gray-50 transition-all">
              <CardContent className="px-2 py-3 md:px-4 md:py-6">
                <p className="text-xs md:text-sm text-gray-600">Controle nodig</p>
                <p className="text-2xl md:text-3xl font-bold text-gray-800">{projectCounts.needsReview}</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Altijd up-to-date gefilterde workhours op basis van admin/monteur + maand
  const filteredWorkHours = rawWorkHours.filter(e => {
    // Filter op monteur
    if (isAdmin) {
      if (selectedTechnician !== 'all' && e.technician_id !== selectedTechnician) return false;
    } else {
      if (e.technician_id !== user?.id) return false;
    }
    // Filter op maand
    if (selectedMonth) {
      const [y, m] = selectedMonth.split('-').map(Number);
      const d = new Date(e.date);
      if (d.getFullYear() !== y || d.getMonth() + 1 !== m) return false;
    }
    return true;
  });

  // Gebruik altijd deze als input voor alles wat je op het dashboard toont!
  const filteredTechnicianData = technicianData;

  const displayData = isAdmin
    ? filteredTechnicianData
    : filteredTechnicianData.filter(t => t.technicianId === user?.id);

  const totalHours = displayData.reduce((s, t) => s + t.totalHours, 0);
  const totalDays = displayData.reduce((s, t) => s + t.daysWorked, 0);
  const avgHoursPerDay = totalDays > 0 ? (totalHours / totalDays) : 0;
  const availableTechnicians = displayData.map(t => ({
    id: t.technicianId,
    name: t.technicianName,
  }));
  const maxHours = Math.max(...displayData.map(t => t.totalHours), 0);
  const maxProfit = Math.max(...displayData.map(t => t.profit), 0);

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
              <p className="text-2xl md:text-3xl font-bold text-gray-800"><ZakelijkUren value={displayData.reduce((s, t) => s + t.totalHours, 0)} /></p>
            </CardContent>
          </Card>
          {isAdmin && (
            <Card className="shadow-lg border-2 border-gray-200 bg-white/90 hover:bg-gray-50 transition-all">
              <CardContent className="px-2 py-3 md:px-4 md:py-6">
                <p className="text-xs md:text-sm text-gray-600">Totale omzet</p>
                <p className="text-2xl md:text-3xl font-bold text-gray-800"><ZakelijkEuro value={displayData.reduce((s, t) => s + t.revenue, 0)} /></p>
              </CardContent>
            </Card>
          )}
          {isAdmin && (
            <Card className="shadow-lg border-2 border-gray-200 bg-white/90 hover:bg-gray-50 transition-all">
              <CardContent className="px-2 py-3 md:px-4 md:py-6">
                <p className="text-xs md:text-sm text-gray-600">Totale winst</p>
                <p className="text-2xl md:text-3xl font-bold text-gray-800"><ZakelijkEuro value={displayData.reduce((s, t) => s + t.profit, 0)} /></p>
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
                    <BarChart data={displayData}>
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
                    const rate = rawRates.find(r => r.technician_id === t.technicianId) || {};
                    // Reiskosten breakdown
                    const travelTo = t.daysWorked > 0 ? (t.travelCost / t.daysWorked) : 0;
                    const travelFrom = t.daysWorked > 0 ? (t.travelRevenue / t.daysWorked) : 0;
                    const costBreakdown = `Normaal: €${(t.regularHours * (rate.hourly_rate || 0)).toFixed(2)} | Overtime: €${(t.overtimeHours * (rate.hourly_rate || 0) * 1.25).toFixed(2)} | Weekend: €${(t.weekendHours * (rate.saturday_rate || 0)).toFixed(2)} | Zondag: €${(t.sundayHours * (rate.sunday_rate || 0)).toFixed(2)} | Reiskosten: ${t.daysWorked} × €${travelTo.toFixed(2)} = €${t.travelCost.toFixed(2)}`;
                    const revenueBreakdown = `Normaal: €${(t.regularHours * (rate.billable_rate || 0)).toFixed(2)} | Overtime: €${(t.overtimeHours * (rate.billable_rate || 0) * 1.25).toFixed(2)} | Weekend: €${(t.weekendHours * (rate.billable_rate || 0) * 1.5).toFixed(2)} | Zondag: €${(t.sundayHours * (rate.billable_rate || 0) * 2).toFixed(2)} | Reisopbrengst: ${t.daysWorked} × €${travelFrom.toFixed(2)} = €${t.travelRevenue.toFixed(2)}`;
                    
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
                                  <div className="text-xs text-green-700 mt-1">Te factureren reiskosten klant: <ZakelijkEuro value={t.travelRevenue} /></div>
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
                  // Gebruik exact dezelfde data als desktop
                  const margin = t.revenue > 0 ? ((t.profit / t.revenue) * 100).toFixed(1) : '0';

                  return (
                    <div
                      key={t.technicianId}
                      className={`
                        rounded-2xl shadow-md border p-3 bg-gradient-to-r
                        from-gray-50 via-white to-gray-50 flex flex-col gap-1
                        ${i % 2 === 0 ? 'border-l-4 border-red-600' : 'border-l-4 border-yellow-300'}
                      `}
                      onClick={() => handleTechnicianClick(t)}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-base text-gray-900">{t.technicianName}</span>
                        <Badge color="bg-gray-100" text="text-gray-700"><ZakelijkDagen value={t.daysWorked} /> dagen</Badge>
                        {t.totalHours === maxHours && (
                          <Badge color="bg-green-50" text="text-green-700">Top uren</Badge>
                        )}
                        {t.profit === maxProfit && (
                          <Badge color="bg-yellow-50" text="text-yellow-700">Top winst</Badge>
                        )}
                      </div>
                      <ProgressBar value={t.totalHours} max={maxHours} color="#dc2626" />
                      <div className="flex flex-wrap gap-x-4 gap-y-1">
                        <div className="flex flex-col items-start">
                          <span className="text-xs text-gray-400">Totaal uren</span>
                          <span className="font-semibold"><ZakelijkUren value={t.totalHours} /></span>
                        </div>
                        <div className="flex flex-col items-start">
                          <span className="text-xs text-gray-400">Omzet</span>
                          <span className="font-semibold text-gray-800"><ZakelijkEuro value={t.revenue} /></span>
                          <span className="text-xs text-green-700 mt-1">Te factureren reiskosten klant: <ZakelijkEuro value={t.travelRevenue} /></span>
                        </div>
                        <div className="flex flex-col items-start">
                          <span className="text-xs text-gray-400">Kosten</span>
                          <span className="font-semibold text-gray-800"><ZakelijkEuro value={t.costs} /></span>
                        </div>
                        <div className="flex flex-col items-start">
                          <span className="text-xs text-gray-400">Reiskosten</span>
                          <span className="font-semibold text-gray-800"><ZakelijkEuro value={t.travelCost} /></span>
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

        {/* Detail Dialog */}
        <Dialog open={!!selectedTechnicianDetails} onOpenChange={() => setSelectedTechnicianDetails(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Gedetailleerd overzicht - {selectedTechnicianDetails?.technicianName}
              </DialogTitle>
            </DialogHeader>
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs md:text-sm border border-gray-200">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-2 border">Datum</th>
                    <th className="p-2 border">Klant</th>
                    <th className="p-2 border">Omschrijving</th>
                    <th className="p-2 border">Normaal</th>
                    <th className="p-2 border">Overwerk</th>
                    <th className="p-2 border">Weekend</th>
                    <th className="p-2 border">Zondag</th>
                    <th className="p-2 border">Totaal uren</th>
                    <th className="p-2 border">Reiskosten aan monteur</th>
                    <th className="p-2 border">Reiskosten van klant</th>
                    <th className="p-2 border">Omzet</th>
                    <th className="p-2 border">Kosten</th>
                    <th className="p-2 border">Winst</th>
                    <th className="p-2 border">Breakdown</th>
                    <th className="p-2 border">Te factureren reiskosten klant</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    // Groepeer per dag+klant
                    const grouped = {};
                    detailedHours.forEach(entry => {
                      const key = `${entry.date}_${entry.customer_id}`;
                      if (!grouped[key]) grouped[key] = [];
                      grouped[key].push(entry);
                    });
                    return Object.entries(grouped).sort((a, b) => b[0].localeCompare(a[0])).map(([key, entriesRaw], idx) => {
                      const entries = Array.isArray(entriesRaw) ? entriesRaw : [];
                      if (!entries.length) return null;
                      // Sommeer uren en bedragen per groep
                      const first = entries[0];
                      const rate = rawRates.find(r => r.technician_id === first.technician_id || r.technician_id === first.technicianId) || {};
                      // Zoek de juiste travel rate voor deze klant+monteur
                      const travelRate = travelRates.find(tr =>
                        String(tr.customer_id) === String(first.customer_id) &&
                        String(tr.technician_id) === String(first.technician_id)
                      );

                      // Filter alleen manual hours voor kosten aan monteur
                      const manualEntries = entries.filter(e => e.is_manual_entry === true);
                      const regular = manualEntries.reduce((s, e) => s + (e.regular_hours ?? e.regularHours ?? 0), 0);
                      const overtime = manualEntries.reduce((s, e) => s + (e.overtime_hours ?? e.overtimeHours ?? 0), 0);
                      const weekend = manualEntries.reduce((s, e) => s + (e.weekend_hours ?? e.weekendHours ?? 0), 0);
                      const sunday = manualEntries.reduce((s, e) => s + (e.sunday_hours ?? e.sundayHours ?? 0), 0);
                      const total = manualEntries.reduce((s, e) => s + (e.hours_worked ?? e.hoursWorked ?? 0), 0);

                      // Bereken kosten voor manuele entries
                      const regularCost = regular * (rate.hourly_rate || 0);
                      const overtimeCost = overtime * (rate.hourly_rate || 0) * 1.25;
                      const weekendCost = weekend * (rate.saturday_rate || rate.hourly_rate * 1.5 || 0);
                      const sundayCost = sunday * (rate.sunday_rate || rate.hourly_rate * 2 || 0);
                      
                      // Bereken reiskosten aan monteur voor manuele entries
                      let travelCostToTech = 0;
                      if (travelRate && manualEntries.length > 0) {
                        travelCostToTech = Number(travelRate.travel_expense_to_technician || 0);
                      }

                      // Bereken omzet voor alle entries
                      const regularRevenue = entries.reduce((sum, e) => sum + (e.regular_hours ?? e.regularHours ?? 0) * (rate.billable_rate || 0), 0);
                      const overtimeRevenue = entries.reduce((sum, e) => sum + (e.overtime_hours ?? e.overtimeHours ?? 0) * (rate.billable_rate || 0) * 1.25, 0);
                      const weekendRevenue = entries.reduce((sum, e) => sum + (e.weekend_hours ?? e.weekendHours ?? 0) * (rate.billable_rate || 0) * 1.5, 0);
                      const sundayRevenue = entries.reduce((sum, e) => sum + (e.sunday_hours ?? e.sundayHours ?? 0) * (rate.billable_rate || 0) * 2, 0);

                      // Bereken reiskosten van klant
                      const travelRevenue = travelRate ? Number(travelRate.travel_expense_from_client || 0) : 0;

                      // Bereken totalen
                      const hoursCost = regularCost + overtimeCost + weekendCost + sundayCost;
                      const totalCost = hoursCost + travelCostToTech;
                      const totalRevenue = regularRevenue + overtimeRevenue + weekendRevenue + sundayRevenue + travelRevenue;
                      const profit = totalRevenue - totalCost;

                      // Omschrijving samenvoegen
                      const description = manualEntries.map(e => e.description).filter(Boolean).join(' | ');

                      // Breakdown
                      const breakdown = [
                        `Normaal: €${regularCost.toFixed(2)}/€${regularRevenue.toFixed(2)}`,
                        `Overwerk: €${overtimeCost.toFixed(2)}/€${overtimeRevenue.toFixed(2)}`,
                        `Weekend: €${weekendCost.toFixed(2)}/€${weekendRevenue.toFixed(2)}`,
                        `Zondag: €${sundayCost.toFixed(2)}/€${sundayRevenue.toFixed(2)}`,
                        `Uren kosten: €${hoursCost.toFixed(2)}`,
                        `Reiskosten aan monteur: €${travelCostToTech.toFixed(2)}`,
                        `Totale kosten: €${totalCost.toFixed(2)}`,
                        `Te factureren reiskosten klant: €${travelRevenue.toFixed(2)}`
                      ].join(' | ');

                      return (
                        <tr key={key} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="p-2 border whitespace-nowrap">{new Date(first.date).toLocaleDateString('nl-NL')}</td>
                          <td className="p-2 border">{first.customer_name || first.customerName || 'Geen klant'}</td>
                          <td className="p-2 border">{description || '-'}</td>
                          <td className="p-2 border text-right">{regular.toFixed(2)}</td>
                          <td className="p-2 border text-right">{overtime.toFixed(2)}</td>
                          <td className="p-2 border text-right">{weekend.toFixed(2)}</td>
                          <td className="p-2 border text-right">{sunday.toFixed(2)}</td>
                          <td className="p-2 border text-right font-bold">{total.toFixed(2)}</td>
                          <td className="p-2 border text-right">€{travelCostToTech.toFixed(2)}</td>
                          <td className="p-2 border text-right text-green-700 font-semibold">€{travelRevenue.toFixed(2)}</td>
                          <td className="p-2 border text-right text-green-700">€{totalRevenue.toFixed(2)}</td>
                          <td className="p-2 border text-right text-red-700">€{totalCost.toFixed(2)}</td>
                          <td className={`p-2 border text-right font-bold ${profit >= 0 ? 'text-green-700' : 'text-red-700'}`}>€{profit.toFixed(2)}</td>
                          <td className="p-2 border text-xs">{breakdown}</td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Dashboard;
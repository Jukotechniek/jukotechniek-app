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
        // Find corresponding

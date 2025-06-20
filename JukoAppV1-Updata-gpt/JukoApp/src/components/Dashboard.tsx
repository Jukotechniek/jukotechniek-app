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
  Cell
} from 'recharts';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { TechnicianSummary } from '@/types/workHours';
import { formatDutchDate } from '@/utils/overtimeCalculations';

const COLORS = ['#dc2626', '#991b1b', '#7f1d1d', '#450a0a'];

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [technicianData, setTechnicianData] = useState<TechnicianSummary[]>([]);
  const [weeklyData, setWeeklyData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const { data: workHours, error: hoursError } = await supabase
        .from('work_hours')
        .select(`
          *,
          profiles!work_hours_technician_id_fkey(full_name)
        `);
      if (hoursError) {
        console.error('Error fetching work hours:', hoursError);
        return;
      }

      const { data: rates, error: ratesError } = await supabase
        .from('technician_rates')
        .select('*');
      if (ratesError) {
        console.error('Error fetching rates:', ratesError);
      }

      if (workHours) {
        const technicianSummaries = processTechnicianData(workHours, rates || []);
        setTechnicianData(technicianSummaries);

        const weekly = processWeeklyData(workHours);
        setWeeklyData(weekly);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const processTechnicianData = (workHours: any[], rates: any[]): TechnicianSummary[] => {
    const technicianMap = new Map<string, any>();
    const rateMap = new Map<string, { hourly: number; billable: number }>();

    rates.forEach(r => {
      rateMap.set(r.technician_id, {
        hourly: Number(r.hourly_rate || 0),
        billable: Number(r.billable_rate || 0)
      });
    });

    workHours.forEach(entry => {
      const techId = entry.technician_id;
      const techName = entry.profiles?.full_name || 'Unknown';

      if (!technicianMap.has(techId)) {
        technicianMap.set(techId, {
          technicianId: techId,
          technicianName: techName,
          totalHours: 0,
          regularHours: 0,
          overtimeHours: 0,
          weekendHours: 0,
          sundayHours: 0,
          daysWorked: 0,
          lastWorked: entry.date,
          entries: [] as any[],
          profit: 0
        });
      }

      const summary = technicianMap.get(techId);
      const hoursWorked = Number(entry.hours_worked || 0);
      const rate = rateMap.get(techId) || { hourly: 0, billable: 0 };

      summary.totalHours += hoursWorked;
      summary.regularHours += Number(entry.regular_hours || 0);
      summary.overtimeHours += Number(entry.overtime_hours || 0);
      summary.weekendHours += Number(entry.weekend_hours || 0);
      summary.sundayHours += Number(entry.sunday_hours || 0);
      summary.entries.push(entry);
      summary.profit += hoursWorked * (rate.billable - rate.hourly);

      if (entry.date > summary.lastWorked) {
        summary.lastWorked = entry.date;
      }
    });

    technicianMap.forEach(summary => {
      const uniqueDates = new Set(summary.entries.map((e: any) => e.date));
      summary.daysWorked = uniqueDates.size;
      delete summary.entries;
    });

    return Array.from(technicianMap.values());
  };

  const processWeeklyData = (workHours: any[]) => {
    const weekMap = new Map<string, { week: string; hours: number }>();

    workHours.forEach(entry => {
      const dateObj = new Date(entry.date);
      const weekStart = new Date(dateObj);
      weekStart.setDate(dateObj.getDate() - dateObj.getDay());
      const weekKey = weekStart.toISOString().split('T')[0];

      if (!weekMap.has(weekKey)) {
        weekMap.set(weekKey, {
          week: `Week of ${formatDutchDate(weekKey)}`,
          hours: 0
        });
      }

      weekMap.get(weekKey)!.hours += Number(entry.hours_worked || 0);
    });

    return Array.from(weekMap.values()).slice(-4);
  };

  const totalHours = technicianData.reduce((sum, tech) => sum + tech.totalHours, 0);
  const totalDays = technicianData.reduce((sum, tech) => sum + tech.daysWorked, 0);
  const avgHoursPerDay = totalDays > 0 ? (totalHours / totalDays).toFixed(1) : '0';
  const totalProfit = technicianData.reduce((sum, tech) => sum + tech.profit, 0);
  const currentUserData = technicianData.find(tech => tech.technicianId === user?.id);

  if (loading) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* ... rest van de JSX blijft ongewijzigd ... */}
    </div>
  );
};

export default Dashboard;

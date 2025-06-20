
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
      console.log('Fetching dashboard data...');
      
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
        console.log('Processing technician data with', workHours.length, 'work hour entries');
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

    // Build rate map
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
          profit: 0,
          revenue: 0,
          costs: 0
        });
      }

      const summary = technicianMap.get(techId);
      const hoursWorked = Number(entry.hours_worked || 0);
      const rate = rateMap.get(techId) || { hourly: 0, billable: 0 };

      // Calculate revenue and costs
      const revenue = hoursWorked * rate.billable;
      const costs = hoursWorked * rate.hourly;
      const profit = revenue - costs;

      summary.totalHours += hoursWorked;
      summary.regularHours += Number(entry.regular_hours || 0);
      summary.overtimeHours += Number(entry.overtime_hours || 0);
      summary.weekendHours += Number(entry.weekend_hours || 0);
      summary.sundayHours += Number(entry.sunday_hours || 0);
      summary.entries.push(entry);
      summary.profit += profit;
      summary.revenue += revenue;
      summary.costs += costs;

      if (entry.date > summary.lastWorked) {
        summary.lastWorked = entry.date;
      }
    });

    // Calculate days worked
    technicianMap.forEach(summary => {
      const uniqueDates = new Set(summary.entries.map((e: any) => e.date));
      summary.daysWorked = uniqueDates.size;
      delete summary.entries;
    });

    return Array.from(technicianMap.values()).sort((a, b) => b.profit - a.profit);
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
          week: `Week ${formatDutchDate(weekKey)}`,
          hours: 0
        });
      }

      weekMap.get(weekKey)!.hours += Number(entry.hours_worked || 0);
    });

    return Array.from(weekMap.values())
      .sort((a, b) => new Date(a.week.split(' ')[1]).getTime() - new Date(b.week.split(' ')[1]).getTime())
      .slice(-8);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const totalHours = technicianData.reduce((sum, tech) => sum + tech.totalHours, 0);
  const totalDays = technicianData.reduce((sum, tech) => sum + tech.daysWorked, 0);
  const avgHoursPerDay = totalDays > 0 ? (totalHours / totalDays).toFixed(1) : '0';
  const totalProfit = technicianData.reduce((sum, tech) => sum + tech.profit, 0);
  const totalRevenue = technicianData.reduce((sum, tech) => sum + tech.revenue, 0);
  const totalCosts = technicianData.reduce((sum, tech) => sum + tech.costs, 0);
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
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Dashboard - {isAdmin ? 'Admin View' : 'Personal View'}
          </h1>
          <p className="text-gray-600">
            {isAdmin 
              ? 'Complete overview of all technicians and performance metrics'
              : 'Your personal work statistics and performance'
            }
          </p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-red-100 rounded-lg">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Hours</p>
                  <p className="text-2xl font-bold text-gray-900">{totalHours.toFixed(1)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalRevenue)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Profit</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalProfit)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Avg Hours/Day</p>
                  <p className="text-2xl font-bold text-gray-900">{avgHoursPerDay}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Weekly Hours Chart */}
          <Card className="bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900">Weekly Hours Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="hours" fill="#dc2626" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Profit Distribution */}
          <Card className="bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900">Profit Distribution by Technician</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={technicianData.slice(0, 4)}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ technicianName, profit }) => `${technicianName}: ${formatCurrency(profit)}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="profit"
                  >
                    {technicianData.slice(0, 4).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Technician Performance Table */}
        {isAdmin && (
          <Card className="bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900">
                Technician Performance Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="pb-3 text-sm font-medium text-gray-600">Technician</th>
                      <th className="pb-3 text-sm font-medium text-gray-600">Total Hours</th>
                      <th className="pb-3 text-sm font-medium text-gray-600">Days Worked</th>
                      <th className="pb-3 text-sm font-medium text-gray-600">Revenue</th>
                      <th className="pb-3 text-sm font-medium text-gray-600">Costs</th>
                      <th className="pb-3 text-sm font-medium text-gray-600">Profit</th>
                      <th className="pb-3 text-sm font-medium text-gray-600">Margin %</th>
                      <th className="pb-3 text-sm font-medium text-gray-600">Last Worked</th>
                    </tr>
                  </thead>
                  <tbody>
                    {technicianData.map((tech) => {
                      const margin = tech.revenue > 0 ? ((tech.profit / tech.revenue) * 100).toFixed(1) : '0';
                      return (
                        <tr key={tech.technicianId} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 font-medium text-gray-900">{tech.technicianName}</td>
                          <td className="py-3 text-gray-700">{tech.totalHours.toFixed(1)}h</td>
                          <td className="py-3 text-gray-700">{tech.daysWorked}</td>
                          <td className="py-3 text-gray-700">{formatCurrency(tech.revenue)}</td>
                          <td className="py-3 text-gray-700">{formatCurrency(tech.costs)}</td>
                          <td className={`py-3 font-medium ${tech.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency(tech.profit)}
                          </td>
                          <td className={`py-3 font-medium ${parseFloat(margin) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {margin}%
                          </td>
                          <td className="py-3 text-gray-700">
                            {new Date(tech.lastWorked).toLocaleDateString('nl-NL')}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Personal Stats for Non-Admin Users */}
        {!isAdmin && currentUserData && (
          <Card className="bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900">
                Your Performance Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-600">{currentUserData.totalHours.toFixed(1)}h</p>
                  <p className="text-sm text-gray-600">Total Hours</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">{currentUserData.daysWorked}</p>
                  <p className="text-sm text-gray-600">Days Worked</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(currentUserData.profit)}</p>
                  <p className="text-sm text-gray-600">Your Profit</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-purple-600">
                    {currentUserData.revenue > 0 ? ((currentUserData.profit / currentUserData.revenue) * 100).toFixed(1) : '0'}%
                  </p>
                  <p className="text-sm text-gray-600">Profit Margin</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Dashboard;

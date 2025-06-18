
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { TechnicianSummary } from '@/types/workHours';
import { formatDutchDate } from '@/utils/overtimeCalculations';

const COLORS = ['#dc2626', '#991b1b', '#7f1d1d', '#450a0a'];

const Dashboard = () => {
  const { user } = useAuth();
  const [technicianData, setTechnicianData] = useState<TechnicianSummary[]>([]);
  const [weeklyData, setWeeklyData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch work hours data
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

      // Fetch technician rates
      const { data: rates, error: ratesError } = await supabase
        .from('technician_rates')
        .select('*');

      if (ratesError) {
        console.error('Error fetching rates:', ratesError);
      }

      // Process data for technician summaries
      if (workHours) {
        const technicianSummaries = processTechnicianData(workHours, rates || []);
        setTechnicianData(technicianSummaries);

        // Process weekly data
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
    const technicianMap = new Map();

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
          entries: []
        });
      }

      const summary = technicianMap.get(techId);
      summary.totalHours += Number(entry.hours_worked || 0);
      summary.regularHours += Number(entry.regular_hours || 0);
      summary.overtimeHours += Number(entry.overtime_hours || 0);
      summary.weekendHours += Number(entry.weekend_hours || 0);
      summary.sundayHours += Number(entry.sunday_hours || 0);
      summary.entries.push(entry);

      if (entry.date > summary.lastWorked) {
        summary.lastWorked = entry.date;
      }
    });

    // Calculate days worked for each technician
    technicianMap.forEach((summary, techId) => {
      const uniqueDates = new Set(summary.entries.map((e: any) => e.date));
      summary.daysWorked = uniqueDates.size;
      delete summary.entries; // Remove entries as we don't need them anymore
    });

    return Array.from(technicianMap.values());
  };

  const processWeeklyData = (workHours: any[]) => {
    const weekMap = new Map();
    
    workHours.forEach(entry => {
      const date = new Date(entry.date);
      const weekStart = new Date(date.setDate(date.getDate() - date.getDay()));
      const weekKey = weekStart.toISOString().split('T')[0];
      
      if (!weekMap.has(weekKey)) {
        weekMap.set(weekKey, { week: `Week ${weekMap.size + 1}`, hours: 0 });
      }
      
      weekMap.get(weekKey).hours += Number(entry.hours_worked || 0);
    });

    return Array.from(weekMap.values()).slice(-4); // Last 4 weeks
  };

  // Calculate totals
  const totalHours = technicianData.reduce((sum, tech) => sum + tech.totalHours, 0);
  const totalDays = technicianData.reduce((sum, tech) => sum + tech.daysWorked, 0);
  const avgHoursPerDay = totalDays > 0 ? (totalHours / totalDays).toFixed(1) : '0';

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
            {isAdmin ? 'Beheerder Dashboard' : 'Mijn Dashboard'}
          </h1>
          <p className="text-gray-600">
            {isAdmin ? 'Overzicht van alle monteur werkuren' : 'Jouw werkuren samenvatting'}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {isAdmin ? (
            <>
              <Card className="bg-white border-l-4 border-l-red-600">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Totaal Uren</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">{totalHours}</div>
                  <p className="text-xs text-gray-600">Alle monteurs</p>
                </CardContent>
              </Card>
              <Card className="bg-white border-l-4 border-l-black">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Actieve Monteurs</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">{technicianData.length}</div>
                  <p className="text-xs text-gray-600">Deze maand</p>
                </CardContent>
              </Card>
              <Card className="bg-white border-l-4 border-l-red-600">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Gem. Uren/Dag</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">{avgHoursPerDay}</div>
                  <p className="text-xs text-gray-600">Alle monteurs</p>
                </CardContent>
              </Card>
              <Card className="bg-white border-l-4 border-l-black">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Totale Dagen</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">{totalDays}</div>
                  <p className="text-xs text-gray-600">Gewerkte dagen</p>
                </CardContent>
              </Card>
            </>
          ) : (
            <>
              <Card className="bg-white border-l-4 border-l-red-600">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Mijn Totaal Uren</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">{currentUserData?.totalHours || 0}</div>
                  <p className="text-xs text-gray-600">Deze maand</p>
                </CardContent>
              </Card>
              <Card className="bg-white border-l-4 border-l-black">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Dagen Gewerkt</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">{currentUserData?.daysWorked || 0}</div>
                  <p className="text-xs text-gray-600">Deze maand</p>
                </CardContent>
              </Card>
              <Card className="bg-white border-l-4 border-l-red-600">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Gem. Uren/Dag</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">
                    {currentUserData && currentUserData.daysWorked > 0 
                      ? (currentUserData.totalHours / currentUserData.daysWorked).toFixed(1) 
                      : '0'}
                  </div>
                  <p className="text-xs text-gray-600">Persoonlijk gemiddelde</p>
                </CardContent>
              </Card>
              <Card className="bg-white border-l-4 border-l-black">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Laatst Gewerkt</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-lg font-bold text-gray-900">
                    {currentUserData?.lastWorked ? formatDutchDate(currentUserData.lastWorked) : 'N.v.t.'}
                  </div>
                  <p className="text-xs text-gray-600">Meest recente invoer</p>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {isAdmin && weeklyData.length > 0 && (
            <Card className="bg-white">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900">Wekelijks Uren Overzicht</CardTitle>
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
          )}
          
          {technicianData.length > 0 && (
            <Card className="bg-white">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900">
                  {isAdmin ? 'Uren Verdeling per Monteur' : 'Mijn Werkpatroon'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  {isAdmin ? (
                    <PieChart>
                      <Pie
                        data={technicianData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ technicianName, totalHours }) => `${technicianName}: ${totalHours}u`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="totalHours"
                      >
                        {technicianData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  ) : (
                    <BarChart data={weeklyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="week" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="hours" fill="#dc2626" />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Technicians Table (Admin only) */}
        {isAdmin && technicianData.length > 0 && (
          <Card className="bg-white mt-6">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900">Monteur Samenvatting</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="pb-3 text-sm font-medium text-gray-600">Monteur</th>
                      <th className="pb-3 text-sm font-medium text-gray-600">Totaal Uren</th>
                      <th className="pb-3 text-sm font-medium text-gray-600">Dagen Gewerkt</th>
                      <th className="pb-3 text-sm font-medium text-gray-600">Laatst Gewerkt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {technicianData.map((tech) => (
                      <tr key={tech.technicianId} className="border-b border-gray-100">
                        <td className="py-3 font-medium text-gray-900">{tech.technicianName}</td>
                        <td className="py-3 text-gray-700">
                          {tech.totalHours}u
                          <div className="text-xs text-gray-500">
                            {tech.overtimeHours > 0 && `Overwerk: ${tech.overtimeHours}u `}
                            {tech.weekendHours > 0 && `Weekend: ${tech.weekendHours}u `}
                            {tech.sundayHours > 0 && `Zondag: ${tech.sundayHours}u`}
                          </div>
                        </td>
                        <td className="py-3 text-gray-700">{tech.daysWorked}</td>
                        <td className="py-3 text-gray-700">
                          {formatDutchDate(tech.lastWorked)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Dashboard;

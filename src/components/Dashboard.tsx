
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Calendar } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PageLayout } from '@/components/ui/page-layout';

interface DashboardProject {
  id: string;
  title: string;
  description: string | null;
  status: string;
  date: string;
  created_at: string;
  updated_at: string;
}

interface DashboardWorkEntry {
  id: string;
  technician_id: string;
  customer_id: string;
  date: string;
  hours_worked: number;
  description: string;
  overtime_hours: number;
  weekend_hours: number;
  sunday_hours: number;
  created_at: string;
}

interface TechnicianHoursData {
  name: string;
  hours: number;
  totalHours: number;
}

const Dashboard = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [projects, setProjects] = useState<DashboardProject[]>([]);
  const [workEntries, setWorkEntries] = useState<DashboardWorkEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalProjects, setTotalProjects] = useState(0);
  const [completedProjects, setCompletedProjects] = useState(0);
  const [totalHoursWorked, setTotalHoursWorked] = useState(0);
  const [technicianHoursData, setTechnicianHoursData] = useState<TechnicianHoursData[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch projects
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .limit(5);

      if (projectsError) throw projectsError;
      setProjects(projectsData || []);
      setTotalProjects(projectsData?.length || 0);
      setCompletedProjects(projectsData?.filter(project => project.status === 'completed').length || 0);

      // Fetch work hours
      const { data: workHoursData, error: workHoursError } = await supabase
        .from('work_hours')
        .select('*')
        .limit(5);

      if (workHoursError) throw workHoursError;
      setWorkEntries(workHoursData || []);

      // Calculate total hours worked
      const totalHours = workHoursData?.reduce((acc, entry) => acc + entry.hours_worked, 0) || 0;
      setTotalHoursWorked(totalHours);

      // Calculate hours per technician for charts
      const { data: allWorkHours, error: allWorkHoursError } = await supabase
        .from('work_hours')
        .select(`
          *,
          profiles!work_hours_technician_id_fkey(full_name)
        `);

      if (allWorkHoursError) throw allWorkHoursError;

      const hoursByTechnician = allWorkHours?.reduce((acc, entry) => {
        const technicianName = entry.profiles?.full_name || 'Unknown';
        if (!acc[technicianName]) {
          acc[technicianName] = { 
            name: technicianName, 
            hours: 0, 
            totalHours: 0 
          };
        }
        acc[technicianName].hours += (entry.overtime_hours || 0) + (entry.weekend_hours || 0) + (entry.sunday_hours || 0);
        acc[technicianName].totalHours += entry.hours_worked;
        return acc;
      }, {});

      setTechnicianHoursData(Object.values(hoursByTechnician || {}));

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <PageLayout title="Dashboard" subtitle="Overzicht van projecten, werkuren en team prestaties.">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600" />
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout 
      title="Dashboard" 
      subtitle="Overzicht van projecten, werkuren en team prestaties."
    >
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <Card className="bg-white shadow-lg border-2 border-gray-200">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">
              Projecten
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-red-600">{totalProjects}</div>
            <p className="text-sm text-gray-500">Totaal aantal projecten</p>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-lg border-2 border-gray-200">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">
              Voltooide Projecten
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-green-600">{completedProjects}</div>
            <p className="text-sm text-gray-500">Aantal voltooide projecten</p>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-lg border-2 border-gray-200">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">
              Gewerkte Uren
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-blue-600">{totalHoursWorked}</div>
            <p className="text-sm text-gray-500">Totaal aantal gewerkte uren</p>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-lg border-2 border-gray-200">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">
              Openstaande Facturen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-orange-600">€4,500</div>
            <p className="text-sm text-gray-500">Totale waarde openstaande facturen</p>
          </CardContent>
        </Card>
      </div>

      {/* Admin Dashboard */}
      {isAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Uren per Monteur Chart */}
          <Card className="bg-white shadow-lg border-2 border-gray-200">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-red-600">Uren per Monteur</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={technicianHoursData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="hours" fill="#dc2626" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* 100% Uren per Monteur */}
          <Card className="bg-white shadow-lg border-2 border-gray-200">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-red-600">100% Uren per Monteur</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={technicianHoursData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="totalHours" fill="#059669" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent Projects */}
      <Card className="bg-white shadow-lg border-2 border-gray-200 mb-6">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">
            Recente Projecten
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full leading-normal">
              <thead>
                <tr>
                  <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Project Naam
                  </th>
                  <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Start Datum
                  </th>
                  <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Voortgang
                  </th>
                </tr>
              </thead>
              <tbody>
                {projects.map((project) => (
                  <tr key={project.id}>
                    <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                      <div className="flex items-center">
                        <div className="ml-3">
                          <p className="text-gray-900 whitespace-no-wrap">
                            {project.title}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                      <p className="text-gray-900 whitespace-no-wrap">{project.status}</p>
                    </td>
                    <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                      <p className="text-gray-900 whitespace-no-wrap">
                        {new Date(project.date).toLocaleDateString()}
                      </p>
                    </td>
                    <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                      <Progress value={60} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Recent Work Hours */}
      <Card className="bg-white shadow-lg border-2 border-gray-200">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">
            Recente Werkuren
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full leading-normal">
              <thead>
                <tr>
                  <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Monteur ID
                  </th>
                  <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Datum
                  </th>
                  <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Uren
                  </th>
                  <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Omschrijving
                  </th>
                </tr>
              </thead>
              <tbody>
                {workEntries.map((entry) => (
                  <tr key={entry.id}>
                    <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                      <div className="flex items-center">
                        <div className="ml-3">
                          <p className="text-gray-900 whitespace-no-wrap">
                            {entry.technician_id}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                      <p className="text-gray-900 whitespace-no-wrap">
                        {new Date(entry.date).toLocaleDateString()}
                      </p>
                    </td>
                    <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                      <p className="text-gray-900 whitespace-no-wrap">{entry.hours_worked}</p>
                    </td>
                    <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                      <p className="text-gray-900 whitespace-no-wrap">{entry.description}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </PageLayout>
  );
};

export default Dashboard;

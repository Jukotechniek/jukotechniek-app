
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useAuth } from '@/contexts/AuthContext';
import { TechnicianSummary } from '@/types/workHours';

// Mock data for dashboard
const mockTechnicianData: TechnicianSummary[] = [
  {
    technicianId: '2',
    technicianName: 'Jan de Vries',
    totalHours: 168,
    daysWorked: 21,
    lastWorked: '2024-06-15'
  },
  {
    technicianId: '3',
    technicianName: 'Pieter Jansen',
    totalHours: 152,
    daysWorked: 19,
    lastWorked: '2024-06-14'
  }
];

const weeklyData = [
  { week: 'Week 1', hours: 320 },
  { week: 'Week 2', hours: 295 },
  { week: 'Week 3', hours: 340 },
  { week: 'Week 4', hours: 280 }
];

const COLORS = ['#dc2626', '#991b1b', '#7f1d1d', '#450a0a'];

const Dashboard = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const totalHours = mockTechnicianData.reduce((sum, tech) => sum + tech.totalHours, 0);
  const totalDays = mockTechnicianData.reduce((sum, tech) => sum + tech.daysWorked, 0);
  const avgHoursPerDay = totalDays > 0 ? (totalHours / totalDays).toFixed(1) : '0';

  const currentUserData = mockTechnicianData.find(tech => tech.technicianId === user?.id);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {isAdmin ? 'Admin Dashboard' : 'My Dashboard'}
          </h1>
          <p className="text-gray-600">
            {isAdmin ? 'Overview of all technician work hours' : 'Your work hour summary'}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {isAdmin ? (
            <>
              <Card className="bg-white border-l-4 border-l-red-600">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Total Hours</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">{totalHours}</div>
                  <p className="text-xs text-gray-600">All technicians</p>
                </CardContent>
              </Card>
              <Card className="bg-white border-l-4 border-l-black">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Active Technicians</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">{mockTechnicianData.length}</div>
                  <p className="text-xs text-gray-600">Working this month</p>
                </CardContent>
              </Card>
              <Card className="bg-white border-l-4 border-l-red-600">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Total Days</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">{totalDays}</div>
                  <p className="text-xs text-gray-600">Days worked</p>
                </CardContent>
              </Card>
              <Card className="bg-white border-l-4 border-l-black">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Avg Hours/Day</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">{avgHoursPerDay}</div>
                  <p className="text-xs text-gray-600">Per technician</p>
                </CardContent>
              </Card>
            </>
          ) : (
            <>
              <Card className="bg-white border-l-4 border-l-red-600">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">My Total Hours</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">{currentUserData?.totalHours || 0}</div>
                  <p className="text-xs text-gray-600">This month</p>
                </CardContent>
              </Card>
              <Card className="bg-white border-l-4 border-l-black">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Days Worked</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">{currentUserData?.daysWorked || 0}</div>
                  <p className="text-xs text-gray-600">This month</p>
                </CardContent>
              </Card>
              <Card className="bg-white border-l-4 border-l-red-600">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Avg Hours/Day</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">
                    {currentUserData ? (currentUserData.totalHours / currentUserData.daysWorked).toFixed(1) : '0'}
                  </div>
                  <p className="text-xs text-gray-600">Personal average</p>
                </CardContent>
              </Card>
              <Card className="bg-white border-l-4 border-l-black">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Last Worked</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-lg font-bold text-gray-900">
                    {currentUserData?.lastWorked ? new Date(currentUserData.lastWorked).toLocaleDateString() : 'N/A'}
                  </div>
                  <p className="text-xs text-gray-600">Most recent entry</p>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {isAdmin && (
            <Card className="bg-white">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900">Weekly Hours Overview</CardTitle>
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
          
          <Card className="bg-white">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900">
                {isAdmin ? 'Hours Distribution by Technician' : 'My Work Pattern'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                {isAdmin ? (
                  <PieChart>
                    <Pie
                      data={mockTechnicianData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ technicianName, totalHours }) => `${technicianName}: ${totalHours}h`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="totalHours"
                    >
                      {mockTechnicianData.map((entry, index) => (
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
        </div>

        {/* Technicians Table (Admin only) */}
        {isAdmin && (
          <Card className="bg-white mt-6">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900">Technician Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="pb-3 text-sm font-medium text-gray-600">Technician</th>
                      <th className="pb-3 text-sm font-medium text-gray-600">Total Hours</th>
                      <th className="pb-3 text-sm font-medium text-gray-600">Days Worked</th>
                      <th className="pb-3 text-sm font-medium text-gray-600">Avg Hours/Day</th>
                      <th className="pb-3 text-sm font-medium text-gray-600">Last Worked</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mockTechnicianData.map((tech) => (
                      <tr key={tech.technicianId} className="border-b border-gray-100">
                        <td className="py-3 font-medium text-gray-900">{tech.technicianName}</td>
                        <td className="py-3 text-gray-700">{tech.totalHours}h</td>
                        <td className="py-3 text-gray-700">{tech.daysWorked}</td>
                        <td className="py-3 text-gray-700">{(tech.totalHours / tech.daysWorked).toFixed(1)}h</td>
                        <td className="py-3 text-gray-700">{new Date(tech.lastWorked).toLocaleDateString()}</td>
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

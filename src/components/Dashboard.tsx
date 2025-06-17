
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useAuth } from '@/contexts/AuthContext';
import { TechnicianSummary } from '@/types/workHours';
import { formatDutchDate } from '@/utils/overtimeCalculations';

// Mock data for dashboard
const mockTechnicianData: TechnicianSummary[] = [
  {
    technicianId: '2',
    technicianName: 'Jan de Vries',
    totalHours: 168,
    regularHours: 140,
    overtimeHours: 20,
    weekendHours: 8,
    sundayHours: 0,
    daysWorked: 21,
    lastWorked: '2024-06-15'
  },
  {
    technicianId: '3',
    technicianName: 'Pieter Jansen',
    totalHours: 152,
    regularHours: 132,
    overtimeHours: 12,
    weekendHours: 8,
    sundayHours: 0,
    daysWorked: 19,
    lastWorked: '2024-06-14'
  }
];

// Mock billing data for profit calculation with Dutch rates
const mockBillingData = [
  { 
    technicianId: '2', 
    hourlyRate: 25, 
    billableRate: 45, 
    travelExpensesToTechnician: 125,
    travelExpensesFromClients: 175
  },
  { 
    technicianId: '3', 
    hourlyRate: 22, 
    billableRate: 40, 
    travelExpensesToTechnician: 98,
    travelExpensesFromClients: 138
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

  // Calculate total profit with enhanced overtime calculations (admin only)
  const totalProfit = isAdmin ? mockTechnicianData.reduce((sum, tech) => {
    const billing = mockBillingData.find(b => b.technicianId === tech.technicianId);
    if (billing) {
      // Calculate wages with overtime multipliers
      const regularPay = tech.regularHours * billing.hourlyRate;
      const overtimePay = tech.overtimeHours * billing.hourlyRate * 1.25;
      const weekendPay = tech.weekendHours * billing.hourlyRate * 1.5;
      const sundayPay = tech.sundayHours * billing.hourlyRate * 2.0;
      
      const totalWages = regularPay + overtimePay + weekendPay + sundayPay;
      const totalCost = totalWages + billing.travelExpensesToTechnician;
      const totalRevenue = (tech.totalHours * billing.billableRate) + billing.travelExpensesFromClients;
      
      return sum + (totalRevenue - totalCost);
    }
    return sum;
  }, 0) : 0;

  const totalRevenue = isAdmin ? mockTechnicianData.reduce((sum, tech) => {
    const billing = mockBillingData.find(b => b.technicianId === tech.technicianId);
    return sum + (billing ? (tech.totalHours * billing.billableRate) + billing.travelExpensesFromClients : 0);
  }, 0) : 0;

  const totalCost = isAdmin ? mockTechnicianData.reduce((sum, tech) => {
    const billing = mockBillingData.find(b => b.technicianId === tech.technicianId);
    if (billing) {
      const regularPay = tech.regularHours * billing.hourlyRate;
      const overtimePay = tech.overtimeHours * billing.hourlyRate * 1.25;
      const weekendPay = tech.weekendHours * billing.hourlyRate * 1.5;
      const sundayPay = tech.sundayHours * billing.hourlyRate * 2.0;
      
      const totalWages = regularPay + overtimePay + weekendPay + sundayPay;
      return sum + totalWages + billing.travelExpensesToTechnician;
    }
    return sum;
  }, 0) : 0;

  const currentUserData = mockTechnicianData.find(tech => tech.technicianId === user?.id);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {isAdmin ? 'Beheerder Dashboard' : 'Mijn Dashboard'}
          </h1>
          <p className="text-gray-600">
            {isAdmin ? 'Overzicht van alle monteur werkuren en winst' : 'Jouw werkuren samenvatting'}
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
              <Card className="bg-white border-l-4 border-l-green-600">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Totale Winst</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">€{totalProfit.toFixed(2)}</div>
                  <p className="text-xs text-gray-600">Omzet: €{totalRevenue.toFixed(2)}</p>
                </CardContent>
              </Card>
              <Card className="bg-white border-l-4 border-l-black">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Totale Kosten</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">€{totalCost.toFixed(2)}</div>
                  <p className="text-xs text-gray-600">Lonen + Reiskosten</p>
                </CardContent>
              </Card>
              <Card className="bg-white border-l-4 border-l-red-600">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Winstmarge</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">
                    {totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : '0'}%
                  </div>
                  <p className="text-xs text-gray-600">Deze maand</p>
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
                    {currentUserData ? (currentUserData.totalHours / currentUserData.daysWorked).toFixed(1) : '0'}
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
          {isAdmin && (
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
                      data={mockTechnicianData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ technicianName, totalHours }) => `${technicianName}: ${totalHours}u`}
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
                      <th className="pb-3 text-sm font-medium text-gray-600">Kosten</th>
                      <th className="pb-3 text-sm font-medium text-gray-600">Omzet</th>
                      <th className="pb-3 text-sm font-medium text-gray-600">Winst</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mockTechnicianData.map((tech) => {
                      const billing = mockBillingData.find(b => b.technicianId === tech.technicianId);
                      if (!billing) return null;
                      
                      // Enhanced cost calculation with overtime
                      const regularPay = tech.regularHours * billing.hourlyRate;
                      const overtimePay = tech.overtimeHours * billing.hourlyRate * 1.25;
                      const weekendPay = tech.weekendHours * billing.hourlyRate * 1.5;
                      const sundayPay = tech.sundayHours * billing.hourlyRate * 2.0;
                      
                      const totalWages = regularPay + overtimePay + weekendPay + sundayPay;
                      const cost = totalWages + billing.travelExpensesToTechnician;
                      const revenue = (tech.totalHours * billing.billableRate) + billing.travelExpensesFromClients;
                      const profit = revenue - cost;
                      
                      return (
                        <tr key={tech.technicianId} className="border-b border-gray-100">
                          <td className="py-3 font-medium text-gray-900">{tech.technicianName}</td>
                          <td className="py-3 text-gray-700">
                            {tech.totalHours}u
                            <div className="text-xs text-gray-500">
                              {tech.overtimeHours > 0 && `Overwerk: ${tech.overtimeHours}u`}
                              {tech.weekendHours > 0 && ` Weekend: ${tech.weekendHours}u`}
                              {tech.sundayHours > 0 && ` Zondag: ${tech.sundayHours}u`}
                            </div>
                          </td>
                          <td className="py-3 text-gray-700">{tech.daysWorked}</td>
                          <td className="py-3 text-gray-700">
                            €{cost.toFixed(2)}
                            <div className="text-xs text-gray-500">
                              Loon: €{totalWages.toFixed(2)} + Reis: €{billing.travelExpensesToTechnician.toFixed(2)}
                            </div>
                          </td>
                          <td className="py-3 text-gray-700">
                            €{revenue.toFixed(2)}
                            <div className="text-xs text-gray-500">
                              Uren: €{(tech.totalHours * billing.billableRate).toFixed(2)} + Reis: €{billing.travelExpensesFromClients.toFixed(2)}
                            </div>
                          </td>
                          <td className={`py-3 font-medium ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            €{profit.toFixed(2)}
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
      </div>
    </div>
  );
};

export default Dashboard;


import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { TechnicianRate, BillingReport } from '@/types/billing';
import { Euro, Calculator, TrendingUp } from 'lucide-react';

// Mock data
const mockRates: TechnicianRate[] = [
  {
    technicianId: '2',
    technicianName: 'Jan de Vries',
    hourlyRate: 25,
    billableRate: 65,
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01'
  },
  {
    technicianId: '3',
    technicianName: 'Pieter Jansen',
    hourlyRate: 28,
    billableRate: 70,
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01'
  }
];

const mockBillingReports: BillingReport[] = [
  {
    technicianId: '2',
    technicianName: 'Jan de Vries',
    totalHours: 160,
    hourlyRate: 25,
    billableRate: 65,
    totalCost: 4000,
    totalBillable: 10400,
    profit: 6400
  },
  {
    technicianId: '3',
    technicianName: 'Pieter Jansen',
    totalHours: 152,
    hourlyRate: 28,
    billableRate: 70,
    totalCost: 4256,
    totalBillable: 10640,
    profit: 6384
  }
];

const Billing = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingRate, setEditingRate] = useState<string | null>(null);
  const [newRate, setNewRate] = useState({
    technicianId: '',
    hourlyRate: '',
    billableRate: ''
  });

  const isAdmin = user?.role === 'admin';

  if (!isAdmin) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <Card className="bg-white">
            <CardContent className="p-8 text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
              <p className="text-gray-600">Only administrators can access billing information.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newRate.technicianId || !newRate.hourlyRate || !newRate.billableRate) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    const hourlyRate = parseFloat(newRate.hourlyRate);
    const billableRate = parseFloat(newRate.billableRate);

    if (hourlyRate <= 0 || billableRate <= 0) {
      toast({
        title: "Error",
        description: "Rates must be greater than 0",
        variant: "destructive"
      });
      return;
    }

    if (billableRate <= hourlyRate) {
      toast({
        title: "Warning",
        description: "Billable rate should be higher than hourly rate for profit",
        variant: "destructive"
      });
    }

    toast({
      title: "Success",
      description: "Technician rate updated successfully"
    });

    setNewRate({
      technicianId: '',
      hourlyRate: '',
      billableRate: ''
    });
    setShowAddForm(false);
  };

  const totalProfit = mockBillingReports.reduce((sum, report) => sum + report.profit, 0);
  const totalBillable = mockBillingReports.reduce((sum, report) => sum + report.totalBillable, 0);
  const totalCost = mockBillingReports.reduce((sum, report) => sum + report.totalCost, 0);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Billing & Profit Analysis</h1>
            <p className="text-gray-600">Manage technician rates and track profitability</p>
          </div>
          <Button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {showAddForm ? 'Cancel' : 'Update Rates'}
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-white">
            <CardContent className="p-6">
              <div className="flex items-center">
                <Euro className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Profit</p>
                  <p className="text-2xl font-bold text-green-600">€{totalProfit.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardContent className="p-6">
              <div className="flex items-center">
                <Calculator className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Billable</p>
                  <p className="text-2xl font-bold text-blue-600">€{totalBillable.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardContent className="p-6">
              <div className="flex items-center">
                <TrendingUp className="h-8 w-8 text-red-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Profit Margin</p>
                  <p className="text-2xl font-bold text-red-600">
                    {totalBillable > 0 ? Math.round((totalProfit / totalBillable) * 100) : 0}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Update Rates Form */}
        {showAddForm && (
          <Card className="bg-white mb-6">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900">Update Technician Rates</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="technician">Technician</Label>
                  <select
                    id="technician"
                    value={newRate.technicianId}
                    onChange={(e) => setNewRate({ ...newRate, technicianId: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    required
                  >
                    <option value="">Select Technician</option>
                    <option value="2">Jan de Vries</option>
                    <option value="3">Pieter Jansen</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hourlyRate">Hourly Rate (€)</Label>
                  <Input
                    id="hourlyRate"
                    type="number"
                    step="0.50"
                    min="0"
                    value={newRate.hourlyRate}
                    onChange={(e) => setNewRate({ ...newRate, hourlyRate: e.target.value })}
                    placeholder="25.00"
                    required
                    className="focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="billableRate">Billable Rate (€)</Label>
                  <Input
                    id="billableRate"
                    type="number"
                    step="0.50"
                    min="0"
                    value={newRate.billableRate}
                    onChange={(e) => setNewRate({ ...newRate, billableRate: e.target.value })}
                    placeholder="65.00"
                    required
                    className="focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                <div className="md:col-span-3">
                  <Button type="submit" className="bg-red-600 hover:bg-red-700 text-white">
                    Update Rate
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Current Rates */}
        <Card className="bg-white mb-6">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">Current Rates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="pb-3 text-sm font-medium text-gray-600">Technician</th>
                    <th className="pb-3 text-sm font-medium text-gray-600">Hourly Rate</th>
                    <th className="pb-3 text-sm font-medium text-gray-600">Billable Rate</th>
                    <th className="pb-3 text-sm font-medium text-gray-600">Margin</th>
                  </tr>
                </thead>
                <tbody>
                  {mockRates.map((rate) => (
                    <tr key={rate.technicianId} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 font-medium text-gray-900">{rate.technicianName}</td>
                      <td className="py-3 text-gray-700">€{rate.hourlyRate}</td>
                      <td className="py-3 text-gray-700">€{rate.billableRate}</td>
                      <td className="py-3 text-green-600 font-medium">
                        €{(rate.billableRate - rate.hourlyRate).toFixed(2)}/hr
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Billing Reports */}
        <Card className="bg-white">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">Monthly Profit Report</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="pb-3 text-sm font-medium text-gray-600">Technician</th>
                    <th className="pb-3 text-sm font-medium text-gray-600">Hours</th>
                    <th className="pb-3 text-sm font-medium text-gray-600">Cost</th>
                    <th className="pb-3 text-sm font-medium text-gray-600">Billable</th>
                    <th className="pb-3 text-sm font-medium text-gray-600">Profit</th>
                    <th className="pb-3 text-sm font-medium text-gray-600">Margin %</th>
                  </tr>
                </thead>
                <tbody>
                  {mockBillingReports.map((report) => (
                    <tr key={report.technicianId} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 font-medium text-gray-900">{report.technicianName}</td>
                      <td className="py-3 text-gray-700">{report.totalHours}h</td>
                      <td className="py-3 text-red-600">€{report.totalCost.toLocaleString()}</td>
                      <td className="py-3 text-blue-600">€{report.totalBillable.toLocaleString()}</td>
                      <td className="py-3 text-green-600 font-medium">€{report.profit.toLocaleString()}</td>
                      <td className="py-3 text-gray-700">
                        {Math.round((report.profit / report.totalBillable) * 100)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Billing;

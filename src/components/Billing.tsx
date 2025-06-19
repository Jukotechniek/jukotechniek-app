
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Euro, Calculator, TrendingUp } from 'lucide-react';

interface TechnicianRate {
  id: string;
  technician_id: string;
  hourly_rate: number;
  billable_rate: number;
  profiles?: { full_name: string };
}

interface BillingReport {
  technicianId: string;
  technicianName: string;
  totalHours: number;
  regularHours: number;
  overtimeHours: number;
  weekendHours: number;
  sundayHours: number;
  hourlyRate: number;
  billableRate: number;
  totalCost: number;
  totalBillable: number;
  profit: number;
}

const Billing = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rates, setRates] = useState<TechnicianRate[]>([]);
  const [billingReports, setBillingReports] = useState<BillingReport[]>([]);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newRate, setNewRate] = useState({
    technicianId: '',
    hourlyRate: '',
    billableRate: ''
  });

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch technicians
      const { data: techniciansData, error: techniciansError } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'technician');

      if (techniciansError) throw techniciansError;
      setTechnicians(techniciansData || []);

      // Fetch technician rates
      const { data: ratesData, error: ratesError } = await supabase
        .from('technician_rates')
        .select(`
          *,
          profiles!technician_rates_technician_id_fkey(full_name)
        `);

      if (ratesError) throw ratesError;
      setRates(ratesData || []);

      // Fetch work hours for billing calculation
      const { data: workHoursData, error: workHoursError } = await supabase
        .from('work_hours')
        .select(`
          technician_id,
          hours_worked,
          regular_hours,
          overtime_hours,
          weekend_hours,
          sunday_hours,
          profiles!work_hours_technician_id_fkey(full_name)
        `);

      if (workHoursError) throw workHoursError;

      // Calculate billing reports
      const billingMap = new Map();

      (workHoursData || []).forEach(entry => {
        const techId = entry.technician_id;
        const techName = entry.profiles?.full_name || 'Unknown';

        if (!billingMap.has(techId)) {
          const rate = ratesData?.find(r => r.technician_id === techId);
          billingMap.set(techId, {
            technicianId: techId,
            technicianName: techName,
            totalHours: 0,
            regularHours: 0,
            overtimeHours: 0,
            weekendHours: 0,
            sundayHours: 0,
            hourlyRate: Number(rate?.hourly_rate || 0),
            billableRate: Number(rate?.billable_rate || 0),
            totalCost: 0,
            totalBillable: 0,
            profit: 0
          });
        }

        const billing = billingMap.get(techId);
        const regularH = Number(entry.regular_hours || 0);
        const overtimeH = Number(entry.overtime_hours || 0);
        const weekendH = Number(entry.weekend_hours || 0);
        const sundayH = Number(entry.sunday_hours || 0);

        billing.totalHours += Number(entry.hours_worked || 0);
        billing.regularHours += regularH;
        billing.overtimeHours += overtimeH;
        billing.weekendHours += weekendH;
        billing.sundayHours += sundayH;

        // Calculate costs with multipliers
        const regularCost = regularH * billing.hourlyRate;
        const overtimeCost = overtimeH * billing.hourlyRate * 1.25;
        const weekendCost = weekendH * billing.hourlyRate * 1.5;
        const sundayCost = sundayH * billing.hourlyRate * 2.0;

        billing.totalCost += regularCost + overtimeCost + weekendCost + sundayCost;

        // Calculate billable with same multipliers
        const regularBillable = regularH * billing.billableRate;
        const overtimeBillable = overtimeH * billing.billableRate * 1.25;
        const weekendBillable = weekendH * billing.billableRate * 1.5;
        const sundayBillable = sundayH * billing.billableRate * 2.0;

        billing.totalBillable += regularBillable + overtimeBillable + weekendBillable + sundayBillable;
      });

      // Calculate profit for each technician
      const reports = Array.from(billingMap.values()).map(billing => ({
        ...billing,
        profit: billing.totalBillable - billing.totalCost
      }));

      setBillingReports(reports);
    } catch (error) {
      console.error('Error fetching billing data:', error);
      toast({
        title: "Fout",
        description: "Kon factureringsgegevens niet laden",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newRate.technicianId || !newRate.hourlyRate || !newRate.billableRate) {
      toast({
        title: "Fout",
        description: "Vul alle verplichte velden in",
        variant: "destructive"
      });
      return;
    }

    const hourlyRate = parseFloat(newRate.hourlyRate);
    const billableRate = parseFloat(newRate.billableRate);

    if (hourlyRate <= 0 || billableRate <= 0) {
      toast({
        title: "Fout",
        description: "Tarieven moeten groter zijn dan 0",
        variant: "destructive"
      });
      return;
    }

    if (billableRate <= hourlyRate) {
      toast({
        title: "Waarschuwing",
        description: "Factuurtarief zou hoger moeten zijn dan uurtarief voor winst",
        variant: "destructive"
      });
    }

    try {
      const { error } = await supabase
        .from('technician_rates')
        .upsert({
          technician_id: newRate.technicianId,
          hourly_rate: hourlyRate,
          billable_rate: billableRate
        }, {
          onConflict: 'technician_id'
        });

      if (error) throw error;

      toast({
        title: "Succes",
        description: "Monteur tarief succesvol bijgewerkt"
      });

      setNewRate({
        technicianId: '',
        hourlyRate: '',
        billableRate: ''
      });
      setShowAddForm(false);
      fetchData();
    } catch (error) {
      console.error('Error updating rate:', error);
      toast({
        title: "Fout",
        description: "Kon tarief niet bijwerken",
        variant: "destructive"
      });
    }
  };

  if (!isAdmin) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <Card className="bg-white">
            <CardContent className="p-8 text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Toegang Geweigerd</h2>
              <p className="text-gray-600">Alleen beheerders kunnen toegang krijgen tot factureringsinformatie.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
        </div>
      </div>
    );
  }

  const totalProfit = billingReports.reduce((sum, report) => sum + report.profit, 0);
  const totalBillable = billingReports.reduce((sum, report) => sum + report.totalBillable, 0);
  const totalCost = billingReports.reduce((sum, report) => sum + report.totalCost, 0);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Facturering & Winst Analyse</h1>
            <p className="text-gray-600">Beheer monteur tarieven en volg winstgevendheid</p>
          </div>
          <Button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {showAddForm ? 'Annuleren' : 'Tarieven Bijwerken'}
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-white">
            <CardContent className="p-6">
              <div className="flex items-center">
                <Euro className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Totale Winst</p>
                  <p className="text-2xl font-bold text-green-600">€{totalProfit.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardContent className="p-6">
              <div className="flex items-center">
                <Calculator className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Totaal Factureerbaar</p>
                  <p className="text-2xl font-bold text-blue-600">€{totalBillable.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardContent className="p-6">
              <div className="flex items-center">
                <TrendingUp className="h-8 w-8 text-red-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Winstmarge</p>
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
              <CardTitle className="text-lg font-semibold text-gray-900">Monteur Tarieven Bijwerken</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="technician">Monteur</Label>
                  <select
                    id="technician"
                    value={newRate.technicianId}
                    onChange={(e) => setNewRate({ ...newRate, technicianId: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    required
                  >
                    <option value="">Selecteer Monteur</option>
                    {technicians.map(tech => (
                      <option key={tech.id} value={tech.id}>
                        {tech.full_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hourlyRate">Uurtarief (€)</Label>
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
                  <Label htmlFor="billableRate">Factuurtarief (€)</Label>
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
                    Tarief Bijwerken
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Current Rates */}
        <Card className="bg-white mb-6">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">Huidige Tarieven</CardTitle>
          </CardHeader>
          <CardContent>
            {rates.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Geen tarieven geconfigureerd
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="pb-3 text-sm font-medium text-gray-600">Monteur</th>
                      <th className="pb-3 text-sm font-medium text-gray-600">Uurtarief</th>
                      <th className="pb-3 text-sm font-medium text-gray-600">Factuurtarief</th>
                      <th className="pb-3 text-sm font-medium text-gray-600">Marge</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rates.map((rate) => (
                      <tr key={rate.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 font-medium text-gray-900">
                          {rate.profiles?.full_name || 'Onbekend'}
                        </td>
                        <td className="py-3 text-gray-700">€{Number(rate.hourly_rate).toFixed(2)}</td>
                        <td className="py-3 text-gray-700">€{Number(rate.billable_rate).toFixed(2)}</td>
                        <td className="py-3 text-green-600 font-medium">
                          €{(Number(rate.billable_rate) - Number(rate.hourly_rate)).toFixed(2)}/uur
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Billing Reports */}
        <Card className="bg-white">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">Maandelijks Winst Rapport</CardTitle>
          </CardHeader>
          <CardContent>
            {billingReports.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Geen factureringsgegevens beschikbaar
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="pb-3 text-sm font-medium text-gray-600">Monteur</th>
                      <th className="pb-3 text-sm font-medium text-gray-600">Uren</th>
                      <th className="pb-3 text-sm font-medium text-gray-600">Kosten</th>
                      <th className="pb-3 text-sm font-medium text-gray-600">Factureerbaar</th>
                      <th className="pb-3 text-sm font-medium text-gray-600">Winst</th>
                      <th className="pb-3 text-sm font-medium text-gray-600">Marge %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {billingReports.map((report) => (
                      <tr key={report.technicianId} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 font-medium text-gray-900">{report.technicianName}</td>
                        <td className="py-3 text-gray-700">
                          {report.totalHours.toFixed(1)}u
                          {(report.overtimeHours > 0 || report.weekendHours > 0 || report.sundayHours > 0) && (
                            <div className="text-xs text-gray-500">
                              {report.overtimeHours > 0 && `Overwerk: ${report.overtimeHours.toFixed(1)}u `}
                              {report.weekendHours > 0 && `Weekend: ${report.weekendHours.toFixed(1)}u `}
                              {report.sundayHours > 0 && `Zondag: ${report.sundayHours.toFixed(1)}u`}
                            </div>
                          )}
                        </td>
                        <td className="py-3 text-red-600">€{report.totalCost.toFixed(2)}</td>
                        <td className="py-3 text-blue-600">€{report.totalBillable.toFixed(2)}</td>
                        <td className="py-3 text-green-600 font-medium">€{report.profit.toFixed(2)}</td>
                        <td className="py-3 text-gray-700">
                          {report.totalBillable > 0 ? Math.round((report.profit / report.totalBillable) * 100) : 0}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Billing;

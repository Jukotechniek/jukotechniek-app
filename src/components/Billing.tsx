import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Customer {
  id: string;
  name: string;
}

interface Technician {
  id: string;
  full_name: string;
  username: string;
}

interface TravelRate {
  id: string;
  customer_id: string;
  technician_id: string;
  travel_expense_to_technician: number;
  travel_expense_from_client: number;
  hourly_rate: number;
  billable_rate: number;
  saturday_rate?: number;
  sunday_rate?: number;
  customer_name?: string;
  technician_name?: string;
}

const TravelExpenseManagement = () => {
  const { toast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [travelRates, setTravelRates] = useState<TravelRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingRate, setEditingRate] = useState<TravelRate | null>(null);
  const [newRate, setNewRate] = useState({
    customerId: '',
    technicianId: '',
    toTechnician: '',
    fromClient: '',
    hourlyRate: '',
    billableRate: '',
    saturdayRate: '',
    sundayRate: ''
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: customersData } = await supabase
        .from('customers')
        .select('*')
        .eq('is_active', true)
        .order('name');

      const { data: techniciansData } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name');

      const { data: ratesData } = await supabase
        .from('customer_technician_rates')
        .select(`
          *,
          customers(name),
          technician:profiles!customer_technician_rates_technician_id_fkey(full_name)
        `);

      const { data: techRates } = await supabase
        .from('technician_rates')
        .select('*');

      setCustomers(customersData || []);
      setTechnicians(techniciansData || []);

      const rateMap = new Map<string, { hourly: number; billable: number; saturday: number; sunday: number }>();
      (techRates || []).forEach(r => {
        rateMap.set(r.technician_id, {
          hourly: r.hourly_rate,
          billable: r.billable_rate,
          saturday: r.saturday_rate ?? r.hourly_rate * 1.5,
          sunday: r.sunday_rate ?? r.hourly_rate * 2
        });
      });

      const formattedRates = (ratesData || []).map(rate => ({
        id: rate.id,
        customer_id: rate.customer_id,
        technician_id: rate.technician_id,
        travel_expense_to_technician: rate.travel_expense_to_technician,
        travel_expense_from_client: rate.travel_expense_from_client,
        hourly_rate: rateMap.get(rate.technician_id)?.hourly || 0,
        billable_rate: rateMap.get(rate.technician_id)?.billable || 0,
        saturday_rate: rateMap.get(rate.technician_id)?.saturday,
        sunday_rate: rateMap.get(rate.technician_id)?.sunday,
        customer_name: rate.customers?.name || 'Verwijderde klant',
        technician_name: rate.technician?.full_name || 'Verwijderde monteur'
      }));

      setTravelRates(formattedRates);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({ title: 'Error', description: 'Failed to load data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveRate = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!newRate.customerId || !newRate.technicianId) {
    toast({ title: 'Error', description: 'Select both customer & technician', variant: 'destructive' });
    return;
  }

  try {
    // 1) Upsert in customer_technician_rates
  const upsertData = editingRate?.id
  ? {
      id: editingRate.id,
      customer_id: newRate.customerId,
      technician_id: newRate.technicianId,
      travel_expense_to_technician: parseFloat(newRate.toTechnician) || 0,
      travel_expense_from_client: parseFloat(newRate.fromClient) || 0,
    }
  : {
      customer_id: newRate.customerId,
      technician_id: newRate.technicianId,
      travel_expense_to_technician: parseFloat(newRate.toTechnician) || 0,
      travel_expense_from_client: parseFloat(newRate.fromClient) || 0,
    };

const { error: ctrError } = await supabase
  .from('customer_technician_rates')
  .upsert([upsertData], {
    onConflict: 'customer_id,technician_id'
  });


    if (ctrError) {
      toast({ title: 'Error', description: ctrError.message, variant: 'destructive' });
      return;
    }

    // 2) Upsert in technician_rates
    const { error: trError } = await supabase
      .from('technician_rates')
      .upsert([{
        technician_id: newRate.technicianId,
        hourly_rate: parseFloat(newRate.hourlyRate) || 0,
        billable_rate: parseFloat(newRate.billableRate) || 0,
          saturday_rate: parseFloat(newRate.saturdayRate) || null,
          sunday_rate: parseFloat(newRate.sundayRate) || null,
      }], {
        onConflict: 'technician_id'
      });

    if (trError) {
      toast({ title: 'Error', description: trError.message, variant: 'destructive' });
      return;
    }

    toast({ title: 'Success', description: 'Travel rate saved!' });
    setNewRate({ customerId: '', technicianId: '', toTechnician: '', fromClient: '', hourlyRate: '', billableRate: '', saturdayRate: '', sundayRate: '' });
    setEditingRate(null);
    setShowAddForm(false);
    fetchData();
  } catch {
    toast({ title: 'Error', description: 'Could not save travel rate', variant: 'destructive' });
  }
};

  const handleEditRate = (rate: TravelRate) => {
    setEditingRate(rate);
    setNewRate({
      customerId: rate.customer_id,
      technicianId: rate.technician_id,
      toTechnician: String(rate.travel_expense_to_technician),
      fromClient: String(rate.travel_expense_from_client),
      hourlyRate: String(rate.hourly_rate),
      billableRate: String(rate.billable_rate),
      saturdayRate: rate.saturday_rate?.toString() || '',
      sundayRate: rate.sunday_rate?.toString() || ''
    });
    setShowAddForm(true);
  };


  const handleDeleteRate = async (id: string) => {
    try {
      // Delete from customer_technician_rates
      const { error: ctrError } = await supabase
        .from('customer_technician_rates')
        .delete()
        .eq('id', id);
      if (ctrError) {
        toast({ title: 'Error', description: ctrError.message, variant: 'destructive' });
        return;
      }
      toast({ title: 'Success', description: 'Travel rate deleted!' });
      fetchData();
    } catch {
      toast({ title: 'Error', description: 'Could not delete travel rate', variant: 'destructive' });
    }
  };

  if (loading) return <div className="p-6 flex justify-center"><div className="animate-spin h-8 w-8 border-b-2 border-red-600 rounded-full"></div></div>;

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Tarieven</h1>
            <p className="text-gray-600">Stel tarieven per monteur per klant in</p>
          </div>
          <Button onClick={() => { setShowAddForm(!showAddForm); setEditingRate(null); }} className="bg-red-600 hover:bg-red-700 text-white">
            {showAddForm ? 'Annuleren' : 'Voeg Tarief Toe'}
          </Button>
        </div>

        {showAddForm && (
          <Card className="bg-white mb-6">
          <CardHeader><CardTitle className="text-lg font-semibold text-gray-900">{editingRate ? 'Tarief Bewerken' : 'Voeg kosten monteur toe'}</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={handleSaveRate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customer">Klant</Label>
                  <select id="customer" value={newRate.customerId} onChange={e => setNewRate({ ...newRate, customerId: e.target.value })} className="w-full p-2 border rounded" required>
                    <option value="">Selecteer Klant</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="technician">Monteur</Label>
                  <select id="technician" value={newRate.technicianId} onChange={e => setNewRate({ ...newRate, technicianId: e.target.value })} className="w-full p-2 border rounded" required>
                    <option value="">Selecteer Monteur</option>
                    {technicians.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                  </select>
                </div>
                <Input id="toTechnician" type="number" step="0.01" placeholder="Reiskosten aan Monteur (€)" value={newRate.toTechnician} onChange={e => setNewRate({ ...newRate, toTechnician: e.target.value })} />
                <Input id="fromClient" type="number" step="0.01" placeholder="Reiskosten van Klant (€)" value={newRate.fromClient} onChange={e => setNewRate({ ...newRate, fromClient: e.target.value })} />
                <Input id="hourlyRate" type="number" step="0.01" placeholder="Uurtarief (€)" value={newRate.hourlyRate} onChange={e => setNewRate({ ...newRate, hourlyRate: e.target.value })} />
                <Input id="billableRate" type="number" step="0.01" placeholder="Factureerbaar (€)" value={newRate.billableRate} onChange={e => setNewRate({ ...newRate, billableRate: e.target.value })} />
                <Input id="saturdayRate" type="number" step="0.01" placeholder="Tarief Zaterdag (€)" value={newRate.saturdayRate} onChange={e => setNewRate({ ...newRate, saturdayRate: e.target.value })} />
                <Input id="sundayRate" type="number" step="0.01" placeholder="Tarief Zondag (€)" value={newRate.sundayRate} onChange={e => setNewRate({ ...newRate, sundayRate: e.target.value })} />
                <Button type="submit" className="md:col-span-2 bg-red-600 hover:bg-red-700 text-white">{editingRate ? 'Bijwerken' : 'Voeg Tarief Toe'}</Button>
              </form>
            </CardContent>
          </Card>
        )}

        <Card className="bg-white">
          <CardHeader><CardTitle className="text-lg font-semibold text-gray-900">Tarieven ({travelRates.length})</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
               <thead>
  <tr className="border-b">
    <th>Klant</th>
    <th>Monteur</th>
    <th>Aan (€)</th>
    <th>Van (€)</th>
    <th>Uurtarief</th>
    <th>Zaterdag</th>
    <th>Zondag</th>
    <th>Factureerbaar</th>
    <th>Acties</th>
  </tr>
</thead>
<tbody>
  {travelRates.map(rate => (
    <tr key={rate.id} className="border-b hover:bg-gray-50">
      <td className="py-3">{rate.customer_name}</td>
      <td className="py-3">{rate.technician_name}</td>
      <td className="py-3">€{rate.travel_expense_to_technician.toFixed(2)}</td>
      <td className="py-3">€{rate.travel_expense_from_client.toFixed(2)}</td>
      <td className="py-3">€{rate.hourly_rate.toFixed(2)}</td>
      <td className="py-3">€{rate.saturday_rate?.toFixed(2)}</td>
      <td className="py-3">€{rate.sunday_rate?.toFixed(2)}</td>
      <td className="py-3">€{rate.billable_rate.toFixed(2)}</td>
      <td className="py-3 space-x-2">
        <Button size="sm" variant="outline" onClick={() => handleEditRate(rate)}>Bewerk</Button>
        <Button size="sm" variant="outline" onClick={() => handleDeleteRate(rate.id)}>Verwijder</Button>
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

export default TravelExpenseManagement;

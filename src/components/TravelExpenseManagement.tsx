
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
  const [newRate, setNewRate] = useState({
    customerId: '',
    technicianId: '',
    toTechnician: '',
    fromClient: ''
  });

  const fetchData = async () => {
    try {
      // Fetch customers
      const { data: customersData } = await supabase
        .from('customers')
        .select('*')
        .eq('is_active', true)
        .order('name');

      // Fetch technicians
      const { data: techniciansData } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name');

      // Fetch travel rates with customer and technician names
      const { data: ratesData } = await supabase
        .from('customer_technician_rates')
        .select(`
          *,
          customers!inner(name),
          profiles!inner(full_name, username)
        `);

      setCustomers(customersData || []);
      setTechnicians(techniciansData || []);
      
      const formattedRates = ratesData?.map(rate => ({
        id: rate.id,
        customer_id: rate.customer_id,
        technician_id: rate.technician_id,
        travel_expense_to_technician: rate.travel_expense_to_technician || 0,
        travel_expense_from_client: rate.travel_expense_from_client || 0,
        customer_name: rate.customers?.name,
        technician_name: rate.profiles?.full_name
      })) || [];

      setTravelRates(formattedRates);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddRate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newRate.customerId || !newRate.technicianId) {
      toast({
        title: "Error",
        description: "Please select both customer and technician",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('customer_technician_rates')
        .insert([{
          customer_id: newRate.customerId,
          technician_id: newRate.technicianId,
          travel_expense_to_technician: parseFloat(newRate.toTechnician) || 0,
          travel_expense_from_client: parseFloat(newRate.fromClient) || 0
        }]);

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Success",
        description: "Travel expenses added successfully"
      });

      setNewRate({
        customerId: '',
        technicianId: '',
        toTechnician: '',
        fromClient: ''
      });
      setShowAddForm(false);
      fetchData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add travel expenses",
        variant: "destructive"
      });
    }
  };

  const handleDeleteRate = async (rateId: string) => {
    if (!window.confirm('Are you sure you want to delete this travel expense rate?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('customer_technician_rates')
        .delete()
        .eq('id', rateId);

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Success",
        description: "Travel expense rate deleted successfully"
      });

      fetchData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete travel expense rate",
        variant: "destructive"
      });
    }
  };

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
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Travel Expense Management</h1>
            <p className="text-gray-600">Set travel expenses per technician per customer</p>
          </div>
          <Button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {showAddForm ? 'Cancel' : 'Add Travel Rate'}
          </Button>
        </div>

        {/* Add Rate Form */}
        {showAddForm && (
          <Card className="bg-white mb-6">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900">Add Travel Expense Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddRate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customer">Customer</Label>
                  <select
                    id="customer"
                    value={newRate.customerId}
                    onChange={(e) => setNewRate({ ...newRate, customerId: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    required
                  >
                    <option value="">Select Customer</option>
                    {customers.map(customer => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name}
                      </option>
                    ))}
                  </select>
                </div>
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
                    {technicians.map(technician => (
                      <option key={technician.id} value={technician.id}>
                        {technician.full_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="toTechnician">Travel Expense to Technician (€)</Label>
                  <Input
                    id="toTechnician"
                    type="number"
                    step="0.01"
                    value={newRate.toTechnician}
                    onChange={(e) => setNewRate({ ...newRate, toTechnician: e.target.value })}
                    placeholder="0.00"
                    className="focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fromClient">Travel Expense from Client (€)</Label>
                  <Input
                    id="fromClient"
                    type="number"
                    step="0.01"
                    value={newRate.fromClient}
                    onChange={(e) => setNewRate({ ...newRate, fromClient: e.target.value })}
                    placeholder="0.00"
                    className="focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <Button type="submit" className="bg-red-600 hover:bg-red-700 text-white">
                    Add Travel Rate
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Travel Rates Table */}
        <Card className="bg-white">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">
              Travel Expense Rates ({travelRates.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="pb-3 text-sm font-medium text-gray-600">Customer</th>
                    <th className="pb-3 text-sm font-medium text-gray-600">Technician</th>
                    <th className="pb-3 text-sm font-medium text-gray-600">To Technician (€)</th>
                    <th className="pb-3 text-sm font-medium text-gray-600">From Client (€)</th>
                    <th className="pb-3 text-sm font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {travelRates.map((rate) => (
                    <tr key={rate.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 font-medium text-gray-900">{rate.customer_name}</td>
                      <td className="py-3 text-gray-700">{rate.technician_name}</td>
                      <td className="py-3 text-gray-700">€{rate.travel_expense_to_technician.toFixed(2)}</td>
                      <td className="py-3 text-gray-700">€{rate.travel_expense_from_client.toFixed(2)}</td>
                      <td className="py-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteRate(rate.id)}
                          className="text-red-600 hover:text-red-800 hover:border-red-600"
                        >
                          Delete
                        </Button>
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

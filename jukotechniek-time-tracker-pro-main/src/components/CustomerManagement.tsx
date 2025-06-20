import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Customer } from '@/types/customers';
import { Trash2, Edit2, Plus, X, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import TravelExpenseManagement from './Billing';

const CustomerManagement = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    address: ''
  });

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('name');
      if (!error) {
        setCustomers(data || []);
      }
    } catch (err) {
      console.error('Error fetching customers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const isAdmin = user?.role === 'admin';

  if (loading) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-2xl font-bold text-gray-900">Toegang Geweigerd</h1>
          <p className="text-gray-600">Alleen beheerders kunnen klanten beheren.</p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.address) {
      toast({
        title: 'Fout',
        description: 'Vul alle velden in',
        variant: 'destructive'
      });
      return;
    }

    if (editingCustomer) {
      const { error } = await supabase
        .from('customers')
        .update({ name: formData.name, address: formData.address })
        .eq('id', editingCustomer.id);
      if (error) {
        toast({ title: 'Fout', description: error.message, variant: 'destructive' });
        return;
      }
      toast({ title: 'Succes', description: 'Klant succesvol bijgewerkt' });
    } else {
      const { error } = await supabase
        .from('customers')
        .insert([{ name: formData.name, address: formData.address, is_active: true }]);
      if (error) {
        toast({ title: 'Fout', description: error.message, variant: 'destructive' });
        return;
      }
      toast({ title: 'Succes', description: 'Klant succesvol toegevoegd' });
    }

    fetchCustomers();
    setFormData({ name: '', address: '' });
    setShowAddForm(false);
    setEditingCustomer(null);
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      address: customer.address
    });
    setShowAddForm(true);
  };

  const handleDelete = async (customerId: string) => {
    if (!window.confirm('Weet je zeker dat je deze klant wilt verwijderen? Dit kan niet ongedaan worden gemaakt.')) return;

    const { error: rateError } = await supabase
      .from('customer_technician_rates')
      .delete()
      .eq('customer_id', customerId);
    if (rateError) {
      toast({ title: 'Fout', description: rateError.message, variant: 'destructive' });
      return;
    }

    const { error } = await supabase.from('customers').delete().eq('id', customerId);
    if (error) {
      toast({ title: 'Fout', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Succes', description: 'Klant succesvol verwijderd' });
    fetchCustomers();
  };

  const handleDeactivate = async (customerId: string) => {
    await supabase.from('customers').update({ is_active: false }).eq('id', customerId);
    toast({ title: 'Succes', description: 'Klant succesvol gedeactiveerd' });
    setCustomers(customers.map(c => c.id === customerId ? { ...c, is_active: false } : c));
  };

  const handleReactivate = async (customerId: string) => {
    await supabase.from('customers').update({ is_active: true }).eq('id', customerId);
    toast({ title: 'Succes', description: 'Klant succesvol geactiveerd' });
    setCustomers(customers.map(c => c.id === customerId ? { ...c, is_active: true } : c));
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Klantenbeheer</h1>
            <p className="text-gray-600">Beheer klanten en hun reiskosten</p>
          </div>
          <Button
            onClick={() => {
              setShowAddForm(!showAddForm);
              setEditingCustomer(null);
              setFormData({ name: '', address: '' });
            }}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            {showAddForm ? 'Annuleren' : 'Klant Toevoegen'}
          </Button>
        </div>

        {showAddForm && (
          <Card className="bg-white mb-6">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900">
                {editingCustomer ? 'Klant Bewerken' : 'Nieuwe Klant Toevoegen'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Klantnaam</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Klantnaam"
                    required
                    className="focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="address">Adres</Label>
                  <Textarea
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Klantadres"
                    required
                    className="focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <Button type="submit" className="bg-red-600 hover:bg-red-700 text-white mr-2">
                    {editingCustomer ? 'Klant Bijwerken' : 'Klant Toevoegen'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <Card className="bg-white">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">
              Klanten ({customers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="pb-3 text-sm font-medium text-gray-600">Klantnaam</th>
                    <th className="pb-3 text-sm font-medium text-gray-600">Adres</th>
                    <th className="pb-3 text-sm font-medium text-gray-600">Status</th>
                    <th className="pb-3 text-sm font-medium text-gray-600">Acties</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((customer) => (
                    <tr key={customer.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 font-medium text-gray-900">{customer.name}</td>
                      <td className="py-3 text-gray-700 max-w-xs truncate">{customer.address}</td>
                      <td className="py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          customer.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {customer.is_active ? 'Actief' : 'Inactief'}
                        </span>
                      </td>
                      <td className="py-3">
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(customer)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          {customer.is_active ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeactivate(customer.id)}
                              className="h-8 w-8 p-0 border-orange-300 text-orange-600 hover:bg-orange-50"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleReactivate(customer.id)}
                              className="h-8 w-8 p-0 border-green-300 text-green-600 hover:bg-green-50"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(customer.id)}
                            className="h-8 w-8 p-0 border-red-300 text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <TravelExpenseManagement />
      </div>
    </div>
  );
};

export default CustomerManagement;

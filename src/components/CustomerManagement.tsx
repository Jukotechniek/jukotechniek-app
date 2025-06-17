
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Customer } from '@/types/customers';
import { Trash2, Edit2, Plus } from 'lucide-react';

// Mock data
const mockCustomers: Customer[] = [
  {
    id: '1',
    name: 'Gemeente Amsterdam',
    address: 'Stadshuis, Amsterdam',
    travelExpense: 25.00,
    createdAt: '2024-06-01T00:00:00Z',
    isActive: true
  },
  {
    id: '2', 
    name: 'KPN Kantoor Rotterdam',
    address: 'Wilhelminakade 123, Rotterdam',
    travelExpense: 35.00,
    createdAt: '2024-06-01T00:00:00Z',
    isActive: true
  },
  {
    id: '3',
    name: 'Philips Healthcare Utrecht',
    address: 'Science Park, Utrecht',
    travelExpense: 30.00,
    createdAt: '2024-06-01T00:00:00Z',
    isActive: true
  }
];

const CustomerManagement = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [customers, setCustomers] = useState(mockCustomers);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    travelExpense: ''
  });

  const isAdmin = user?.role === 'admin';

  if (!isAdmin) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-2xl font-bold text-gray-900">Access Denied</h1>
          <p className="text-gray-600">Only administrators can manage customers.</p>
        </div>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.address || !formData.travelExpense) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive"
      });
      return;
    }

    const travelExpense = parseFloat(formData.travelExpense);
    if (travelExpense < 0) {
      toast({
        title: "Error", 
        description: "Travel expense cannot be negative",
        variant: "destructive"
      });
      return;
    }

    if (editingCustomer) {
      // Update existing customer
      setCustomers(customers.map(customer => 
        customer.id === editingCustomer.id 
          ? { ...customer, ...formData, travelExpense }
          : customer
      ));
      toast({
        title: "Success",
        description: "Customer updated successfully"
      });
    } else {
      // Add new customer
      const newCustomer: Customer = {
        id: Date.now().toString(),
        name: formData.name,
        address: formData.address,
        travelExpense,
        createdAt: new Date().toISOString(),
        isActive: true
      };
      setCustomers([...customers, newCustomer]);
      toast({
        title: "Success",
        description: "Customer added successfully"
      });
    }

    setFormData({ name: '', address: '', travelExpense: '' });
    setShowAddForm(false);
    setEditingCustomer(null);
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      address: customer.address,
      travelExpense: customer.travelExpense.toString()
    });
    setShowAddForm(true);
  };

  const handleDelete = (customerId: string) => {
    setCustomers(customers.map(customer =>
      customer.id === customerId 
        ? { ...customer, isActive: false }
        : customer
    ));
    toast({
      title: "Success",
      description: "Customer deactivated successfully"
    });
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Customer Management</h1>
            <p className="text-gray-600">Manage customers and their travel expenses</p>
          </div>
          <Button
            onClick={() => {
              setShowAddForm(!showAddForm);
              setEditingCustomer(null);
              setFormData({ name: '', address: '', travelExpense: '' });
            }}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            {showAddForm ? 'Cancel' : 'Add Customer'}
          </Button>
        </div>

        {/* Add/Edit Customer Form */}
        {showAddForm && (
          <Card className="bg-white mb-6">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900">
                {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Customer Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Customer name"
                    required
                    className="focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="travelExpense">Travel Expense (€)</Label>
                  <Input
                    id="travelExpense"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.travelExpense}
                    onChange={(e) => setFormData({ ...formData, travelExpense: e.target.value })}
                    placeholder="25.00"
                    required
                    className="focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="address">Address</Label>
                  <Textarea
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Customer address"
                    required
                    className="focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <Button type="submit" className="bg-red-600 hover:bg-red-700 text-white mr-2">
                    {editingCustomer ? 'Update Customer' : 'Add Customer'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Customers List */}
        <Card className="bg-white">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">
              Customers ({customers.filter(c => c.isActive).length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="pb-3 text-sm font-medium text-gray-600">Customer Name</th>
                    <th className="pb-3 text-sm font-medium text-gray-600">Address</th>
                    <th className="pb-3 text-sm font-medium text-gray-600">Travel Expense</th>
                    <th className="pb-3 text-sm font-medium text-gray-600">Status</th>
                    <th className="pb-3 text-sm font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((customer) => (
                    <tr key={customer.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 font-medium text-gray-900">{customer.name}</td>
                      <td className="py-3 text-gray-700 max-w-xs truncate">{customer.address}</td>
                      <td className="py-3 text-gray-700 font-medium">€{customer.travelExpense.toFixed(2)}</td>
                      <td className="py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          customer.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {customer.isActive ? 'Active' : 'Inactive'}
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
                          {customer.isActive && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDelete(customer.id)}
                              className="h-8 w-8 p-0 border-red-300 text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
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

export default CustomerManagement;

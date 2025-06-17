
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { CustomerTechnicianRate } from '@/types/customers';
import { Edit2, Save, X, Plus, Trash2 } from 'lucide-react';

// Mock data with all combinations
const mockRates: CustomerTechnicianRate[] = [
  {
    id: '1',
    customerId: '1',
    technicianId: '2',
    travelExpenseToTechnician: 25.00,
    travelExpenseFromClient: 35.00,
    createdAt: '2024-06-01T00:00:00Z',
    updatedAt: '2024-06-01T00:00:00Z'
  },
  {
    id: '2',
    customerId: '2',
    technicianId: '2',
    travelExpenseToTechnician: 35.00,
    travelExpenseFromClient: 45.00,
    createdAt: '2024-06-01T00:00:00Z',
    updatedAt: '2024-06-01T00:00:00Z'
  },
  {
    id: '3',
    customerId: '3',
    technicianId: '2',
    travelExpenseToTechnician: 30.00,
    travelExpenseFromClient: 40.00,
    createdAt: '2024-06-01T00:00:00Z',
    updatedAt: '2024-06-01T00:00:00Z'
  },
  {
    id: '4',
    customerId: '1',
    technicianId: '3',
    travelExpenseToTechnician: 25.00,
    travelExpenseFromClient: 35.00,
    createdAt: '2024-06-01T00:00:00Z',
    updatedAt: '2024-06-01T00:00:00Z'
  },
  {
    id: '5',
    customerId: '2',
    technicianId: '3',
    travelExpenseToTechnician: 35.00,
    travelExpenseFromClient: 45.00,
    createdAt: '2024-06-01T00:00:00Z',
    updatedAt: '2024-06-01T00:00:00Z'
  },
  {
    id: '6',
    customerId: '3',
    technicianId: '3',
    travelExpenseToTechnician: 30.00,
    travelExpenseFromClient: 40.00,
    createdAt: '2024-06-01T00:00:00Z',
    updatedAt: '2024-06-01T00:00:00Z'
  }
];

const mockCustomers = [
  { id: '1', name: 'Gemeente Amsterdam' },
  { id: '2', name: 'KPN Kantoor Rotterdam' },
  { id: '3', name: 'Philips Healthcare Utrecht' }
];

const mockTechnicians = [
  { id: '2', name: 'Jan de Vries' },
  { id: '3', name: 'Pieter Jansen' }
];

const CustomerTechnicianRates = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rates, setRates] = useState(mockRates);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editData, setEditData] = useState({
    travelExpenseToTechnician: '',
    travelExpenseFromClient: ''
  });
  const [newRate, setNewRate] = useState({
    customerId: '',
    technicianId: '',
    travelExpenseToTechnician: '',
    travelExpenseFromClient: ''
  });

  const isAdmin = user?.role === 'admin';

  if (!isAdmin) {
    return null;
  }

  const handleEdit = (rate: CustomerTechnicianRate) => {
    setEditingId(rate.id);
    setEditData({
      travelExpenseToTechnician: rate.travelExpenseToTechnician.toString(),
      travelExpenseFromClient: rate.travelExpenseFromClient.toString()
    });
  };

  const handleSave = (rateId: string) => {
    const toTech = parseFloat(editData.travelExpenseToTechnician);
    const fromClient = parseFloat(editData.travelExpenseFromClient);
    
    if (toTech < 0 || fromClient < 0) {
      toast({
        title: "Fout",
        description: "Reiskosten kunnen niet negatief zijn",
        variant: "destructive"
      });
      return;
    }

    setRates(rates.map(rate => 
      rate.id === rateId 
        ? { 
            ...rate, 
            travelExpenseToTechnician: toTech,
            travelExpenseFromClient: fromClient,
            updatedAt: new Date().toISOString()
          }
        : rate
    ));
    
    setEditingId(null);
    toast({
      title: "Succes",
      description: "Reiskosten bijgewerkt"
    });
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditData({
      travelExpenseToTechnician: '',
      travelExpenseFromClient: ''
    });
  };

  const handleAddRate = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newRate.customerId || !newRate.technicianId || !newRate.travelExpenseToTechnician || !newRate.travelExpenseFromClient) {
      toast({
        title: "Fout",
        description: "Vul alle velden in",
        variant: "destructive"
      });
      return;
    }

    const toTech = parseFloat(newRate.travelExpenseToTechnician);
    const fromClient = parseFloat(newRate.travelExpenseFromClient);
    
    if (toTech < 0 || fromClient < 0) {
      toast({
        title: "Fout",
        description: "Reiskosten kunnen niet negatief zijn",
        variant: "destructive"
      });
      return;
    }

    // Check if combination already exists
    const existingRate = rates.find(r => 
      r.customerId === newRate.customerId && r.technicianId === newRate.technicianId
    );
    
    if (existingRate) {
      toast({
        title: "Fout",
        description: "Deze combinatie van klant en monteur bestaat al",
        variant: "destructive"
      });
      return;
    }

    const rate: CustomerTechnicianRate = {
      id: Date.now().toString(),
      customerId: newRate.customerId,
      technicianId: newRate.technicianId,
      travelExpenseToTechnician: toTech,
      travelExpenseFromClient: fromClient,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setRates([...rates, rate]);
    setNewRate({
      customerId: '',
      technicianId: '',
      travelExpenseToTechnician: '',
      travelExpenseFromClient: ''
    });
    setShowAddForm(false);
    
    toast({
      title: "Succes",
      description: "Reiskosten toegevoegd"
    });
  };

  const handleDelete = (rateId: string) => {
    setRates(rates.filter(r => r.id !== rateId));
    toast({
      title: "Succes",
      description: "Reiskosten verwijderd"
    });
  };

  const getCustomerName = (customerId: string) => {
    return mockCustomers.find(c => c.id === customerId)?.name || 'Onbekend';
  };

  const getTechnicianName = (technicianId: string) => {
    return mockTechnicians.find(t => t.id === technicianId)?.name || 'Onbekend';
  };

  return (
    <Card className="bg-white mt-6">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg font-semibold text-gray-900">
            Reiskosten per Monteur per Klant
          </CardTitle>
          <Button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            {showAddForm ? 'Annuleren' : 'Reiskosten Toevoegen'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Add Form */}
        {showAddForm && (
          <Card className="mb-6 bg-gray-50">
            <CardHeader>
              <CardTitle className="text-md">Nieuwe Reiskosten Toevoegen</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddRate} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customer">Klant</Label>
                  <select
                    id="customer"
                    value={newRate.customerId}
                    onChange={(e) => setNewRate({ ...newRate, customerId: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    required
                  >
                    <option value="">Selecteer Klant</option>
                    {mockCustomers.map(customer => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name}
                      </option>
                    ))}
                  </select>
                </div>
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
                    {mockTechnicians.map(technician => (
                      <option key={technician.id} value={technician.id}>
                        {technician.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="toTech">Betaald aan Monteur (€)</Label>
                  <Input
                    id="toTech"
                    type="number"
                    step="0.01"
                    min="0"
                    value={newRate.travelExpenseToTechnician}
                    onChange={(e) => setNewRate({ ...newRate, travelExpenseToTechnician: e.target.value })}
                    placeholder="25.00"
                    required
                    className="focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fromClient">Ontvangen van Klant (€)</Label>
                  <Input
                    id="fromClient"
                    type="number"
                    step="0.01"
                    min="0"
                    value={newRate.travelExpenseFromClient}
                    onChange={(e) => setNewRate({ ...newRate, travelExpenseFromClient: e.target.value })}
                    placeholder="35.00"
                    required
                    className="focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                <div className="md:col-span-2 lg:col-span-4">
                  <Button type="submit" className="bg-red-600 hover:bg-red-700 text-white">
                    Toevoegen
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="pb-3 text-sm font-medium text-gray-600">Klant</th>
                <th className="pb-3 text-sm font-medium text-gray-600">Monteur</th>
                <th className="pb-3 text-sm font-medium text-gray-600">Betaald aan Monteur</th>
                <th className="pb-3 text-sm font-medium text-gray-600">Ontvangen van Klant</th>
                <th className="pb-3 text-sm font-medium text-gray-600">Winst per Reis</th>
                <th className="pb-3 text-sm font-medium text-gray-600">Acties</th>
              </tr>
            </thead>
            <tbody>
              {rates.map((rate) => {
                const profit = rate.travelExpenseFromClient - rate.travelExpenseToTechnician;
                const isEditing = editingId === rate.id;
                
                return (
                  <tr key={rate.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 font-medium text-gray-900">
                      {getCustomerName(rate.customerId)}
                    </td>
                    <td className="py-3 text-gray-700">
                      {getTechnicianName(rate.technicianId)}
                    </td>
                    <td className="py-3 text-gray-700">
                      {isEditing ? (
                        <Input
                          type="number"
                          step="0.01"
                          value={editData.travelExpenseToTechnician}
                          onChange={(e) => setEditData({
                            ...editData,
                            travelExpenseToTechnician: e.target.value
                          })}
                          className="w-24"
                        />
                      ) : (
                        `€${rate.travelExpenseToTechnician.toFixed(2)}`
                      )}
                    </td>
                    <td className="py-3 text-gray-700">
                      {isEditing ? (
                        <Input
                          type="number"
                          step="0.01"
                          value={editData.travelExpenseFromClient}
                          onChange={(e) => setEditData({
                            ...editData,
                            travelExpenseFromClient: e.target.value
                          })}
                          className="w-24"
                        />
                      ) : (
                        `€${rate.travelExpenseFromClient.toFixed(2)}`
                      )}
                    </td>
                    <td className={`py-3 font-medium ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      €{profit.toFixed(2)}
                    </td>
                    <td className="py-3">
                      <div className="flex space-x-2">
                        {isEditing ? (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleSave(rate.id)}
                              className="h-8 w-8 p-0 bg-green-600 hover:bg-green-700"
                            >
                              <Save className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={handleCancel}
                              className="h-8 w-8 p-0"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(rate)}
                              className="h-8 w-8 p-0"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDelete(rate.id)}
                              className="h-8 w-8 p-0 border-red-300 text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

export default CustomerTechnicianRates;

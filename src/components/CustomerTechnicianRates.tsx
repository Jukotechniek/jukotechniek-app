
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { CustomerTechnicianRate } from '@/types/customers';
import { Edit2, Save, X } from 'lucide-react';

// Mock data
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
  const [editData, setEditData] = useState({
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

  const getCustomerName = (customerId: string) => {
    return mockCustomers.find(c => c.id === customerId)?.name || 'Onbekend';
  };

  const getTechnicianName = (technicianId: string) => {
    return mockTechnicians.find(t => t.id === technicianId)?.name || 'Onbekend';
  };

  return (
    <Card className="bg-white mt-6">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-900">
          Reiskosten per Monteur per Klant
        </CardTitle>
      </CardHeader>
      <CardContent>
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
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(rate)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
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


import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { WorkEntry } from '@/types/workHours';
import { calculateOvertimeHours, formatDutchDate } from '@/utils/overtimeCalculations';
import { Trash2, Edit2, Save, X } from 'lucide-react';

// Mock customers data
const mockCustomers = [
  { id: '1', name: 'Gemeente Amsterdam' },
  { id: '2', name: 'KPN Kantoor Rotterdam' },
  { id: '3', name: 'Philips Healthcare Utrecht' }
];

// Mock travel expenses per technician per customer
const mockTravelExpenses = [
  { customerId: '1', technicianId: '2', toTechnician: 25.00, fromClient: 35.00 },
  { customerId: '2', technicianId: '2', toTechnician: 35.00, fromClient: 45.00 },
  { customerId: '3', technicianId: '2', toTechnician: 30.00, fromClient: 40.00 },
  { customerId: '1', technicianId: '3', toTechnician: 25.00, fromClient: 35.00 },
  { customerId: '2', technicianId: '3', toTechnician: 35.00, fromClient: 45.00 },
  { customerId: '3', technicianId: '3', toTechnician: 30.00, fromClient: 40.00 }
];

// Updated mock data with customer and overtime info
const mockWorkEntries: WorkEntry[] = [
  {
    id: '1',
    technicianId: '2',
    technicianName: 'Jan de Vries',
    customerId: '1',
    customerName: 'Gemeente Amsterdam',
    date: '2024-06-15',
    hoursWorked: 9,
    regularHours: 8,
    overtimeHours: 1,
    weekendHours: 0,
    sundayHours: 0,
    isWeekend: false,
    isSunday: false,
    isManualEntry: false,
    description: 'Installatie op kantoor Amsterdam',
    travelExpenseToTechnician: 25.00,
    travelExpenseFromClient: 35.00,
    createdAt: '2024-06-15T08:00:00Z',
    createdBy: '2'
  },
  {
    id: '2',
    technicianId: '3',
    technicianName: 'Pieter Jansen',
    customerId: '2',
    customerName: 'KPN Kantoor Rotterdam',
    date: '2024-06-14',
    hoursWorked: 7.5,
    regularHours: 7.5,
    overtimeHours: 0,
    weekendHours: 0,
    sundayHours: 0,
    isWeekend: false,
    isSunday: false,
    isManualEntry: true,
    description: 'Onderhoudswerkzaamheden Rotterdam',
    travelExpenseToTechnician: 35.00,
    travelExpenseFromClient: 45.00,
    createdAt: '2024-06-14T09:30:00Z',
    createdBy: '1'
  }
];

const WorkHours = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [workEntries, setWorkEntries] = useState(mockWorkEntries);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<WorkEntry | null>(null);
  const [newEntry, setNewEntry] = useState({
    technicianId: user?.role === 'technician' ? user.id : '',
    customerId: mockCustomers.length === 1 ? mockCustomers[0].id : '',
    date: new Date().toISOString().split('T')[0],
    hoursWorked: '',
    description: ''
  });

  const isAdmin = user?.role === 'admin';
  const filteredEntries = isAdmin 
    ? workEntries 
    : workEntries.filter(entry => entry.technicianId === user?.id);

  const getTravelExpenses = (customerId: string, technicianId: string) => {
    return mockTravelExpenses.find(
      exp => exp.customerId === customerId && exp.technicianId === technicianId
    ) || { toTechnician: 0, fromClient: 0 };
  };

  const handleAddEntry = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newEntry.technicianId || !newEntry.customerId || !newEntry.date || !newEntry.hoursWorked) {
      toast({
        title: "Fout",
        description: "Vul alle verplichte velden in",
        variant: "destructive"
      });
      return;
    }

    const hours = parseFloat(newEntry.hoursWorked);
    if (hours <= 0 || hours > 24) {
      toast({
        title: "Fout",
        description: "Uren moeten tussen 0 en 24 liggen",
        variant: "destructive"
      });
      return;
    }

    // Calculate overtime hours
    const overtimeData = calculateOvertimeHours(newEntry.date, hours);
    
    // Get travel expenses
    const travelExpenses = getTravelExpenses(newEntry.customerId, newEntry.technicianId);
    const selectedCustomer = mockCustomers.find(c => c.id === newEntry.customerId);
    
    const entry: WorkEntry = {
      id: Date.now().toString(),
      technicianId: newEntry.technicianId,
      technicianName: newEntry.technicianId === '2' ? 'Jan de Vries' : 'Pieter Jansen',
      customerId: newEntry.customerId,
      customerName: selectedCustomer?.name || '',
      date: newEntry.date,
      hoursWorked: hours,
      ...overtimeData,
      isManualEntry: true,
      description: newEntry.description,
      travelExpenseToTechnician: travelExpenses.toTechnician,
      travelExpenseFromClient: travelExpenses.fromClient,
      createdAt: new Date().toISOString(),
      createdBy: user?.id || ''
    };

    setWorkEntries([...workEntries, entry]);
    
    let overtimeMessage = '';
    if (overtimeData.isSunday) {
      overtimeMessage = ` Zondag: ${overtimeData.sundayHours}u tegen 200%`;
    } else if (overtimeData.isWeekend) {
      overtimeMessage = ` Weekend: ${overtimeData.weekendHours}u tegen 150%`;
    } else if (overtimeData.overtimeHours > 0) {
      overtimeMessage = ` Overwerk: ${overtimeData.overtimeHours}u tegen 125%`;
    }
    
    toast({
      title: "Succes",
      description: `Werkuren succesvol toegevoegd.${overtimeMessage}`
    });

    setNewEntry({
      technicianId: user?.role === 'technician' ? user.id : '',
      customerId: mockCustomers.length === 1 ? mockCustomers[0].id : '',
      date: new Date().toISOString().split('T')[0],
      hoursWorked: '',
      description: ''
    });
    setShowAddForm(false);
  };

  const handleEdit = (entry: WorkEntry) => {
    if (!isAdmin && entry.technicianId !== user?.id) {
      toast({
        title: "Fout",
        description: "Je kunt alleen je eigen uren bewerken",
        variant: "destructive"
      });
      return;
    }
    setEditingEntry(entry);
  };

  const handleSaveEdit = () => {
    if (!editingEntry) return;

    const hours = editingEntry.hoursWorked;
    if (hours <= 0 || hours > 24) {
      toast({
        title: "Fout",
        description: "Uren moeten tussen 0 en 24 liggen",
        variant: "destructive"
      });
      return;
    }

    const overtimeData = calculateOvertimeHours(editingEntry.date, hours);
    
    setWorkEntries(workEntries.map(entry => 
      entry.id === editingEntry.id 
        ? { ...editingEntry, ...overtimeData }
        : entry
    ));
    
    setEditingEntry(null);
    toast({
      title: "Succes",
      description: "Werkuren succesvol bijgewerkt"
    });
  };

  const handleDelete = (entryId: string, entry: WorkEntry) => {
    if (!isAdmin && entry.technicianId !== user?.id) {
      toast({
        title: "Fout",
        description: "Je kunt alleen je eigen uren verwijderen",
        variant: "destructive"
      });
      return;
    }

    setWorkEntries(workEntries.filter(e => e.id !== entryId));
    toast({
      title: "Succes",
      description: "Werkuren succesvol verwijderd"
    });
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {isAdmin ? 'Werkuren Beheer' : 'Mijn Werkuren'}
            </h1>
            <p className="text-gray-600">
              {isAdmin ? 'Beheer en volg alle monteur werkuren' : 'Bekijk en beheer jouw werkuren'}
            </p>
          </div>
          <Button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {showAddForm ? 'Annuleren' : 'Uren Toevoegen'}
          </Button>
        </div>

        {/* Add Entry Form */}
        {showAddForm && (
          <Card className="bg-white mb-6">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900">Werkuren Toevoegen</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddEntry} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {isAdmin && (
                  <div className="space-y-2">
                    <Label htmlFor="technician">Monteur</Label>
                    <select
                      id="technician"
                      value={newEntry.technicianId}
                      onChange={(e) => setNewEntry({ ...newEntry, technicianId: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      required
                    >
                      <option value="">Selecteer Monteur</option>
                      <option value="2">Jan de Vries</option>
                      <option value="3">Pieter Jansen</option>
                    </select>
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="customer">Klant</Label>
                  <select
                    id="customer"
                    value={newEntry.customerId}
                    onChange={(e) => setNewEntry({ ...newEntry, customerId: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    required
                  >
                    <option value="">Selecteer Klant</option>
                    {mockCustomers.map(customer => {
                      const travelExpenses = getTravelExpenses(customer.id, newEntry.technicianId);
                      return (
                        <option key={customer.id} value={customer.id}>
                          {customer.name} {isAdmin && `(€${travelExpenses.toTechnician.toFixed(2)} reis)`}
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date">Datum</Label>
                  <Input
                    id="date"
                    type="date"
                    value={newEntry.date}
                    onChange={(e) => setNewEntry({ ...newEntry, date: e.target.value })}
                    required
                    className="focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hours">Gewerkte Uren</Label>
                  <Input
                    id="hours"
                    type="number"
                    step="0.5"
                    min="0.5"
                    max="24"
                    value={newEntry.hoursWorked}
                    onChange={(e) => setNewEntry({ ...newEntry, hoursWorked: e.target.value })}
                    placeholder="8.0"
                    required
                    className="focus:ring-red-500 focus:border-red-500"
                  />
                  {newEntry.hoursWorked && (
                    <div className="text-xs text-gray-600">
                      {(() => {
                        const hours = parseFloat(newEntry.hoursWorked);
                        const overtimeData = calculateOvertimeHours(newEntry.date, hours);
                        if (overtimeData.isSunday) {
                          return `Zondag: ${hours}u tegen 200% tarief`;
                        } else if (overtimeData.isWeekend) {
                          return `Weekend: ${hours}u tegen 150% tarief`;
                        } else if (overtimeData.overtimeHours > 0) {
                          return `Normaal: ${overtimeData.regularHours}u, Overwerk: ${overtimeData.overtimeHours}u tegen 125%`;
                        } else {
                          return `Normale uren: ${hours}u`;
                        }
                      })()}
                    </div>
                  )}
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="description">Omschrijving (Optioneel)</Label>
                  <Textarea
                    id="description"
                    value={newEntry.description}
                    onChange={(e) => setNewEntry({ ...newEntry, description: e.target.value })}
                    placeholder="Korte omschrijving van uitgevoerde werkzaamheden"
                    className="focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <Button type="submit" className="bg-red-600 hover:bg-red-700 text-white">
                    Toevoegen
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Work Entries Table */}
        <Card className="bg-white">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">
              Werkuren ({filteredEntries.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredEntries.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Geen werkuren gevonden
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-200">
                      {isAdmin && <th className="pb-3 text-sm font-medium text-gray-600">Monteur</th>}
                      <th className="pb-3 text-sm font-medium text-gray-600">Klant</th>
                      <th className="pb-3 text-sm font-medium text-gray-600">Datum</th>
                      <th className="pb-3 text-sm font-medium text-gray-600">Uren</th>
                      {isAdmin && <th className="pb-3 text-sm font-medium text-gray-600">Overwerk</th>}
                      {isAdmin && <th className="pb-3 text-sm font-medium text-gray-600">Reis</th>}
                      <th className="pb-3 text-sm font-medium text-gray-600">Type</th>
                      <th className="pb-3 text-sm font-medium text-gray-600">Omschrijving</th>
                      <th className="pb-3 text-sm font-medium text-gray-600">Acties</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEntries.map((entry) => (
                      <tr key={entry.id} className="border-b border-gray-100 hover:bg-gray-50">
                        {isAdmin && (
                          <td className="py-3 font-medium text-gray-900">{entry.technicianName}</td>
                        )}
                        <td className="py-3 text-gray-700">{entry.customerName}</td>
                        <td className="py-3 text-gray-700">
                          {editingEntry?.id === entry.id ? (
                            <Input
                              type="date"
                              value={editingEntry.date}
                              onChange={(e) => setEditingEntry({...editingEntry, date: e.target.value})}
                              className="w-32"
                            />
                          ) : (
                            <>
                              {formatDutchDate(entry.date)}
                              {entry.isSunday && <span className="ml-1 text-xs text-purple-600">(Zondag)</span>}
                              {entry.isWeekend && <span className="ml-1 text-xs text-orange-600">(Zaterdag)</span>}
                            </>
                          )}
                        </td>
                        <td className="py-3 text-gray-700 font-medium">
                          {editingEntry?.id === entry.id ? (
                            <Input
                              type="number"
                              step="0.5"
                              min="0.5"
                              max="24"
                              value={editingEntry.hoursWorked}
                              onChange={(e) => setEditingEntry({...editingEntry, hoursWorked: parseFloat(e.target.value)})}
                              className="w-20"
                            />
                          ) : (
                            <>
                              {entry.hoursWorked}u
                              {isAdmin && entry.regularHours !== entry.hoursWorked && (
                                <div className="text-xs text-gray-500">
                                  Normaal: {entry.regularHours}u
                                </div>
                              )}
                            </>
                          )}
                        </td>
                        {isAdmin && (
                          <td className="py-3 text-gray-700">
                            {entry.overtimeHours > 0 && (
                              <span className="text-orange-600 font-medium">
                                {entry.overtimeHours}u (125%)
                              </span>
                            )}
                            {entry.weekendHours > 0 && (
                              <span className="text-orange-600 font-medium">
                                {entry.weekendHours}u (150%)
                              </span>
                            )}
                            {entry.sundayHours > 0 && (
                              <span className="text-purple-600 font-medium">
                                {entry.sundayHours}u (200%)
                              </span>
                            )}
                            {entry.overtimeHours === 0 && entry.weekendHours === 0 && entry.sundayHours === 0 && (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                        )}
                        {isAdmin && (
                          <td className="py-3 text-gray-700">
                            €{entry.travelExpenseToTechnician?.toFixed(2) || '0.00'}
                          </td>
                        )}
                        <td className="py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            entry.isManualEntry
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {entry.isManualEntry ? 'Handmatig' : 'Geregistreerd'}
                          </span>
                        </td>
                        <td className="py-3 text-gray-700 max-w-xs truncate">
                          {editingEntry?.id === entry.id ? (
                            <Input
                              value={editingEntry.description || ''}
                              onChange={(e) => setEditingEntry({...editingEntry, description: e.target.value})}
                              className="w-32"
                            />
                          ) : (
                            entry.description || 'Geen omschrijving'
                          )}
                        </td>
                        <td className="py-3">
                          <div className="flex space-x-2">
                            {editingEntry?.id === entry.id ? (
                              <>
                                <Button
                                  size="sm"
                                  onClick={handleSaveEdit}
                                  className="h-8 w-8 p-0 bg-green-600 hover:bg-green-700"
                                >
                                  <Save className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setEditingEntry(null)}
                                  className="h-8 w-8 p-0"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </>
                            ) : (
                              <>
                                {(isAdmin || entry.technicianId === user?.id) && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleEdit(entry)}
                                    className="h-8 w-8 p-0"
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </Button>
                                )}
                                {(isAdmin || entry.technicianId === user?.id) && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleDelete(entry.id, entry)}
                                    className="h-8 w-8 p-0 border-red-300 text-red-600 hover:bg-red-50"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </>
                            )}
                          </div>
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

export default WorkHours;

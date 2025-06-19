
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { WorkEntry } from '@/types/workHours';
import { calculateOvertimeHours, formatDutchDate } from '@/utils/overtimeCalculations';
import { Trash2, Edit2, Save, X } from 'lucide-react';

const WorkHours = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [workEntries, setWorkEntries] = useState<WorkEntry[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<WorkEntry | null>(null);
  const [newEntry, setNewEntry] = useState({
    technicianId: user?.role === 'technician' ? user.id : '',
    customerId: '',
    date: new Date().toISOString().split('T')[0],
    hoursWorked: '',
    description: ''
  });

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch customers
      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select('*')
        .eq('is_active', true);

      if (customersError) throw customersError;
      setCustomers(customersData || []);

      // Fetch technicians (profiles)
      const { data: techniciansData, error: techniciansError } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'technician');

      if (techniciansError) throw techniciansError;
      setTechnicians(techniciansData || []);

      // Fetch work hours with related data
      let query = supabase
        .from('work_hours')
        .select(`
          *,
          profiles!work_hours_technician_id_fkey(full_name),
          customers!work_hours_customer_id_fkey(name)
        `)
        .order('date', { ascending: false });

      if (!isAdmin && user?.id) {
        query = query.eq('technician_id', user.id);
      }

      const { data: workHoursData, error: workHoursError } = await query;

      if (workHoursError) throw workHoursError;

      const formattedEntries: WorkEntry[] = (workHoursData || []).map(entry => ({
        id: entry.id,
        technicianId: entry.technician_id,
        technicianName: entry.profiles?.full_name || 'Unknown',
        customerId: entry.customer_id,
        customerName: entry.customers?.name || 'Unknown',
        date: entry.date,
        hoursWorked: Number(entry.hours_worked),
        regularHours: Number(entry.regular_hours || 0),
        overtimeHours: Number(entry.overtime_hours || 0),
        weekendHours: Number(entry.weekend_hours || 0),
        sundayHours: Number(entry.sunday_hours || 0),
        isWeekend: entry.is_weekend || false,
        isSunday: entry.is_sunday || false,
        isManualEntry: entry.is_manual_entry || true,
        description: entry.description || '',
        travelExpenseToTechnician: Number(entry.travel_expense_to_technician || 0),
        travelExpenseFromClient: Number(entry.travel_expense_from_client || 0),
        createdAt: entry.created_at,
        createdBy: entry.created_by
      }));

      setWorkEntries(formattedEntries);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Fout",
        description: "Kon gegevens niet laden",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getTravelExpenses = async (customerId: string, technicianId: string) => {
    const { data, error } = await supabase
      .from('customer_technician_rates')
      .select('travel_expense_to_technician, travel_expense_from_client')
      .eq('customer_id', customerId)
      .eq('technician_id', technicianId)
      .single();

    if (error || !data) {
      return { toTechnician: 0, fromClient: 0 };
    }

    return {
      toTechnician: Number(data.travel_expense_to_technician || 0),
      fromClient: Number(data.travel_expense_from_client || 0)
    };
  };

  const handleAddEntry = async (e: React.FormEvent) => {
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

    try {
      const overtimeData = calculateOvertimeHours(newEntry.date, hours);
      const travelExpenses = await getTravelExpenses(newEntry.customerId, newEntry.technicianId);

      const { error } = await supabase
        .from('work_hours')
        .insert({
          technician_id: newEntry.technicianId,
          customer_id: newEntry.customerId,
          date: newEntry.date,
          hours_worked: hours,
          regular_hours: overtimeData.regularHours,
          overtime_hours: overtimeData.overtimeHours,
          weekend_hours: overtimeData.weekendHours,
          sunday_hours: overtimeData.sundayHours,
          is_weekend: overtimeData.isWeekend,
          is_sunday: overtimeData.isSunday,
          is_manual_entry: true,
          description: newEntry.description,
          travel_expense_to_technician: travelExpenses.toTechnician,
          travel_expense_from_client: travelExpenses.fromClient,
          created_by: user?.id
        });

      if (error) throw error;

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
        customerId: '',
        date: new Date().toISOString().split('T')[0],
        hoursWorked: '',
        description: ''
      });
      setShowAddForm(false);
      fetchData();
    } catch (error) {
      console.error('Error adding entry:', error);
      toast({
        title: "Fout",
        description: "Kon werkuren niet toevoegen",
        variant: "destructive"
      });
    }
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

  const handleSaveEdit = async () => {
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

    try {
      const overtimeData = calculateOvertimeHours(editingEntry.date, hours);

      const { error } = await supabase
        .from('work_hours')
        .update({
          hours_worked: hours,
          regular_hours: overtimeData.regularHours,
          overtime_hours: overtimeData.overtimeHours,
          weekend_hours: overtimeData.weekendHours,
          sunday_hours: overtimeData.sundayHours,
          is_weekend: overtimeData.isWeekend,
          is_sunday: overtimeData.isSunday,
          description: editingEntry.description
        })
        .eq('id', editingEntry.id);

      if (error) throw error;

      setEditingEntry(null);
      toast({
        title: "Succes",
        description: "Werkuren succesvol bijgewerkt"
      });
      fetchData();
    } catch (error) {
      console.error('Error updating entry:', error);
      toast({
        title: "Fout",
        description: "Kon werkuren niet bijwerken",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (entryId: string, entry: WorkEntry) => {
    if (!isAdmin && entry.technicianId !== user?.id) {
      toast({
        title: "Fout",
        description: "Je kunt alleen je eigen uren verwijderen",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('work_hours')
        .delete()
        .eq('id', entryId);

      if (error) throw error;

      toast({
        title: "Succes",
        description: "Werkuren succesvol verwijderd"
      });
      fetchData();
    } catch (error) {
      console.error('Error deleting entry:', error);
      toast({
        title: "Fout",
        description: "Kon werkuren niet verwijderen",
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
                      {technicians.map(tech => (
                        <option key={tech.id} value={tech.id}>
                          {tech.full_name}
                        </option>
                      ))}
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
                    {customers.map(customer => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name}
                      </option>
                    ))}
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
              Werkuren ({workEntries.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {workEntries.length === 0 ? (
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
                    {workEntries.map((entry) => (
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

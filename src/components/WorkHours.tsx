import React, { useState, useEffect } from 'react';
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
import { supabase } from '@/integrations/supabase/client';

interface Customer {
  id: string;
  name: string;
}

interface TravelRate {
  customer_id: string;
  technician_id: string;
  travel_expense_to_technician: number | null;
  travel_expense_from_client: number | null;
}

interface Technician {
  id: string;
  full_name: string;
  username: string;
}

const WorkHours = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [workEntries, setWorkEntries] = useState<WorkEntry[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [travelRates, setTravelRates] = useState<TravelRate[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<WorkEntry | null>(null);
  const [newEntry, setNewEntry] = useState({
    technicianId: user?.role === 'technician' ? user.id : '',
    customerId: '',
    date: new Date().toISOString().split('T')[0],
    hoursWorked: '',
    startTime: '',
    endTime: '',
    description: ''
  });

  const isAdmin = user?.role === 'admin';
  const [selectedTech, setSelectedTech] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7));

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: customerData, error: custError } = await supabase
        .from('customers')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (custError) throw custError;

      const { data: technicianData, error: techError } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'technician')
        .order('full_name');
      if (techError) throw techError;

      const { data: rateData, error: rateError } = await supabase
        .from('customer_technician_rates')
        .select('*');
      if (rateError) throw rateError;

      const { data: entries, error: entryError } = await supabase
        .from('work_hours')
        .select(`
          *,
          customers(name),
          technician:profiles!work_hours_technician_id_fkey(full_name)
        `)
        .order('date', { ascending: false });
      if (entryError) throw entryError;

      setCustomers(customerData || []);
      setTechnicians(technicianData || []);
      setTravelRates(rateData || []);

      const formatted = (entries || []).map(e => ({
        id: e.id,
        technicianId: e.technician_id || '',
        technicianName: e.technician?.full_name || '',
        customerId: e.customer_id || '',
        customerName: e.customers?.name || '',
        date: e.date,
        hoursWorked: e.hours_worked,
        startTime: e.start_time || '',
        endTime: e.end_time || '',
        regularHours: e.regular_hours || 0,
        overtimeHours: e.overtime_hours || 0,
        weekendHours: e.weekend_hours || 0,
        sundayHours: e.sunday_hours || 0,
        isWeekend: e.is_weekend || false,
        isSunday: e.is_sunday || false,
        isManualEntry: e.is_manual_entry || false,
        description: e.description || '',
        travelExpenseToTechnician: e.travel_expense_to_technician || 0,
        travelExpenseFromClient: e.travel_expense_from_client || 0,
        createdAt: e.created_at || '',
        createdBy: e.created_by || ''
      }));

      setWorkEntries(formatted);
    } catch (error) {
      console.error('Error fetching work hours:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (customers.length > 0 && !newEntry.customerId) {
      setNewEntry(prev => ({ ...prev, customerId: customers[0].id }));
    }
    // eslint-disable-next-line
  }, [customers]);

  const getTravelExpenses = (customerId: string, technicianId: string) => {
    return (
      travelRates.find(
        exp =>
          exp.customer_id === customerId && exp.technician_id === technicianId
      ) || { travel_expense_to_technician: 0, travel_expense_from_client: 0 }
    );
  };

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      (!isAdmin && !newEntry.customerId) ||
      (isAdmin && (!newEntry.technicianId || !newEntry.customerId)) ||
      !newEntry.date ||
      !newEntry.hoursWorked ||
      !newEntry.startTime ||
      !newEntry.endTime
    ) {
      toast({
        title: 'Fout',
        description: 'Vul alle verplichte velden in',
        variant: 'destructive'
      });
      return;
    }

    const hours = parseFloat(newEntry.hoursWorked);
    if (hours <= 0 || hours > 24) {
      toast({
        title: 'Fout',
        description: 'Uren moeten tussen 0 en 24 liggen',
        variant: 'destructive'
      });
      return;
    }

    const overtimeData = calculateOvertimeHours(newEntry.date, hours);
    const travelExpenses = getTravelExpenses(newEntry.customerId, newEntry.technicianId);

    const { data, error } = await supabase
      .from('work_hours')
      .insert([
        {
          technician_id: newEntry.technicianId,
          customer_id: newEntry.customerId,
          date: newEntry.date,
          hours_worked: hours,
          start_time: newEntry.startTime,
          end_time: newEntry.endTime,
          is_manual_entry: true,
          description: newEntry.description,
          regular_hours: overtimeData.regularHours,
          overtime_hours: overtimeData.overtimeHours,
          weekend_hours: overtimeData.weekendHours,
          sunday_hours: overtimeData.sundayHours,
          is_weekend: overtimeData.isWeekend,
          is_sunday: overtimeData.isSunday,
          travel_expense_to_technician: travelExpenses.travel_expense_to_technician,
          travel_expense_from_client: travelExpenses.travel_expense_from_client,
          created_by: user?.id || '',
          manual_verified: false
        }
      ])
      .select(`
        *,
        customers(name),
        technician:profiles!work_hours_technician_id_fkey(full_name)
      `)
      .single();

    if (error) {
      toast({ title: 'Fout', description: error.message, variant: 'destructive' });
      return;
    }

    if (data) {
      const formatted: WorkEntry = {
        id: data.id,
        technicianId: data.technician_id || '',
        technicianName: data.technician?.full_name || '',
        customerId: data.customer_id || '',
        customerName: data.customers?.name || '',
        date: data.date,
        hoursWorked: data.hours_worked,
        startTime: data.start_time || '',
        endTime: data.end_time || '',
        regularHours: data.regular_hours || 0,
        overtimeHours: data.overtime_hours || 0,
        weekendHours: data.weekend_hours || 0,
        sundayHours: data.sunday_hours || 0,
        isWeekend: data.is_weekend || false,
        isSunday: data.is_sunday || false,
        isManualEntry: data.is_manual_entry || false,
        description: data.description || '',
        travelExpenseToTechnician: data.travel_expense_to_technician || 0,
        travelExpenseFromClient: data.travel_expense_from_client || 0,
        createdAt: data.created_at || '',
        createdBy: data.created_by || ''
      };
      setWorkEntries(prev => [formatted, ...prev]);
    }

    toast({ title: 'Succes', description: 'Werkuren succesvol toegevoegd' });
    setNewEntry({
      technicianId: user?.role === 'technician' ? user.id : '',
      customerId: customers[0]?.id || '',
      date: new Date().toISOString().split('T')[0],
      hoursWorked: '',
      startTime: '',
      endTime: '',
      description: ''
    });
    setShowAddForm(false);
  };

  const handleEdit = (entry: WorkEntry) => {
    if (!isAdmin && entry.technicianId !== user?.id) {
      toast({
        title: 'Fout',
        description: 'Je kunt alleen je eigen uren bewerken',
        variant: 'destructive'
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
        title: 'Fout',
        description: 'Uren moeten tussen 0 en 24 liggen',
        variant: 'destructive'
      });
      return;
    }

    const overtimeData = calculateOvertimeHours(editingEntry.date, hours);
    const { error } = await supabase
      .from('work_hours')
      .update({
        date: editingEntry.date,
        hours_worked: hours,
        start_time: editingEntry.startTime,
        end_time: editingEntry.endTime,
        description: editingEntry.description,
        regular_hours: overtimeData.regularHours,
        overtime_hours: overtimeData.overtimeHours,
        weekend_hours: overtimeData.weekendHours,
        sunday_hours: overtimeData.sundayHours,
        is_weekend: overtimeData.isWeekend,
        is_sunday: overtimeData.isSunday,
        manual_verified: false // or set to the appropriate value if needed
      })
      .eq('id', editingEntry.id);

    if (error) {
      toast({ title: 'Fout', description: error.message, variant: 'destructive' });
      return;
    }

    setWorkEntries(prev =>
      prev.map(e =>
        e.id === editingEntry.id ? { ...editingEntry, ...overtimeData } : e
      )
    );
    setEditingEntry(null);
    toast({ title: 'Succes', description: 'Werkuren succesvol bijgewerkt' });
  };

  const handleDelete = async (entryId: string, entry: WorkEntry) => {
    if (!isAdmin && entry.technicianId !== user?.id) {
      toast({
        title: 'Fout',
        description: 'Je kunt alleen je eigen uren verwijderen',
        variant: 'destructive'
      });
      return;
    }

    const { error } = await supabase.from('work_hours').delete().eq('id', entryId);
    if (error) {
      toast({ title: 'Fout', description: error.message, variant: 'destructive' });
      return;
    }

    setWorkEntries(prev => prev.filter(e => e.id !== entryId));
    toast({ title: 'Succes', description: 'Werkuren succesvol verwijderd' });
  };

  const filteredEntries = workEntries.filter(e => {
    if (isAdmin) {
      if (selectedTech !== 'all' && e.technicianId !== selectedTech) return false;
    } else {
      if (e.technicianId !== user?.id) return false;
    }
    if (selectedMonth !== 'all') {
      const [year, month] = selectedMonth.split('-').map(n => parseInt(n, 10));
      const d = new Date(e.date);
      if (d.getFullYear() !== year || d.getMonth() + 1 !== month) return false;
    }
    return true;
  });

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

        <div className="
  mb-4
  flex flex-col gap-y-2
  sm:flex-row sm:items-center sm:space-x-4 sm:gap-y-0
">
  {isAdmin && (
    <select
      value={selectedTech}
      onChange={e => setSelectedTech(e.target.value)}
      className="p-2 border rounded w-full sm:w-auto"
    >
      <option value="all">Alle monteurs</option>
      {technicians.map(t => (
        <option key={t.id} value={t.id}>
          {t.full_name}
        </option>
      ))}
    </select>
  )}
  <Input
    type="month"
    value={selectedMonth === 'all' ? '' : selectedMonth}
    onChange={e => setSelectedMonth(e.target.value || 'all')}
    className="p-2 border rounded w-full sm:w-auto"
  />
  <Button
    onClick={() => setSelectedMonth('all')}
    className="bg-red-600 text-white w-full sm:w-auto"
  >
    Alles
  </Button>
</div>

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
                      onChange={e => setNewEntry({ ...newEntry, technicianId: e.target.value })}
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
                    onChange={e => setNewEntry({ ...newEntry, customerId: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    required
                  >
                    <option value="">Selecteer Klant</option>
                    {customers.map(customer => {
                      const travelExpenses = getTravelExpenses(customer.id, newEntry.technicianId);
                      return (
                        <option key={customer.id} value={customer.id}>
                          {customer.name}
                          {isAdmin && ` (€${(travelExpenses.travel_expense_to_technician || 0).toFixed(2)})`}
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
                    onChange={e => setNewEntry({ ...newEntry, date: e.target.value })}
                    required
                    className="focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="startTime">Begintijd</Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={newEntry.startTime}
                    onChange={e => setNewEntry({ ...newEntry, startTime: e.target.value })}
                    required
                    className="focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endTime">Eindtijd</Label>
                  <Input
                    id="endTime"
                    type="time"
                    value={newEntry.endTime}
                    onChange={e => setNewEntry({ ...newEntry, endTime: e.target.value })}
                    required
                    className="focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hours">Gewerkte Uren</Label>
                  <Input
                    id="hours"
                    type="number"
                    step="0.25"
                    min="0.25"
                    max="24"
                    value={newEntry.hoursWorked}
                    onChange={e => setNewEntry({ ...newEntry, hoursWorked: e.target.value })}
                    placeholder="8.0"
                    required
                    className="focus:ring-red-500 focus:border-red-500"
                  />
                  {isAdmin && newEntry.hoursWorked && (
                    <div className="text-xs text-gray-600">
                      {(() => {
                        const hrs = parseFloat(newEntry.hoursWorked);
                        const od = calculateOvertimeHours(newEntry.date, hrs);
                        if (od.isSunday) return `Zondag: ${od.sundayHours}u tegen 200%`;
                        if (od.isWeekend) return `Weekend: ${od.weekendHours}u tegen 150%`;
                        if (od.overtimeHours > 0)
                          return `Normaal: ${od.regularHours}u, Overwerk: ${od.overtimeHours}u tegen 125%`;
                        return `Normale uren: ${hrs}u`;
                      })()}
                    </div>
                  )}
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="description">Omschrijving (Optioneel)</Label>
                  <Textarea
                    id="description"
                    value={newEntry.description}
                    onChange={e => setNewEntry({ ...newEntry, description: e.target.value })}
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

        <Card className="bg-white">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">
              Werkuren ({filteredEntries.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-200">
                    {isAdmin && <th className="pb-3 text-sm font-medium text-gray-600">Monteur</th>}
                    <th className="pb-3 text-sm font-medium text-gray-600">Klant</th>
                    <th className="pb-3 text-sm font-medium text-gray-600">Datum</th>
                    <th className="pb-3 text-sm font-medium text-gray-600">Begintijd</th>
                    <th className="pb-3 text-sm font-medium text-gray-600">Eindtijd</th>
                    <th className="pb-3 text-sm font-medium text-gray-600">Uren</th>
                    {isAdmin && (
                      <>
                        <th className="pb-3 text-sm font-medium text-gray-600">Normaal</th>
                        <th className="pb-3 text-sm font-medium text-gray-600">Overwerk</th>
                        <th className="pb-3 text-sm font-medium text-gray-600">Zaterdag</th>
                        <th className="pb-3 text-sm font-medium text-gray-600">Zondag</th>
                      </>
                    )}
                    <th className="pb-3 text-sm font-medium text-gray-600">Omschrijving</th>
                    <th className="pb-3 text-sm font-medium text-gray-600">Acties</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEntries.map(entry => (
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
                            onChange={e => setEditingEntry({ ...editingEntry, date: e.target.value })}
                            className="h-8"
                          />
                        ) : (
                          new Date(entry.date).toLocaleDateString('nl-NL')
                        )}
                      </td>
                      <td className="py-3 text-gray-700">
                        {editingEntry?.id === entry.id ? (
                          <Input
                            type="time"
                            value={editingEntry.startTime || ''}
                            onChange={e => setEditingEntry({ ...editingEntry, startTime: e.target.value })}
                            className="h-8 w-24"
                          />
                        ) : (
                          entry.startTime || '-'
                        )}
                      </td>
                      <td className="py-3 text-gray-700">
                        {editingEntry?.id === entry.id ? (
                          <Input
                            type="time"
                            value={editingEntry.endTime || ''}
                            onChange={e => setEditingEntry({ ...editingEntry, endTime: e.target.value })}
                            className="h-8 w-24"
                          />
                        ) : (
                          entry.endTime || '-'
                        )}
                      </td>
                      <td className="py-3 text-gray-700">
                        {editingEntry?.id === entry.id ? (
                          <Input
                            type="number"
                            step="0.5"
                            min="0.5"
                            max="24"
                            value={editingEntry.hoursWorked}
                            onChange={e =>
                              setEditingEntry({ ...editingEntry, hoursWorked: parseFloat(e.target.value) })
                            }
                            className="h-8 w-20"
                          />
                        ) : (
                          `${entry.hoursWorked}h`
                        )}
                      </td>
                      {isAdmin && (
                        <>
                          <td className="py-3 text-gray-700">
                            {entry.regularHours.toFixed(1)}h
                          </td>
                          <td className="py-3 text-orange-600">
                            {entry.overtimeHours.toFixed(1)}h
                          </td>
                          <td className="py-3 text-orange-600">
                            {entry.weekendHours.toFixed(1)}h
                          </td>
                          <td className="py-3 text-purple-600">
                            {entry.sundayHours.toFixed(1)}h
                          </td>
                        </>
                      )}
                      <td className="py-3 text-gray-700 max-w-xs truncate">
                        {editingEntry?.id === entry.id ? (
                          <Input
                            value={editingEntry.description || ''}
                            onChange={e =>
                              setEditingEntry({ ...editingEntry, description: e.target.value })
                            }
                            className="h-8"
                          />
                        ) : (
                          entry.description || '-'
                        )}
                      </td>
                      <td className="py-3">
                        <div className="flex space-x-2">
                          {editingEntry?.id === entry.id ? (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={handleSaveEdit}
                                className="h-8 w-8 p-0 border-green-300 text-green-600 hover:bg-green-50"
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
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEdit(entry)}
                                className="h-8 w-8 p-0"
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDelete(entry.id, entry)}
                                className="h-8 w-8 p-0 border-red-300 text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredEntries.length === 0 && (
                    <tr>
                      <td colSpan={isAdmin ? 11 : 7} className="py-8 text-center text-gray-500">
                        Geen werkuren gevonden
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default WorkHours;

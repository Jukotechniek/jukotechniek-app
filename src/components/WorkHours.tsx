
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { WorkEntry, TechnicianSummary } from '@/types/workHours';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Clock, Plus, Edit, Trash2 } from 'lucide-react';

const WorkHours = () => {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const [workEntries, setWorkEntries] = useState<WorkEntry[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<WorkEntry | null>(null);
  const [newEntry, setNewEntry] = useState({
    technicianId: currentUser?.role === 'technician' ? currentUser.id : '',
    customerId: '',
    date: new Date().toISOString().split('T')[0],
    hoursWorked: 0,
    description: '',
    travelExpenseToTechnician: 0,
    travelExpenseFromClient: 0,
  });

  const isAdmin = currentUser?.role === 'admin';
  const isOpdrachtgever = currentUser?.role === 'opdrachtgever';
  const isTechnician = currentUser?.role === 'technician';

  useEffect(() => {
    fetchData();
  }, [currentUser]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch customers
      const { data: customersData } = await supabase
        .from('customers')
        .select('*')
        .eq('is_active', true)
        .order('name');

      setCustomers(customersData || []);

      // Fetch technicians
      const { data: techniciansData } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'technician')
        .order('full_name');

      setTechnicians(techniciansData || []);

      // Fetch work entries
      let workQuery = supabase
        .from('work_hours')
        .select(`
          *,
          profiles!work_hours_technician_id_fkey(full_name),
          customers!work_hours_customer_id_fkey(name)
        `)
        .order('date', { ascending: false });

      // Filter based on user role
      if (isTechnician) {
        workQuery = workQuery.eq('technician_id', currentUser?.id);
      }

      const { data: workData, error } = await workQuery;

      if (error) {
        console.error('Error fetching work entries:', error);
        toast({
          title: "Error",
          description: "Failed to fetch work entries",
          variant: "destructive"
        });
        return;
      }

      const formattedEntries: WorkEntry[] = (workData || []).map(entry => ({
        id: entry.id,
        technicianId: entry.technician_id,
        technicianName: entry.profiles?.full_name || 'Unknown',
        customerId: entry.customer_id,
        customerName: entry.customers?.name || 'Unknown',
        date: entry.date,
        hoursWorked: entry.hours_worked,
        isManualEntry: entry.is_manual_entry,
        description: entry.description || '',
        travelExpenseToTechnician: entry.travel_expense_to_technician || 0,
        travelExpenseFromClient: entry.travel_expense_from_client || 0,
        regularHours: entry.regular_hours || 0,
        overtimeHours: entry.overtime_hours || 0,
        weekendHours: entry.weekend_hours || 0,
        sundayHours: entry.sunday_hours || 0,
        isWeekend: entry.is_weekend || false,
        isSunday: entry.is_sunday || false,
        createdAt: entry.created_at,
        createdBy: entry.created_by
      }));

      setWorkEntries(formattedEntries);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newEntry.technicianId || !newEntry.customerId || !newEntry.hoursWorked) {
      toast({
        title: "Error",
        description: "Vul alle vereiste velden in",
        variant: "destructive"
      });
      return;
    }

    try {
      const entryData = {
        technician_id: newEntry.technicianId,
        customer_id: newEntry.customerId,
        date: newEntry.date,
        hours_worked: newEntry.hoursWorked,
        description: newEntry.description,
        travel_expense_to_technician: newEntry.travelExpenseToTechnician,
        travel_expense_from_client: newEntry.travelExpenseFromClient,
        is_manual_entry: true,
        created_by: currentUser?.id
      };

      const { error } = await supabase
        .from('work_hours')
        .insert([entryData]);

      if (error) {
        console.error('Error creating work entry:', error);
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Success",
        description: "Werkuren succesvol toegevoegd"
      });

      setNewEntry({
        technicianId: currentUser?.role === 'technician' ? currentUser.id : '',
        customerId: '',
        date: new Date().toISOString().split('T')[0],
        hoursWorked: 0,
        description: '',
        travelExpenseToTechnician: 0,
        travelExpenseFromClient: 0,
      });
      setShowAddForm(false);
      fetchData();
    } catch (error) {
      console.error('Error creating work entry:', error);
      toast({
        title: "Error",
        description: "Kon werkuren niet toevoegen",
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Werkuren</h1>
          <p className="text-gray-600">
            {isTechnician ? 'Beheer je werkuren' : 'Overzicht van alle werkuren'}
          </p>
        </div>

        {/* Add Entry Form */}
        {(isAdmin || isTechnician) && (
          <>
            <div className="mb-6 flex justify-end">
              <Button
                onClick={() => setShowAddForm(!showAddForm)}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                {showAddForm ? 'Annuleren' : 'Uren Toevoegen'}
              </Button>
            </div>

            {showAddForm && (
              <Card className="bg-white mb-6 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-gray-900">Nieuwe Werkuren</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmitEntry} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {isAdmin && (
                      <div className="space-y-2">
                        <Label htmlFor="technicianId">Monteur *</Label>
                        <select
                          id="technicianId"
                          value={newEntry.technicianId}
                          onChange={(e) => setNewEntry({ ...newEntry, technicianId: e.target.value })}
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
                          required
                        >
                          <option value="">Selecteer monteur</option>
                          {technicians.map(tech => (
                            <option key={tech.id} value={tech.id}>{tech.full_name}</option>
                          ))}
                        </select>
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label htmlFor="customerId">Klant *</Label>
                      <select
                        id="customerId"
                        value={newEntry.customerId}
                        onChange={(e) => setNewEntry({ ...newEntry, customerId: e.target.value })}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
                        required
                      >
                        <option value="">Selecteer klant</option>
                        {customers.map(customer => (
                          <option key={customer.id} value={customer.id}>{customer.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="date">Datum *</Label>
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
                      <Label htmlFor="hoursWorked">Gewerkte Uren *</Label>
                      <Input
                        id="hoursWorked"
                        type="number"
                        step="0.5"
                        min="0"
                        value={newEntry.hoursWorked}
                        onChange={(e) => setNewEntry({ ...newEntry, hoursWorked: parseFloat(e.target.value) || 0 })}
                        required
                        className="focus:ring-red-500 focus:border-red-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="travelExpenseToTechnician">Reiskosten naar monteur (€)</Label>
                      <Input
                        id="travelExpenseToTechnician"
                        type="number"
                        step="0.01"
                        min="0"
                        value={newEntry.travelExpenseToTechnician}
                        onChange={(e) => setNewEntry({ ...newEntry, travelExpenseToTechnician: parseFloat(e.target.value) || 0 })}
                        className="focus:ring-red-500 focus:border-red-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="travelExpenseFromClient">Reiskosten van klant (€)</Label>
                      <Input
                        id="travelExpenseFromClient"
                        type="number"
                        step="0.01"
                        min="0"
                        value={newEntry.travelExpenseFromClient}
                        onChange={(e) => setNewEntry({ ...newEntry, travelExpenseFromClient: parseFloat(e.target.value) || 0 })}
                        className="focus:ring-red-500 focus:border-red-500"
                      />
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <Label htmlFor="description">Beschrijving</Label>
                      <Textarea
                        id="description"
                        value={newEntry.description}
                        onChange={(e) => setNewEntry({ ...newEntry, description: e.target.value })}
                        placeholder="Beschrijving van het uitgevoerde werk..."
                        className="focus:ring-red-500 focus:border-red-500"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Button type="submit" className="bg-red-600 hover:bg-red-700 text-white">
                        Uren Toevoegen
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Work Entries Table */}
        <Card className="bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900 flex items-center">
              <Clock className="h-5 w-5 mr-2 text-red-600" />
              Werkuren ({workEntries.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-200">
                    {!isTechnician && <th className="pb-3 text-sm font-medium text-gray-600">Monteur</th>}
                    <th className="pb-3 text-sm font-medium text-gray-600">Klant</th>
                    <th className="pb-3 text-sm font-medium text-gray-600">Datum</th>
                    <th className="pb-3 text-sm font-medium text-gray-600">Uren</th>
                    {/* Hide overtime columns from technicians */}
                    {!isTechnician && (
                      <>
                        <th className="pb-3 text-sm font-medium text-gray-600">Normaal</th>
                        <th className="pb-3 text-sm font-medium text-gray-600">Overwerk</th>
                        <th className="pb-3 text-sm font-medium text-gray-600">Weekend</th>
                        <th className="pb-3 text-sm font-medium text-gray-600">Zondag</th>
                      </>
                    )}
                    <th className="pb-3 text-sm font-medium text-gray-600">Beschrijving</th>
                    <th className="pb-3 text-sm font-medium text-gray-600">Reiskosten</th>
                    {(isAdmin || (isTechnician && editingEntry)) && <th className="pb-3 text-sm font-medium text-gray-600">Acties</th>}
                  </tr>
                </thead>
                <tbody>
                  {workEntries.map((entry) => (
                    <tr key={entry.id} className="border-b border-gray-100 hover:bg-gray-50">
                      {!isTechnician && (
                        <td className="py-3 font-medium text-gray-900">
                          {entry.technicianName}
                        </td>
                      )}
                      <td className="py-3 text-gray-700">
                        {entry.customerName}
                      </td>
                      <td className="py-3 text-gray-700">
                        {new Date(entry.date).toLocaleDateString('nl-NL')}
                      </td>
                      <td className="py-3 text-gray-700">
                        {entry.hoursWorked}
                      </td>
                      {/* Hide overtime columns from technicians */}
                      {!isTechnician && (
                        <>
                          <td className="py-3 text-gray-700">
                            {entry.regularHours}
                          </td>
                          <td className="py-3 text-gray-700">
                            {entry.overtimeHours}
                          </td>
                          <td className="py-3 text-gray-700">
                            {entry.weekendHours}
                          </td>
                          <td className="py-3 text-gray-700">
                            {entry.sundayHours}
                          </td>
                        </>
                      )}
                      <td className="py-3 text-gray-700">
                        {entry.description || '-'}
                      </td>
                      <td className="py-3 text-gray-700">
                        <div className="text-sm">
                          {entry.travelExpenseToTechnician > 0 && (
                            <div>Naar: €{entry.travelExpenseToTechnician}</div>
                          )}
                          {entry.travelExpenseFromClient > 0 && (
                            <div>Van: €{entry.travelExpenseFromClient}</div>
                          )}
                          {entry.travelExpenseToTechnician === 0 && entry.travelExpenseFromClient === 0 && '-'}
                        </div>
                      </td>
                      {(isAdmin || (isTechnician && entry.technicianId === currentUser?.id)) && (
                        <td className="py-3">
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEditingEntry(entry)}
                              className="text-gray-600 hover:text-gray-800"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            {isAdmin && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {/* handleDeleteEntry logic */}}
                                className="text-red-600 hover:text-red-800"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                  {workEntries.length === 0 && (
                    <tr>
                      <td colSpan={isTechnician ? 6 : 10} className="py-8 text-center text-gray-500">
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

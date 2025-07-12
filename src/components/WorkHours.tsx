
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Calendar, Plus, Clock, Building, User, Edit, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, parseISO, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from 'date-fns';
import { nl } from 'date-fns/locale';

interface WorkHourEntry {
  id: string;
  technician_id: string | null;
  customer_id: string | null;
  date: string;
  hours_worked: number;
  description: string | null;
  created_at: string | null;
}

interface Customer {
  id: string;
  name: string;
}

interface UserProfile {
  id: string;
  username: string | null;
  full_name: string | null;
}

const WorkHours: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [workHours, setWorkHours] = useState<WorkHourEntry[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedWorkHour, setSelectedWorkHour] = useState<WorkHourEntry | null>(null);

  // Form state
  const [customerId, setCustomerId] = useState('');
  const [date, setDate] = useState(format(selectedDate, 'yyyy-MM-dd'));
  const [hoursWorked, setHoursWorked] = useState<number | ''>('');
  const [description, setDescription] = useState('');
  const [technicianId, setTechnicianId] = useState(user?.id || '');

  useEffect(() => {
    if (user) {
      setTechnicianId(user.id);
      fetchData();
    }
  }, [user, selectedDate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [workHoursData, customersData, usersData] = await Promise.all([
        fetchWorkHours(),
        fetchCustomers(),
        fetchUsers()
      ]);

      setWorkHours(workHoursData);
      setCustomers(customersData);
      setUsers(usersData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchWorkHours = async () => {
    let query = supabase
      .from('work_hours')
      .select('id, technician_id, customer_id, date, hours_worked, description, created_at')
      .order('date', { ascending: false });

    if (!isAdmin) {
      query = query.eq('technician_id', user?.id);
    }

    const startDate = startOfWeek(selectedDate, { weekStartsOn: 1 });
    const endDate = endOfWeek(selectedDate, { weekStartsOn: 1 });

    query = query.gte('date', format(startDate, 'yyyy-MM-dd'));
    query = query.lte('date', format(endDate, 'yyyy-MM-dd'));

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  };

  const fetchCustomers = async () => {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('name');

    if (error) throw error;
    return data || [];
  };

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('full_name');

    if (error) throw error;
    return data || [];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerId || !date || !hoursWorked || !description || !technicianId) {
      alert('Please fill in all fields.');
      return;
    }

    const newWorkHour = {
      technician_id: technicianId,
      customer_id: customerId,
      date: date,
      hours_worked: parseFloat(hoursWorked.toString()),
      description: description,
    };

    try {
      const { data, error } = await supabase
        .from('work_hours')
        .insert([newWorkHour])
        .select('id, technician_id, customer_id, date, hours_worked, description, created_at')
        .single();

      if (error) throw error;

      setWorkHours(prevHours => [...prevHours, data]);
      setIsCreateDialogOpen(false);
      clearForm();
      fetchData();
    } catch (error) {
      console.error('Error creating work hour entry:', error);
      alert('Failed to create work hour entry.');
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedWorkHour?.id) {
      alert('No work hour selected to update.');
      return;
    }

    if (!customerId || !date || !hoursWorked || !description) {
      alert('Please fill in all fields.');
      return;
    }

    const updatedWorkHour = {
      customer_id: customerId,
      date: date,
      hours_worked: parseFloat(hoursWorked.toString()),
      description: description,
    };

    try {
      const { data, error } = await supabase
        .from('work_hours')
        .update(updatedWorkHour)
        .eq('id', selectedWorkHour.id)
        .select('id, technician_id, customer_id, date, hours_worked, description, created_at')
        .single();

      if (error) throw error;

      setWorkHours(prevHours =>
        prevHours.map(hour => (hour.id === selectedWorkHour.id ? data : hour))
      );
      setIsEditDialogOpen(false);
      clearForm();
      fetchData();
    } catch (error) {
      console.error('Error updating work hour entry:', error);
      alert('Failed to update work hour entry.');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this entry?')) {
      try {
        const { error } = await supabase
          .from('work_hours')
          .delete()
          .eq('id', id);

        if (error) throw error;

        setWorkHours(prevHours => prevHours.filter(hour => hour.id !== id));
        fetchData();
      } catch (error) {
        console.error('Error deleting work hour entry:', error);
        alert('Failed to delete work hour entry.');
      }
    }
  };

  const clearForm = () => {
    setCustomerId('');
    setDate(format(selectedDate, 'yyyy-MM-dd'));
    setHoursWorked('');
    setDescription('');
    setSelectedWorkHour(null);
  };

  const handleEditClick = (workHour: WorkHourEntry) => {
    setSelectedWorkHour(workHour);
    setCustomerId(workHour.customer_id || '');
    setDate(workHour.date);
    setHoursWorked(workHour.hours_worked);
    setDescription(workHour.description || '');
    setIsEditDialogOpen(true);
  };

  const handleDateChange = (newDate: Date) => {
    setSelectedDate(newDate);
    setDate(format(newDate, 'yyyy-MM-dd'));
  };

  const getWeekInterval = (date: Date) => {
    const start = startOfWeek(date, { weekStartsOn: 1 });
    const end = endOfWeek(date, { weekStartsOn: 1 });
    return `${format(start, 'dd MMM', { locale: nl })} - ${format(end, 'dd MMM yyyy', { locale: nl })}`;
  };

  const weekDays = eachDayOfInterval({
    start: startOfWeek(selectedDate, { weekStartsOn: 1 }),
    end: endOfWeek(selectedDate, { weekStartsOn: 1 })
  });

  return (
    <div className="p-2 md:p-6 bg-gradient-to-br from-white via-gray-100 to-red-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <header className="mb-4 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-red-700 mb-1 md:mb-2 tracking-tight">
            {isAdmin ? "Werk Uren" : "Mijn Uren"}
          </h1>
          <p className="text-gray-600 text-sm md:text-base">
            {isAdmin ? "Beheer alle werkuren van technici." : "Registreer en bekijk je gewerkte uren."}
          </p>
        </header>

        <Card className="mb-4 shadow-lg border-2 border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">
                {getWeekInterval(selectedDate)}
              </h2>
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" onClick={() => handleDateChange(new Date(selectedDate.setDate(selectedDate.getDate() - 7)))}>
                  <Calendar className="h-4 w-4 mr-1" />
                  Vorige week
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleDateChange(new Date(selectedDate.setDate(selectedDate.getDate() + 7)))}>
                  Volgende week
                  <Calendar className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
              {weekDays.map(day => (
                <div key={day.toISOString()} className="text-center">
                  <div className="text-sm text-gray-600">{format(day, 'EEE', { locale: nl })}</div>
                  <div
                    className={`rounded-full h-8 w-8 flex items-center justify-center ${isSameDay(day, selectedDate) ? 'bg-red-600 text-white' : 'hover:bg-gray-100 text-gray-800'
                      } cursor-pointer`}
                    onClick={() => handleDateChange(day)}
                  >
                    {format(day, 'dd')}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="mb-4 flex justify-end">
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" /> Nieuwe Uren Registratie</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Nieuwe Uren Registratie</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Select onValueChange={setCustomerId} value={customerId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecteer een klant" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map(customer => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
                <div>
                  <Input
                    type="number"
                    placeholder="Aantal gewerkte uren"
                    value={hoursWorked}
                    onChange={(e) => setHoursWorked(parseFloat(e.target.value) || '')}
                  />
                </div>
                <div>
                  <Textarea
                    placeholder="Beschrijving van de werkzaamheden"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
                <div className="flex justify-end">
                  <Button type="submit">Opslaan</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {workHours.map(hour => (
              <Card key={hour.id} className="shadow-sm border border-gray-200">
                <CardContent className="p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-semibold">{customers.find(c => c.id === hour.customer_id)?.name || 'Onbekende klant'}</h3>
                      <p className="text-gray-600">{hour.description}</p>
                      <div className="flex items-center text-gray-500 mt-2">
                        <Clock className="h-4 w-4 mr-1" />
                        <span>{hour.hours_worked} uren</span>
                        <Calendar className="h-4 w-4 mx-1" />
                        <span>{format(parseISO(hour.date), 'dd-MM-yyyy')}</span>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      {isAdmin && (
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleEditClick(hour)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleDelete(hour.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Uren Registratie Bewerken</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <Select onValueChange={setCustomerId} value={customerId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecteer een klant" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map(customer => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div>
                <Input
                  type="number"
                  placeholder="Aantal gewerkte uren"
                  value={hoursWorked}
                  onChange={(e) => setHoursWorked(parseFloat(e.target.value) || '')}
                />
              </div>
              <div>
                <Textarea
                  placeholder="Beschrijving van de werkzaamheden"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div className="flex justify-end">
                <Button type="submit">Update</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default WorkHours;

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, TrendingUp, DollarSign, Clock, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { nl } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

interface TechnicianAnalytics {
  id: string;
  name: string;
  totalHours: number;
  regularHours: number;
  overtimeHours: number;
  weekendHours: number;
  sundayHours: number;
  totalProfit: number;
  totalRevenue: number;
  totalCosts: number;
  dailyStats: DailyStats[];
}

interface DailyStats {
  date: string;
  hours: number;
  profit: number;
  revenue: number;
  costs: number;
  isWeekend: boolean;
  isSunday: boolean;
}

const Analytics: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<TechnicianAnalytics[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month'>('week');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (isAdmin) {
      fetchAnalytics();
    }
  }, [selectedPeriod, selectedDate]);

  const getDateRange = () => {
    if (selectedPeriod === 'week') {
      return {
        start: startOfWeek(selectedDate, { weekStartsOn: 1 }),
        end: endOfWeek(selectedDate, { weekStartsOn: 1 })
      };
    } else {
      return {
        start: startOfMonth(selectedDate),
        end: endOfMonth(selectedDate)
      };
    }
  };

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const { start, end } = getDateRange();
      const startStr = format(start, 'yyyy-MM-dd');
      const endStr = format(end, 'yyyy-MM-dd');

      // Fetch work hours with profiles
      const { data: workHours } = await supabase
        .from('work_hours')
        .select(`
          *,
          profiles!work_hours_technician_id_fkey(id, full_name)
        `)
        .gte('date', startStr)
        .lte('date', endStr)
        .order('date');

      // Fetch technician rates separately
      const { data: technicianRates } = await supabase
        .from('technician_rates')
        .select('*');


      const technicianMap = new Map<string, TechnicianAnalytics>();

      // Process work hours
      workHours?.forEach(hour => {
        const techId = hour.technician_id;
        const techName = hour.profiles?.full_name || 'Unknown';
        
        if (!technicianMap.has(techId)) {
          technicianMap.set(techId, {
            id: techId,
            name: techName,
            totalHours: 0,
            regularHours: 0,
            overtimeHours: 0,
            weekendHours: 0,
            sundayHours: 0,
            totalProfit: 0,
            totalRevenue: 0,
            totalCosts: 0,
            dailyStats: []
          });
        }

        const tech = technicianMap.get(techId)!;
        const date = new Date(hour.date);
        const isWeekend = date.getDay() === 6; // Saturday
        const isSunday = date.getDay() === 0; // Sunday
        
        // Use only manually registered hours for cost and revenue calculations
        const hoursToUse = hour.hours_worked;
        
        // Calculate rates
        const rates = technicianRates?.find(r => r.technician_id === techId);
        const hourlyRate = rates?.hourly_rate || 25;
        const billableRate = rates?.billable_rate || 45;
        const saturdayRate = rates?.saturday_rate || hourlyRate * 1.25;
        const sundayRate = rates?.sunday_rate || hourlyRate * 1.5;
        
        let costPerHour = hourlyRate;
        let revenuePerHour = billableRate;
        
        if (isSunday) {
          costPerHour = sundayRate;
          revenuePerHour = billableRate * 1.5;
        } else if (isWeekend) {
          costPerHour = saturdayRate;
          revenuePerHour = billableRate * 1.25;
        }
        
        const costs = hoursToUse * costPerHour + (hour.travel_expense_to_technician || 0);
        const revenue = hoursToUse * revenuePerHour + (hour.travel_expense_from_client || 0);
        const profit = revenue - costs;

        // Update totals
        tech.totalHours += hoursToUse;
        if (isSunday) {
          tech.sundayHours += hoursToUse;
        } else if (isWeekend) {
          tech.weekendHours += hoursToUse;
        } else if (hoursToUse > 8) {
          tech.regularHours += 8;
          tech.overtimeHours += hoursToUse - 8;
        } else {
          tech.regularHours += hoursToUse;
        }
        
        tech.totalCosts += costs;
        tech.totalRevenue += revenue;
        tech.totalProfit += profit;

        // Add daily stats
        tech.dailyStats.push({
          date: hour.date,
          hours: hoursToUse,
          profit,
          revenue,
          costs,
          isWeekend,
          isSunday
        });
      });

      setAnalytics(Array.from(technicianMap.values()));
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast({
        title: 'Fout',
        description: 'Kon analytics niet laden',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Geen toegang</h1>
          <p className="text-gray-600 mt-2">Alleen admins hebben toegang tot analytics.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
        </div>
      </div>
    );
  }

  const totalProfit = analytics.reduce((sum, tech) => sum + tech.totalProfit, 0);
  const totalRevenue = analytics.reduce((sum, tech) => sum + tech.totalRevenue, 0);
  const totalCosts = analytics.reduce((sum, tech) => sum + tech.totalCosts, 0);
  const totalHours = analytics.reduce((sum, tech) => sum + tech.totalHours, 0);

  const colors = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6'];

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
          
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex gap-2">
              <Button
                variant={selectedPeriod === 'week' ? 'default' : 'outline'}
                onClick={() => setSelectedPeriod('week')}
                className={selectedPeriod === 'week' ? 'bg-red-600 hover:bg-red-700' : ''}
              >
                Week
              </Button>
              <Button
                variant={selectedPeriod === 'month' ? 'default' : 'outline'}
                onClick={() => setSelectedPeriod('month')}
                className={selectedPeriod === 'month' ? 'bg-red-600 hover:bg-red-700' : ''}
              >
                Maand
              </Button>
            </div>
            
            <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(selectedDate, selectedPeriod === 'week' ? "'Week van' d MMMM yyyy" : "MMMM yyyy", { locale: nl })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => {
                    if (date) {
                      setSelectedDate(date);
                      setDatePickerOpen(false);
                    }
                  }}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Totale Winst</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">€{totalProfit.toFixed(2)}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Totale Omzet</CardTitle>
              <DollarSign className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">€{totalRevenue.toFixed(2)}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Totale Kosten</CardTitle>
              <DollarSign className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">€{totalCosts.toFixed(2)}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Totale Uren</CardTitle>
              <Clock className="h-4 w-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-600">{totalHours.toFixed(1)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Profit per Technician */}
          <Card>
            <CardHeader>
              <CardTitle>Winst per Monteur</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analytics}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Bar dataKey="totalProfit" fill="#ef4444" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Hours Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Urenverdeling</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={analytics}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="totalHours"
                    label={({ name, value }) => `${name}: ${value.toFixed(1)}h`}
                  >
                    {analytics.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Analytics per Technician */}
        <div className="space-y-6">
          {analytics.map((tech, index) => (
            <Card key={tech.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  {tech.name} - Gedetailleerde Analytics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                  <div className="text-center">
                    <div className="text-sm text-gray-500">Totale Uren</div>
                    <div className="text-lg font-bold">{tech.totalHours.toFixed(1)}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-gray-500">Weekdag Uren</div>
                    <div className="text-lg font-bold">{tech.regularHours.toFixed(1)}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-gray-500">Overwerk</div>
                    <div className="text-lg font-bold text-orange-600">{tech.overtimeHours.toFixed(1)}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-gray-500">Zaterdag</div>
                    <div className="text-lg font-bold text-blue-600">{tech.weekendHours.toFixed(1)}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-gray-500">Zondag</div>
                    <div className="text-lg font-bold text-purple-600">{tech.sundayHours.toFixed(1)}</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-sm text-gray-500">Winst</div>
                    <div className="text-xl font-bold text-green-600">€{tech.totalProfit.toFixed(2)}</div>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-sm text-gray-500">Omzet</div>
                    <div className="text-xl font-bold text-blue-600">€{tech.totalRevenue.toFixed(2)}</div>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <div className="text-sm text-gray-500">Kosten</div>
                    <div className="text-xl font-bold text-red-600">€{tech.totalCosts.toFixed(2)}</div>
                  </div>
                </div>

                {/* Daily profit chart */}
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={tech.dailyStats}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Line type="monotone" dataKey="profit" stroke={colors[index % colors.length]} strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Analytics;

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { WorkEntry } from '@/types/workHours';

// Mock data
const mockWorkEntries: WorkEntry[] = [
  {
    id: '1',
    technicianId: '2',
    technicianName: 'Jan de Vries',
    date: '2024-06-15',
    hoursWorked: 8,
    isManualEntry: false,
    description: 'Installation at Amsterdam office',
    createdAt: '2024-06-15T08:00:00Z',
    createdBy: '2'
  },
  {
    id: '2',
    technicianId: '3',
    technicianName: 'Pieter Jansen',
    date: '2024-06-14',
    hoursWorked: 7.5,
    isManualEntry: true,
    description: 'Maintenance work Rotterdam',
    createdAt: '2024-06-14T09:30:00Z',
    createdBy: '1'
  },
  {
    id: '3',
    technicianId: '2',
    technicianName: 'Jan de Vries',
    date: '2024-06-13',
    hoursWorked: 9,
    isManualEntry: false,
    description: 'Emergency repair Utrecht',
    createdAt: '2024-06-13T07:45:00Z',
    createdBy: '2'
  }
];

const WorkHours = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEntry, setNewEntry] = useState({
    technicianId: user?.role === 'technician' ? user.id : '',
    date: '',
    hoursWorked: '',
    description: ''
  });

  const isAdmin = user?.role === 'admin';
  const filteredEntries = isAdmin 
    ? mockWorkEntries 
    : mockWorkEntries.filter(entry => entry.technicianId === user?.id);

  const handleAddEntry = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newEntry.technicianId || !newEntry.date || !newEntry.hoursWorked) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    const hours = parseFloat(newEntry.hoursWorked);
    if (hours <= 0 || hours > 24) {
      toast({
        title: "Error",
        description: "Hours must be between 0 and 24",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Success",
      description: "Work entry added successfully"
    });

    setNewEntry({
      technicianId: user?.role === 'technician' ? user.id : '',
      date: '',
      hoursWorked: '',
      description: ''
    });
    setShowAddForm(false);
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {isAdmin ? 'Work Hours Management' : 'My Work Hours'}
            </h1>
            <p className="text-gray-600">
              {isAdmin ? 'Manage and track all technician work hours' : 'View and manage your work hours'}
            </p>
          </div>
          <Button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {showAddForm ? 'Cancel' : 'Add Hours'}
          </Button>
        </div>

        {/* Add Entry Form */}
        {showAddForm && (
          <Card className="bg-white mb-6">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900">Add Work Hours</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddEntry} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {isAdmin && (
                  <div className="space-y-2">
                    <Label htmlFor="technician">Technician</Label>
                    <select
                      id="technician"
                      value={newEntry.technicianId}
                      onChange={(e) => setNewEntry({ ...newEntry, technicianId: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      required
                    >
                      <option value="">Select Technician</option>
                      <option value="2">Jan de Vries</option>
                      <option value="3">Pieter Jansen</option>
                    </select>
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
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
                  <Label htmlFor="hours">Hours Worked</Label>
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
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    value={newEntry.description}
                    onChange={(e) => setNewEntry({ ...newEntry, description: e.target.value })}
                    placeholder="Brief description of work performed"
                    className="focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <Button type="submit" className="bg-red-600 hover:bg-red-700 text-white">
                    Add Entry
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
              Work Hour Entries ({filteredEntries.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredEntries.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No work entries found
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-200">
                      {isAdmin && <th className="pb-3 text-sm font-medium text-gray-600">Technician</th>}
                      <th className="pb-3 text-sm font-medium text-gray-600">Date</th>
                      <th className="pb-3 text-sm font-medium text-gray-600">Hours</th>
                      <th className="pb-3 text-sm font-medium text-gray-600">Type</th>
                      <th className="pb-3 text-sm font-medium text-gray-600">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEntries.map((entry) => (
                      <tr key={entry.id} className="border-b border-gray-100 hover:bg-gray-50">
                        {isAdmin && (
                          <td className="py-3 font-medium text-gray-900">{entry.technicianName}</td>
                        )}
                        <td className="py-3 text-gray-700">
                          {new Date(entry.date).toLocaleDateString()}
                        </td>
                        <td className="py-3 text-gray-700 font-medium">{entry.hoursWorked}h</td>
                        <td className="py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            entry.isManualEntry
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {entry.isManualEntry ? 'Manual' : 'Registered'}
                          </span>
                        </td>
                        <td className="py-3 text-gray-700 max-w-xs truncate">
                          {entry.description || 'No description'}
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

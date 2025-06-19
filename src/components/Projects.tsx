
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Project } from '@/types/projects';
import { formatDutchDate } from '@/utils/overtimeCalculations';
import { Trash2, Edit2, Save, X, Eye, Clock, CheckCircle, AlertCircle } from 'lucide-react';

const Projects = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [newProject, setNewProject] = useState({
    technicianId: user?.role === 'technician' ? user.id : '',
    customerId: '',
    date: new Date().toISOString().split('T')[0],
    title: '',
    description: '',
    hoursSpent: '',
    status: 'in-progress' as 'in-progress' | 'completed' | 'needs-review'
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

      // Fetch projects with related data
      let query = supabase
        .from('projects')
        .select(`
          *,
          profiles!projects_technician_id_fkey(full_name),
          customers!projects_customer_id_fkey(name)
        `)
        .order('date', { ascending: false });

      if (!isAdmin && user?.id) {
        query = query.eq('technician_id', user.id);
      }

      const { data: projectsData, error: projectsError } = await query;

      if (projectsError) throw projectsError;

      const formattedProjects: Project[] = (projectsData || []).map(project => ({
        id: project.id,
        technicianId: project.technician_id,
        technicianName: project.profiles?.full_name || 'Unknown',
        customerId: project.customer_id,
        customerName: project.customers?.name || 'Unknown',
        date: project.date,
        title: project.title,
        description: project.description || '',
        images: project.images || [],
        hoursSpent: Number(project.hours_spent),
        status: project.status,
        createdAt: project.created_at,
        updatedAt: project.updated_at
      }));

      setProjects(formattedProjects);
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

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newProject.technicianId || !newProject.customerId || !newProject.date || !newProject.title || !newProject.hoursSpent) {
      toast({
        title: "Fout",
        description: "Vul alle verplichte velden in",
        variant: "destructive"
      });
      return;
    }

    const hours = parseFloat(newProject.hoursSpent);
    if (hours <= 0 || hours > 24) {
      toast({
        title: "Fout",
        description: "Uren moeten tussen 0 en 24 liggen",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('projects')
        .insert({
          technician_id: newProject.technicianId,
          customer_id: newProject.customerId,
          date: newProject.date,
          title: newProject.title,
          description: newProject.description,
          hours_spent: hours,
          status: newProject.status,
          images: []
        });

      if (error) throw error;

      toast({
        title: "Succes",
        description: "Project succesvol toegevoegd"
      });

      setNewProject({
        technicianId: user?.role === 'technician' ? user.id : '',
        customerId: '',
        date: new Date().toISOString().split('T')[0],
        title: '',
        description: '',
        hoursSpent: '',
        status: 'in-progress'
      });
      setShowAddForm(false);
      fetchData();
    } catch (error) {
      console.error('Error adding project:', error);
      toast({
        title: "Fout",
        description: "Kon project niet toevoegen",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (project: Project) => {
    if (!isAdmin && project.technicianId !== user?.id) {
      toast({
        title: "Fout",
        description: "Je kunt alleen je eigen projecten bewerken",
        variant: "destructive"
      });
      return;
    }
    setEditingProject(project);
  };

  const handleSaveEdit = async () => {
    if (!editingProject) return;

    const hours = editingProject.hoursSpent;
    if (hours <= 0 || hours > 24) {
      toast({
        title: "Fout",
        description: "Uren moeten tussen 0 en 24 liggen",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('projects')
        .update({
          title: editingProject.title,
          description: editingProject.description,
          hours_spent: hours,
          status: editingProject.status,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingProject.id);

      if (error) throw error;

      setEditingProject(null);
      toast({
        title: "Succes",
        description: "Project succesvol bijgewerkt"
      });
      fetchData();
    } catch (error) {
      console.error('Error updating project:', error);
      toast({
        title: "Fout",
        description: "Kon project niet bijwerken",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (projectId: string, project: Project) => {
    if (!isAdmin && project.technicianId !== user?.id) {
      toast({
        title: "Fout",
        description: "Je kunt alleen je eigen projecten verwijderen",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);

      if (error) throw error;

      toast({
        title: "Succes",
        description: "Project succesvol verwijderd"
      });
      fetchData();
    } catch (error) {
      console.error('Error deleting project:', error);
      toast({
        title: "Fout",
        description: "Kon project niet verwijderen",
        variant: "destructive"
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'needs-review':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      default:
        return <Clock className="h-4 w-4 text-blue-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'needs-review':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Voltooid';
      case 'needs-review':
        return 'Controle Nodig';
      default:
        return 'In Uitvoering';
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
              {isAdmin ? 'Projecten Beheer' : 'Mijn Projecten'}
            </h1>
            <p className="text-gray-600">
              {isAdmin ? 'Beheer en volg alle projecten' : 'Bekijk en beheer jouw projecten'}
            </p>
          </div>
          <Button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {showAddForm ? 'Annuleren' : 'Project Toevoegen'}
          </Button>
        </div>

        {/* Add Project Form */}
        {showAddForm && (
          <Card className="bg-white mb-6">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900">Project Toevoegen</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddProject} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {isAdmin && (
                  <div className="space-y-2">
                    <Label htmlFor="technician">Monteur</Label>
                    <select
                      id="technician"
                      value={newProject.technicianId}
                      onChange={(e) => setNewProject({ ...newProject, technicianId: e.target.value })}
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
                    value={newProject.customerId}
                    onChange={(e) => setNewProject({ ...newProject, customerId: e.target.value })}
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
                    value={newProject.date}
                    onChange={(e) => setNewProject({ ...newProject, date: e.target.value })}
                    required
                    className="focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hours">Bestede Uren</Label>
                  <Input
                    id="hours"
                    type="number"
                    step="0.5"
                    min="0.5"
                    max="24"
                    value={newProject.hoursSpent}
                    onChange={(e) => setNewProject({ ...newProject, hoursSpent: e.target.value })}
                    placeholder="8.0"
                    required
                    className="focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="title">Project Titel</Label>
                  <Input
                    id="title"
                    value={newProject.title}
                    onChange={(e) => setNewProject({ ...newProject, title: e.target.value })}
                    placeholder="Korte beschrijving van het project"
                    required
                    className="focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <select
                    id="status"
                    value={newProject.status}
                    onChange={(e) => setNewProject({ ...newProject, status: e.target.value as any })}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    required
                  >
                    <option value="in-progress">In Uitvoering</option>
                    <option value="completed">Voltooid</option>
                    <option value="needs-review">Controle Nodig</option>
                  </select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="description">Uitgebreide Beschrijving</Label>
                  <Textarea
                    id="description"
                    value={newProject.description}
                    onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                    placeholder="Uitgebreide beschrijving van uitgevoerde werkzaamheden"
                    className="focus:ring-red-500 focus:border-red-500"
                    rows={4}
                  />
                </div>
                <div className="md:col-span-2">
                  <Button type="submit" className="bg-red-600 hover:bg-red-700 text-white">
                    Project Toevoegen
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Projects Table */}
        <Card className="bg-white">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">
              Projecten ({projects.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {projects.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Geen projecten gevonden
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-200">
                      {isAdmin && <th className="pb-3 text-sm font-medium text-gray-600">Monteur</th>}
                      <th className="pb-3 text-sm font-medium text-gray-600">Klant</th>
                      <th className="pb-3 text-sm font-medium text-gray-600">Datum</th>
                      <th className="pb-3 text-sm font-medium text-gray-600">Titel</th>
                      <th className="pb-3 text-sm font-medium text-gray-600">Uren</th>
                      <th className="pb-3 text-sm font-medium text-gray-600">Status</th>
                      <th className="pb-3 text-sm font-medium text-gray-600">Acties</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projects.map((project) => (
                      <tr key={project.id} className="border-b border-gray-100 hover:bg-gray-50">
                        {isAdmin && (
                          <td className="py-3 font-medium text-gray-900">{project.technicianName}</td>
                        )}
                        <td className="py-3 text-gray-700">{project.customerName}</td>
                        <td className="py-3 text-gray-700">
                          {editingProject?.id === project.id ? (
                            <Input
                              type="date"
                              value={editingProject.date}
                              onChange={(e) => setEditingProject({...editingProject, date: e.target.value})}
                              className="w-32"
                            />
                          ) : (
                            formatDutchDate(project.date)
                          )}
                        </td>
                        <td className="py-3 text-gray-700 font-medium max-w-xs">
                          {editingProject?.id === project.id ? (
                            <Input
                              value={editingProject.title}
                              onChange={(e) => setEditingProject({...editingProject, title: e.target.value})}
                              className="w-48"
                            />
                          ) : (
                            <div>
                              <div className="truncate">{project.title}</div>
                              {project.description && (
                                <div className="text-xs text-gray-500 truncate">{project.description}</div>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="py-3 text-gray-700 font-medium">
                          {editingProject?.id === project.id ? (
                            <Input
                              type="number"
                              step="0.5"
                              min="0.5"
                              max="24"
                              value={editingProject.hoursSpent}
                              onChange={(e) => setEditingProject({...editingProject, hoursSpent: parseFloat(e.target.value)})}
                              className="w-20"
                            />
                          ) : (
                            `${project.hoursSpent}u`
                          )}
                        </td>
                        <td className="py-3">
                          {editingProject?.id === project.id ? (
                            <select
                              value={editingProject.status}
                              onChange={(e) => setEditingProject({...editingProject, status: e.target.value as any})}
                              className="w-32 p-1 border border-gray-300 rounded text-sm"
                            >
                              <option value="in-progress">In Uitvoering</option>
                              <option value="completed">Voltooid</option>
                              <option value="needs-review">Controle Nodig</option>
                            </select>
                          ) : (
                            <div className="flex items-center space-x-2">
                              {getStatusIcon(project.status)}
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                                {getStatusText(project.status)}
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="py-3">
                          <div className="flex space-x-2">
                            {editingProject?.id === project.id ? (
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
                                  onClick={() => setEditingProject(null)}
                                  className="h-8 w-8 p-0"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </>
                            ) : (
                              <>
                                {(isAdmin || project.technicianId === user?.id) && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleEdit(project)}
                                    className="h-8 w-8 p-0"
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </Button>
                                )}
                                {(isAdmin || project.technicianId === user?.id) && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleDelete(project.id, project)}
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

export default Projects;

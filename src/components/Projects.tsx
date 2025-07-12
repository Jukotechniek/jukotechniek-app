import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Trash2, Edit2, Save, X, Plus, Eye, Upload, Calendar, Clock, User, Building2 } from 'lucide-react';
import { uploadProjectImages } from '@/utils/uploadProjectImages';

interface Project {
  id: string;
  title: string;
  description: string | null;
  date: string;
  hours_spent: number;
  status: string;
  technician_id: string | null;
  customer_id: string | null;
  images: string[] | null;
  created_at: string;
  updated_at: string;
  technician?: { full_name: string };
  customers?: { name: string };
}

interface Customer {
  id: string;
  name: string;
}

interface Technician {
  id: string;
  full_name: string;
}

const Projects = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);

  const isAdmin = user?.role === 'admin';

  const [newProject, setNewProject] = useState({
    title: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    hours_spent: '',
    status: 'in-progress',
    technician_id: user?.role === 'technician' ? user.id : '',
    customer_id: ''
  });

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

      let query = supabase
        .from('projects')
        .select(`
          *,
          technician:profiles!projects_technician_id_fkey(full_name),
          customers(name)
        `)
        .order('created_at', { ascending: false });

      if (!isAdmin) {
        query = query.eq('technician_id', user?.id);
      }

      const { data: projectData, error: projError } = await query;
      if (projError) throw projError;

      setCustomers(customerData || []);
      setTechnicians(technicianData || []);
      setProjects(projectData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Fout',
        description: 'Er is een fout opgetreden bij het ophalen van gegevens',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newProject.title || !newProject.date || !newProject.hours_spent || !newProject.customer_id) {
      toast({
        title: 'Fout',
        description: 'Vul alle verplichte velden in',
        variant: 'destructive'
      });
      return;
    }

    const hours = parseFloat(newProject.hours_spent);
    if (hours <= 0) {
      toast({
        title: 'Fout',
        description: 'Uren moeten groter zijn dan 0',
        variant: 'destructive'
      });
      return;
    }

    try {
      let imageUrls: string[] = [];
      if (selectedImages.length > 0) {
        imageUrls = await uploadProjectImages(selectedImages);
      }

      const { data, error } = await supabase
        .from('projects')
        .insert([
          {
            title: newProject.title,
            description: newProject.description,
            date: newProject.date,
            hours_spent: hours,
            status: newProject.status,
            technician_id: newProject.technician_id,
            customer_id: newProject.customer_id,
            images: imageUrls.length > 0 ? imageUrls : null
          }
        ])
        .select(`
          *,
          technician:profiles!projects_technician_id_fkey(full_name),
          customers(name)
        `)
        .single();

      if (error) throw error;

      if (data) {
        setProjects(prev => [data, ...prev]);
        toast({
          title: 'Succes',
          description: 'Project succesvol toegevoegd'
        });
        setNewProject({
          title: '',
          description: '',
          date: new Date().toISOString().split('T')[0],
          hours_spent: '',
          status: 'in-progress',
          technician_id: user?.role === 'technician' ? user.id : '',
          customer_id: ''
        });
        setSelectedImages([]);
        setShowAddForm(false);
      }
    } catch (error) {
      console.error('Error adding project:', error);
      toast({
        title: 'Fout',
        description: 'Er is een fout opgetreden bij het toevoegen van het project',
        variant: 'destructive'
      });
    }
  };

  const handleEdit = (project: Project) => {
    if (!isAdmin && project.technician_id !== user?.id) {
      toast({
        title: 'Fout',
        description: 'Je kunt alleen je eigen projecten bewerken',
        variant: 'destructive'
      });
      return;
    }
    setEditingProject(project);
  };

  const handleSaveEdit = async () => {
    if (!editingProject) return;

    try {
      const { error } = await supabase
        .from('projects')
        .update({
          title: editingProject.title,
          description: editingProject.description,
          date: editingProject.date,
          hours_spent: editingProject.hours_spent,
          status: editingProject.status
        })
        .eq('id', editingProject.id);

      if (error) throw error;

      setProjects(prev =>
        prev.map(p => p.id === editingProject.id ? editingProject : p)
      );
      setEditingProject(null);
      toast({
        title: 'Succes',
        description: 'Project succesvol bijgewerkt'
      });
    } catch (error) {
      console.error('Error updating project:', error);
      toast({
        title: 'Fout',
        description: 'Er is een fout opgetreden bij het bijwerken van het project',
        variant: 'destructive'
      });
    }
  };

  const handleDelete = async (projectId: string, project: Project) => {
    if (!isAdmin && project.technician_id !== user?.id) {
      toast({
        title: 'Fout',
        description: 'Je kunt alleen je eigen projecten verwijderen',
        variant: 'destructive'
      });
      return;
    }

    try {
      const { error } = await supabase.from('projects').delete().eq('id', projectId);
      if (error) throw error;

      setProjects(prev => prev.filter(p => p.id !== projectId));
      toast({
        title: 'Succes',
        description: 'Project succesvol verwijderd'
      });
    } catch (error) {
      console.error('Error deleting project:', error);
      toast({
        title: 'Fout',
        description: 'Er is een fout opgetreden bij het verwijderen van het project',
        variant: 'destructive'
      });
    }
  };

  if (loading) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-red-700 mb-2">
              {isAdmin ? 'Project Beheer' : 'Mijn Projecten'}
            </h1>
            <p className="text-gray-600">
              {isAdmin ? 'Beheer en volg alle projecten' : 'Bekijk en beheer jouw projecten'}
            </p>
          </div>
          <Button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            {showAddForm ? 'Annuleren' : 'Project Toevoegen'}
          </Button>
        </div>

        {showAddForm && (
          <Card className="bg-white mb-6">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900">Nieuw Project</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Titel *</Label>
                    <Input
                      id="title"
                      value={newProject.title}
                      onChange={(e) => setNewProject({ ...newProject, title: e.target.value })}
                      required
                      className="focus:ring-red-500 focus:border-red-500"
                    />
                  </div>
                  {isAdmin && (
                    <div className="space-y-2">
                      <Label htmlFor="technician">Monteur *</Label>
                      <Select
                        value={newProject.technician_id}
                        onValueChange={(value) => setNewProject({ ...newProject, technician_id: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecteer monteur" />
                        </SelectTrigger>
                        <SelectContent>
                          {technicians.map(tech => (
                            <SelectItem key={tech.id} value={tech.id}>
                              {tech.full_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="customer">Klant *</Label>
                    <Select
                      value={newProject.customer_id}
                      onValueChange={(value) => setNewProject({ ...newProject, customer_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecteer klant" />
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
                  <div className="space-y-2">
                    <Label htmlFor="date">Datum *</Label>
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
                    <Label htmlFor="hours">Bestede Uren *</Label>
                    <Input
                      id="hours"
                      type="number"
                      step="0.5"
                      min="0.5"
                      value={newProject.hours_spent}
                      onChange={(e) => setNewProject({ ...newProject, hours_spent: e.target.value })}
                      required
                      className="focus:ring-red-500 focus:border-red-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={newProject.status}
                      onValueChange={(value) => setNewProject({ ...newProject, status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="in-progress">In Uitvoering</SelectItem>
                        <SelectItem value="completed">Afgerond</SelectItem>
                        <SelectItem value="on-hold">On Hold</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Beschrijving</Label>
                  <Textarea
                    id="description"
                    value={newProject.description}
                    onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                    placeholder="Beschrijf het project..."
                    className="focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="images">Afbeeldingen</Label>
                  <Input
                    id="images"
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => setSelectedImages(Array.from(e.target.files || []))}
                    className="focus:ring-red-500 focus:border-red-500"
                  />
                  {selectedImages.length > 0 && (
                    <p className="text-sm text-gray-600">
                      {selectedImages.length} bestand(en) geselecteerd
                    </p>
                  )}
                </div>
                <Button type="submit" className="bg-red-600 hover:bg-red-700 text-white">
                  Project Toevoegen
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <Card key={project.id} className="bg-white hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    {editingProject?.id === project.id ? (
                      <Input
                        value={editingProject.title}
                        onChange={(e) => setEditingProject({ ...editingProject, title: e.target.value })}
                        className="font-semibold text-lg mb-2"
                      />
                    ) : (
                      <CardTitle className="text-lg font-semibold text-gray-900 mb-2">
                        {project.title}
                      </CardTitle>
                    )}
                    <div className="flex items-center text-sm text-gray-600 mb-1">
                      <Building2 className="h-4 w-4 mr-1" />
                      {project.customers?.name || 'Geen klant'}
                    </div>
                    {isAdmin && (
                      <div className="flex items-center text-sm text-gray-600 mb-1">
                        <User className="h-4 w-4 mr-1" />
                        {project.technician?.full_name || 'Geen monteur'}
                      </div>
                    )}
                    <div className="flex items-center text-sm text-gray-600 mb-1">
                      <Calendar className="h-4 w-4 mr-1" />
                      {new Date(project.date).toLocaleDateString('nl-NL')}
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <Clock className="h-4 w-4 mr-1" />
                      {project.hours_spent} uur
                    </div>
                  </div>
                  <div className="flex space-x-1">
                    {editingProject?.id === project.id ? (
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
                          onClick={() => setEditingProject(null)}
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
                          onClick={() => handleEdit(project)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(project.id, project)}
                          className="h-8 w-8 p-0 border-red-300 text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {editingProject?.id === project.id ? (
                  <div className="space-y-3">
                    <Textarea
                      value={editingProject.description || ''}
                      onChange={(e) => setEditingProject({ ...editingProject, description: e.target.value })}
                      placeholder="Beschrijving..."
                      className="min-h-[60px]"
                    />
                    <Input
                      type="date"
                      value={editingProject.date}
                      onChange={(e) => setEditingProject({ ...editingProject, date: e.target.value })}
                    />
                    <Input
                      type="number"
                      step="0.5"
                      min="0.5"
                      value={editingProject.hours_spent}
                      onChange={(e) => setEditingProject({ ...editingProject, hours_spent: parseFloat(e.target.value) })}
                    />
                    <Select
                      value={editingProject.status}
                      onValueChange={(value) => setEditingProject({ ...editingProject, status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="in-progress">In Uitvoering</SelectItem>
                        <SelectItem value="completed">Afgerond</SelectItem>
                        <SelectItem value="on-hold">On Hold</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <>
                    {project.description && (
                      <p className="text-gray-700 text-sm mb-3 line-clamp-3">
                        {project.description}
                      </p>
                    )}
                    <div className="flex justify-between items-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        project.status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : project.status === 'in-progress'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {project.status === 'completed' ? 'Afgerond' : 
                         project.status === 'in-progress' ? 'In Uitvoering' : 'On Hold'}
                      </span>
                      {project.images && project.images.length > 0 && (
                        <div className="flex items-center text-sm text-gray-500">
                          <Eye className="h-4 w-4 mr-1" />
                          {project.images.length} foto's
                        </div>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {projects.length === 0 && (
          <Card className="bg-white">
            <CardContent className="p-8 text-center">
              <div className="text-gray-500 mb-4">
                <Calendar className="h-12 w-12 mx-auto mb-2" />
                <h3 className="text-lg font-semibold">Geen projecten gevonden</h3>
                <p>Er zijn nog geen projecten toegevoegd.</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Projects;

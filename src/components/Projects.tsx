
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Project } from '@/types/projects';
import { supabase } from '@/integrations/supabase/client';
import { Camera, X, Plus, Trash2, Edit2, Save, CheckCircle, AlertCircle, Clock, ChevronDown } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface Customer { id: string; name: string; }

const Projects = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [newProject, setNewProject] = useState({
    title: '',
    description: '',
    hoursSpent: '',
    customerId: '',
    date: new Date().toISOString().split('T')[0],
    status: 'in-progress' as Project['status']
  });
  const [selectedTech, setSelectedTech] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [collapsed, setCollapsed] = useState<Record<Project['status'], boolean>>({
    'in-progress': false,
    'needs-review': false,
    'completed': false
  });

  const fetchData = async () => {
  setLoading(true);
  try {
    const { data: customerData } = await supabase
      .from('customers')
      .select('*')
      .order('name');
    const { data: projectData } = await supabase
      .from('projects')
      .select('*, customers(name), profiles(full_name)')
      .order('date', { ascending: false });
    setCustomers(customerData || []);
    const formatted = (projectData || []).map(p => ({
      id: p.id,
      technicianId: p.technician_id || '',
      technicianName: p.profiles?.full_name || '',
      customerId: p.customer_id || '',
      customerName: p.customers?.name || '',
      date: p.date,
      title: p.title,
      description: p.description || '',
      images: p.images || [],
      hoursSpent: p.hours_spent,
      status: p.status as Project['status'],
      createdAt: p.created_at || ''
    }));
    setProjects(formatted);
  } catch (err) {
    console.error('Error fetching projects:', err);
  } finally {
    setLoading(false);
  }
};


  useEffect(() => {
    fetchData();
  }, []);

  const isAdmin = user?.role === 'admin' || user?.role === 'opdrachtgever';

  const technicians = Array.from(
    new Map(projects.map(p => [p.technicianId, p.technicianName])).entries()
  ).map(([id, name]) => ({ id, name }));

  const filteredProjects = projects.filter(p => {
    if (!isAdmin && p.technicianId !== user?.id) return false;
    if (isAdmin && selectedTech !== 'all' && p.technicianId !== selectedTech)
      return false;
    if (selectedMonth) {
      const [y, m] = selectedMonth.split('-').map(n => parseInt(n, 10));
      const d = new Date(p.date);
      if (d.getFullYear() !== y || d.getMonth() + 1 !== m) return false;
    }
    return true;
  });

  const projectsByStatus: Record<Project['status'], Project[]> = {
    'in-progress': [],
    'needs-review': [],
    'completed': []
  };
  filteredProjects.forEach(p => {
    projectsByStatus[p.status].push(p);
  });

  if (loading) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
        </div>


      </div>
    );
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newImages = Array.from(files).slice(0, 5 - selectedImages.length);
      setSelectedImages(prev => [...prev, ...newImages]);
    }
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newProject.title || !newProject.date || !newProject.hoursSpent || !newProject.customerId) {
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

    const selectedCustomer = customers.find(c => c.id === newProject.customerId);
    
    if (editingProject) {
      const { error } = await supabase
        .from('projects')
        .update({
          title: newProject.title,
          description: newProject.description,
          date: newProject.date,
          hours_spent: hours,
          status: newProject.status,
          customer_id: newProject.customerId
        })
        .eq('id', editingProject.id);
      if (error) {
        toast({ title: 'Fout', description: error.message, variant: 'destructive' });
        return;
      }
      toast({ title: 'Succes', description: 'Project succesvol bijgewerkt' });
    } else {
      const { error } = await supabase.from('projects').insert([
        {
          technician_id: user?.id,
          customer_id: newProject.customerId,
          title: newProject.title,
          description: newProject.description,
          date: newProject.date,
          hours_spent: hours,
          status: newProject.status,
          images: []
        }
      ]);
      if (error) {
        toast({ title: 'Fout', description: error.message, variant: 'destructive' });
        return;
      }
      toast({ title: 'Succes', description: 'Project succesvol toegevoegd' });
    }

    fetchData();

    setNewProject({
      title: '',
      description: '',
      hoursSpent: '',
      customerId: '',
      date: new Date().toISOString().split('T')[0],
      status: 'in-progress'
    });
    setSelectedImages([]);
    setShowAddForm(false);
    setEditingProject(null);
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
    setNewProject({
      title: project.title,
      description: project.description,
      hoursSpent: project.hoursSpent.toString(),
      customerId: project.customerId || '',
      date: project.date,
      status: project.status
    });
    setShowAddForm(true);
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

    if (!window.confirm('Weet je zeker dat je dit project wilt verwijderen?')) return;
    const { error } = await supabase.from('projects').delete().eq('id', projectId);
    if (error) {
      toast({ title: 'Fout', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Succes', description: 'Project succesvol verwijderd' });
    fetchData();
  };

  const handleStatusChange = async (projectId: string, newStatus: Project['status']) => {
    const { error } = await supabase
      .from('projects')
      .update({ status: newStatus })
      .eq('id', projectId);

    if (error) {
      toast({ title: 'Fout', description: error.message, variant: 'destructive' });
      return;
    }

    const statusText = newStatus === 'completed' ? 'voltooid' :
                     newStatus === 'needs-review' ? 'heeft controle nodig' : 'in behandeling';

    toast({ title: 'Succes', description: `Project status bijgewerkt naar: ${statusText}` });
    fetchData();
  };

  const getStatusIcon = (status: Project['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'needs-review':
        return <AlertCircle className="h-4 w-4 text-orange-600" />;
      default:
        return <Clock className="h-4 w-4 text-blue-600" />;
    }
  };

  const getStatusText = (status: Project['status']) => {
    switch (status) {
      case 'completed':
        return 'Voltooid';
      case 'needs-review':
        return 'Controle Nodig';
      default:
        return 'In Behandeling';
    }
  };

  const renderProjectCard = (project: Project) => {
    const card = (
      <Card key={project.id} className="bg-white">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <CardTitle className="text-lg font-semibold text-gray-900">
                {project.title}
              </CardTitle>
              {isAdmin && (
                <p className="text-sm text-gray-600">{project.technicianName}</p>
              )}
              <p className="text-sm text-gray-600">{project.customerName}</p>
              <div className="flex items-center mt-2">
                {getStatusIcon(project.status)}
                <span className="ml-1 text-sm font-medium">
                  {getStatusText(project.status)}
                </span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">
                {new Date(project.date).toLocaleDateString('nl-NL')}
              </p>
              <p className="text-lg font-semibold text-red-600">
                {project.hoursSpent}u
              </p>
              <div className="flex space-x-1 mt-2">
                {(isAdmin || project.technicianId === user?.id) && (
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
          </div>
        </CardHeader>
        <CardContent>
          {project.status !== 'completed' && (
            <p className="text-gray-700 mb-4">{project.description}</p>
          )}

          {project.technicianId === user?.id && (
            <div className="flex flex-wrap gap-2 mb-4">
              <Button
                size="sm"
                onClick={() => handleStatusChange(project.id, 'in-progress')}
                variant={project.status === 'in-progress' ? 'default' : 'outline'}
                className="text-xs"
              >
                <Clock className="h-3 w-3 mr-1" />
                In Behandeling
              </Button>
              <Button
                size="sm"
                onClick={() => handleStatusChange(project.id, 'needs-review')}
                variant={project.status === 'needs-review' ? 'default' : 'outline'}
                className="text-xs"
              >
                <AlertCircle className="h-3 w-3 mr-1" />
                Controle Nodig
              </Button>
              <Button
                size="sm"
                onClick={() => handleStatusChange(project.id, 'completed')}
                variant={project.status === 'completed' ? 'default' : 'outline'}
                className="text-xs"
              >
                <CheckCircle className="h-3 w-3 mr-1" />
                Voltooid
              </Button>
            </div>
          )}

          {project.images.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {project.images.map((image, index) => (
                <img
                  key={index}
                  src={image}
                  alt={`Project afbeelding ${index + 1}`}
                  className="w-full h-20 object-cover rounded"
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );

    if (project.status === 'completed') {
      return (
        <Tooltip key={project.id}>
          <TooltipTrigger asChild>{card}</TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs text-wrap">
            <p className="font-semibold mb-1">{project.title}</p>
            <p className="text-sm text-gray-700">{project.description || 'Geen omschrijving'}</p>
          </TooltipContent>
        </Tooltip>
      );
    }

    return card;
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {isAdmin ? 'Alle Projecten' : 'Mijn Projecten'}
            </h1>
            <p className="text-gray-600">
              {isAdmin ? 'Bekijk alle monteur projecten' : 'Volg je dagelijkse projecten en werk'}
            </p>
          </div>
          <Button
            onClick={() => {
              setShowAddForm(!showAddForm);
              setEditingProject(null);
              setNewProject({
                title: '',
                description: '',
                hoursSpent: '',
                customerId: '',
                date: new Date().toISOString().split('T')[0],
                status: 'in-progress'
              });
            }}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            {showAddForm ? 'Annuleren' : 'Project Toevoegen'}
          </Button>
        </div>

        {isAdmin && (
          <div className="mb-6 flex items-center space-x-4">
            <select
              value={selectedTech}
              onChange={e => setSelectedTech(e.target.value)}
              className="p-2 border rounded"
            >
              <option value="all">Alle monteurs</option>
              {technicians.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <Input
              type="month"
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="p-2 border rounded"
            />
            <Button onClick={() => setSelectedMonth('')} className="bg-red-600 text-white">
              Alles
            </Button>
          </div>
        )}

        {/* Add/Edit Project Form */}
        {showAddForm && (
          <Card className="bg-white mb-6">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900">
                {editingProject ? 'Project Bewerken' : 'Nieuw Project Toevoegen'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Project Titel *</Label>
                    <Input
                      id="title"
                      value={newProject.title}
                      onChange={(e) => setNewProject({ ...newProject, title: e.target.value })}
                      placeholder="bv. HVAC Installatie"
                      required
                      className="focus:ring-red-500 focus:border-red-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customer">Klant *</Label>
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
                      max="24"
                      value={newProject.hoursSpent}
                      onChange={(e) => setNewProject({ ...newProject, hoursSpent: e.target.value })}
                      placeholder="8.0"
                      required
                      className="focus:ring-red-500 focus:border-red-500"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <select
                    id="status"
                    value={newProject.status}
                    onChange={(e) => setNewProject({ ...newProject, status: e.target.value as Project['status'] })}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  >
                    <option value="in-progress">In Behandeling</option>
                    <option value="needs-review">Controle Nodig</option>
                    <option value="completed">Voltooid</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Omschrijving</Label>
                  <Textarea
                    id="description"
                    value={newProject.description}
                    onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                    placeholder="Beschrijf het uitgevoerde werk..."
                    className="focus:ring-red-500 focus:border-red-500"
                    rows={3}
                  />
                </div>

                {/* Image Upload */}
                <div className="space-y-2">
                  <Label>Project Afbeeldingen (Max 5)</Label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                    <div className="text-center">
                      <Camera className="mx-auto h-12 w-12 text-gray-400" />
                      <div className="mt-2">
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                          id="image-upload"
                          disabled={selectedImages.length >= 5}
                        />
                        <label
                          htmlFor="image-upload"
                          className={`cursor-pointer text-red-600 hover:text-red-700 ${
                            selectedImages.length >= 5 ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                        >
                          Klik om afbeeldingen te uploaden
                        </label>
                      </div>
                      <p className="text-sm text-gray-500">PNG, JPG tot 10MB elk</p>
                    </div>
                  </div>

                  {/* Image Preview */}
                  {selectedImages.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mt-4">
                      {selectedImages.map((image, index) => (
                        <div key={index} className="relative">
                          <img
                            src={URL.createObjectURL(image)}
                            alt={`Voorbeeld ${index + 1}`}
                            className="w-full h-24 object-cover rounded-lg"
                          />
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1 hover:bg-red-700"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <Button type="submit" className="bg-red-600 hover:bg-red-700 text-white">
                  {editingProject ? 'Project Bijwerken' : 'Project Toevoegen'}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Projects List */}
        <div className="space-y-10">
          {(['in-progress', 'needs-review', 'completed'] as Project['status'][]).map(status => (
            <div key={status}>
              <h2
                className="text-xl font-semibold text-gray-900 mb-4 flex items-center cursor-pointer select-none"
                onClick={() => setCollapsed(prev => ({ ...prev, [status]: !prev[status] }))}
              >
                {getStatusText(status)}
                <ChevronDown
                  className={`ml-2 h-4 w-4 transition-transform ${collapsed[status] ? '-rotate-90' : ''}`}
                />
              </h2>
              {!collapsed[status] && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {projectsByStatus[status].length === 0 ? (
                    <div className="col-span-2 text-center py-8 text-gray-500">
                      Geen projecten gevonden
                    </div>
                  ) : (
                    projectsByStatus[status].map(project => renderProjectCard(project))
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Projects;

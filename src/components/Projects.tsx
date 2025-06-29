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
import { uploadProjectImages } from '@/utils/uploadProjectImages';
import {
  Camera,
  X,
  Plus,
  Trash2,
  Edit2,
  Save,
  CheckCircle,
  AlertCircle,
  Clock,
  ChevronDown
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface Customer { id: string; name: string; }
interface Technician { id: string; name: string; }

const Projects = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [techniciansList, setTechniciansList] = useState<Technician[]>([]);
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
    status: 'in-progress' as Project['status'],
    technicianId: ''
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
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name')
        .order('full_name', { ascending: true });
      const { data: projectData } = await supabase
        .from('projects')
        .select('*, customers(name), profiles(full_name)')
        .order('date', { ascending: false });
      setCustomers(customerData || []);
      setTechniciansList(
        (profilesData || []).map(t => ({
          id: t.id,
          name: t.full_name
        }))
      );
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
  ).filter(([id]) => !!id && !!id.trim())
   .map(([id, name]) => ({ id, name }));

  const filteredProjects = projects.filter(p => {
    if (!isAdmin && p.technicianId !== user?.id) return false;
    if (isAdmin && selectedTech !== 'all' && p.technicianId !== selectedTech) return false;
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

  // Uren alleen verplicht als status "completed" is
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !newProject.title ||
      !newProject.date ||
      !newProject.customerId ||
      (isAdmin && !newProject.technicianId) ||
      (newProject.status === 'completed' && !newProject.hoursSpent)
    ) {
      toast({ title: "Fout", description: "Vul alle verplichte velden in", variant: "destructive" });
      return;
    }
    if (newProject.status === 'completed') {
      const hours = parseFloat(newProject.hoursSpent);
      if (isNaN(hours) || hours <= 0 || hours > 24) {
        toast({ title: "Fout", description: "Uren moeten tussen 0 en 24 liggen", variant: "destructive" });
        return;
      }
    }

    const technicianIdToSave = isAdmin
      ? newProject.technicianId
      : user?.id;

    let projectId: string | null = null;

    if (editingProject) {
      const { error } = await supabase
        .from('projects')
        .update({
          title: newProject.title,
          description: newProject.description,
          date: newProject.date,
          hours_spent: newProject.status === 'completed' ? parseFloat(newProject.hoursSpent) : null,
          status: newProject.status,
          customer_id: newProject.customerId,
          technician_id: technicianIdToSave
        })
        .eq('id', editingProject.id);
      if (error) {
        toast({ title: 'Fout', description: error.message, variant: 'destructive' });
        return;
      }
      projectId = editingProject.id;
      toast({ title: 'Succes', description: 'Project succesvol bijgewerkt' });
    } else {
      const { data, error } = await supabase.from('projects').insert([{ 
        technician_id: technicianIdToSave,
        customer_id: newProject.customerId,
        title: newProject.title,
        description: newProject.description,
        date: newProject.date,
        hours_spent: newProject.status === 'completed' ? parseFloat(newProject.hoursSpent) : null,
        status: newProject.status,
        images: []
      }]).select().single();
      if (error) {
        toast({ title: 'Fout', description: error.message, variant: 'destructive' });
        return;
      }
      projectId = data?.id || null;
      toast({ title: 'Succes', description: 'Project succesvol toegevoegd' });
    }

    if (projectId && selectedImages.length > 0) {
      const urls = await uploadProjectImages(selectedImages, projectId);
      if (urls.length > 0) {
        const { error } = await supabase
          .from('projects')
          .update({ images: urls })
          .eq('id', projectId);
        if (error) {
          toast({ title: 'Fout', description: error.message, variant: 'destructive' });
        }
      }
    }

    fetchData();
    setNewProject({
      title: '',
      description: '',
      hoursSpent: '',
      customerId: '',
      date: new Date().toISOString().split('T')[0],
      status: 'in-progress',
      technicianId: ''
    });
    setSelectedImages([]);
    setShowAddForm(false);
    setEditingProject(null);
  };

  const handleEdit = (project: Project) => {
    if (!isAdmin && project.technicianId !== user?.id) {
      toast({ title: "Fout", description: "Je kunt alleen je eigen projecten bewerken", variant: "destructive" });
      return;
    }
    setEditingProject(project);
    setNewProject({
      title: project.title,
      description: project.description,
      hoursSpent: project.hoursSpent ? project.hoursSpent.toString() : '',
      customerId: project.customerId,
      date: project.date,
      status: project.status,
      technicianId: project.technicianId
    });
    setShowAddForm(true);
  };

  const handleDelete = async (projectId: string, project: Project) => {
    if (!isAdmin && project.technicianId !== user?.id) {
      toast({ title: "Fout", description: "Je kunt alleen je eigen projecten verwijderen", variant: "destructive" });
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

  // Status-knoppen per project: admin of toegewezen monteur mag status zetten
  const handleStatusChange = async (project: Project, newStatus: Project['status']) => {
    // Alleen uren verplicht als je op voltooid zet
    if (newStatus === 'completed' && (!project.hoursSpent || project.hoursSpent <= 0)) {
      toast({ title: 'Fout', description: 'Voer eerst het aantal bestede uren in via "Bewerken"', variant: 'destructive' });
      return;
    }
    const { error } = await supabase
      .from('projects')
      .update({ status: newStatus })
      .eq('id', project.id);
    if (error) {
      toast({ title: 'Fout', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Succes', description: `Project status bijgewerkt naar: ${getStatusText(newStatus)}` });
    fetchData();
  };

  const getStatusIcon = (status: Project['status']) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'needs-review': return <AlertCircle className="h-4 w-4 text-orange-600" />;
      default: return <Clock className="h-4 w-4 text-blue-600" />;
    }
  };
  const getStatusText = (status: Project['status']) => {
    switch (status) {
      case 'completed': return 'Voltooid';
      case 'needs-review': return 'Controle Nodig';
      default: return 'In Behandeling';
    }
  };

  const canStatusChange = (project: Project) =>
    isAdmin || project.technicianId === user?.id;

  // PROJECTCARD inclusief tooltip op hover én statusknoppen
  const renderProjectCard = (project: Project) => (
    <Tooltip key={project.id}>
      <TooltipTrigger asChild>
        <Card className="bg-white hover:shadow-lg transition-shadow duration-200 cursor-pointer">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-lg font-semibold text-gray-900">
                  {project.title}
                </CardTitle>
                {isAdmin && <p className="text-sm text-gray-600">{project.technicianName}</p>}
                <p className="text-sm text-gray-600">{project.customerName}</p>
                <div className="flex items-center mt-2">
                  {getStatusIcon(project.status)}
                  <span className="ml-1 text-sm font-medium">{getStatusText(project.status)}</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">
                  {new Date(project.date).toLocaleDateString('nl-NL')}
                </p>
                <p className="text-lg font-semibold text-red-600">{project.hoursSpent ? project.hoursSpent + 'u' : ''}</p>
                <div className="flex space-x-1 mt-2">
                  {(isAdmin || project.technicianId === user?.id) && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => handleEdit(project)} className="h-8 w-8 p-0">
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleDelete(project.id, project)} className="h-8 w-8 p-0 border-red-300 text-red-600 hover:bg-red-50">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {canStatusChange(project) && (
              <div className="flex flex-wrap gap-2 mb-2">
                <Button
                  size="sm"
                  onClick={() => handleStatusChange(project, 'in-progress')}
                  variant={project.status === 'in-progress' ? 'default' : 'outline'}
                  className="text-xs"
                >
                  <Clock className="h-3 w-3 mr-1" /> In Behandeling
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleStatusChange(project, 'needs-review')}
                  variant={project.status === 'needs-review' ? 'default' : 'outline'}
                  className="text-xs"
                >
                  <AlertCircle className="h-3 w-3 mr-1" /> Controle Nodig
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleStatusChange(project, 'completed')}
                  variant={project.status === 'completed' ? 'default' : 'outline'}
                  className="text-xs"
                >
                  <CheckCircle className="h-3 w-3 mr-1" /> Voltooid
                </Button>
              </div>
            )}
            {project.images?.length > 0 && (
              <div className="mt-2 grid grid-cols-2 gap-2">
                {project.images.map((url, idx) => (
                  <img
                    key={idx}
                    src={url}
                    alt={`Projectafbeelding ${idx + 1}`}
                    className="h-24 w-full object-cover rounded"
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs text-wrap">
        <p className="font-semibold mb-1">{project.title}</p>
        <p className="text-sm text-gray-700">
          {project.description || 'Geen omschrijving'}
        </p>
      </TooltipContent>
    </Tooltip>
  );

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="mb-2 text-3xl font-bold text-gray-900">{isAdmin ? 'Alle Projecten' : 'Mijn Projecten'}</h1>
            <p className="text-gray-600">{isAdmin ? 'Bekijk alle monteur projecten' : 'Volg je dagelijkse projecten en werk'}</p>
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
                status: 'in-progress',
                technicianId: ''
              });
            }}
            className="bg-red-600 text-white hover:bg-red-700"
          >
            <Plus className="mr-2 h-4 w-4" />
            {showAddForm ? 'Annuleren' : 'Project Toevoegen'}
          </Button>
        </div>

        {isAdmin && (
          <div className="mb-6 flex items-center space-x-4">
            <select
              value={selectedTech}
              onChange={e => setSelectedTech(e.target.value)}
              className="rounded border p-2"
            >
              <option value="all">Alle monteurs</option>
              {technicians.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            <Input
              type="month"
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="rounded border p-2"
            />
            <Button onClick={() => setSelectedMonth('')} className="bg-red-600 text-white">Alles</Button>
          </div>
        )}

        {showAddForm && (
          <Card className="mb-6 bg-white">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900">
                {editingProject ? 'Project Bewerken' : 'Nieuw Project Toevoegen'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="title">Project Titel *</Label>
                  <Input
                    id="title"
                    required
                    value={newProject.title}
                    onChange={e => setNewProject({ ...newProject, title: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="customer">Klant *</Label>
                  <select
                    id="customer"
                    required
                    value={newProject.customerId}
                    onChange={e => setNewProject({ ...newProject, customerId: e.target.value })}
                    className="w-full rounded border p-2"
                  >
                    <option value="">Selecteer Klant</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                {isAdmin && (
                  <div>
                    <Label htmlFor="technician">Monteur *</Label>
                    <select
                      id="technician"
                      required
                      value={newProject.technicianId}
                      onChange={e => setNewProject({ ...newProject, technicianId: e.target.value })}
                      className="w-full rounded border p-2"
                    >
                      <option value="">Selecteer Monteur</option>
                      {techniciansList.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="date">Datum *</Label>
                    <Input
                      id="date"
                      type="date"
                      required
                      value={newProject.date}
                      onChange={e => setNewProject({ ...newProject, date: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="hours">
                      Bestede Uren {newProject.status === 'completed' && '*'}
                      {newProject.status !== 'completed' && ' (optioneel)'}
                    </Label>
                    <Input
                      id="hours"
                      type="number"
                      step="0.5"
                      min="0.5"
                      max="24"
                      required={newProject.status === 'completed'}
                      value={newProject.hoursSpent}
                      onChange={e => setNewProject({ ...newProject, hoursSpent: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="status">Status</Label>
                  <select
                    id="status"
                    value={newProject.status}
                    onChange={e => setNewProject({ ...newProject, status: e.target.value as Project['status'] })}
                    className="w-full rounded border p-2"
                  >
                    <option value="in-progress">In Behandeling</option>
                    <option value="needs-review">Controle Nodig</option>
                    <option value="completed">Voltooid</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="description">Omschrijving</Label>
                  <Textarea
                    id="description"
                    rows={3}
                    value={newProject.description}
                    onChange={e => setNewProject({ ...newProject, description: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Project Afbeeldingen (max 5)</Label>
                  <div className="rounded border-2 border-dashed p-4 text-center">
                    <Camera className="mx-auto mb-2 h-12 w-12 text-gray-400" />
                    <input
                      id="image-upload"
                      type="file"
                      multiple
                      accept="image/*"
                      disabled={selectedImages.length >= 5}
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    <label htmlFor="image-upload" className="cursor-pointer text-red-600 hover:text-red-700">
                      Klik om afbeeldingen te uploaden
                    </label>
                    {selectedImages.length > 0 && (
                      <div className="mt-4 grid grid-cols-2 gap-4">
                        {selectedImages.map((img, i) => (
                          <div key={i} className="relative">
                            <img
                              src={URL.createObjectURL(img)}
                              alt={`Voorbeeld ${i+1}`}
                              className="h-24 w-full rounded object-cover"
                            />
                            <button
                              onClick={() => removeImage(i)}
                              className="absolute -top-2 -right-2 rounded-full bg-red-600 p-1 text-white"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <Button type="submit" className="bg-red-600 hover:bg-red-700 text-white">
                  <Save className="mr-2 h-4 w-4" />
                  {editingProject ? 'Opslaan' : 'Toevoegen'}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="space-y-10">
          {(['in-progress', 'needs-review', 'completed'] as Project['status'][]).map(status => (
            <div key={status}>
              <h2
                onClick={() => setCollapsed(prev => ({ ...prev, [status]: !prev[status] }))}
                className="mb-4 flex cursor-pointer items-center select-none text-xl font-semibold text-gray-900"
              >
                {getStatusText(status)} ({projectsByStatus[status].length})
                <ChevronDown
                  className={`ml-2 h-4 w-4 transition-transform ${collapsed[status] ? '-rotate-90' : ''}`}
                />
              </h2>
              {!collapsed[status] && (
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  {projectsByStatus[status].length === 0 ? (
                    <div className="col-span-2 py-8 text-center text-gray-500">
                      Geen projecten gevonden
                    </div>
                  ) : (
                    projectsByStatus[status].map(renderProjectCard)
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

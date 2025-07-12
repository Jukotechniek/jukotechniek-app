
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Calendar, Clock, Building, User, Image as ImageIcon, Edit, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, parseISO } from 'date-fns';
import { Project } from '@/types/projects';

interface Customer {
  id: string;
  name: string;
}

interface UserProfile {
  id: string;
  username: string | null;
  full_name: string | null;
}

const Projects: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [projects, setProjects] = useState<Project[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [hoursSpent, setHoursSpent] = useState<number | ''>('');
  const [status, setStatus] = useState<'in-progress' | 'completed' | 'needs-review'>('in-progress');
  const [technicianId, setTechnicianId] = useState(user?.id || '');

  useEffect(() => {
    if (user) {
      setTechnicianId(user.id);
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [projectsData, customersData, usersData] = await Promise.all([
        fetchProjects(),
        fetchCustomers(),
        fetchUsers()
      ]);

      setProjects(projectsData);
      setCustomers(customersData);
      setUsers(usersData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    let query = supabase
      .from('projects')
      .select('*')
      .order('date', { ascending: false });

    if (!isAdmin) {
      query = query.eq('technician_id', user?.id);
    }

    const { data, error } = await query;

    if (error) throw error;
    
    // Map database data to Project interface
    return (data || []).map(item => ({
      id: item.id,
      technicianId: item.technician_id || '',
      technicianName: '',
      customerId: item.customer_id,
      customerName: '',
      date: item.date,
      title: item.title,
      description: item.description || '',
      images: item.images || [],
      hoursSpent: item.hours_spent,
      status: (item.status as Project['status']) || 'in-progress',
      createdAt: item.created_at || '',
      updatedAt: item.updated_at
    }));
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

    if (!title || !description || !customerId || !date || !hoursSpent || !technicianId) {
      alert('Please fill in all fields.');
      return;
    }

    const newProject = {
      title: title,
      description: description,
      customer_id: customerId,
      technician_id: technicianId,
      date: date,
      hours_spent: parseFloat(hoursSpent.toString()),
      status: status,
      images: [],
    };

    try {
      const { data, error } = await supabase
        .from('projects')
        .insert([newProject])
        .select()
        .single();

      if (error) throw error;

      const mappedProject: Project = {
        id: data.id,
        technicianId: data.technician_id || '',
        technicianName: '',
        customerId: data.customer_id,
        customerName: '',
        date: data.date,
        title: data.title,
        description: data.description || '',
        images: data.images || [],
        hoursSpent: data.hours_spent,
        status: (data.status as Project['status']) || 'in-progress',
        createdAt: data.created_at || '',
        updatedAt: data.updated_at
      };

      setProjects(prevProjects => [...prevProjects, mappedProject]);
      setIsCreateDialogOpen(false);
      clearForm();
      fetchData();
    } catch (error) {
      console.error('Error creating project:', error);
      alert('Failed to create project.');
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedProject?.id) {
      alert('No project selected to update.');
      return;
    }

    if (!title || !description || !customerId || !date || !hoursSpent) {
      alert('Please fill in all fields.');
      return;
    }

    const updatedProject = {
      title: title,
      description: description,
      customer_id: customerId,
      date: date,
      hours_spent: parseFloat(hoursSpent.toString()),
      status: status,
    };

    try {
      const { data, error } = await supabase
        .from('projects')
        .update(updatedProject)
        .eq('id', selectedProject.id)
        .select()
        .single();

      if (error) throw error;

      const mappedProject: Project = {
        id: data.id,
        technicianId: data.technician_id || '',
        technicianName: '',
        customerId: data.customer_id,
        customerName: '',
        date: data.date,
        title: data.title,
        description: data.description || '',
        images: data.images || [],
        hoursSpent: data.hours_spent,
        status: (data.status as Project['status']) || 'in-progress',
        createdAt: data.created_at || '',
        updatedAt: data.updated_at
      };

      setProjects(prevProjects =>
        prevProjects.map(project => (project.id === selectedProject.id ? mappedProject : project))
      );
      setIsEditDialogOpen(false);
      clearForm();
      fetchData();
    } catch (error) {
      console.error('Error updating project:', error);
      alert('Failed to update project.');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this project?')) {
      try {
        const { error } = await supabase
          .from('projects')
          .delete()
          .eq('id', id);

        if (error) throw error;

        setProjects(prevProjects => prevProjects.filter(project => project.id !== id));
        fetchData();
      } catch (error) {
        console.error('Error deleting project:', error);
        alert('Failed to delete project.');
      }
    }
  };

  const clearForm = () => {
    setTitle('');
    setDescription('');
    setCustomerId('');
    setDate(format(new Date(), 'yyyy-MM-dd'));
    setHoursSpent('');
    setStatus('in-progress');
    setSelectedProject(null);
  };

  const handleEditClick = (project: Project) => {
    setSelectedProject(project);
    setTitle(project.title);
    setDescription(project.description);
    setCustomerId(project.customerId || '');
    setDate(project.date);
    setHoursSpent(project.hoursSpent);
    setStatus(project.status);
    setIsEditDialogOpen(true);
  };

  const getStatusBadge = (status: Project['status']) => {
    const statusMap = {
      'in-progress': { label: 'In Progress', color: 'bg-blue-100 text-blue-800' },
      'completed': { label: 'Completed', color: 'bg-green-100 text-green-800' },
      'needs-review': { label: 'Needs Review', color: 'bg-yellow-100 text-yellow-800' }
    };
    
    const statusInfo = statusMap[status] || statusMap['in-progress'];
    
    return (
      <Badge className={statusInfo.color}>
        {statusInfo.label}
      </Badge>
    );
  };

  return (
    <div className="p-2 md:p-6 bg-gradient-to-br from-white via-gray-100 to-red-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <header className="mb-4 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-red-700 mb-1 md:mb-2 tracking-tight">
            Mijn Projecten
          </h1>
          <p className="text-gray-600 text-sm md:text-base">
            Beheer je projecten en documenteer uitgevoerde werkzaamheden.
          </p>
        </header>

        <div className="mb-6 flex justify-end">
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" /> Nieuw Project</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Nieuw Project</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Input
                    placeholder="Project titel"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>
                <div>
                  <Textarea
                    placeholder="Project beschrijving"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
                <div>
                  <Select onValueChange={setCustomerId} value={customerId}>
                    <SelectTrigger>
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
                    step="0.5"
                    placeholder="Bestede uren"
                    value={hoursSpent}
                    onChange={(e) => setHoursSpent(parseFloat(e.target.value) || '')}
                  />
                </div>
                <div>
                  <Select value={status} onValueChange={(value: Project['status']) => setStatus(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="in-progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="needs-review">Needs Review</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Annuleren
                  </Button>
                  <Button type="submit">Project Opslaan</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map(project => (
              <Card key={project.id} className="shadow-lg border-2 border-gray-200 hover:shadow-xl transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg font-bold text-gray-900 line-clamp-2">
                      {project.title}
                    </CardTitle>
                    <div className="flex space-x-1">
                      {isAdmin && (
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleEditClick(project)}
                          className="h-8 w-8"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleDelete(project.id)}
                        className="h-8 w-8"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    {getStatusBadge(project.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-gray-600 text-sm line-clamp-3">{project.description}</p>
                  
                  <div className="space-y-2 text-sm text-gray-500">
                    <div className="flex items-center">
                      <Building className="h-4 w-4 mr-2" />
                      <span>{customers.find(c => c.id === project.customerId)?.name || 'Unknown Customer'}</span>
                    </div>
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-2" />
                      <span>{format(parseISO(project.date), 'dd-MM-yyyy')}</span>
                    </div>
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-2" />
                      <span>{project.hoursSpent} uren</span>
                    </div>
                    {project.images && project.images.join('').length > 0 && (
                      <div className="flex items-center">
                        <ImageIcon className="h-4 w-4 mr-2" />
                        <span>{project.images.length} foto's</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {projects.length === 0 && !loading && (
          <Card className="shadow-lg border-2 border-gray-200">
            <CardContent className="p-8 text-center">
              <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Geen projecten gevonden</h3>
              <p className="text-gray-600">Begin met het toevoegen van je eerste project.</p>
            </CardContent>
          </Card>
        )}

        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Project Bewerken</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <Input
                  placeholder="Project titel"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div>
                <Textarea
                  placeholder="Project beschrijving"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div>
                <Select onValueChange={setCustomerId} value={customerId}>
                  <SelectTrigger>
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
                  step="0.5"
                  placeholder="Bestede uren"
                  value={hoursSpent}
                  onChange={(e) => setHoursSpent(parseFloat(e.target.value) || '')}
                />
              </div>
              <div>
                <Select value={status} onValueChange={(value: Project['status']) => setStatus(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="needs-review">Needs Review</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Annuleren
                </Button>
                <Button type="submit">Wijzigingen Opslaan</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Projects;

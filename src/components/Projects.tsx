
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Calendar, Plus, User, Building, Clock, FileText, Image as ImageIcon, Trash2, Edit } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { uploadProjectImages } from '@/utils/uploadProjectImages';
import { PageLayout } from '@/components/ui/page-layout';

// Use the actual database schema types
interface Project {
  id: string;
  title: string;
  description: string | null;
  status: string | null;
  date: string;
  hours_spent: number;
  created_at: string | null;
  updated_at: string | null;
  technician_id: string | null;
  customer_id: string | null;
  images: string[] | null;
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

const Projects: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [projects, setProjects] = useState<Project[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<string>('in-progress');
  const [date, setDate] = useState<string>('');
  const [hoursSpent, setHoursSpent] = useState<number>(0);
  const [customerId, setCustomerId] = useState<string>('');
  const [technicianId, setTechnicianId] = useState<string>('');
  const [newImages, setNewImages] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);

  useEffect(() => {
    fetchProjects();
    fetchCustomers();
    fetchUsers();
  }, []);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('projects')
        .select('*');

      if (!isAdmin) {
        query = query.eq('technician_id', user?.id);
      }

      const { data, error } = await query;

      if (error) throw error;

      setProjects(data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name');

      if (error) throw error;

      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, full_name');

      if (error) throw error;

      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleOpen = () => {
    setOpen(true);
    setEditMode(false);
    setSelectedProject(null);
    setTitle('');
    setDescription('');
    setStatus('in-progress');
    setDate('');
    setHoursSpent(0);
    setCustomerId('');
    setTechnicianId('');
    setNewImages([]);
    setExistingImages([]);
  };

  const handleEdit = (project: Project) => {
    setEditMode(true);
    setSelectedProject(project);
    setTitle(project.title);
    setDescription(project.description || '');
    setStatus(project.status || 'in-progress');
    setDate(project.date);
    setHoursSpent(project.hours_spent);
    setCustomerId(project.customer_id || '');
    setTechnicianId(project.technician_id || '');
    setExistingImages(project.images || []);
    setNewImages([]);
    setOpen(true);
  };

  const handleCreate = async () => {
    try {
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .insert([
          {
            title,
            description,
            status,
            date,
            hours_spent: hoursSpent,
            customer_id: customerId || null,
            technician_id: technicianId || null,
            images: [],
          },
        ])
        .select()
        .single();

      if (projectError) throw projectError;

      const uploadedImageUrls = await uploadProjectImages(newImages, projectData.id);

      const { error: updateError } = await supabase
        .from('projects')
        .update({ images: uploadedImageUrls })
        .eq('id', projectData.id);

      if (updateError) throw updateError;

      setProjects(prevProjects => [...prevProjects, { ...projectData, images: uploadedImageUrls }]);
      setOpen(false);
    } catch (error) {
      console.error('Error creating project:', error);
    }
  };

  const handleUpdate = async () => {
    if (!selectedProject) return;

    try {
      const uploadedImageUrls = await uploadProjectImages(newImages, selectedProject.id);

      const updatedImages = [...(selectedProject.images || []), ...uploadedImageUrls];

      const { error } = await supabase
        .from('projects')
        .update({
          title,
          description,
          status,
          date,
          hours_spent: hoursSpent,
          customer_id: customerId || null,
          technician_id: technicianId || null,
          images: updatedImages,
        })
        .eq('id', selectedProject.id);

      if (error) throw error;

      setProjects(prevProjects =>
        prevProjects.map(project =>
          project.id === selectedProject.id
            ? {
                ...project,
                title,
                description,
                status,
                date,
                hours_spent: hoursSpent,
                customer_id: customerId || null,
                technician_id: technicianId || null,
                images: updatedImages,
              }
            : project
        )
      );
      setOpen(false);
    } catch (error) {
      console.error('Error updating project:', error);
    }
  };

  const handleDelete = async (projectId: string) => {
    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);

      if (error) throw error;

      setProjects(prevProjects => prevProjects.filter(project => project.id !== projectId));
    } catch (error) {
      console.error('Error deleting project:', error);
    }
  };

  const handleImageDelete = async (imageUrl: string) => {
    if (!selectedProject) return;
  
    try {
      const updatedImages = selectedProject.images ? selectedProject.images.filter(url => url !== imageUrl) : [];
  
      const { error } = await supabase
        .from('projects')
        .update({ images: updatedImages })
        .eq('id', selectedProject.id);
  
      if (error) {
        throw error;
      }
  
      setProjects(prevProjects =>
        prevProjects.map(project =>
          project.id === selectedProject.id
            ? { ...project, images: updatedImages }
            : project
        )
      );
  
      setExistingImages(updatedImages);
  
    } catch (error) {
      console.error('Error deleting image:', error);
    }
  };

  if (loading) {
    return (
      <PageLayout title={isAdmin ? "Projecten" : "Mijn Projecten"} subtitle={isAdmin ? "Beheer alle projecten en hun status." : "Bekijk en beheer je toegewezen projecten."}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600" />
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout 
      title={isAdmin ? "Projecten" : "Mijn Projecten"} 
      subtitle={isAdmin ? "Beheer alle projecten en hun status." : "Bekijk en beheer je toegewezen projecten."}
    >
      <Card className="mb-4 shadow-lg border-2 border-gray-200">
        <CardContent className="p-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">
              {isAdmin ? 'Projecten beheren' : 'Mijn projecten'}
            </h2>
            {isAdmin && (
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button onClick={handleOpen} className="bg-green-600 text-white hover:bg-green-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Nieuw project
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>{editMode ? 'Project bewerken' : 'Nieuw project'}</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <label htmlFor="title" className="text-right font-medium">
                        Titel
                      </label>
                      <Input
                        id="title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="col-span-3"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <label htmlFor="description" className="text-right font-medium">
                        Beschrijving
                      </label>
                      <Textarea
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="col-span-3"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <label htmlFor="status" className="text-right font-medium">
                        Status
                      </label>
                      <Select value={status} onValueChange={(value) => setStatus(value)}>
                        <SelectTrigger className="col-span-3">
                          <SelectValue placeholder="Selecteer een status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="in-progress">Bezig</SelectItem>
                          <SelectItem value="completed">Afgerond</SelectItem>
                          <SelectItem value="needs-review">Controle nodig</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <label htmlFor="date" className="text-right font-medium">
                        Datum
                      </label>
                      <Input
                        type="date"
                        id="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="col-span-3"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <label htmlFor="hoursSpent" className="text-right font-medium">
                        Gewerkte uren
                      </label>
                      <Input
                        type="number"
                        id="hoursSpent"
                        value={hoursSpent}
                        onChange={(e) => setHoursSpent(Number(e.target.value))}
                        className="col-span-3"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <label htmlFor="customerId" className="text-right font-medium">
                        Klant
                      </label>
                      <Select value={customerId} onValueChange={setCustomerId}>
                        <SelectTrigger className="col-span-3">
                          <SelectValue placeholder="Selecteer een klant" />
                        </SelectTrigger>
                        <SelectContent>
                          {customers.map((customer) => (
                            <SelectItem key={customer.id} value={customer.id}>
                              {customer.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <label htmlFor="technicianId" className="text-right font-medium">
                        Technicus
                      </label>
                      <Select value={technicianId} onValueChange={setTechnicianId}>
                        <SelectTrigger className="col-span-3">
                          <SelectValue placeholder="Selecteer een technicus" />
                        </SelectTrigger>
                        <SelectContent>
                          {users.map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.full_name} ({user.username})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <label htmlFor="images" className="text-right font-medium">
                        Nieuwe afbeeldingen
                      </label>
                      <Input
                        type="file"
                        id="images"
                        multiple
                        onChange={(e) => {
                          if (e.target.files) {
                            setNewImages(Array.from(e.target.files));
                          }
                        }}
                        className="col-span-3"
                      />
                    </div>
                    {editMode && (
                      <div className="grid grid-cols-4 items-start gap-4">
                        <label className="text-right font-medium">
                          Bestaande afbeeldingen
                        </label>
                        <div className="col-span-3 flex flex-wrap gap-2">
                          {existingImages.map((url, index) => (
                            <div key={index} className="relative">
                              <img src={url} alt={`Project Image ${index}`} className="w-32 h-24 object-cover rounded-md" />
                              <Button
                                variant="ghost"
                                size="icon"
                                className="absolute top-0 right-0 bg-black/50 text-white hover:bg-black/80"
                                onClick={() => handleImageDelete(url)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex justify-end">
                    <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                      Annuleren
                    </Button>
                    <Button type="submit" onClick={editMode ? handleUpdate : handleCreate} className="ml-2">
                      {editMode ? 'Update project' : 'Maak project'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map((project) => (
          <Card key={project.id} className="shadow-md border-2 border-gray-200">
            <CardHeader>
              <div className="flex items-start justify-between">
                <CardTitle className="text-lg font-semibold">{project.title}</CardTitle>
                {isAdmin && (
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(project)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">{project.description}</p>
              <div className="mt-2 space-y-1">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span className="text-xs text-gray-500">Datum:</span>
                  <span className="text-sm font-medium">{project.date || 'Niet ingesteld'}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span className="text-xs text-gray-500">Uren:</span>
                  <span className="text-sm font-medium">{project.hours_spent} uur</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Building className="h-4 w-4 text-gray-500" />
                  <span className="text-xs text-gray-500">Klant:</span>
                  <span className="text-sm font-medium">
                    {customers.find(customer => customer.id === project.customer_id)?.name || 'Niet toegewezen'}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-gray-500" />
                  <span className="text-xs text-gray-500">Technicus:</span>
                  <span className="text-sm font-medium">
                    {users.find(user => user.id === project.technician_id)?.full_name || 'Niet toegewezen'}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <FileText className="h-4 w-4 text-gray-500" />
                  <span className="text-xs text-gray-500">Status:</span>
                  <span className="text-sm font-medium">{project.status}</span>
                </div>
              </div>
              {project.images && project.images.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-semibold mb-2">Afbeeldingen:</h4>
                  <div className="flex flex-wrap gap-2">
                    {project.images.map((url, index) => (
                      <img key={index} src={url} alt={`Project Image ${index}`} className="w-24 h-20 object-cover rounded-md" />
                    ))}
                  </div>
                </div>
              )}
              {isAdmin && (
                <Button
                  variant="destructive"
                  size="sm"
                  className="mt-4 w-full"
                  onClick={() => handleDelete(project.id)}
                >
                  Verwijder project
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </PageLayout>
  );
};

export default Projects;

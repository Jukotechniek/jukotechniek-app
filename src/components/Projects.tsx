import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle, AlertTriangle, XCircle, Webhook, RefreshCw, Plus, Minus } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { MoreVertical, Copy, Edit, Trash2 } from 'lucide-react';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { format } from "date-fns"

interface Project {
  id: string;
  technicianId: string;
  technicianName: string;
  customerId: string;
  customerName: string;
  date: string;
  title: string;
  description: string;
  images: string[];
  hoursSpent: number;
  status: 'in-progress' | 'completed' | 'needs-review';
  createdAt: string;
  updatedAt: string;
}

interface Customer {
  id: string;
  name: string;
}

interface Technician {
  id: string;
  full_name: string;
}

const ProjectsComponent = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    fetchProjects();
    if (isAdmin) {
      fetchCustomers();
      fetchTechnicians();
    }
  }, [isAdmin]);

  const fetchProjects = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          customers(name),
          profiles(full_name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const transformedProjects: Project[] = data?.map(project => ({
        id: project.id,
        technicianId: project.technician_id || '',
        technicianName: project.profiles?.full_name || 'Onbekend',
        customerId: project.customer_id || '',
        customerName: project.customers?.name || 'Onbekend',
        date: project.date,
        title: project.title,
        description: project.description || '',
        images: project.images || [],
        hoursSpent: project.hours_spent,
        status: (project.status as 'in-progress' | 'completed' | 'needs-review') || 'in-progress',
        createdAt: project.created_at || '',
        updatedAt: project.updated_at || ''
      })) || [];

      setProjects(transformedProjects);
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast({
        title: "Fout",
        description: "Kon projecten niet laden",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast({
        title: "Fout",
        description: "Kon klanten niet laden",
        variant: "destructive"
      });
    }
  };

  const fetchTechnicians = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('role', 'technician')
        .order('full_name', { ascending: true });

      if (error) throw error;
      setTechnicians(data || []);
    } catch (error) {
      console.error('Error fetching technicians:', error);
      toast({
        title: "Fout",
        description: "Kon monteurs niet laden",
        variant: "destructive"
      });
    }
  };

  const [newProject, setNewProject] = useState<Omit<Project, 'id' | 'createdAt' | 'updatedAt'>>({
    technicianId: '',
    technicianName: '',
    customerId: '',
    customerName: '',
    date: new Date().toISOString().split('T')[0],
    title: '',
    description: '',
    images: [],
    hoursSpent: 0,
    status: 'in-progress',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewProject(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>, type: 'customer' | 'technician') => {
    const { value } = e.target;
    if (type === 'customer') {
      const selectedCustomer = customers.find(c => c.id === value);
      setNewProject(prev => ({ ...prev, customerId: value, customerName: selectedCustomer?.name || '' }));
    } else {
      const selectedTechnician = technicians.find(t => t.id === value);
      setNewProject(prev => ({ ...prev, technicianId: value, technicianName: selectedTechnician?.full_name || '' }));
    }
  };

  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      setNewProject(prev => ({ ...prev, date: date.toISOString().split('T')[0] }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data, error } = await supabase
        .from('projects')
        .insert([
          {
            technician_id: newProject.technicianId,
            customer_id: newProject.customerId,
            date: newProject.date,
            title: newProject.title,
            description: newProject.description,
            images: newProject.images,
            hours_spent: newProject.hoursSpent,
            status: newProject.status,
          },
        ]);

      if (error) throw error;

      toast({
        title: "Succes",
        description: "Project succesvol aangemaakt"
      });

      fetchProjects();
      setShowCreateForm(false);
      setNewProject({
        technicianId: '',
        technicianName: '',
        customerId: '',
        customerName: '',
        date: new Date().toISOString().split('T')[0],
        title: '',
        description: '',
        images: [],
        hoursSpent: 0,
        status: 'in-progress',
      });
    } catch (error) {
      console.error('Error creating project:', error);
      toast({
        title: "Fout",
        description: "Kon project niet aanmaken",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    setIsLoading(true);
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

      fetchProjects();
    } catch (error) {
      console.error('Error deleting project:', error);
      toast({
        title: "Fout",
        description: "Kon project niet verwijderen",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const [editProject, setEditProject] = useState<Project | null>(null);

  const handleEditClick = (project: Project) => {
    setEditProject(project);
  };

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditProject(prev => ({ ...prev, [name]: value }));
  };

  const handleEditSelectChange = (e: React.ChangeEvent<HTMLSelectElement>, type: 'customer' | 'technician') => {
    const { value } = e.target;
    if (type === 'customer') {
      const selectedCustomer = customers.find(c => c.id === value);
      setEditProject(prev => ({ ...prev, customerId: value, customerName: selectedCustomer?.name || '' }));
    } else {
      const selectedTechnician = technicians.find(t => t.id === value);
      setEditProject(prev => ({ ...prev, technicianId: value, technicianName: selectedTechnician?.full_name || '' }));
    }
  };

  const handleEditDateChange = (date: Date | undefined) => {
    if (date) {
      setEditProject(prev => ({ ...prev, date: date.toISOString().split('T')[0] }));
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data, error } = await supabase
        .from('projects')
        .update({
          technician_id: editProject.technicianId,
          customer_id: editProject.customerId,
          date: editProject.date,
          title: editProject.title,
          description: editProject.description,
          images: editProject.images,
          hours_spent: editProject.hoursSpent,
          status: editProject.status,
        })
        .eq('id', editProject.id);

      if (error) throw error;

      toast({
        title: "Succes",
        description: "Project succesvol bewerkt"
      });

      fetchProjects();
      setEditProject(null);
    } catch (error) {
      console.error('Error updating project:', error);
      toast({
        title: "Fout",
        description: "Kon project niet bewerken",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <Card className="bg-white">
            <CardContent className="p-8 text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Toegang Geweigerd</h2>
              <p className="text-gray-600">Alleen beheerders kunnen toegang krijgen tot projecten.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Projecten</h1>
            <p className="text-gray-600">Beheer alle projecten</p>
          </div>
          <div className="flex space-x-3">
            <Button
              onClick={() => setShowCreateForm(true)}
              variant="outline"
              className="border-gray-300"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nieuw Project
            </Button>
          </div>
        </div>

        <Card className="bg-white">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">Projecten Overzicht</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
              </div>
            ) : projects.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Geen projecten gevonden
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">Datum</TableHead>
                      <TableHead>Titel</TableHead>
                      <TableHead>Klant</TableHead>
                      <TableHead>Monteur</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {projects.map((project) => (
                      <TableRow key={project.id}>
                        <TableCell className="font-medium">{new Date(project.date).toLocaleDateString('nl-NL')}</TableCell>
                        <TableCell>{project.title}</TableCell>
                        <TableCell>{project.customerName}</TableCell>
                        <TableCell>{project.technicianName}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {project.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Acties</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => navigator.clipboard.writeText(project.id)}>
                                <Copy className="mr-2 h-4 w-4" />
                                <span>Copy project ID</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEditClick(project)}>
                                <Edit className="mr-2 h-4 w-4" />
                                <span>Edit</span>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleDeleteProject(project.id)} className="text-red-600 focus:text-red-600">
                                <Trash2 className="mr-2 h-4 w-4" />
                                <span>Delete</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Nieuw Project</DialogTitle>
              <DialogDescription>Maak een nieuw project aan.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="technicianId">Monteur</Label>
                  <select
                    id="technicianId"
                    name="technicianId"
                    onChange={(e) => handleSelectChange(e, 'technician')}
                    value={newProject.technicianId}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">Selecteer een monteur</option>
                    {technicians.map(technician => (
                      <option key={technician.id} value={technician.id}>{technician.full_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="customerId">Klant</Label>
                  <select
                    id="customerId"
                    name="customerId"
                    onChange={(e) => handleSelectChange(e, 'customer')}
                    value={newProject.customerId}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">Selecteer een klant</option>
                    {customers.map(customer => (
                      <option key={customer.id} value={customer.id}>{customer.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <Label>Datum</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-[240px] justify-start text-left font-normal",
                        !newProject.date && "text-muted-foreground"
                      )}
                    >
                      {newProject.date ? (
                        format(new Date(newProject.date), "PPP")
                      ) : (
                        <span>Kies een datum</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="center" side="bottom">
                    <Calendar
                      mode="single"
                      selected={newProject.date ? new Date(newProject.date) : undefined}
                      onSelect={handleDateChange}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label htmlFor="title">Titel</Label>
                <Input
                  type="text"
                  id="title"
                  name="title"
                  value={newProject.title}
                  onChange={handleInputChange}
                  placeholder="Project titel"
                />
              </div>
              <div>
                <Label htmlFor="description">Beschrijving</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={newProject.description}
                  onChange={handleInputChange}
                  placeholder="Project beschrijving"
                />
              </div>
              <Button type="submit" disabled={isLoading} className="bg-red-600 hover:bg-red-700 text-white">
                {isLoading ? 'Aanmaken...' : 'Project Aanmaken'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={editProject !== null} onOpenChange={() => setEditProject(null)}>
          {editProject && (
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Bewerk Project</DialogTitle>
                <DialogDescription>Bewerk de details van dit project.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="technicianId">Monteur</Label>
                    <select
                      id="technicianId"
                      name="technicianId"
                      onChange={(e) => handleEditSelectChange(e, 'technician')}
                      value={editProject.technicianId}
                      className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="">Selecteer een monteur</option>
                      {technicians.map(technician => (
                        <option key={technician.id} value={technician.id}>{technician.full_name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="customerId">Klant</Label>
                    <select
                      id="customerId"
                      name="customerId"
                      onChange={(e) => handleEditSelectChange(e, 'customer')}
                      value={editProject.customerId}
                      className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="">Selecteer een klant</option>
                      {customers.map(customer => (
                        <option key={customer.id} value={customer.id}>{customer.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <Label>Datum</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-[240px] justify-start text-left font-normal",
                          !editProject.date && "text-muted-foreground"
                        )}
                      >
                        {editProject.date ? (
                          format(new Date(editProject.date), "PPP")
                        ) : (
                          <span>Kies een datum</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="center" side="bottom">
                      <Calendar
                        mode="single"
                        selected={editProject.date ? new Date(editProject.date) : undefined}
                        onSelect={handleEditDateChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <Label htmlFor="title">Titel</Label>
                  <Input
                    type="text"
                    id="title"
                    name="title"
                    value={editProject.title}
                    onChange={handleEditInputChange}
                    placeholder="Project titel"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Beschrijving</Label>
                  <Textarea
                    id="description"
                    name="description"
                    value={editProject.description}
                    onChange={handleEditInputChange}
                    placeholder="Project beschrijving"
                  />
                </div>
                <Button type="submit" disabled={isLoading} className="bg-red-600 hover:bg-red-700 text-white">
                  {isLoading ? 'Opslaan...' : 'Project Opslaan'}
                </Button>
              </form>
            </DialogContent>
          )}
        </Dialog>
      </div>
    </div>
  );
};

export default ProjectsComponent;

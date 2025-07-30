import React, { useState, useEffect, useRef } from 'react';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { format } from 'date-fns';
import TechnicianFilter from './TechnicianFilter';

interface Customer { id: string; name: string; }
interface Technician { id: string; name: string; }

// Helper: haal een lijst met signed URLs op voor een lijst met storage paths
const getSignedUrls = async (paths: string[]) => {
  if (!paths || paths.length === 0) return [];
  const storagePaths = paths.map(url =>
    url.includes('/project-images/')
      ? url.split('/project-images/')[1]
      : url
  );
  const { data, error } = await supabase.storage.from('project-images').createSignedUrls(storagePaths, 3600);
  if (error) {
    console.error('Kan signed urls niet ophalen:', error);
    return [];
  }
  return data.map(item => item.signedUrl);
};

// Helper voor safe mod
function mod(n: number, m: number) {
  return ((n % m) + m) % m;
}

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
    technicianId: '',
    isPublic: false
  });
  const [selectedTech, setSelectedTech] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [collapsed, setCollapsed] = useState<Record<Project['status'], boolean>>({
    'in-progress': false,
    'needs-review': false,
    'completed': false
  });

  // Modal state voor details
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [signedImageUrls, setSignedImageUrls] = useState<string[]>([]);
  const [signedPreviewUrls, setSignedPreviewUrls] = useState<{ [projectId: string]: string[] }>({});

  // Fullscreen galerij state (welke index van signedImageUrls)
  const [fullscreenImageIndex, setFullscreenImageIndex] = useState<number | null>(null);

  // Ref voor swipe
  const swipeRef = useRef<HTMLDivElement | null>(null);
  const swipeStart = useRef<number | null>(null);

  // Fullscreen afsluiten & pijltjes navigatie (escape, left, right)
  useEffect(() => {
    if (fullscreenImageIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFullscreenImageIndex(null);
      if (e.key === 'ArrowLeft')
        setFullscreenImageIndex(i =>
          i === null
            ? 0
            : mod(i - 1, signedImageUrls.length)
        );
      if (e.key === 'ArrowRight')
        setFullscreenImageIndex(i =>
          i === null
            ? 0
            : mod(i + 1, signedImageUrls.length)
        );
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fullscreenImageIndex, signedImageUrls.length]);

  // Swipe (touch én mouse)
  useEffect(() => {
    if (fullscreenImageIndex === null) return;
    const el = swipeRef.current;
    if (!el) return;

    let x0: number | null = null;
    let lastX: number | null = null;

    const onTouchStart = (e: TouchEvent) => {
      x0 = e.touches[0].clientX;
      lastX = x0;
    };
    const onTouchMove = (e: TouchEvent) => {
      lastX = e.touches[0].clientX;
    };
    const onTouchEnd = () => {
      if (x0 !== null && lastX !== null) {
        const dx = lastX - x0;
        if (Math.abs(dx) > 60) {
          if (dx > 0) { // swipe right
            setFullscreenImageIndex(i =>
              i === null ? 0 : mod(i - 1, signedImageUrls.length)
            );
          } else { // swipe left
            setFullscreenImageIndex(i =>
              i === null ? 0 : mod(i + 1, signedImageUrls.length)
            );
          }
        }
      }
      x0 = null;
      lastX = null;
    };
    el.addEventListener('touchstart', onTouchStart);
    el.addEventListener('touchmove', onTouchMove);
    el.addEventListener('touchend', onTouchEnd);

    // Mouse events voor desktop swipe (optioneel)
    let mouseDown = false;
    let mx0 = null as number | null;
    let mxLast = null as number | null;
    const onMouseDown = (e: MouseEvent) => {
      mouseDown = true;
      mx0 = e.clientX;
      mxLast = mx0;
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!mouseDown) return;
      mxLast = e.clientX;
    };
    const onMouseUp = () => {
      if (mouseDown && mx0 !== null && mxLast !== null) {
        const dx = mxLast - mx0;
        if (Math.abs(dx) > 60) {
          if (dx > 0) { // swipe right
            setFullscreenImageIndex(i =>
              i === null ? 0 : mod(i - 1, signedImageUrls.length)
            );
          } else { // swipe left
            setFullscreenImageIndex(i =>
              i === null ? 0 : mod(i + 1, signedImageUrls.length)
            );
          }
        }
      }
      mouseDown = false;
      mx0 = null;
      mxLast = null;
    };
    el.addEventListener('mousedown', onMouseDown);
    el.addEventListener('mousemove', onMouseMove);
    el.addEventListener('mouseup', onMouseUp);
    el.addEventListener('mouseleave', onMouseUp);

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('mousedown', onMouseDown);
      el.removeEventListener('mousemove', onMouseMove);
      el.removeEventListener('mouseup', onMouseUp);
      el.removeEventListener('mouseleave', onMouseUp);
    };
  }, [fullscreenImageIndex, signedImageUrls.length]);

  // --- DATA ophalen en prepareren ---
  useEffect(() => {
    async function fetchAllSignedPreviews() {
      const allUrls: { [projectId: string]: string[] } = {};
      for (let project of projects) {
        if (project.images && project.images.length > 0) {
          const urls = await getSignedUrls(project.images);
          allUrls[project.id] = urls;
        }
      }
      setSignedPreviewUrls(allUrls);
    }
    if (projects.length > 0) fetchAllSignedPreviews();
  }, [projects]);

  useEffect(() => {
    if (detailsOpen && selectedProject && selectedProject.images && selectedProject.images.length > 0) {
      getSignedUrls(selectedProject.images).then(urls => setSignedImageUrls(urls));
    } else {
      setSignedImageUrls([]);
    }
  }, [selectedProject, detailsOpen]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: customerData } = await supabase
        .from('customers')
        .select('*')
        .order('name');
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, customer')
        .in('role', ['technician', 'admin'])
        .order('full_name', { ascending: true });
      const { data: projectData } = await supabase
        .from('projects')
        .select('*, customers(name), profiles(full_name)')
        .order('date', { ascending: false });
      setCustomers(customerData || []);
      setTechniciansList(
        Array.isArray(profilesData)
          ? profilesData.map((t: any) => ({
              id: t.id,
              name: t.full_name
            }))
          : []
      );
      const formatted = Array.isArray(projectData)
        ? projectData.map((p: any) => ({
        id: p.id,
        technicianId: p.technician_id, // no fallback to ''
        technicianName: p.profiles?.full_name || '',
        customerId: p.customer_id || '',
        customerName: p.customers?.name || '',
        date: p.date,
        title: p.title,
        description: p.description || '',
        images: p.images || [],
        hoursSpent: p.hours_spent,
        status: p.status as Project['status'],
        createdAt: p.created_at || '',
        isPublic: p.is_public ?? false
      })) : [];
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

  useEffect(() => {
    if (
      customers.length === 1 &&
      (!newProject.customerId || !customers.some(c => c.id === newProject.customerId)) &&
      showAddForm
    ) {
      setNewProject(prev => ({ ...prev, customerId: customers[0].id }));
    }
    // eslint-disable-next-line
  }, [customers, showAddForm]);

  // Determine admin and opdrachtgever roles separately
  const isAdmin = user?.role === 'admin';
  const isOpdrachtgever = user?.role === 'opdrachtgever';
  const isAdminOrOpdrachtgever = isAdmin || isOpdrachtgever;

  // For opdrachtgever, set their own customerId automatically from profile
  useEffect(() => {
    if (isOpdrachtgever && user?.customer) {
      setNewProject(prev => ({ ...prev, customerId: user.customer }));
    }
    // eslint-disable-next-line
  }, [isOpdrachtgever, user?.customer, showAddForm]);

  const technicians = Array.from(
    new Map(projects.map(p => [p.technicianId, p.technicianName])).entries()
  ).filter(([id]) => !!id && !!id.trim())
    .map(([id, name]) => ({ id, name }));

  const filteredProjects = projects.filter(p => {
    // Show for all mechanics if technicianId is null, for the assigned mechanic, or for admin/opdrachtgever
    if (isAdminOrOpdrachtgever) {
      if (selectedTech !== 'all' && p.technicianId !== selectedTech) return false;
      if (selectedMonth) {
        const [y, m] = selectedMonth.split('-').map(n => parseInt(n, 10));
        const d = new Date(p.date);
        if (d.getFullYear() !== y || d.getMonth() + 1 !== m) return false;
      }
      return true;
    } else {
      // For mechanics: show if assigned to them OR if technicianId is null (Alle monteurs)
      if (p.technicianId === user?.id || p.technicianId === null) {
        if (selectedMonth) {
          const [y, m] = selectedMonth.split('-').map(n => parseInt(n, 10));
          const d = new Date(p.date);
          if (d.getFullYear() !== y || d.getMonth() + 1 !== m) return false;
        }
        return true;
      }
      return false;
    }
  });

  const projectsByStatus: Record<Project['status'], Project[]> = {
    'in-progress': [],
    'needs-review': [],
    'completed': []
  };
  filteredProjects.forEach(p => {
    projectsByStatus[p.status].push(p);
  });

  // Set all status sections collapsed by default, only open if there are projects in that status
  useEffect(() => {
    setCollapsed({
      'in-progress': projectsByStatus['in-progress'].length > 0 ? false : true,
      'needs-review': projectsByStatus['needs-review'].length > 0 ? false : true,
      'completed': projectsByStatus['completed'].length > 0 ? false : true,
    });
    // eslint-disable-next-line
  }, [projectsByStatus['in-progress'].length, projectsByStatus['needs-review'].length, projectsByStatus['completed'].length]);

  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [emailDate, setEmailDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [recipientEmail, setRecipientEmail] = useState(() =>
    localStorage.getItem('projectEmailRecipient') || ''
  ); // Admin can set this
  const [webhookUrl, setWebhookUrl] = useState(() =>
    localStorage.getItem('projectEmailWebhook') || ''
  ); // Admin can set this
  const [emailConfigId, setEmailConfigId] = useState<string | null>(null);
  const [showEmailConfig, setShowEmailConfig] = useState(false);

  // Fetch saved email config from Supabase if available
  useEffect(() => {
    const fetchEmailConfig = async () => {
      // @ts-expect-error Type instantiation is excessively deep and possibly infinite
      const result = await supabase
        .from('ai_assistant_config')
        .select('id, project_email_recipient, project_email_webhook')
        .eq('type', 'email')
        .single();
      const { data, error } = result as any;
      if (!error && data && typeof data === 'object' && data !== null && 'id' in data) {
        setEmailConfigId((data as any).id);
        if ((data as any).project_email_recipient) {
          setRecipientEmail((data as any).project_email_recipient);
          localStorage.setItem('projectEmailRecipient', (data as any).project_email_recipient);
        }
        if ((data as any).project_email_webhook) {
          setWebhookUrl((data as any).project_email_webhook);
          localStorage.setItem('projectEmailWebhook', (data as any).project_email_webhook);
        }
      }
    };
    fetchEmailConfig();
  }, []);

  // Set default month filter to current month on mount
  useEffect(() => {
    if (!selectedMonth) {
      const now = new Date();
      const monthStr = now.toISOString().slice(0, 7);
      setSelectedMonth(monthStr);
    }
    // eslint-disable-next-line
  }, []);

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
      const existing = editingProject?.images?.length || 0;
      const allowed = 5 - (selectedImages.length + existing);
      const newImages = Array.from(files).slice(0, allowed);
      setSelectedImages(prev => [...prev, ...newImages]);
    }
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !newProject.title ||
      !newProject.date ||
      (!isOpdrachtgever && !newProject.customerId) ||
      ((isAdmin || isOpdrachtgever) && !newProject.technicianId) ||
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

    // Map 'all' to null for DB
    const technicianIdToSave = isAdmin
      ? (newProject.technicianId === 'all' ? null : newProject.technicianId)
      : user?.id;

    let projectId: string | null = null;

    if (editingProject) {
      const { error } = await supabase
        .from('projects')
        .update({
          title: newProject.title,
          description: newProject.description,
          date: newProject.date,
          hours_spent: newProject.hoursSpent !== '' ? parseFloat(newProject.hoursSpent) : 0,
          status: newProject.status,
          customer_id: newProject.customerId,
          technician_id: technicianIdToSave,
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
        hours_spent: newProject.hoursSpent !== '' ? parseFloat(newProject.hoursSpent) : 0,
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
        const existing = editingProject?.images || [];
        const { error } = await supabase
          .from('projects')
          .update({ images: existing.concat(urls) })
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
      technicianId: '',
      isPublic: false
    });
    setSelectedImages([]);
    setShowAddForm(false);
    setEditingProject(null);
  };

  const handleEdit = (project: Project) => {
    // Allow edit if admin, assigned mechanic, or 'Alle monteurs' (null)
    if (!isAdmin && project.technicianId !== user?.id && project.technicianId !== null) {
      toast({ title: "Fout", description: "Je kunt alleen je eigen projecten of 'Alle monteurs' projecten bewerken", variant: "destructive" });
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
      technicianId: project.technicianId,
      isPublic: project.isPublic || false
    });
    setSelectedImages([]);
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

  const handleStatusChange = async (project: Project, newStatus: Project['status']) => {
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
    isAdmin || project.technicianId === user?.id || project.technicianId === null;

  // --- Details modal open/close ---
  const openDetails = (project: Project) => {
    setSelectedProject(project);
    setDetailsOpen(true);
  };

  // PROJECTCARD inclusief tooltip op hover én statusknoppen
  const renderProjectCard = (project: Project) => (
    <Tooltip key={project.id}>
      <TooltipTrigger asChild>
        <Card
          className="bg-white hover:shadow-lg transition-shadow duration-200 cursor-pointer"
          onClick={() => openDetails(project)}
        >
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  {project.title}
                  {project.technicianId === null && (
                    <span className="ml-2 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold border border-blue-300">Alle monteurs</span>
                  )}
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
                  {(isAdmin || project.technicianId === user?.id || project.technicianId === null) && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={e => { e.stopPropagation(); handleEdit(project); }}
                      className="h-8 w-8 p-0"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  )}
                  {(isAdmin || project.technicianId === user?.id) && (
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={e => { e.stopPropagation(); handleDelete(project.id, project); }}
                        className="h-8 w-8 p-0 border-red-300 text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
                  onClick={e => { e.stopPropagation(); handleStatusChange(project, 'in-progress'); }}
                  variant={project.status === 'in-progress' ? 'default' : 'outline'}
                  className="text-xs"
                >
                  <Clock className="h-3 w-3 mr-1" /> In Behandeling
                </Button>
                <Button
                  size="sm"
                  onClick={e => { e.stopPropagation(); handleStatusChange(project, 'needs-review'); }}
                  variant={project.status === 'needs-review' ? 'default' : 'outline'}
                  className="text-xs"
                >
                  <AlertCircle className="h-3 w-3 mr-1" /> Controle Nodig
                </Button>
                <Button
                  size="sm"
                  onClick={e => { e.stopPropagation(); handleStatusChange(project, 'completed'); }}
                  variant={project.status === 'completed' ? 'default' : 'outline'}
                  className="text-xs"
                >
                  <CheckCircle className="h-3 w-3 mr-1" /> Voltooid
                </Button>
              </div>
            )}
            {project.images?.length > 0 && signedPreviewUrls[project.id]?.length > 0 && (
              <div className="mt-2 grid grid-cols-2 gap-2">
                {signedPreviewUrls[project.id].map((url, idx) => (
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

  // Directly send day report to n8n webhook
  const sendDayReportDirect = async () => {
    if (!webhookUrl) {
      toast({ title: 'Fout', description: 'Geen webhook URL ingesteld', variant: 'destructive' });
      return;
    }
    // Fetch projects for the selected date from Supabase
    let projects = [];
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, title, description, hours_spent, images, technician_id, customer_id, date')
        .eq('date', emailDate);
      if (error) throw error;
      projects = data;
    } catch (err) {
      toast({ title: 'Fout', description: 'Kon projecten niet ophalen', variant: 'destructive' });
      return;
    }
    // Post directly to n8n webhook
    const resp = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: emailDate,
        recipient: recipientEmail,
        projects
      })
    });
    let data;
    try { data = await resp.json(); } catch { data = {}; }
    if (resp.ok) {
      toast({ title: 'Succes', description: 'Dagrapport verstuurd', variant: 'default' });
      setShowEmailDialog(false);
    } else {
      toast({ title: 'Fout', description: data.error || 'Kon email niet versturen', variant: 'destructive' });
    }
  };

  const saveEmailConfig = () => {
    localStorage.setItem('projectEmailRecipient', recipientEmail);
    localStorage.setItem('projectEmailWebhook', webhookUrl);
    const save = async () => {
      let error;
      if (emailConfigId) {
        ({ error } = await supabase
          .from('ai_assistant_config')
          .update({
            project_email_recipient: recipientEmail,
            project_email_webhook: webhookUrl,
            type: 'email',
          } as any)
          .eq('id', emailConfigId));
      } else {
        const { error: insertError, data } = await supabase
          .from('ai_assistant_config')
          .insert([{ project_email_recipient: recipientEmail, project_email_webhook: webhookUrl, type: 'email' } as any])
          .select()
          .single();
        error = insertError;
        if (!insertError && data) setEmailConfigId((data as any).id);
      }
      if (error) {
        toast({ title: 'Fout', description: 'Kon instellingen niet opslaan', variant: 'destructive' });
      } else {
        toast({ title: 'Succes', description: 'Email instellingen opgeslagen' });
        setShowEmailConfig(false);
      }
    };
    save();
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="mb-2 text-3xl font-bold text-gray-900">{isAdmin ? 'Alle Projecten' : 'Mijn Projecten'}</h1>
            <p className="text-gray-600">{isAdmin ? 'Bekijk alle monteur projecten' : 'Volg je dagelijkse projecten en werk'}</p>
          </div>
          <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
            {isAdmin && (
              <Button onClick={() => setShowEmailConfig(true)} variant="outline" className="border-red-600 text-red-600 hover:bg-red-50 w-full md:w-auto">Email Instellen</Button>
            )}
            {isAdminOrOpdrachtgever && (
              <Button onClick={() => setShowEmailDialog(true)} className="bg-blue-600 text-white hover:bg-blue-700 w-full md:w-auto">Email dagrapport</Button>
            )}
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
                  technicianId: '',
                  isPublic: false
                });
              }}
              className="bg-red-600 text-white hover:bg-red-700 w-full md:w-auto"
            >
              <Plus className="mr-2 h-4 w-4" />
              {showAddForm ? 'Annuleren' : 'Project Toevoegen'}
            </Button>
          </div>
        </div>

        {/* FILTER BAR */}
        {(isAdminOrOpdrachtgever) && (
          <div className="mb-6 flex flex-col md:flex-row md:items-center md:space-x-6 space-y-2 md:space-y-0">
            <div>
              <TechnicianFilter
                technicians={technicians}
                selectedTechnician={selectedTech}
                onTechnicianChange={setSelectedTech}
              />
            </div>
            <div className="flex items-center space-x-2">
              <label htmlFor="monthPicker" className="text-gray-600 whitespace-nowrap text-xs md:text-base">
                Selecteer maand:
              </label>
              <input
                id="monthPicker"
                type="month"
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
                className="border rounded px-1 py-1 text-xs md:text-base focus:ring-2 focus:ring-red-500"
              />
              <button
                type="button"
                onClick={() => setSelectedMonth('')}
                className="px-2 py-1 text-xs md:px-3 md:py-1 bg-red-600 text-white rounded hover:bg-red-700 transition"
              >
                Alles weergeven
              </button>
            </div>
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
                {/* Customer select: only for admin and technician, not opdrachtgever */}
                {isAdmin && (
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
                )}
                {isOpdrachtgever && (
                  <input type="hidden" value={newProject.customerId} />
                )}
                {/* Mechanic select: show for admin and opdrachtgever, not for technicians */}
                {(isAdmin || isOpdrachtgever) && (
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
                      <option value="all">Alle monteurs</option>
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
                  <Label>Afbeeldingen (max 5)</Label>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {editingProject?.images?.map((url, i) => (
                      <div key={i} className="relative">
                        <img src={url} alt="bestaande afbeelding" className="h-24 w-full object-cover rounded" />
                        {(isAdmin || editingProject.technicianId === user?.id) && (
                          <button
                            type="button"
                            onClick={async () => {
                              // Remove image from project in DB
                              const newImages = editingProject.images.filter((_, idx) => idx !== i);
                              const { error } = await supabase
                                .from('projects')
                                .update({ images: newImages })
                                .eq('id', editingProject.id);
                              if (error) {
                                toast({ title: 'Fout', description: error.message, variant: 'destructive' });
                              } else {
                                // Update local state
                                setEditingProject({ ...editingProject, images: newImages });
                                // Also update projects list
                                setProjects(prev => prev.map(p => p.id === editingProject.id ? { ...p, images: newImages } : p));
                                toast({ title: 'Succes', description: 'Afbeelding verwijderd' });
                              }
                            }}
                            className="absolute top-1 right-1 bg-white rounded-full p-0.5 shadow border border-red-300 text-red-600 hover:bg-red-50"
                            title="Verwijder afbeelding"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    ))}
                    {selectedImages.map((file, idx) => (
                      <div key={idx} className="relative">
                        <img src={URL.createObjectURL(file)} alt="preview" className="h-24 w-full object-cover rounded" />
                        <button type="button" onClick={() => removeImage(idx)} className="absolute top-1 right-1 bg-white rounded-full p-0.5 shadow">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                  {((editingProject?.images?.length || 0) + selectedImages.length) < 5 && (
                    <label className="mt-2 inline-flex items-center gap-2 cursor-pointer">
                      <Camera className="h-5 w-5" />
                      <span className="text-sm">Voeg afbeeldingen toe</span>
                      <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
                    </label>
                  )}
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
                className="mb-4 flex cursor-pointer items-center select-none text-xl font-semibold text-gray-900 gap-2"
              >
                {getStatusText(status)}
                <span className={`inline-flex items-center justify-center rounded-full text-xs font-bold px-2 py-0.5 ${projectsByStatus[status].length > 0 ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'}`}
                  style={{ minWidth: 28 }}>
                  {projectsByStatus[status].length}
                </span>
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
      {/* DETAILS MODAL */}
      {selectedProject && detailsOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-xl w-full relative">
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-red-500 text-2xl"
              onClick={() => setDetailsOpen(false)}
            >
              &times;
            </button>
            <h2 className="text-xl font-bold mb-2">{selectedProject.title}</h2>
            <div className="mb-2 text-gray-600">{selectedProject.customerName}</div>
            <div className="mb-2">{selectedProject.description || <span className="text-gray-400">Geen omschrijving</span>}</div>
            <div className="grid grid-cols-2 gap-3 mt-4">
              {signedImageUrls && signedImageUrls.length > 0 ? (
                signedImageUrls.map((url, i) => (
                  <img
                    key={i}
                    src={url}
                    alt={`Projectafbeelding ${i + 1}`}
                    className="w-full rounded cursor-zoom-in"
                    style={{ maxHeight: 140, objectFit: 'cover' }}
                    onClick={() => setFullscreenImageIndex(i)}
                  />
                ))
              ) : (
                <div className="col-span-2 text-gray-400">Geen afbeeldingen toegevoegd</div>
              )}
            </div>
            {(isAdmin || selectedProject.technicianId === user?.id) && (
              <div className="mt-4 text-right">
                <Button
                  size="sm"
                  onClick={() => {
                    setDetailsOpen(false);
                    handleEdit(selectedProject);
                  }}
                >
                  Bewerken
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
      {/* FULLSCREEN GALERIJ OVERLAY */}
      {fullscreenImageIndex !== null && signedImageUrls.length > 0 && (
        <div
          ref={swipeRef}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-95 select-none"
          onClick={() => setFullscreenImageIndex(null)}
          style={{ cursor: 'zoom-out', touchAction: 'none' }}
        >
          {/* Vorige */}
          {signedImageUrls.length > 1 && (
            <button
              onClick={e => {
                e.stopPropagation();
                setFullscreenImageIndex(i =>
                  i === null ? 0 : mod(i - 1, signedImageUrls.length)
                );
              }}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/90 text-white rounded-full p-3 text-3xl z-10"
              aria-label="Vorige foto"
              style={{ userSelect: 'none' }}
            >
              &#8592;
            </button>
          )}
          {/* Volgende */}
          {signedImageUrls.length > 1 && (
            <button
              onClick={e => {
                e.stopPropagation();
                setFullscreenImageIndex(i =>
                  i === null ? 0 : mod(i + 1, signedImageUrls.length)
                );
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/90 text-white rounded-full p-3 text-3xl z-10"
              aria-label="Volgende foto"
              style={{ userSelect: 'none' }}
            >
              &#8594;
            </button>
          )}
          {/* Sluitknop */}
          <button
            onClick={e => { e.stopPropagation(); setFullscreenImageIndex(null); }}
            className="absolute top-4 right-4 bg-black/70 hover:bg-black/90 text-white rounded-full p-3 text-2xl z-10 shadow-md"
            aria-label="Sluiten"
            style={{ lineHeight: 1 }}
          >
            &times;
          </button>
          {/* Foto */}
          <img
            src={signedImageUrls[fullscreenImageIndex]}
            alt={`Projectafbeelding ${fullscreenImageIndex + 1}`}
            className="w-screen h-screen object-contain bg-black select-none"
            style={{ display: 'block', maxWidth: '100vw', maxHeight: '100vh' }}
            draggable={false}
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
      {/* Email Config Dialog (only for admin) */}
      {isAdmin && (
        <Dialog open={showEmailConfig} onOpenChange={setShowEmailConfig}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Email Ontvanger Instellen</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="recipientEmail">Ontvanger Email</Label>
              <Input
                id="recipientEmail"
                value={recipientEmail}
                onChange={e => setRecipientEmail(e.target.value)}
                placeholder="voorbeeld@email.nl"
                type="email"
              />
              <Label htmlFor="webhookUrl">n8n Webhook URL</Label>
              <Input
                id="webhookUrl"
                value={webhookUrl}
                onChange={e => setWebhookUrl(e.target.value)}
                placeholder="https://jouw-n8n-endpoint"
                type="url"
              />
              <p className="text-xs text-gray-500">Plak hier de n8n webhook link waar het dagrapport naartoe gestuurd wordt.</p>
            </div>
            <DialogFooter>
              <Button onClick={saveEmailConfig} className="bg-red-600 text-white">Opslaan</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      {/* Email Day Report Dialog */}
      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Email Dagrapport</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="emailDate">Selecteer dag</Label>
              <Input
                id="emailDate"
                type="date"
                value={emailDate}
                onChange={e => setEmailDate(e.target.value)}
                className="w-full"
              />
            </div>
            <div>
              <Label>Monteurs</Label>
              <ul className="list-disc ml-6">
                {techniciansList.map(t => (
                  <li key={t.id}>{t.name}</li>
                ))}
              </ul>
            </div>
            <div>
              <Label>Ontvanger</Label>
              <p className="text-sm text-gray-700">{recipientEmail || 'Geen email ingesteld'}</p>
            </div>
            <div>
              <Label>n8n Webhook</Label>
              <p className="text-xs text-gray-500 break-all">{webhookUrl || 'Geen webhook ingesteld'}</p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={sendDayReportDirect} className="bg-blue-600 text-white">Stuur Dagrapport</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Projects;


import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Project } from '@/types/projects';
import { Camera, X, Plus } from 'lucide-react';

// Mock data
const mockProjects: Project[] = [
  {
    id: '1',
    technicianId: '2',
    technicianName: 'Jan de Vries',
    date: '2024-06-15',
    title: 'HVAC Installation',
    description: 'Installed new HVAC system at Amsterdam office building',
    images: [],
    hoursSpent: 8,
    createdAt: '2024-06-15T08:00:00Z'
  }
];

const Projects = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [newProject, setNewProject] = useState({
    title: '',
    description: '',
    hoursSpent: '',
    date: new Date().toISOString().split('T')[0] // Auto-fill with today's date
  });

  const isAdmin = user?.role === 'admin';
  const filteredProjects = isAdmin 
    ? mockProjects 
    : mockProjects.filter(project => project.technicianId === user?.id);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newProject.title || !newProject.date || !newProject.hoursSpent) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    const hours = parseFloat(newProject.hoursSpent);
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
      description: "Project added successfully"
    });

    setNewProject({
      title: '',
      description: '',
      hoursSpent: '',
      date: new Date().toISOString().split('T')[0]
    });
    setSelectedImages([]);
    setShowAddForm(false);
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {isAdmin ? 'All Projects' : 'My Projects'}
            </h1>
            <p className="text-gray-600">
              {isAdmin ? 'View all technician projects' : 'Track your daily projects and work'}
            </p>
          </div>
          <Button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {showAddForm ? 'Cancel' : 'Add Project'}
          </Button>
        </div>

        {/* Add Project Form */}
        {showAddForm && (
          <Card className="bg-white mb-6">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900">Add New Project</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Project Title *</Label>
                    <Input
                      id="title"
                      value={newProject.title}
                      onChange={(e) => setNewProject({ ...newProject, title: e.target.value })}
                      placeholder="e.g., HVAC Installation"
                      required
                      className="focus:ring-red-500 focus:border-red-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="date">Date *</Label>
                    <Input
                      id="date"
                      type="date"
                      value={newProject.date}
                      onChange={(e) => setNewProject({ ...newProject, date: e.target.value })}
                      required
                      className="focus:ring-red-500 focus:border-red-500"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="hours">Hours Spent *</Label>
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

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newProject.description}
                    onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                    placeholder="Describe the work performed..."
                    className="focus:ring-red-500 focus:border-red-500"
                    rows={3}
                  />
                </div>

                {/* Image Upload */}
                <div className="space-y-2">
                  <Label>Project Images (Max 5)</Label>
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
                          Click to upload images
                        </label>
                      </div>
                      <p className="text-sm text-gray-500">PNG, JPG up to 10MB each</p>
                    </div>
                  </div>

                  {/* Image Preview */}
                  {selectedImages.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mt-4">
                      {selectedImages.map((image, index) => (
                        <div key={index} className="relative">
                          <img
                            src={URL.createObjectURL(image)}
                            alt={`Preview ${index + 1}`}
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
                  Add Project
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Projects List */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredProjects.length === 0 ? (
            <div className="col-span-2 text-center py-8 text-gray-500">
              No projects found
            </div>
          ) : (
            filteredProjects.map((project) => (
              <Card key={project.id} className="bg-white">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg font-semibold text-gray-900">
                        {project.title}
                      </CardTitle>
                      {isAdmin && (
                        <p className="text-sm text-gray-600">{project.technicianName}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">
                        {new Date(project.date).toLocaleDateString()}
                      </p>
                      <p className="text-lg font-semibold text-red-600">
                        {project.hoursSpent}h
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 mb-4">{project.description}</p>
                  {project.images.length > 0 && (
                    <div className="grid grid-cols-3 gap-2">
                      {project.images.map((image, index) => (
                        <img
                          key={index}
                          src={image}
                          alt={`Project image ${index + 1}`}
                          className="w-full h-20 object-cover rounded"
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Projects;

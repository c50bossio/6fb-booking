'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ImageUpload } from '@/components/ui/ImageUpload';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { 
  Image as ImageIcon, 
  Plus, 
  Edit, 
  Trash2, 
  Star, 
  Award
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface PortfolioImage {
  id: number;
  image_url: string;
  title?: string;
  description?: string;
  is_featured: boolean;
  display_order: number;
  created_at: string;
  updated_at?: string;
}

interface Specialty {
  id: number;
  specialty_name: string;
  category?: string;
  experience_level?: string;
  is_primary: boolean;
  created_at: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const SPECIALTY_CATEGORIES = [
  'cuts',
  'styling', 
  'coloring',
  'beard',
  'specialty_cuts',
  'treatments',
  'other'
];

const EXPERIENCE_LEVELS = [
  'beginner',
  'intermediate', 
  'advanced',
  'expert'
];

export default function BarberPortfolioPage() {
  const [portfolioImages, setPortfolioImages] = useState<PortfolioImage[]>([]);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [loading, setLoading] = useState(true);
  const [barberId, setBarberId] = useState<number | null>(null);
  
  // Modal states
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [specialtyModalOpen, setSpecialtyModalOpen] = useState(false);
  const [editingImage, setEditingImage] = useState<PortfolioImage | null>(null);

  // Form states
  const [imageForm, setImageForm] = useState({
    title: '',
    description: '',
    is_featured: false,
    display_order: 0
  });
  const [imageFiles, setImageFiles] = useState<string[]>([]);
  
  const [specialtyForm, setSpecialtyForm] = useState({
    specialty_name: '',
    category: '',
    experience_level: '',
    is_primary: false
  });

  // Get current user info and fetch data
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.id) {
      setBarberId(user.id);
      fetchPortfolioData(user.id);
    } else {
      toast({
        title: 'Error',
        description: 'User information not found',
        variant: 'destructive',
      });
      setLoading(false);
    }
  }, []);

  const fetchPortfolioData = async (barberId: number) => {
    try {
      const token = localStorage.getItem('token');
      
      // Fetch portfolio images
      const imagesResponse = await fetch(`${API_URL}/api/v2/barber-profiles/${barberId}/portfolio`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (imagesResponse.ok) {
        const imagesData = await imagesResponse.json();
        setPortfolioImages(imagesData);
      }

      // Fetch specialties
      const specialtiesResponse = await fetch(`${API_URL}/api/v2/barber-profiles/${barberId}/specialties`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (specialtiesResponse.ok) {
        const specialtiesData = await specialtiesResponse.json();
        setSpecialties(specialtiesData);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching portfolio data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load portfolio data',
        variant: 'destructive',
      });
      setLoading(false);
    }
  };

  // Portfolio Image Management
  const handleSaveImage = async () => {
    if (!barberId || imageFiles.length === 0) {
      toast({
        title: 'Error',
        description: 'Please upload an image',
        variant: 'destructive',
      });
      return;
    }

    try {
      const token = localStorage.getItem('token');
      
      if (editingImage) {
        // Update existing image
        const response = await fetch(`${API_URL}/api/v2/barber-profiles/${barberId}/portfolio/${editingImage.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            title: imageForm.title || null,
            description: imageForm.description || null,
            is_featured: imageForm.is_featured,
            display_order: imageForm.display_order
          })
        });

        if (response.ok) {
          await fetchPortfolioData(barberId);
          toast({
            title: 'Success',
            description: 'Portfolio image updated successfully',
          });
        }
      } else {
        // Create new image
        const response = await fetch(`${API_URL}/api/v2/barber-profiles/${barberId}/portfolio`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            image_url: imageFiles[0],
            title: imageForm.title || null,
            description: imageForm.description || null,
            is_featured: imageForm.is_featured,
            display_order: imageForm.display_order || portfolioImages.length
          })
        });

        if (response.ok) {
          await fetchPortfolioData(barberId);
          toast({
            title: 'Success',
            description: 'Portfolio image added successfully',
          });
        }
      }

      // Reset form and close modal
      setImageForm({ title: '', description: '', is_featured: false, display_order: 0 });
      setImageFiles([]);
      setEditingImage(null);
      setImageModalOpen(false);
      
    } catch (error) {
      console.error('Error saving image:', error);
      toast({
        title: 'Error',
        description: 'Failed to save image',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteImage = async (imageId: number) => {
    if (!barberId) return;

    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${API_URL}/api/v2/barber-profiles/${barberId}/portfolio/${imageId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        await fetchPortfolioData(barberId);
        toast({
          title: 'Success',
          description: 'Portfolio image deleted successfully',
        });
      }
    } catch (error) {
      console.error('Error deleting image:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete image',
        variant: 'destructive',
      });
    }
  };

  const handleEditImage = (image: PortfolioImage) => {
    setEditingImage(image);
    setImageForm({
      title: image.title || '',
      description: image.description || '',
      is_featured: image.is_featured,
      display_order: image.display_order
    });
    setImageFiles([image.image_url]);
    setImageModalOpen(true);
  };

  // Specialty Management
  const handleSaveSpecialty = async () => {
    if (!barberId || !specialtyForm.specialty_name.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a specialty name',
        variant: 'destructive',
      });
      return;
    }

    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${API_URL}/api/v2/barber-profiles/${barberId}/specialties`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          specialty_name: specialtyForm.specialty_name,
          category: specialtyForm.category || null,
          experience_level: specialtyForm.experience_level || null,
          is_primary: specialtyForm.is_primary
        })
      });

      if (response.ok) {
        await fetchPortfolioData(barberId);
        toast({
          title: 'Success',
          description: 'Specialty added successfully',
        });
        
        // Reset form and close modal
        setSpecialtyForm({
          specialty_name: '',
          category: '',
          experience_level: '',
          is_primary: false
        });
        setSpecialtyModalOpen(false);
      }
    } catch (error) {
      console.error('Error saving specialty:', error);
      toast({
        title: 'Error',
        description: 'Failed to save specialty',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteSpecialty = async (specialtyId: number) => {
    if (!barberId) return;

    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${API_URL}/api/v2/barber-profiles/${barberId}/specialties/${specialtyId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        await fetchPortfolioData(barberId);
        toast({
          title: 'Success',
          description: 'Specialty removed successfully',
        });
      }
    } catch (error) {
      console.error('Error deleting specialty:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete specialty',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
          <div className="grid gap-6">
            <div className="h-64 bg-gray-200 rounded"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">My Portfolio</h1>
        <p className="text-gray-600">
          Showcase your best work and highlight your specialties to attract clients.
        </p>
      </div>

      <Tabs defaultValue="images" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="images">Portfolio Images</TabsTrigger>
          <TabsTrigger value="specialties">Specialties</TabsTrigger>
        </TabsList>

        <TabsContent value="images" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold">Portfolio Images</h2>
              <p className="text-gray-600">Show off your best cuts and styles</p>
            </div>
            <Dialog open={imageModalOpen} onOpenChange={setImageModalOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Add Image
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {editingImage ? 'Edit Portfolio Image' : 'Add Portfolio Image'}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Image</Label>
                    <ImageUpload
                      value={imageFiles}
                      onChange={setImageFiles}
                      maxFiles={1}
                      maxSize={10}
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="imageTitle">Title (Optional)</Label>
                    <Input
                      id="imageTitle"
                      placeholder="e.g. Classic Fade"
                      value={imageForm.title}
                      onChange={(e) => setImageForm(prev => ({ ...prev, title: e.target.value }))}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="imageDescription">Description (Optional)</Label>
                    <Textarea
                      id="imageDescription"
                      placeholder="Describe the style or technique used..."
                      value={imageForm.description}
                      onChange={(e) => setImageForm(prev => ({ ...prev, description: e.target.value }))}
                      rows={2}
                    />
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="featured"
                      checked={imageForm.is_featured}
                      onCheckedChange={(checked) => setImageForm(prev => ({ ...prev, is_featured: checked }))}
                    />
                    <Label htmlFor="featured">Featured Image</Label>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button onClick={handleSaveImage} className="flex-1">
                      {editingImage ? 'Update' : 'Add'} Image
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setImageModalOpen(false);
                        setEditingImage(null);
                        setImageForm({ title: '', description: '', is_featured: false, display_order: 0 });
                        setImageFiles([]);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {portfolioImages.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Portfolio Images</h3>
                <p className="text-gray-600 mb-4">
                  Start building your portfolio by adding images of your best work.
                </p>
                <Button onClick={() => setImageModalOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Image
                </Button>
              </div>
            ) : (
              portfolioImages.map((image) => (
                <Card key={image.id} className="overflow-hidden">
                  <div className="relative aspect-square">
                    <img
                      src={image.image_url}
                      alt={image.title || 'Portfolio image'}
                      className="w-full h-full object-cover"
                    />
                    {image.is_featured && (
                      <Badge className="absolute top-2 left-2 bg-yellow-500">
                        <Star className="h-3 w-3 mr-1" />
                        Featured
                      </Badge>
                    )}
                    <div className="absolute top-2 right-2 flex gap-1">
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-8 w-8 p-0"
                        onClick={() => handleEditImage(image)}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="h-8 w-8 p-0"
                        onClick={() => handleDeleteImage(image.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  {(image.title || image.description) && (
                    <CardContent className="p-4">
                      {image.title && (
                        <h3 className="font-medium mb-1">{image.title}</h3>
                      )}
                      {image.description && (
                        <p className="text-sm text-gray-600">{image.description}</p>
                      )}
                    </CardContent>
                  )}
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="specialties" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold">Your Specialties</h2>
              <p className="text-gray-600">List your skills and areas of expertise</p>
            </div>
            <Dialog open={specialtyModalOpen} onOpenChange={setSpecialtyModalOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Add Specialty
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Add Specialty</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="specialtyName">Specialty Name *</Label>
                    <Input
                      id="specialtyName"
                      placeholder="e.g. Fade Cuts, Beard Styling"
                      value={specialtyForm.specialty_name}
                      onChange={(e) => setSpecialtyForm(prev => ({ ...prev, specialty_name: e.target.value }))}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="category">Category</Label>
                    <select
                      id="category"
                      className="w-full mt-1 p-2 border border-gray-300 rounded-md"
                      value={specialtyForm.category}
                      onChange={(e) => setSpecialtyForm(prev => ({ ...prev, category: e.target.value }))}
                    >
                      <option value="">Select category...</option>
                      {SPECIALTY_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>
                          {cat.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <Label htmlFor="experienceLevel">Experience Level</Label>
                    <select
                      id="experienceLevel"
                      className="w-full mt-1 p-2 border border-gray-300 rounded-md"
                      value={specialtyForm.experience_level}
                      onChange={(e) => setSpecialtyForm(prev => ({ ...prev, experience_level: e.target.value }))}
                    >
                      <option value="">Select level...</option>
                      {EXPERIENCE_LEVELS.map(level => (
                        <option key={level} value={level}>
                          {level.charAt(0).toUpperCase() + level.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="primarySpecialty"
                      checked={specialtyForm.is_primary}
                      onCheckedChange={(checked) => setSpecialtyForm(prev => ({ ...prev, is_primary: checked }))}
                    />
                    <Label htmlFor="primarySpecialty">Primary Specialty</Label>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button onClick={handleSaveSpecialty} className="flex-1">
                      Add Specialty
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setSpecialtyModalOpen(false);
                        setSpecialtyForm({
                          specialty_name: '',
                          category: '',
                          experience_level: '',
                          is_primary: false
                        });
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4">
            {specialties.length === 0 ? (
              <div className="text-center py-12">
                <Award className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Specialties Added</h3>
                <p className="text-gray-600 mb-4">
                  Add your specialties to help clients understand what services you offer.
                </p>
                <Button onClick={() => setSpecialtyModalOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Specialty
                </Button>
              </div>
            ) : (
              specialties.map((specialty) => (
                <Card key={specialty.id}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-medium">{specialty.specialty_name}</h3>
                          {specialty.is_primary && (
                            <Badge variant="default" className="text-xs">
                              <Star className="h-3 w-3 mr-1" />
                              Primary
                            </Badge>
                          )}
                        </div>
                        <div className="flex gap-2 text-sm text-gray-600">
                          {specialty.category && (
                            <Badge variant="outline">
                              {specialty.category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </Badge>
                          )}
                          {specialty.experience_level && (
                            <Badge variant="outline">
                              {specialty.experience_level.charAt(0).toUpperCase() + specialty.experience_level.slice(1)}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteSpecialty(specialty.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
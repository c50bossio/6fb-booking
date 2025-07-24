'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ImageUpload } from '@/components/ui/ImageUpload';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { 
  User, 
  Camera, 
  Save, 
  Award, 
  Star, 
  Link as LinkIcon,
  Instagram,
  Facebook,
  TwitterIcon as XIcon,
  Globe,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface BarberProfile {
  id: number;
  name: string;
  email: string;
  bio?: string;
  years_experience?: number;
  profile_image_url?: string;
  social_links?: {
    instagram?: string;
    facebook?: string;
    twitter?: string;
    website?: string;
  };
  profile_completed: boolean;
  specialties: Array<{
    id: number;
    specialty_name: string;
    category?: string;
    experience_level?: string;
    is_primary: boolean;
  }>;
  portfolio_images: Array<{
    id: number;
    image_url: string;
    title?: string;
    description?: string;
    is_featured: boolean;
    display_order: number;
  }>;
  created_at: string;
}

interface ProfileCompletion {
  completion_percentage: number;
  missing_fields: string[];
  suggestions: string[];
  is_public_ready: boolean;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function BarberProfilePage() {
  const [profile, setProfile] = useState<BarberProfile | null>(null);
  const [completion, setCompletion] = useState<ProfileCompletion | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [barberId, setBarberId] = useState<number | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    bio: '',
    years_experience: '',
    social_links: {
      instagram: '',
      facebook: '',
      twitter: '',
      website: ''
    }
  });
  const [profileImage, setProfileImage] = useState<string[]>([]);

  // Get current user info and fetch profile
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.id) {
      setBarberId(user.id);
      fetchProfile(user.id);
    } else {
      toast({
        title: 'Error',
        description: 'User information not found',
        variant: 'destructive',
      });
      setLoading(false);
    }
  }, []);

  const fetchProfile = async (barberId: number) => {
    try {
      const token = localStorage.getItem('token');
      
      // Fetch profile data
      const profileResponse = await fetch(`${API_URL}/api/v2/barber-profiles/${barberId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        setProfile(profileData);
        
        // Initialize form with existing data
        setFormData({
          bio: profileData.bio || '',
          years_experience: profileData.years_experience?.toString() || '',
          social_links: {
            instagram: profileData.social_links?.instagram || '',
            facebook: profileData.social_links?.facebook || '',
            twitter: profileData.social_links?.twitter || '',
            website: profileData.social_links?.website || ''
          }
        });
        
        if (profileData.profile_image_url) {
          setProfileImage([profileData.profile_image_url]);
        }
      }

      // Fetch completion status
      const completionResponse = await fetch(`${API_URL}/api/v2/barber-profiles/${barberId}/completion`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (completionResponse.ok) {
        const completionData = await completionResponse.json();
        setCompletion(completionData);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast({
        title: 'Error',
        description: 'Failed to load profile data',
        variant: 'destructive',
      });
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!barberId) return;

    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      
      const updateData = {
        bio: formData.bio || null,
        years_experience: formData.years_experience ? parseInt(formData.years_experience) : null,
        social_links: formData.social_links,
        profile_image_url: profileImage[0] || null
      };

      const method = profile ? 'PUT' : 'POST';
      const response = await fetch(`${API_URL}/api/v2/barber-profiles/${barberId}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(updateData)
      });

      if (response.ok) {
        const updatedProfile = await response.json();
        setProfile(updatedProfile);
        
        // Refresh completion status
        await fetchProfile(barberId);
        
        toast({
          title: 'Success',
          description: 'Profile updated successfully',
        });
      } else {
        throw new Error('Failed to update profile');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: 'Error',
        description: 'Failed to save profile changes',
        variant: 'destructive',
      });
    }
    setSaving(false);
  };

  const handleImageUpload = async (files: string[]) => {
    if (!barberId || files.length === 0) return;

    try {
      const token = localStorage.getItem('token');
      
      // For now, we'll assume the ImageUpload component handles the actual upload
      // and returns URLs. In a real implementation, you might need to upload to
      // your backend's image upload endpoint first.
      
      setProfileImage(files);
      
      toast({
        title: 'Success',
        description: 'Profile image updated',
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: 'Error',
        description: 'Failed to upload image',
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
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">My Profile</h1>
        <p className="text-gray-600 mb-6">
          Manage your professional profile to showcase your skills and attract clients.
        </p>
        
        {completion && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {completion.is_public_ready ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-orange-600" />
                )}
                Profile Completion
              </CardTitle>
              <CardDescription>
                {completion.is_public_ready 
                  ? 'Your profile is ready for clients to view!' 
                  : 'Complete your profile to attract more clients'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-2">
                  <span>Progress</span>
                  <span>{completion.completion_percentage}%</span>
                </div>
                <Progress value={completion.completion_percentage} className="mb-4" />
              </div>
              
              {completion.missing_fields.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">To improve your profile:</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {completion.suggestions.map((suggestion, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-orange-500 mt-1">•</span>
                        {suggestion}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <Tabs defaultValue="basic" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="basic">Basic Information</TabsTrigger>
          <TabsTrigger value="social">Social Links</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5" />
                Profile Photo
              </CardTitle>
              <CardDescription>
                Upload a professional headshot to build trust with clients
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ImageUpload
                value={profileImage}
                onChange={handleImageUpload}
                maxFiles={1}
                maxSize={5}
                acceptedTypes={['image/jpeg', 'image/png', 'image/webp']}
                className="mb-4"
                disabled={saving}
              />
              <p className="text-sm text-gray-500">
                Recommended: Square image, at least 400x400px
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Professional Information
              </CardTitle>
              <CardDescription>
                Tell clients about your experience and specialties
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="bio">Professional Bio</Label>
                <Textarea
                  id="bio"
                  placeholder="Tell clients about your experience, style, and what makes you unique..."
                  value={formData.bio}
                  onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                  className="mt-1"
                  rows={4}
                />
                <p className="text-sm text-gray-500 mt-1">
                  {formData.bio.length}/1000 characters
                </p>
              </div>

              <div>
                <Label htmlFor="experience">Years of Experience</Label>
                <Input
                  id="experience"
                  type="number"
                  min="0"
                  max="50"
                  placeholder="e.g. 5"
                  value={formData.years_experience}
                  onChange={(e) => setFormData(prev => ({ ...prev, years_experience: e.target.value }))}
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>

          {profile?.specialties && profile.specialties.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Your Specialties
                </CardTitle>
                <CardDescription>
                  Skills and services you offer
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {profile.specialties.map((specialty) => (
                    <Badge 
                      key={specialty.id} 
                      variant={specialty.is_primary ? "default" : "secondary"}
                      className="flex items-center gap-1"
                    >
                      {specialty.is_primary && <Star className="h-3 w-3" />}
                      {specialty.specialty_name}
                    </Badge>
                  ))}
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  Manage your specialties in the Portfolio section
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="social" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LinkIcon className="h-5 w-5" />
                Social Media Links
              </CardTitle>
              <CardDescription>
                Connect your social accounts to showcase your work and build credibility
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="instagram" className="flex items-center gap-2">
                  <Instagram className="h-4 w-4" />
                  Instagram
                </Label>
                <Input
                  id="instagram"
                  type="url"
                  placeholder="https://instagram.com/yourusername"
                  value={formData.social_links.instagram}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    social_links: { ...prev.social_links, instagram: e.target.value }
                  }))}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="facebook" className="flex items-center gap-2">
                  <Facebook className="h-4 w-4" />
                  Facebook
                </Label>
                <Input
                  id="facebook"
                  type="url"
                  placeholder="https://facebook.com/yourusername"
                  value={formData.social_links.facebook}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    social_links: { ...prev.social_links, facebook: e.target.value }
                  }))}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="twitter" className="flex items-center gap-2">
                  <XIcon className="h-4 w-4" />
                  X (Twitter)
                </Label>
                <Input
                  id="twitter"
                  type="url"
                  placeholder="https://x.com/yourusername"
                  value={formData.social_links.twitter}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    social_links: { ...prev.social_links, twitter: e.target.value }
                  }))}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="website" className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Personal Website
                </Label>
                <Input
                  id="website"
                  type="url"
                  placeholder="https://yourwebsite.com"
                  value={formData.social_links.website}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    social_links: { ...prev.social_links, website: e.target.value }
                  }))}
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="mt-8 flex justify-end">
        <Button 
          onClick={handleSaveProfile}
          disabled={saving}
          className="flex items-center gap-2"
        >
          <Save className="h-4 w-4" />
          {saving ? 'Saving...' : 'Save Profile'}
        </Button>
      </div>
    </div>
  );
}
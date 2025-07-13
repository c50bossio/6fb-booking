'use client'

import React, { useState } from 'react'
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Label } from "@/components/ui/Label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  UserPlus, 
  Send, 
  X, 
  Mail, 
  Shield,
  DollarSign,
  BarChart3,
  Users,
  Settings,
  MapPin,
  Calendar,
  CheckCircle,
  AlertTriangle,
  Info
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface Permission {
  id: string
  name: string
  description: string
  category: 'billing' | 'staff' | 'analytics' | 'locations' | 'system'
  icon: React.ComponentType<any>
}

interface UserInviteFormData {
  email: string
  first_name?: string
  last_name?: string
  role: 'super_admin' | 'admin' | 'owner' | 'manager' | 'barber' | 'user'
  permissions: string[]
  locations: number[]
  message?: string
  send_welcome_email: boolean
}

interface UserInviteFormProps {
  organization: any
  isOpen: boolean
  onClose: () => void
  onInvite: (data: UserInviteFormData) => Promise<void>
  availableLocations: any[]
}

const AVAILABLE_PERMISSIONS: Permission[] = [
  {
    id: 'can_manage_billing',
    name: 'Manage Billing',
    description: 'Access to billing information, subscriptions, and payment methods',
    category: 'billing',
    icon: DollarSign
  },
  {
    id: 'can_manage_staff',
    name: 'Manage Staff',
    description: 'Add, edit, and remove team members and their roles',
    category: 'staff',
    icon: Users
  },
  {
    id: 'can_view_analytics',
    name: 'View Analytics',
    description: 'Access to business analytics, reports, and performance metrics',
    category: 'analytics',
    icon: BarChart3
  },
  {
    id: 'can_manage_locations',
    name: 'Manage Locations',
    description: 'Add, edit, and configure barbershop locations',
    category: 'locations',
    icon: MapPin
  },
  {
    id: 'can_manage_appointments',
    name: 'Manage Appointments',
    description: 'Book, modify, and cancel appointments for clients',
    category: 'staff',
    icon: Calendar
  },
  {
    id: 'can_manage_settings',
    name: 'Manage Settings',
    description: 'Access to organization settings and configuration',
    category: 'system',
    icon: Settings
  },
  {
    id: 'can_view_reports',
    name: 'View Reports',
    description: 'Access to detailed business reports and insights',
    category: 'analytics',
    icon: BarChart3
  },
  {
    id: 'can_manage_clients',
    name: 'Manage Clients',
    description: 'Add, edit, and manage client information and history',
    category: 'staff',
    icon: Users
  }
]

const ROLE_TEMPLATES = {
  super_admin: {
    name: 'Super Admin',
    description: 'Complete system access across all organizations',
    permissions: AVAILABLE_PERMISSIONS.map(p => p.id),
    badge_color: 'bg-red-100 text-red-800'
  },
  admin: {
    name: 'Admin',
    description: 'Full administrative access to this organization',
    permissions: AVAILABLE_PERMISSIONS.filter(p => p.category !== 'system').map(p => p.id),
    badge_color: 'bg-purple-100 text-purple-800'
  },
  owner: {
    name: 'Owner',
    description: 'Business owner with billing and management access',
    permissions: ['can_manage_billing', 'can_manage_staff', 'can_view_analytics', 'can_manage_locations', 'can_manage_settings'],
    badge_color: 'bg-yellow-100 text-yellow-800'
  },
  manager: {
    name: 'Manager',
    description: 'Location manager with staff and operational access',
    permissions: ['can_manage_staff', 'can_view_analytics', 'can_manage_appointments', 'can_manage_clients'],
    badge_color: 'bg-blue-100 text-blue-800'
  },
  barber: {
    name: 'Barber',
    description: 'Barber with appointment and client management access',
    permissions: ['can_manage_appointments', 'can_manage_clients', 'can_view_reports'],
    badge_color: 'bg-green-100 text-green-800'
  },
  user: {
    name: 'User',
    description: 'Basic user with limited access',
    permissions: ['can_view_reports'],
    badge_color: 'bg-gray-100 text-gray-800'
  }
}

export default function UserInviteForm({ 
  organization, 
  isOpen, 
  onClose, 
  onInvite,
  availableLocations 
}: UserInviteFormProps) {
  const { toast } = useToast()
  const [formData, setFormData] = useState<UserInviteFormData>({
    email: '',
    first_name: '',
    last_name: '',
    role: 'user',
    permissions: ['can_view_reports'],
    locations: [],
    message: '',
    send_welcome_email: true
  })
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [selectedRole, setSelectedRole] = useState<keyof typeof ROLE_TEMPLATES>('user')

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.email.trim()) {
      newErrors.email = 'Email address is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }

    if (formData.permissions.length === 0) {
      newErrors.permissions = 'At least one permission must be selected'
    }

    if (formData.locations.length === 0 && availableLocations.length > 0) {
      newErrors.locations = 'At least one location must be selected'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      toast({
        title: 'Validation Error',
        description: 'Please correct the errors below',
        variant: 'destructive'
      })
      return
    }

    try {
      setIsLoading(true)
      await onInvite(formData)
      toast({
        title: 'Invitation Sent',
        description: `Invitation sent to ${formData.email}`,
      })
      onClose()
    } catch (error) {
      console.error('Failed to send invitation:', error)
      toast({
        title: 'Error',
        description: 'Failed to send invitation',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleRoleChange = (role: keyof typeof ROLE_TEMPLATES) => {
    setSelectedRole(role)
    setFormData(prev => ({
      ...prev,
      role,
      permissions: ROLE_TEMPLATES[role].permissions
    }))
    
    // Clear permission errors
    if (errors.permissions) {
      setErrors(prev => ({ ...prev, permissions: '' }))
    }
  }

  const handlePermissionToggle = (permissionId: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permissionId)
        ? prev.permissions.filter(p => p !== permissionId)
        : [...prev.permissions, permissionId]
    }))
    
    // Clear permission errors
    if (errors.permissions) {
      setErrors(prev => ({ ...prev, permissions: '' }))
    }
  }

  const handleLocationToggle = (locationId: number) => {
    setFormData(prev => ({
      ...prev,
      locations: prev.locations.includes(locationId)
        ? prev.locations.filter(l => l !== locationId)
        : [...prev.locations, locationId]
    }))
    
    // Clear location errors
    if (errors.locations) {
      setErrors(prev => ({ ...prev, locations: '' }))
    }
  }

  const handleInputChange = (field: keyof UserInviteFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const groupedPermissions = AVAILABLE_PERMISSIONS.reduce((acc, permission) => {
    if (!acc[permission.category]) {
      acc[permission.category] = []
    }
    acc[permission.category].push(permission)
    return acc
  }, {} as Record<string, Permission[]>)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <UserPlus className="h-6 w-6" />
              Invite Team Member
            </h2>
            <p className="text-muted-foreground mt-1">
              Send an invitation to join {organization?.name}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* User Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  User Information
                </CardTitle>
                <CardDescription>
                  Basic information for the new team member
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="team.member@example.com"
                    className={errors.email ? 'border-red-500' : ''}
                  />
                  {errors.email && (
                    <p className="text-sm text-red-500 mt-1">{errors.email}</p>
                  )}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="first_name">First Name</Label>
                    <Input
                      id="first_name"
                      value={formData.first_name}
                      onChange={(e) => handleInputChange('first_name', e.target.value)}
                      placeholder="John"
                    />
                  </div>
                  <div>
                    <Label htmlFor="last_name">Last Name</Label>
                    <Input
                      id="last_name"
                      value={formData.last_name}
                      onChange={(e) => handleInputChange('last_name', e.target.value)}
                      placeholder="Smith"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="message">Welcome Message (Optional)</Label>
                  <Textarea
                    id="message"
                    value={formData.message}
                    onChange={(e) => handleInputChange('message', e.target.value)}
                    placeholder="Welcome to our team! We're excited to have you..."
                    rows={3}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="send_welcome_email"
                    checked={formData.send_welcome_email}
                    onCheckedChange={(checked) => handleInputChange('send_welcome_email', checked)}
                  />
                  <Label htmlFor="send_welcome_email" className="text-sm">
                    Send welcome email with setup instructions
                  </Label>
                </div>
              </CardContent>
            </Card>

            {/* Role Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Role & Access Level
                </CardTitle>
                <CardDescription>
                  Choose the appropriate role for this team member
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="role">Role</Label>
                  <Select
                    value={selectedRole}
                    onValueChange={handleRoleChange}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(ROLE_TEMPLATES).map(([key, template]) => (
                        <SelectItem key={key} value={key}>
                          <div className="flex items-center gap-2">
                            <Badge className={template.badge_color}>
                              {template.name}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {/* Role Description */}
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={ROLE_TEMPLATES[selectedRole].badge_color}>
                        {ROLE_TEMPLATES[selectedRole].name}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {ROLE_TEMPLATES[selectedRole].description}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Permissions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Permissions</CardTitle>
              <CardDescription>
                Specific permissions for this team member. Role templates are pre-configured but can be customized.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {errors.permissions && (
                <Alert variant="destructive" className="mb-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{errors.permissions}</AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-6">
                {Object.entries(groupedPermissions).map(([category, permissions]) => (
                  <div key={category}>
                    <h4 className="font-medium mb-3 capitalize">{category} Permissions</h4>
                    <div className="grid gap-3 md:grid-cols-2">
                      {permissions.map((permission) => {
                        const IconComponent = permission.icon
                        const isChecked = formData.permissions.includes(permission.id)
                        
                        return (
                          <div
                            key={permission.id}
                            className={`flex items-start space-x-3 p-3 rounded-lg border transition-colors ${
                              isChecked ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'
                            }`}
                          >
                            <Checkbox
                              id={permission.id}
                              checked={isChecked}
                              onCheckedChange={() => handlePermissionToggle(permission.id)}
                            />
                            <div className="flex-1 min-w-0">
                              <Label
                                htmlFor={permission.id}
                                className="flex items-center gap-2 font-medium cursor-pointer"
                              >
                                <IconComponent className="h-4 w-4" />
                                {permission.name}
                              </Label>
                              <p className="text-sm text-muted-foreground mt-1">
                                {permission.description}
                              </p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Location Access */}
          {availableLocations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Location Access
                </CardTitle>
                <CardDescription>
                  Select which locations this team member can access
                </CardDescription>
              </CardHeader>
              <CardContent>
                {errors.locations && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{errors.locations}</AlertDescription>
                  </Alert>
                )}
                
                <div className="grid gap-3 md:grid-cols-2">
                  {availableLocations.map((location) => {
                    const isChecked = formData.locations.includes(location.id)
                    
                    return (
                      <div
                        key={location.id}
                        className={`flex items-start space-x-3 p-3 rounded-lg border transition-colors ${
                          isChecked ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <Checkbox
                          id={`location-${location.id}`}
                          checked={isChecked}
                          onCheckedChange={() => handleLocationToggle(location.id)}
                        />
                        <div className="flex-1 min-w-0">
                          <Label
                            htmlFor={`location-${location.id}`}
                            className="font-medium cursor-pointer"
                          >
                            {location.name}
                          </Label>
                          <p className="text-sm text-muted-foreground mt-1">
                            {location.city}, {location.state}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Info className="h-5 w-5" />
                Invitation Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <UserPlus className="h-5 w-5" />
                  </div>
                  <div>
                    <h5 className="font-medium">
                      {formData.first_name && formData.last_name 
                        ? `${formData.first_name} ${formData.last_name}` 
                        : formData.email || 'New Team Member'
                      }
                    </h5>
                    <p className="text-sm text-muted-foreground">{formData.email}</p>
                  </div>
                </div>
                
                <div className="grid gap-3 md:grid-cols-3">
                  <div>
                    <span className="text-sm text-muted-foreground">Role</span>
                    <div className="mt-1">
                      <Badge className={ROLE_TEMPLATES[selectedRole].badge_color}>
                        {ROLE_TEMPLATES[selectedRole].name}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Permissions</span>
                    <p className="text-sm font-medium mt-1">
                      {formData.permissions.length} permission{formData.permissions.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Locations</span>
                    <p className="text-sm font-medium mt-1">
                      {formData.locations.length} location{formData.locations.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Form Actions */}
          <div className="flex items-center justify-between pt-6 border-t">
            <Alert>
              <Mail className="h-4 w-4" />
              <AlertDescription className="text-sm">
                An invitation email will be sent to {formData.email || 'the provided email address'}
              </AlertDescription>
            </Alert>
            
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Sending...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Send className="h-4 w-4" />
                    Send Invitation
                  </div>
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
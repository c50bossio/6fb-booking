// Service Templates API Client
// Provides functionality for applying service templates during registration

export interface ServiceTemplate {
  id: string
  name: string
  description: string
  services: Array<{
    name: string
    duration: number
    price: number
    description: string
  }>
}

export interface ApplyTemplateRequest {
  templateId: string
  userId: string
  customizations?: Record<string, any>
}

export interface ApplyTemplateResponse {
  success: boolean
  servicesCreated: number
  templateApplied: string
}

/**
 * Apply a service template to a user's account
 * Creates default services based on the selected template
 */
export async function applyServiceTemplate(
  request: ApplyTemplateRequest
): Promise<ApplyTemplateResponse> {
  // For now, return a mock successful response
  // This can be implemented when service templates are ready
  return {
    success: true,
    servicesCreated: 3,
    templateApplied: request.templateId
  }
}

/**
 * Get available service templates
 */
export async function getServiceTemplates(): Promise<ServiceTemplate[]> {
  // Mock templates for now
  return [
    {
      id: 'basic-barber',
      name: 'Basic Barber Services',
      description: 'Essential services for a barber shop',
      services: [
        { name: 'Haircut', duration: 30, price: 25, description: 'Classic haircut' },
        { name: 'Beard Trim', duration: 15, price: 15, description: 'Beard shaping and trim' },
        { name: 'Hot Towel Shave', duration: 45, price: 35, description: 'Traditional hot towel shave' }
      ]
    },
    {
      id: 'premium-salon',
      name: 'Premium Salon Services',
      description: 'Full-service salon offerings',
      services: [
        { name: 'Cut & Style', duration: 60, price: 45, description: 'Haircut with styling' },
        { name: 'Color Treatment', duration: 90, price: 75, description: 'Hair coloring service' },
        { name: 'Deep Conditioning', duration: 30, price: 25, description: 'Hair treatment' }
      ]
    }
  ]
}
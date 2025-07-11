'use client'

import React, { useState } from 'react'
import { toast } from '@/hooks/use-toast'
import { ServiceTemplateSelector } from './index'
import { ServiceTemplate } from '@/lib/types/service-templates'
import { applyServiceTemplate } from '@/lib/api/service-templates'

/**
 * Example integration component showing how to use ServiceTemplateSelector
 * 
 * This component demonstrates:
 * - Basic integration with the onboarding flow
 * - Handling template selection and application
 * - Error handling and user feedback
 * - Integration with existing forms and workflows
 */
export const ServiceTemplateIntegrationExample: React.FC = () => {
  const [selectedTemplates, setSelectedTemplates] = useState<ServiceTemplate[]>([])
  const [isApplying, setIsApplying] = useState(false)

  // Handle template selection
  const handleTemplatesSelect = (templates: ServiceTemplate[]) => {
    setSelectedTemplates(templates)
    console.log('Selected templates:', templates)
    
    // Show user feedback
    if (templates.length > 0) {
      toast({
        title: "Templates Selected",
        description: `${templates.length} template${templates.length !== 1 ? 's' : ''} selected`,
      })
    }
  }

  // Handle template application
  const handleApplyTemplates = async (templates: ServiceTemplate[]) => {
    setIsApplying(true)
    
    try {
      // Apply each template
      const applications = await Promise.all(
        templates.map(template => 
          applyServiceTemplate({
            template_id: template.id,
            apply_business_rules: true,
            apply_pricing_rules: true
          })
        )
      )
      
      // Show success message
      toast({
        title: "Templates Applied Successfully",
        description: `${applications.length} service${applications.length !== 1 ? 's' : ''} created from templates`,
      })
      
      // Clear selection
      setSelectedTemplates([])
      
      // You could redirect to services page or next onboarding step
      // router.push('/services')
      
    } catch (error) {
      console.error('Error applying templates:', error)
      toast({
        title: "Error Applying Templates",
        description: "Failed to create services from templates. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsApplying(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Service Template Selection
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          This is an example of how to integrate the ServiceTemplateSelector component
          into your onboarding flow. You can customize the props and behavior as needed.
        </p>
      </div>

      <ServiceTemplateSelector
        onTemplatesSelect={handleTemplatesSelect}
        selectedTemplates={selectedTemplates}
        maxSelections={5}
        showFeaturedOnly={false}
        allowMultiSelect={true}
        onApply={handleApplyTemplates}
      />

      {/* Example of additional onboarding steps */}
      {selectedTemplates.length > 0 && (
        <div className="mt-8 p-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <h3 className="text-lg font-semibold mb-4">Next Steps</h3>
          <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <li>• Review and customize your selected templates</li>
            <li>• Set up your availability and booking rules</li>
            <li>• Configure payment processing</li>
            <li>• Customize your booking page</li>
            <li>• Launch your services</li>
          </ul>
        </div>
      )}
    </div>
  )
}

export default ServiceTemplateIntegrationExample
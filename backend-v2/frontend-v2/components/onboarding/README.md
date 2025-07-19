# Service Template Onboarding Components

This directory contains the comprehensive service template selection system for the BookedBarber V2 onboarding flow, built around the Six Figure Barber methodology.

## Components Overview

### ServiceTemplateSelector
The main component that provides a complete interface for browsing, filtering, and selecting service templates.

**Features:**
- Fetches templates from the `/api/v2/service-templates/` endpoint
- Filtering by tier (starter, professional, premium, luxury)
- Search functionality
- Single or multi-select modes
- Responsive grid/list view
- Template preview functionality
- Apply templates directly to user's services

**Usage:**
```tsx
import { ServiceTemplateSelector } from '@/components/onboarding'

<ServiceTemplateSelector
  onTemplatesSelect={(templates) => console.log('Selected:', templates)}
  selectedTemplates={selectedTemplates}
  maxSelections={5}
  allowMultiSelect={true}
  showFeaturedOnly={false}
  onApply={handleApplyTemplates}
/>
```

### ServiceTemplateCard
Individual template card component displaying key template information.

**Features:**
- Template name, description, and tier
- Six Figure Barber methodology score
- Pricing information
- Revenue impact indicator
- Usage statistics
- Selection state management
- Preview button

**Usage:**
```tsx
import { ServiceTemplateCard } from '@/components/onboarding'

<ServiceTemplateCard
  template={template}
  selected={isSelected}
  onSelect={handleSelect}
  onPreview={handlePreview}
  showPrice={true}
  showMethodologyScore={true}
  compact={false}
/>
```

### ServiceTemplatePreview
Modal component providing detailed template information and application functionality.

**Features:**
- Comprehensive template details
- Six Figure Barber methodology alignment
- Pricing strategy breakdown
- Business rules and configuration
- Success metrics and statistics
- Apply template functionality
- Tabbed interface for organization

**Usage:**
```tsx
import { ServiceTemplatePreview } from '@/components/onboarding'

<ServiceTemplatePreview
  template={template}
  isOpen={showPreview}
  onClose={() => setShowPreview(false)}
  onApply={handleApplyTemplate}
/>
```

## Six Figure Barber Integration

All components are designed around the Six Figure Barber methodology:

### Tier System
- **Starter**: Foundation services for new practitioners
- **Professional**: Enhanced services for established practitioners
- **Premium**: High-value services for experienced practitioners
- **Luxury**: Ultimate services for master-level practitioners

### Methodology Scoring
Templates include methodology alignment scores (0-100) indicating how well they align with 6FB principles:
- **90-100**: Excellent alignment
- **80-89**: Very good alignment
- **70-79**: Good alignment
- **60-69**: Fair alignment
- **<60**: Needs improvement

### Revenue Impact Classification
- **High**: Significant revenue potential
- **Medium**: Moderate revenue potential
- **Low**: Supporting revenue stream

## API Integration

### Endpoints Used
- `GET /api/v2/service-templates/` - List templates with filtering
- `GET /api/v2/service-templates/featured` - Get featured templates
- `GET /api/v2/service-templates/{id}` - Get specific template
- `POST /api/v2/service-templates/apply` - Apply template to user's services
- `GET /api/v2/service-templates/tiers/summary` - Get tier statistics

### Data Types
All components use TypeScript interfaces defined in `@/lib/types/service-templates.ts`:
- `ServiceTemplate` - Main template data structure
- `ServiceTemplateFilters` - Filter parameters
- `ServiceTemplateApplyRequest` - Template application request
- `ServiceTemplateApplyResponse` - Template application response

## Styling and Theming

Components use the existing BookedBarber V2 design system:
- **UI Components**: Built with shadcn/ui components
- **Styling**: Tailwind CSS with custom design tokens
- **Responsive**: Mobile-first responsive design
- **Dark Mode**: Full dark mode support
- **Animations**: Smooth transitions and hover effects

## Error Handling

Comprehensive error handling includes:
- API request failures
- Network connectivity issues
- Template application errors
- User feedback via toast notifications
- Fallback UI states

## Performance Considerations

- **Lazy Loading**: Components load data on demand
- **Pagination**: Large template lists are paginated
- **Caching**: API responses are cached where appropriate
- **Debounced Search**: Search input is debounced for performance
- **Optimistic Updates**: UI updates optimistically where possible

## Usage Examples

### Basic Integration
```tsx
import { ServiceTemplateSelector } from '@/components/onboarding'

function OnboardingStep() {
  const [selectedTemplates, setSelectedTemplates] = useState([])
  
  return (
    <ServiceTemplateSelector
      onTemplatesSelect={setSelectedTemplates}
      selectedTemplates={selectedTemplates}
      maxSelections={3}
      showFeaturedOnly={true}
    />
  )
}
```

### Advanced Integration with Apply
```tsx
import { ServiceTemplateSelector } from '@/components/onboarding'
import { applyServiceTemplate } from '@/lib/api/service-templates'

function OnboardingStep() {
  const handleApplyTemplates = async (templates) => {
    for (const template of templates) {
      await applyServiceTemplate({
        template_id: template.id,
        apply_business_rules: true,
        apply_pricing_rules: true
      })
    }
    // Navigate to next step
  }
  
  return (
    <ServiceTemplateSelector
      onTemplatesSelect={handleSelect}
      onApply={handleApplyTemplates}
      allowMultiSelect={true}
      maxSelections={5}
    />
  )
}
```

### Filtered by Tier
```tsx
<ServiceTemplateSelector
  onTemplatesSelect={handleSelect}
  filterByTier={['professional', 'premium']}
  showFeaturedOnly={false}
/>
```

## File Structure

```
components/onboarding/
├── ServiceTemplateSelector.tsx    # Main selector component
├── ServiceTemplateCard.tsx        # Individual template card
├── ServiceTemplatePreview.tsx     # Template preview modal
├── ServiceTemplateIntegrationExample.tsx  # Integration example
├── index.ts                       # Export declarations
└── README.md                      # This file

lib/
├── types/service-templates.ts     # TypeScript interfaces
└── api/service-templates.ts       # API client functions
```

## Development Notes

### Testing
- Components should be tested with mock data
- API calls should be mocked in tests
- Responsive behavior should be tested on multiple screen sizes
- Error states should be tested with failed API calls

### Accessibility
- All components follow WCAG guidelines
- Keyboard navigation is fully supported
- Screen reader compatibility
- Focus management in modal components

### Browser Compatibility
- Modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile browsers (iOS Safari, Chrome Mobile)
- Responsive design works on all screen sizes

## Future Enhancements

Potential future improvements:
- Bulk template operations
- Template customization before application
- Template sharing and collaboration
- Advanced analytics and usage tracking
- Integration with external template marketplaces
- A/B testing for template effectiveness

## Support

For questions or issues with these components:
1. Check the component props and TypeScript interfaces
2. Review the API documentation
3. Test with the integration example
4. Check browser console for errors
5. Verify API endpoint availability
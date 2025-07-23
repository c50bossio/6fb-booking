# Global Modal Component Usage Guide

## Overview
BookedBarber V2 uses a standardized Modal component with built-in global features:
- ✅ Click outside to close
- ✅ ESC key to close
- ✅ Focus management and accessibility
- ✅ Body scroll prevention
- ✅ Consistent animations
- ✅ Dark mode support

## Basic Usage

```tsx
import { Modal, ModalBody, ModalFooter } from '@/components/ui/Modal'

function MyComponent() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      title="Modal Title"
      description="Optional description"
      size="md"
      position="center"
    >
      <ModalBody>
        <p>Modal content goes here</p>
      </ModalBody>
      
      <ModalFooter>
        <Button variant="outline" onClick={() => setIsOpen(false)}>
          Cancel
        </Button>
        <Button onClick={handleSave}>
          Save
        </Button>
      </ModalFooter>
    </Modal>
  )
}
```

## Modal Props

### Core Props
- `isOpen: boolean` - Controls modal visibility
- `onClose: () => void` - Called when modal should close
- `title?: string` - Modal title (appears in header)
- `description?: string` - Optional description under title

### Size Options
- `size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | 'full' | 'screen'`
- Default: `'md'`
- Use `'2xl'` for QR generators, `'md'` for forms, `'4xl'` for wide content

### Position Options
- `position?: 'center' | 'bottom' | 'top'`
- Default: `'bottom'` (iOS-style slide up)
- Use `'center'` for desktop-focused modals

### Behavior Options
- `closeOnOverlayClick?: boolean` - Default: `true`
- `closeOnEscape?: boolean` - Default: `true`
- `preventScroll?: boolean` - Default: `true`
- `trapFocus?: boolean` - Default: `true`
- `showCloseButton?: boolean` - Default: `true`

### Styling Options
- `variant?: 'default' | 'glass' | 'gradient' | 'premium'`
- `overflow?: 'hidden' | 'visible' | 'auto'`
- `className?: string` - Additional CSS classes
- `overlayClassName?: string` - Additional overlay classes

## Component Structure

```tsx
<Modal {...props}>
  <ModalBody>
    {/* Main content */}
  </ModalBody>
  
  <ModalFooter>
    {/* Action buttons */}
  </ModalFooter>
</Modal>
```

## Examples

### Simple Confirmation Modal
```tsx
<Modal
  isOpen={showDelete}
  onClose={() => setShowDelete(false)}
  title="Delete Item"
  description="This action cannot be undone"
  size="sm"
  position="center"
>
  <ModalBody>
    <p>Are you sure you want to delete this item?</p>
  </ModalBody>
  
  <ModalFooter>
    <Button variant="outline" onClick={() => setShowDelete(false)}>
      Cancel
    </Button>
    <Button variant="destructive" onClick={handleDelete}>
      Delete
    </Button>
  </ModalFooter>
</Modal>
```

### Form Modal
```tsx
<Modal
  isOpen={showForm}
  onClose={() => setShowForm(false)}
  title="Create New Item"
  size="lg"
  position="center"
>
  <ModalBody>
    <form onSubmit={handleSubmit}>
      <div className="space-y-4">
        <Input label="Name" value={name} onChange={setName} />
        <Select label="Category" value={category} onChange={setCategory}>
          {/* options */}
        </Select>
      </div>
    </form>
  </ModalBody>
  
  <ModalFooter>
    <Button variant="outline" onClick={() => setShowForm(false)}>
      Cancel
    </Button>
    <Button onClick={handleSubmit}>
      Create
    </Button>
  </ModalFooter>
</Modal>
```

### Mobile-First Modal (iOS Style)
```tsx
<Modal
  isOpen={showMobile}
  onClose={() => setShowMobile(false)}
  title="Settings"
  size="full"
  position="bottom"
  variant="default"
>
  <ModalBody>
    {/* Mobile-optimized content */}
  </ModalBody>
</Modal>
```

### QR Generator Modal
```tsx
<Modal
  isOpen={showQR}
  onClose={() => setShowQR(false)}
  title="Generate QR Code"
  size="2xl"
  position="center"
>
  <ModalBody>
    <QRCodeGenerator {...qrProps} />
  </ModalBody>
  
  <ModalFooter>
    <div className="flex items-center gap-2 text-sm text-gray-600 mr-auto">
      <Share2 className="w-4 h-4" />
      <span>Perfect for business cards and marketing</span>
    </div>
    <Button onClick={() => setShowQR(false)}>
      Close
    </Button>
  </ModalFooter>
</Modal>
```

## Migration from Custom Modals

### Before (Custom Modal)
```tsx
// ❌ Don't do this
<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
  <div className="bg-white rounded-lg max-w-md w-full p-6">
    <h2>Modal Title</h2>
    {/* content */}
  </div>
</div>
```

### After (Global Modal)
```tsx
// ✅ Do this instead
<Modal
  isOpen={isOpen}
  onClose={onClose}
  title="Modal Title"
  size="md"
>
  <ModalBody>
    {/* content */}
  </ModalBody>
</Modal>
```

## Accessibility Features

The Modal component automatically provides:
- **Focus management**: Focus is trapped within the modal
- **Keyboard navigation**: ESC to close, Tab to navigate
- **Screen reader support**: Proper ARIA attributes
- **Focus restoration**: Returns focus to trigger element when closed

## Global Features Enabled

Every modal using this component gets:
1. **Click outside to close** - Automatically enabled
2. **ESC key to close** - Press ESC anywhere to close
3. **Focus trapping** - Tab navigation stays within modal
4. **Body scroll lock** - Background doesn't scroll
5. **Consistent animations** - Smooth open/close transitions
6. **Dark mode support** - Automatically adapts to theme

## Best Practices

1. **Always use the global Modal** - Don't create custom modal wrappers
2. **Use appropriate sizes** - `md` for forms, `2xl` for complex content
3. **Include proper actions** - Always provide Cancel + Primary action
4. **Handle loading states** - Disable buttons during async operations
5. **Use semantic titles** - Clear, descriptive modal titles
6. **Provide descriptions** - Help users understand the modal's purpose

## Common Patterns

### Loading Modal
```tsx
<Modal isOpen={isLoading} onClose={() => {}} showCloseButton={false}>
  <ModalBody>
    <div className="text-center">
      <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
      <p>Processing...</p>
    </div>
  </ModalBody>
</Modal>
```

### Disabled Close During Action
```tsx
<Modal
  isOpen={isOpen}
  onClose={isSubmitting ? () => {} : onClose}
  closeOnOverlayClick={!isSubmitting}
  closeOnEscape={!isSubmitting}
>
  {/* content */}
</Modal>
```

This global Modal component ensures consistent behavior and user experience across the entire BookedBarber application.
# Dark Mode Development Guidelines

## 🎯 Quick Start Checklist

**Before committing any component:**
- [ ] All text has `dark:` color variants
- [ ] All backgrounds have `dark:` variants  
- [ ] No hardcoded light colors (bg-gray-50, bg-white, etc.)
- [ ] Tested in both light and dark modes
- [ ] Text contrast meets WCAG AA standards

## 🚨 Common Issues and Solutions

### ❌ AVOID: Hardcoded Light Colors
```tsx
// BAD - Will be invisible in dark mode
<div className="bg-gray-50 text-gray-900">
  {content}
</div>

// BAD - Missing dark variants
<p className="text-gray-600">Invisible text</p>
```

### ✅ CORRECT: Dark Mode Aware
```tsx
// GOOD - Proper dark mode support
<div className="bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white">
  {content}
</div>

// GOOD - Complete color pairs
<p className="text-gray-600 dark:text-gray-300">Visible text</p>
```

## 🎨 Approved Color Combinations

### Text Colors
```tsx
// Primary text
className="text-gray-900 dark:text-white"

// Secondary text  
className="text-gray-600 dark:text-gray-300"

// Muted text
className="text-gray-500 dark:text-gray-400"

// Placeholder text
className="text-gray-400 dark:text-gray-500"
```

### Background Colors
```tsx
// Page backgrounds
className="bg-white dark:bg-zinc-900"

// Card backgrounds
className="bg-white dark:bg-zinc-800"

// Elevated surfaces
className="bg-gray-50 dark:bg-zinc-700"

// Input backgrounds
className="bg-white dark:bg-zinc-800"
```

### Border Colors
```tsx
// Default borders
className="border-gray-300 dark:border-gray-600"

// Subtle borders
className="border-gray-200 dark:border-gray-700"

// Emphasis borders
className="border-gray-400 dark:border-gray-500"
```

### Status Colors
```tsx
// Success states
className="bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300"

// Warning states  
className="bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300"

// Error states
className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300"

// Info states
className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
```

## 🔧 Development Tools

### Import Contrast Validation
```tsx
import { validateContrast, ContrastValidators, DARK_MODE_BEST_PRACTICES } from '@/lib/contrastValidation'

// Validate color combinations
const result = validateContrast('#ffffff', '#000000')
console.log(result.passesAA) // true

// Component-specific validators
ContrastValidators.analyticsCard('#f9fafb', '#1f2937')
```

### Quick Audit Function
```tsx
import { auditComponentContrast } from '@/lib/contrastValidation'

// Audit your component
auditComponentContrast('MyComponent', [
  { background: '#ffffff', text: '#000000', context: 'Main text' },
  { background: '#f9fafb', text: '#374151', context: 'Secondary text' }
])
```

## 📱 Testing Strategy

### Manual Testing
1. **Toggle dark mode** - Use the theme switcher
2. **Check all text** - Ensure everything is readable
3. **Test interactions** - Hover states, focus states
4. **Mobile testing** - Dark mode on mobile devices

### Browser Developer Tools
```bash
# Force dark mode in Chrome DevTools
1. Open DevTools (F12)
2. Command Palette (Ctrl+Shift+P)
3. Type "dark mode"
4. Select "Emulate CSS prefers-color-scheme: dark"
```

### Automated Testing
```tsx
// Example test for dark mode
test('component renders correctly in dark mode', () => {
  const { container } = render(
    <div className="dark">
      <MyComponent />
    </div>
  )
  
  // Check for dark mode classes
  expect(container.querySelector('.dark\\:bg-zinc-800')).toBeInTheDocument()
})
```

## 🎯 Analytics Component Special Guidelines

### Analytics Cards
```tsx
// Use proper dark backgrounds for data displays
<Card className="bg-white dark:bg-zinc-800">
  <div className="bg-gray-50 dark:bg-gray-800 p-4">
    <span className="text-gray-900 dark:text-white">Current Value</span>
    <span className="text-gray-600 dark:text-gray-300">$1,234</span>
  </div>
</Card>
```

### Progress Bars
```tsx
// Ensure progress bars have proper contrast
<div className="bg-gray-200 dark:bg-gray-700 rounded-full">
  <div className="bg-primary-500 h-2 rounded-full" style={{width: '75%'}} />
</div>
```

### Action Items
```tsx
// Action item cards with proper contrast
<div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
  <h4 className="text-gray-900 dark:text-white font-medium">Action Title</h4>
  <p className="text-gray-600 dark:text-gray-400">Description text</p>
  <span className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-2 py-1 rounded">
    high priority
  </span>
</div>
```

## 🚫 Never Do This

### Hardcoded Light Backgrounds
```tsx
// NEVER - Will break in dark mode
<div className="bg-white">
<div className="bg-gray-50"> 
<div className="bg-green-50">
<span className="text-gray-900">
```

### Missing Dark Variants
```tsx
// NEVER - Incomplete dark mode support
<p className="text-gray-600">              // Missing dark:text-gray-300
<div className="border-gray-300">          // Missing dark:border-gray-600
<button className="bg-blue-500">           // Missing dark hover states
```

### Assuming Light Mode
```tsx
// NEVER - Don't assume background colors
<span className="text-white">Text</span>   // What if bg is white in light mode?
```

## ✅ Development Workflow

### 1. Start with Base Colors
```tsx
// Always start with the base color pair
className="bg-white dark:bg-zinc-800 text-gray-900 dark:text-white"
```

### 2. Add Semantic Colors
```tsx
// Then add semantic meanings
className="bg-white dark:bg-zinc-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600"
```

### 3. Test Both Modes
- Toggle dark mode frequently during development
- Use browser DevTools to force dark mode
- Test on actual mobile devices

### 4. Validate Contrast
```tsx
import { validateContrast } from '@/lib/contrastValidation'

// Check your color combinations
const isAccessible = validateContrast('#ffffff', '#000000').passesAA
```

## 🎨 Design System Integration

### Using Our Card Component
```tsx
// Use the pre-built Card variants (already dark mode ready)
<Card variant="default">        // White bg -> dark bg automatically
<Card variant="elevated">       // Elevated surface with shadows
<Card variant="success">        // Success state colors
```

### Using Our Button Component  
```tsx
// Button variants handle dark mode automatically
<Button variant="primary">      // Primary brand colors
<Button variant="secondary">    // Neutral colors
<Button variant="ghost">        // Transparent with hover
```

## 📚 Resources

- [WCAG Contrast Guidelines](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [Tailwind Dark Mode Guide](https://tailwindcss.com/docs/dark-mode)

## 🆘 When You Need Help

1. **Check the contrast validation utility** first
2. **Look at existing components** for patterns
3. **Test in both modes** before asking for review
4. **Use the approved color combinations** above
5. **Ask for design review** if unsure about color choices

---

**Remember: Dark mode is not optional - it's an accessibility feature that must work perfectly.**
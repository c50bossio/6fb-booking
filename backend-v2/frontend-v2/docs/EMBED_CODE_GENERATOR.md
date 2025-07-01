# Embed Code Generator Documentation

## Overview

The Embed Code Generator allows barbershops to generate HTML iframe codes that can be embedded on their websites or other external sites. This enables customers to book appointments directly from the barbershop's website without leaving the page.

## Features

### Core Functionality
- **HTML Iframe Generation**: Creates secure, sandboxed iframe code
- **Multiple Size Options**: Small (300x400), Medium (400x600), Large (600x800), or Custom dimensions
- **Responsive Design**: Optional responsive wrapper that adapts to container width
- **Theme Support**: Auto, Light, or Dark theme options
- **Live Preview**: Shows how the widget will appear on the website
- **Copy to Clipboard**: One-click copying of generated code

### Code Types
1. **HTML Only**: Basic iframe code for simple integration
2. **CSS**: Optional styles for better responsive behavior
3. **JavaScript**: Advanced features for booking event handling
4. **Complete Package**: Everything combined for full functionality

### Security Features
- **Sandboxed Iframe**: Runs in secure sandbox environment
- **HTTPS Required**: Secure communication for production use
- **Payment Security**: All payments processed securely via Stripe
- **Data Protection**: No customer data stored on external servers

## Usage

### Basic Implementation

```typescript
import { EmbedCodeGenerator } from '../components/booking/EmbedCodeGenerator';

<EmbedCodeGenerator
  barberId="your-barber-id"
  serviceId="optional-service-id"
  locationId="optional-location-id"
/>
```

### Generated Iframe Code Example

```html
<!-- 6FB Booking Widget - Responsive -->
<div style="position:relative;padding-bottom:150%;height:0;overflow:hidden;max-width:400px;">
  <iframe
    src="https://your-app.com/book?barber=123&embed=true"
    title="6FB Booking Widget"
    sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"
    allow="payment; camera; microphone"
    loading="lazy"
    referrerpolicy="strict-origin-when-cross-origin"
    style="position:absolute;top:0;left:0;width:100%;height:100%;border:1px solid #e5e7eb;border-radius:8px;"
    frameborder="0">
    <p>Your browser does not support iframes. Please visit our booking page directly.</p>
  </iframe>
</div>
<!-- End 6FB Booking Widget -->
```

## Configuration Options

### Embed Settings Interface

```typescript
interface EmbedSettings {
  size: 'small' | 'medium' | 'large' | 'custom';
  width: string;
  height: string;
  border: boolean;
  borderRadius: string;
  title: string;
  responsive: boolean;
  theme?: 'light' | 'dark' | 'auto';
}
```

### URL Parameters

The booking URL supports these parameters:
- `embed=true` - Enables embed mode
- `barber=id` - Pre-select specific barber
- `service=id` - Pre-select specific service
- `location=id` - Pre-select specific location
- `theme=light|dark|auto` - Set theme preference
- `hideHeader=true` - Hide header in embed mode
- `hideFooter=true` - Hide footer in embed mode

## Platform Integration

### WordPress
1. Add a "Custom HTML" block
2. Paste the embed code
3. Preview and publish

### Wix
1. Add "Embed" → "HTML iframe"
2. Paste the embed code
3. Adjust size and publish

### Squarespace
1. Add a "Code" block
2. Set to "HTML" mode
3. Paste code and publish

### Shopify
1. Edit theme code
2. Add embed code to template
3. Test and publish

### Custom Websites
Simply paste the HTML code where you want the widget to appear.

## Advanced Features

### Iframe Communication

The generated JavaScript code enables communication between the iframe and parent window:

```javascript
// Listen for booking completion
window.addEventListener('sixfb-booking-completed', function(event) {
  console.log('Booking completed:', event.detail);
  // Add your custom logic here
});

// Listen for booking cancellation
window.addEventListener('sixfb-booking-cancelled', function(event) {
  console.log('Booking cancelled');
  // Add your custom logic here
});
```

### CSS Customization

The generated CSS provides responsive behavior and can be customized:

```css
/* 6FB Booking Widget - Responsive CSS */
.sixfb-booking-widget {
  position: relative;
  padding-bottom: 150%;
  height: 0;
  overflow: hidden;
  max-width: 400px;
  margin: 0 auto;
}

.sixfb-booking-widget iframe {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}
```

## Security Considerations

### Sandbox Attributes
- `allow-scripts` - Required for widget functionality
- `allow-same-origin` - Enables form submissions
- `allow-forms` - Allows form interactions
- `allow-popups` - For payment processing
- `allow-top-navigation-by-user-activation` - User-initiated navigation only

### Content Security Policy
If your site uses CSP, you may need to add:

```
Content-Security-Policy: frame-src 'self' https://your-6fb-domain.com;
```

## Troubleshooting

### Common Issues

1. **Widget not showing**
   - Check iframe code was pasted correctly
   - Verify HTTPS is enabled
   - Check browser console for errors

2. **Widget loads but content doesn't appear**
   - Review Content Security Policy settings
   - Ensure iframe embedding is allowed
   - Test the widget URL directly

3. **Booking process fails**
   - Verify 6FB account configuration
   - Check Stripe Connect setup
   - Test on main site first

### Debugging

1. Open browser developer tools
2. Check Console tab for errors
3. Verify Network tab shows successful requests
4. Test iframe URL directly in new tab

## API Reference

### EmbedCodeGenerator Props

```typescript
interface EmbedCodeGeneratorProps {
  barberId?: string;        // Pre-select barber
  serviceId?: string;       // Pre-select service
  locationId?: string;      // Pre-select location
  className?: string;       // Additional CSS classes
}
```

### Utility Functions

```typescript
// Generate booking URL with parameters
generateBookingUrl(params: EmbedParams): string

// Generate iframe HTML code
generateIframeCode(options: EmbedCodeOptions): string

// Generate responsive CSS
generateEmbedCSS(settings: EmbedSettings): string

// Generate JavaScript for communication
generateEmbedJS(): string

// Validate embed settings
validateEmbedSettings(settings: EmbedSettings): string[]

// Copy text to clipboard
copyToClipboard(text: string): Promise<boolean>
```

## Best Practices

### Performance
- Use `loading="lazy"` for better page load times
- Consider iframe dimensions for mobile devices
- Test on various screen sizes

### Accessibility
- Always include meaningful `title` attribute
- Provide fallback content for unsupported browsers
- Test with screen readers

### User Experience
- Choose appropriate widget size for your layout
- Use responsive mode for better mobile experience
- Match border radius to your site's design
- Test the complete booking flow

### Maintenance
- Regularly test embedded widgets
- Monitor for any CSP or security issues
- Keep backup of working embed codes
- Document any customizations made

## Support

For additional help with embed code integration:
1. Check the troubleshooting section
2. Test the widget URL directly
3. Review browser console for errors
4. Contact support with your embed code and website URL

## Version History

- **v1.0**: Initial embed code generator with basic iframe support
- **v1.1**: Added responsive design options and theme support
- **v1.2**: Enhanced security with sandbox attributes
- **v1.3**: Added platform-specific instructions and troubleshooting
export interface EmbedSettings {
  size: EmbedSize;
  width: string;
  height: string;
  border: boolean;
  borderRadius: string;
  title: string;
  responsive: boolean;
  theme?: 'light' | 'dark' | 'auto';
  primaryColor?: string;
  backgroundColor?: string;
}

export type EmbedSize = 'small' | 'medium' | 'large' | 'custom';

export interface EmbedPreset {
  name: string;
  width: string;
  height: string;
  description: string;
}

export interface EmbedParams {
  barberId?: string;
  serviceId?: string;
  locationId?: string;
  theme?: string;
  primaryColor?: string;
  hideHeader?: boolean;
  hideFooter?: boolean;
  allowClose?: boolean;
}

export interface EmbedCodeOptions {
  url: string;
  settings: EmbedSettings;
  sandboxAttributes: string[];
  allowAttributes: string[];
}

export interface PlatformInstructions {
  platform: string;
  title: string;
  steps: string[];
  notes?: string[];
  icon?: string;
}

export const EMBED_PRESETS: Record<EmbedSize, EmbedPreset> = {
  small: {
    name: 'Small',
    width: '300',
    height: '400',
    description: 'Perfect for sidebars and compact spaces'
  },
  medium: {
    name: 'Medium',
    width: '400',
    height: '600',
    description: 'Ideal for most website integrations'
  },
  large: {
    name: 'Large',
    width: '600',
    height: '800',
    description: 'Full-featured experience for main content areas'
  },
  custom: {
    name: 'Custom',
    width: '400',
    height: '600',
    description: 'Define your own dimensions'
  }
};

export const SECURITY_SANDBOX_ATTRIBUTES = [
  'allow-scripts',
  'allow-same-origin',
  'allow-forms',
  'allow-popups',
  'allow-popups-to-escape-sandbox',
  'allow-top-navigation-by-user-activation',
  'allow-downloads-without-user-activation'
];

export const IFRAME_ALLOW_ATTRIBUTES = [
  'payment',
  'camera',
  'microphone',
  'geolocation',
  'encrypted-media'
];

export const PLATFORM_INSTRUCTIONS: PlatformInstructions[] = [
  {
    platform: 'wordpress',
    title: 'WordPress',
    steps: [
      'In the WordPress editor, add a "Custom HTML" block',
      'Paste the embed code into the HTML block',
      'Preview your page to see the widget',
      'Publish or update your page'
    ],
    notes: [
      'Some WordPress themes may require additional CSS for optimal display',
      'Ensure your theme supports iframe embedding'
    ]
  },
  {
    platform: 'wix',
    title: 'Wix',
    steps: [
      'Click "Add" → "Embed" → "HTML iframe"',
      'Click "Enter Code" and paste the embed code',
      'Adjust the iframe size if needed',
      'Click "Apply" and publish your site'
    ],
    notes: [
      'Wix may automatically adjust iframe dimensions',
      'Test the widget after publishing'
    ]
  },
  {
    platform: 'squarespace',
    title: 'Squarespace',
    steps: [
      'Add a "Code" block to your page',
      'Paste the embed code',
      'Set the code block to "HTML" mode',
      'Save and publish your changes'
    ],
    notes: [
      'Available on Business and Commerce plans',
      'May require developer mode for advanced customization'
    ]
  },
  {
    platform: 'shopify',
    title: 'Shopify',
    steps: [
      'Go to Online Store → Themes → Actions → Edit code',
      'Open the template file where you want the widget',
      'Paste the embed code in the desired location',
      'Save and preview your store'
    ],
    notes: [
      'Consider placing in product pages or custom pages',
      'Test checkout integration thoroughly'
    ]
  },
  {
    platform: 'webflow',
    title: 'Webflow',
    steps: [
      'Add an "Embed" component to your page',
      'Paste the embed code into the embed settings',
      'Adjust the embed component size',
      'Publish your site'
    ],
    notes: [
      'Use a fixed height for the embed component',
      'Responsive embeds work well in Webflow'
    ]
  },
  {
    platform: 'custom',
    title: 'Custom HTML/CSS',
    steps: [
      'Paste the embed code where you want it in your HTML file',
      'Optionally wrap in a container div for styling',
      'Test across different devices and browsers',
      'Add custom CSS if needed for integration'
    ],
    notes: [
      'Ensure HTTPS is enabled for production',
      'Consider CSP (Content Security Policy) implications'
    ]
  }
];
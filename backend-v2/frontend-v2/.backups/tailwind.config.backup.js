/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Primary Brand Colors - Teal/Turquoise (BookedBarber brand)
        primary: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6', // Main brand color
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
          950: '#042f2e',
        },
        
        // Secondary/Neutral Colors
        secondary: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },
        
        // Semantic Colors
        success: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
          950: '#052e16',
        },
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
          950: '#451a03',
        },
        error: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
          950: '#450a0a',
        },
        info: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },
      },
      
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'San Francisco',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'sans-serif'
        ],
        display: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'San Francisco',
          'Segoe UI',
          'sans-serif'
        ],
      },
      
      // Enhanced Shadow & Glow System for Premium iOS Feel
      boxShadow: {
        // Existing shadows (preserved)
        'glow-primary': '0 0 20px rgba(20, 184, 166, 0.5)',
        'glow-accent': '0 0 20px rgba(30, 41, 59, 0.5)',
        'glow-success': '0 0 20px rgba(5, 150, 105, 0.5)',
        
        // iOS-style shadows
        'ios-sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'ios': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        'ios-md': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'ios-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        'ios-xl': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        'ios-2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        
        // Premium Glow Effects
        'glow-primary-subtle': 'var(--glow-primary)',
        'glow-primary-strong': 'var(--glow-primary-strong)',
        'glow-success-subtle': 'var(--glow-success)',
        'glow-warning-subtle': 'var(--glow-warning)',
        'glow-error-subtle': 'var(--glow-error)',
        
        // Surface & Elevation
        'surface-glow': 'var(--surface-glow)',
        'elevated-glow': 'var(--elevated-glow)',
        
        // Dynamic Island Style
        'island': '0 8px 30px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(255, 255, 255, 0.05)',
        'island-hover': '0 12px 40px rgba(0, 0, 0, 0.16), 0 0 0 1px rgba(255, 255, 255, 0.08)',
        
        // Glass morphism shadows
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
        'glass-dark': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        'glass-light': '0 8px 32px 0 rgba(255, 255, 255, 0.1)',
        
        // Premium shadows
        'premium': '0 20px 40px -12px rgba(0, 0, 0, 0.25), 0 8px 16px -8px rgba(0, 0, 0, 0.1)',
        'premium-colored': '0 20px 40px -12px rgba(20, 184, 166, 0.4)',
      },
      
      // iOS-style Animation Curves and Durations
      animation: {
        // Existing animations (preserved)
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-gentle': 'pulseGentle 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        
        // iOS-style animations
        'ios-bounce': 'iosBounce 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        'ios-scale': 'iosScale 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        'ios-slide-up': 'iosSlideUp 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        'ios-slide-down': 'iosSlideDown 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        'ios-fade': 'iosFade 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        'glass-morph': 'glassMorph 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      },
      
      keyframes: {
        // Existing keyframes (preserved)
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        pulseGentle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.8' },
        },
        
        // iOS-style keyframes
        iosBounce: {
          '0%': { transform: 'scale(0.8)', opacity: '0' },
          '50%': { transform: 'scale(1.05)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        iosScale: {
          '0%': { transform: 'scale(0.95)' },
          '100%': { transform: 'scale(1)' },
        },
        iosSlideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        iosSlideDown: {
          '0%': { transform: 'translateY(-20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        iosFade: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        glassMorph: {
          '0%': { 
            backdropFilter: 'blur(0px)',
            background: 'rgba(255, 255, 255, 0)',
          },
          '100%': { 
            backdropFilter: 'blur(20px)',
            background: 'rgba(255, 255, 255, 0.1)',
          },
        },
      },
      
      // Mobile-first Spacing Scale
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
        '144': '36rem',
      },
      
      // Enhanced Border Radius for iOS-style Design
      borderRadius: {
        'ios': '10px',
        'ios-lg': '16px',
        'ios-xl': '20px',
        'ios-2xl': '24px',
      },
      
      // Custom Blur Values for Glass Morphism
      backdropBlur: {
        'xs': '2px',
        'ios': '20px',
        'glass': '40px',
      },
      
      // iOS-style Typography Scale
      fontSize: {
        'ios-caption2': ['11px', { lineHeight: '13px', fontWeight: '400' }],
        'ios-caption1': ['12px', { lineHeight: '16px', fontWeight: '400' }],
        'ios-footnote': ['13px', { lineHeight: '18px', fontWeight: '400' }],
        'ios-subheadline': ['15px', { lineHeight: '20px', fontWeight: '400' }],
        'ios-callout': ['16px', { lineHeight: '21px', fontWeight: '400' }],
        'ios-body': ['17px', { lineHeight: '22px', fontWeight: '400' }],
        'ios-headline': ['17px', { lineHeight: '22px', fontWeight: '600' }],
        'ios-title3': ['20px', { lineHeight: '25px', fontWeight: '400' }],
        'ios-title2': ['22px', { lineHeight: '28px', fontWeight: '400' }],
        'ios-title1': ['28px', { lineHeight: '34px', fontWeight: '400' }],
        'ios-large-title': ['34px', { lineHeight: '41px', fontWeight: '400' }],
      },
      
      // Safe area insets for iOS devices
      padding: {
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-left': 'env(safe-area-inset-left)',
        'safe-right': 'env(safe-area-inset-right)',
      },
      margin: {
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-left': 'env(safe-area-inset-left)',
        'safe-right': 'env(safe-area-inset-right)',
      },
      height: {
        'safe-area-inset-bottom': 'env(safe-area-inset-bottom)',
      },
      
      // Premium Gradient System
      backgroundImage: {
        // Ambient lighting gradients
        'ambient-light': 'var(--ambient-light)',
        'ambient-warm': 'var(--ambient-warm)',
        'ambient-cool': 'var(--ambient-cool)',
        
        // Premium surface gradients
        'surface-gradient': 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)',
        'surface-gradient-dark': 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 100%)',
        
        // Dynamic Island gradients
        'island-gradient': 'linear-gradient(135deg, rgba(0, 0, 0, 0.8) 0%, rgba(0, 0, 0, 0.9) 100%)',
        'island-gradient-hover': 'linear-gradient(135deg, rgba(0, 0, 0, 0.75) 0%, rgba(0, 0, 0, 0.85) 100%)',
        
        // Premium button gradients
        'premium-primary': 'linear-gradient(135deg, rgb(20, 184, 166) 0%, rgb(13, 148, 136) 100%)',
        'premium-primary-hover': 'linear-gradient(135deg, rgb(13, 148, 136) 0%, rgb(15, 118, 110) 100%)',
        
        // Glass surface gradients
        'glass-gradient': 'linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.05) 100%)',
        'glass-gradient-dark': 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.02) 100%)',
      },
    },
  },
  plugins: [],
}
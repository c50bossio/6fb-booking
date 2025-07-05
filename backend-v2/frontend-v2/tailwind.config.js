/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  future: {
    hoverOnlyWhenSupported: true,
  },
  theme: {
    // Base screens optimized for mobile-first design
    screens: {
      xs: '475px',
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',
      '3xl': '1920px',
    },
    extend: {
      // Enhanced color system
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
        
        // Semantic Colors with enhanced contrast
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
        
        // iOS-style grays for better consistency
        'ios-gray': {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
          950: '#030712',
        },
        
        // Dark mode specific colors
        'dark-surface': {
          50: '#fafafa',
          100: '#18181b',
          200: '#27272a',
          300: '#3f3f46',
          400: '#52525b',
          500: '#71717a',
          600: '#a1a1aa',
          700: '#d4d4d8',
          800: '#e4e4e7',
          900: '#f4f4f5',
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
      
      // Enhanced typography scale with better defaults and letter spacing
      fontSize: {
        'xs': ['12px', { lineHeight: '16px', fontWeight: '400', letterSpacing: '0.025em' }],
        'sm': ['14px', { lineHeight: '20px', fontWeight: '400', letterSpacing: '0.01em' }],
        'base': ['16px', { lineHeight: '24px', fontWeight: '400', letterSpacing: '0' }],
        'lg': ['18px', { lineHeight: '28px', fontWeight: '400', letterSpacing: '-0.01em' }],
        'xl': ['20px', { lineHeight: '32px', fontWeight: '400', letterSpacing: '-0.015em' }],
        '2xl': ['24px', { lineHeight: '36px', fontWeight: '400', letterSpacing: '-0.02em' }],
        '3xl': ['30px', { lineHeight: '40px', fontWeight: '400', letterSpacing: '-0.025em' }],
        '4xl': ['36px', { lineHeight: '44px', fontWeight: '400', letterSpacing: '-0.03em' }],
        '5xl': ['48px', { lineHeight: '56px', fontWeight: '400', letterSpacing: '-0.035em' }],
        '6xl': ['60px', { lineHeight: '68px', fontWeight: '400', letterSpacing: '-0.04em' }],
        
        // iOS-specific scales for consistency
        'ios-caption2': ['11px', { lineHeight: '13px', fontWeight: '400', letterSpacing: '0.05em' }],
        'ios-caption1': ['12px', { lineHeight: '16px', fontWeight: '400', letterSpacing: '0.025em' }],
        'ios-footnote': ['13px', { lineHeight: '18px', fontWeight: '400', letterSpacing: '0.01em' }],
        'ios-subheadline': ['15px', { lineHeight: '20px', fontWeight: '400', letterSpacing: '0' }],
        'ios-callout': ['16px', { lineHeight: '21px', fontWeight: '400', letterSpacing: '0' }],
        'ios-body': ['17px', { lineHeight: '22px', fontWeight: '400', letterSpacing: '0' }],
        'ios-headline': ['17px', { lineHeight: '22px', fontWeight: '600', letterSpacing: '-0.01em' }],
        'ios-title3': ['20px', { lineHeight: '25px', fontWeight: '400', letterSpacing: '-0.015em' }],
        'ios-title2': ['22px', { lineHeight: '28px', fontWeight: '400', letterSpacing: '-0.02em' }],
        'ios-title1': ['28px', { lineHeight: '34px', fontWeight: '400', letterSpacing: '-0.025em' }],
        'ios-large-title': ['34px', { lineHeight: '41px', fontWeight: '400', letterSpacing: '-0.03em' }],
      },
      
      // Enhanced mobile-first spacing scale with consistent rhythm
      spacing: {
        // Micro spacing
        '0.5': '0.125rem', // 2px
        '1.5': '0.375rem', // 6px
        '2.5': '0.625rem', // 10px
        '3.5': '0.875rem', // 14px
        
        // Standard spacing extensions
        '18': '4.5rem',   // 72px
        '22': '5.5rem',   // 88px
        '26': '6.5rem',   // 104px
        '30': '7.5rem',   // 120px
        '34': '8.5rem',   // 136px
        '88': '22rem',    // 352px
        '128': '32rem',   // 512px
        '144': '36rem',   // 576px
        '160': '40rem',   // 640px
        '192': '48rem',   // 768px
        
        // Component-specific spacing
        'card-sm': '1rem',    // 16px
        'card-md': '1.5rem',  // 24px
        'card-lg': '2rem',    // 32px
        'card-xl': '2.5rem',  // 40px
        
        // Layout spacing
        'section-xs': '2rem',   // 32px
        'section-sm': '3rem',   // 48px
        'section-md': '4rem',   // 64px
        'section-lg': '6rem',   // 96px
        'section-xl': '8rem',   // 128px
      },
      
      // Enhanced border radius system for modern iOS design
      borderRadius: {
        'none': '0px',
        'sm': '2px',
        'md': '6px',
        'lg': '8px',
        'xl': '12px',
        '2xl': '16px',
        '3xl': '24px',
        'full': '9999px',
        
        // iOS-specific radius values
        'ios-xs': '4px',
        'ios-sm': '6px',
        'ios': '10px',
        'ios-md': '12px',
        'ios-lg': '16px',
        'ios-xl': '20px',
        'ios-2xl': '24px',
        'ios-3xl': '28px',
        
        // Component-specific radius
        'button': '8px',
        'card': '12px',
        'modal': '20px',
        'input': '8px',
        'badge': '16px',
      },
      
      // Comprehensive shadow system for depth and elevation
      boxShadow: {
        // Base Tailwind shadows (enhanced)
        'sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'DEFAULT': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        'md': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        'xl': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        'inner': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
        'none': 'none',
        
        // iOS-style elevation shadows
        'ios-sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'ios': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        'ios-md': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'ios-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        'ios-xl': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        'ios-2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        
        // Glow effects
        'glow-primary': '0 0 20px rgba(20, 184, 166, 0.5)',
        'glow-primary-subtle': '0 0 10px rgba(20, 184, 166, 0.3)',
        'glow-primary-strong': '0 0 30px rgba(20, 184, 166, 0.7)',
        'glow-accent': '0 0 20px rgba(30, 41, 59, 0.5)',
        'glow-success': '0 0 20px rgba(5, 150, 105, 0.5)',
        'glow-warning': '0 0 20px rgba(245, 158, 11, 0.5)',
        'glow-error': '0 0 20px rgba(239, 68, 68, 0.5)',
        
        // Glass morphism shadows
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
        'glass-dark': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        'glass-light': '0 8px 32px 0 rgba(255, 255, 255, 0.1)',
        'glass-subtle': '0 4px 16px 0 rgba(31, 38, 135, 0.2)',
        
        // Dynamic Island style
        'island': '0 8px 30px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(255, 255, 255, 0.05)',
        'island-hover': '0 12px 40px rgba(0, 0, 0, 0.16), 0 0 0 1px rgba(255, 255, 255, 0.08)',
        
        // Premium shadows
        'premium': '0 20px 40px -12px rgba(0, 0, 0, 0.25), 0 8px 16px -8px rgba(0, 0, 0, 0.1)',
        'premium-colored': '0 20px 40px -12px rgba(20, 184, 166, 0.4)',
        'premium-soft': '0 10px 30px -10px rgba(0, 0, 0, 0.15)',
        
        // Component-specific shadows
        'button': '0 2px 4px -1px rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.06)',
        'button-hover': '0 4px 8px -2px rgba(0, 0, 0, 0.15), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
        'card': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'card-hover': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        'modal': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        'dropdown': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        'toast': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      },
      
      // Enhanced blur values for glass morphism and iOS effects
      backdropBlur: {
        'xs': '2px',
        'sm': '4px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
        '2xl': '24px',
        '3xl': '40px',
        'ios': '20px',
        'glass': '40px',
        'intense': '64px',
      },
      
      // Backdrop brightness and contrast for glass effects
      backdropBrightness: {
        25: '.25',
        75: '.75',
        90: '.9',
        95: '.95',
        105: '1.05',
        110: '1.1',
        125: '1.25',
      },
      backdropContrast: {
        25: '.25',
        75: '.75',
        90: '.9',
        95: '.95',
        105: '1.05',
        110: '1.1',
        125: '1.25',
      },
      
      // Performance-optimized animation durations and curves
      transitionDuration: {
        '75': '75ms',
        '100': '100ms',
        '150': '150ms',
        '200': '200ms',
        '300': '300ms',
        '500': '500ms',
        '700': '700ms',
        '1000': '1000ms',
      },
      transitionTimingFunction: {
        'ios': 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        'ios-spring': 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'snappy': 'cubic-bezier(0.4, 0, 1, 1)',
        'bounce': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      },
      
      // Performance-optimized animations with GPU acceleration
      animation: {
        // Enhanced basic animations
        'fade-in': 'fadeIn 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        'fade-out': 'fadeOut 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        'slide-up': 'slideUp 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        'slide-down': 'slideDown 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        'slide-left': 'slideLeft 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        'slide-right': 'slideRight 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        'pulse-gentle': 'pulseGentle 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pulse-strong': 'pulseStrong 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-gentle': 'bounceGentle 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-in-right': 'slideInRight 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        
        // iOS-style animations with proper easing
        'ios-bounce': 'iosBounce 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        'ios-scale': 'iosScale 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        'ios-scale-down': 'iosScaleDown 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        'ios-slide-up': 'iosSlideUp 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        'ios-slide-down': 'iosSlideDown 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        'ios-fade': 'iosFade 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        'glass-morph': 'glassMorph 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        
        // Advanced animations
        'float': 'float 3s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'shimmer': 'shimmer 2s linear infinite',
        'wiggle': 'wiggle 1s ease-in-out infinite',
        'shake': 'shake 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97)',
        'heartbeat': 'heartbeat 1.5s ease-in-out infinite',
        
        // Loading animations
        'skeleton': 'skeleton 1.2s ease-in-out infinite',
        'dots': 'dots 1.5s linear infinite',
        'spinner': 'spin 1s linear infinite',
        
        // New enhanced animations
        'scale-in': 'scaleIn 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        'scale-out': 'scaleOut 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        'rubber-band': 'rubberBand 1s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        'jello': 'jello 0.9s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        'wobble': 'wobble 1s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        'tada': 'tada 1s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        'morphing-gradient': 'morphingGradient 8s ease-in-out infinite',
        'typewriter': 'typewriter 3s steps(30, end)',
        'blink': 'blink 1s step-end infinite',
        'bounce-soft': 'bounceSoft 2s ease-in-out infinite',
      },
      
      keyframes: {
        // Enhanced keyframes with improved animations
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeOut: {
          '0%': { opacity: '1', transform: 'translateY(0)' },
          '100%': { opacity: '0', transform: 'translateY(-8px)' },
        },
        slideUp: {
          '0%': { transform: 'translate3d(0, 16px, 0)', opacity: '0' },
          '100%': { transform: 'translate3d(0, 0, 0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translate3d(0, -16px, 0)', opacity: '0' },
          '100%': { transform: 'translate3d(0, 0, 0)', opacity: '1' },
        },
        slideLeft: {
          '0%': { transform: 'translate3d(16px, 0, 0)', opacity: '0' },
          '100%': { transform: 'translate3d(0, 0, 0)', opacity: '1' },
        },
        slideRight: {
          '0%': { transform: 'translate3d(-16px, 0, 0)', opacity: '0' },
          '100%': { transform: 'translate3d(0, 0, 0)', opacity: '1' },
        },
        slideInRight: {
          '0%': { transform: 'translate3d(100%, 0, 0)', opacity: '0' },
          '100%': { transform: 'translate3d(0, 0, 0)', opacity: '1' },
        },
        pulseGentle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.8' },
        },
        pulseStrong: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.7', transform: 'scale(1.02)' },
        },
        bounceGentle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
        
        // Enhanced iOS-style keyframes
        iosBounce: {
          '0%': { transform: 'scale(0.8)', opacity: '0' },
          '50%': { transform: 'scale(1.05)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        iosScale: {
          '0%': { transform: 'scale(0.95)', opacity: '0.8' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        iosScaleDown: {
          '0%': { transform: 'scale(1.05)', opacity: '1' },
          '100%': { transform: 'scale(1)', opacity: '0.8' },
        },
        iosSlideUp: {
          '0%': { transform: 'translate3d(0, 20px, 0)', opacity: '0' },
          '100%': { transform: 'translate3d(0, 0, 0)', opacity: '1' },
        },
        iosSlideDown: {
          '0%': { transform: 'translate3d(0, -20px, 0)', opacity: '0' },
          '100%': { transform: 'translate3d(0, 0, 0)', opacity: '1' },
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
        
        // Advanced animation keyframes with GPU optimization
        float: {
          '0%, 100%': { transform: 'translate3d(0, 0px, 0)' },
          '50%': { transform: 'translate3d(0, -10px, 0)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(20, 184, 166, 0.2)' },
          '100%': { boxShadow: '0 0 20px rgba(20, 184, 166, 0.6)' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        wiggle: {
          '0%, 100%': { transform: 'rotate(-3deg)' },
          '50%': { transform: 'rotate(3deg)' },
        },
        shake: {
          '10%, 90%': { transform: 'translate3d(-1px, 0, 0)' },
          '20%, 80%': { transform: 'translate3d(2px, 0, 0)' },
          '30%, 50%, 70%': { transform: 'translate3d(-4px, 0, 0)' },
          '40%, 60%': { transform: 'translate3d(4px, 0, 0)' },
        },
        heartbeat: {
          '0%': { transform: 'scale(1)' },
          '14%': { transform: 'scale(1.1)' },
          '28%': { transform: 'scale(1)' },
          '42%': { transform: 'scale(1.1)' },
          '70%': { transform: 'scale(1)' },
        },
        skeleton: {
          '0%': { 
            backgroundPosition: '-200px 0',
            backgroundImage: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)'
          },
          '100%': { 
            backgroundPosition: 'calc(200px + 100%) 0',
            backgroundImage: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)'
          },
        },
        dots: {
          '0%, 20%': { opacity: '0.4' },
          '50%': { opacity: '1' },
          '100%': { opacity: '0.4' },
        },
        
        // New enhanced keyframes
        scaleIn: {
          '0%': { transform: 'scale(0.95) translate3d(0, 0, 0)', opacity: '0' },
          '100%': { transform: 'scale(1) translate3d(0, 0, 0)', opacity: '1' },
        },
        scaleOut: {
          '0%': { transform: 'scale(1) translate3d(0, 0, 0)', opacity: '1' },
          '100%': { transform: 'scale(0.95) translate3d(0, 0, 0)', opacity: '0' },
        },
        rubberBand: {
          '0%': { transform: 'scale3d(1, 1, 1)' },
          '30%': { transform: 'scale3d(1.25, 0.75, 1)' },
          '40%': { transform: 'scale3d(0.75, 1.25, 1)' },
          '50%': { transform: 'scale3d(1.15, 0.85, 1)' },
          '65%': { transform: 'scale3d(0.95, 1.05, 1)' },
          '75%': { transform: 'scale3d(1.05, 0.95, 1)' },
          '100%': { transform: 'scale3d(1, 1, 1)' },
        },
        jello: {
          '0%, 11.1%, 100%': { transform: 'translate3d(0, 0, 0)' },
          '22.2%': { transform: 'skewX(-12.5deg) skewY(-12.5deg)' },
          '33.3%': { transform: 'skewX(6.25deg) skewY(6.25deg)' },
          '44.4%': { transform: 'skewX(-3.125deg) skewY(-3.125deg)' },
          '55.5%': { transform: 'skewX(1.5625deg) skewY(1.5625deg)' },
          '66.6%': { transform: 'skewX(-0.78125deg) skewY(-0.78125deg)' },
          '77.7%': { transform: 'skewX(0.390625deg) skewY(0.390625deg)' },
          '88.8%': { transform: 'skewX(-0.1953125deg) skewY(-0.1953125deg)' },
        },
        wobble: {
          '0%': { transform: 'translate3d(0, 0, 0)' },
          '15%': { transform: 'translate3d(-25%, 0, 0) rotate3d(0, 0, 1, -5deg)' },
          '30%': { transform: 'translate3d(20%, 0, 0) rotate3d(0, 0, 1, 3deg)' },
          '45%': { transform: 'translate3d(-15%, 0, 0) rotate3d(0, 0, 1, -3deg)' },
          '60%': { transform: 'translate3d(10%, 0, 0) rotate3d(0, 0, 1, 2deg)' },
          '75%': { transform: 'translate3d(-5%, 0, 0) rotate3d(0, 0, 1, -1deg)' },
          '100%': { transform: 'translate3d(0, 0, 0)' },
        },
        tada: {
          '0%': { transform: 'scale3d(1, 1, 1)' },
          '10%, 20%': { transform: 'scale3d(0.9, 0.9, 0.9) rotate3d(0, 0, 1, -3deg)' },
          '30%, 50%, 70%, 90%': { transform: 'scale3d(1.1, 1.1, 1.1) rotate3d(0, 0, 1, 3deg)' },
          '40%, 60%, 80%': { transform: 'scale3d(1.1, 1.1, 1.1) rotate3d(0, 0, 1, -3deg)' },
          '100%': { transform: 'scale3d(1, 1, 1)' },
        },
        morphingGradient: {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
        typewriter: {
          '0%': { width: '0' },
          '100%': { width: '100%' },
        },
        blink: {
          '0%, 50%': { opacity: '1' },
          '51%, 100%': { opacity: '0' },
        },
        bounceSoft: {
          '0%, 100%': { transform: 'translateY(0) translate3d(0, 0, 0)' },
          '50%': { transform: 'translateY(-5px) translate3d(0, 0, 0)' },
        },
      },
      
      // Enhanced safe area and viewport utilities
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
        'screen-small': '100svh', // Small viewport height
        'screen-large': '100lvh', // Large viewport height
        'screen-dynamic': '100dvh', // Dynamic viewport height
      },
      width: {
        'screen-small': '100svw',
        'screen-large': '100lvw',
        'screen-dynamic': '100dvw',
      },
      minHeight: {
        'screen-small': '100svh',
        'screen-large': '100lvh',
        'screen-dynamic': '100dvh',
      },
      
      // Enhanced gradient system with CSS custom properties fallbacks
      backgroundImage: {
        // Ambient lighting gradients
        'ambient-light': 'linear-gradient(135deg, rgba(255, 255, 255, 0.8) 0%, rgba(255, 255, 255, 0.4) 100%)',
        'ambient-warm': 'linear-gradient(135deg, rgba(255, 245, 235, 0.8) 0%, rgba(255, 237, 213, 0.4) 100%)',
        'ambient-cool': 'linear-gradient(135deg, rgba(239, 246, 255, 0.8) 0%, rgba(219, 234, 254, 0.4) 100%)',
        
        // Premium surface gradients
        'surface-gradient': 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)',
        'surface-gradient-dark': 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 100%)',
        
        // Dynamic Island gradients with better iOS fidelity
        'island-gradient': 'linear-gradient(135deg, rgba(0, 0, 0, 0.8) 0%, rgba(0, 0, 0, 0.9) 100%)',
        'island-gradient-hover': 'linear-gradient(135deg, rgba(0, 0, 0, 0.75) 0%, rgba(0, 0, 0, 0.85) 100%)',
        'island-light': 'linear-gradient(135deg, rgba(255, 255, 255, 0.8) 0%, rgba(255, 255, 255, 0.9) 100%)',
        'island-light-hover': 'linear-gradient(135deg, rgba(255, 255, 255, 0.75) 0%, rgba(255, 255, 255, 0.85) 100%)',
        
        // Premium button gradients
        'premium-primary': 'linear-gradient(135deg, rgb(20, 184, 166) 0%, rgb(13, 148, 136) 100%)',
        'premium-primary-hover': 'linear-gradient(135deg, rgb(13, 148, 136) 0%, rgb(15, 118, 110) 100%)',
        'premium-secondary': 'linear-gradient(135deg, rgb(100, 116, 139) 0%, rgb(71, 85, 105) 100%)',
        
        // Glass surface gradients
        'glass-gradient': 'linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.05) 100%)',
        'glass-gradient-dark': 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.02) 100%)',
        
        // Mesh gradients for modern UI
        'mesh-primary': 'radial-gradient(at 40% 20%, rgb(20, 184, 166) 0px, transparent 50%), radial-gradient(at 80% 0%, rgb(59, 130, 246) 0px, transparent 50%), radial-gradient(at 0% 50%, rgb(168, 85, 247) 0px, transparent 50%)',
        'mesh-secondary': 'radial-gradient(at 40% 40%, rgb(255, 255, 255) 0px, transparent 50%), radial-gradient(at 90% 10%, rgb(236, 254, 255) 0px, transparent 50%), radial-gradient(at 0% 100%, rgb(245, 245, 245) 0px, transparent 50%)',
      },
      
      // Content width constraints for better readability
      maxWidth: {
        'prose': '65ch',
        'prose-sm': '55ch',
        'prose-lg': '75ch',
        'container-xs': '448px',
        'container-sm': '576px',
        'container-md': '768px',
        'container-lg': '992px',
        'container-xl': '1200px',
        'container-2xl': '1400px',
      },
      
      // Z-index scale for consistent layering
      zIndex: {
        '1': '1',
        '2': '2',
        '3': '3',
        '4': '4',
        '5': '5',
        'dropdown': '1000',
        'sticky': '1020',
        'fixed': '1030',
        'modal-backdrop': '1040',
        'modal': '1050',
        'popover': '1060',
        'tooltip': '1070',
        'toast': '1080',
      },
      
      // Aspect ratios for consistent media
      aspectRatio: {
        'card': '4/3',
        'video': '16/9',
        'photo': '3/2',
        'square': '1/1',
        'portrait': '3/4',
        'wide': '21/9',
      },
    },
  },
  plugins: [
    // Custom plugin for iOS-style utilities and performance optimizations
    function({ addUtilities, theme }) {
      const newUtilities = {
        // Touch-friendly utilities
        '.touch-manipulation': {
          'touch-action': 'manipulation',
        },
        '.touch-pan-x': {
          'touch-action': 'pan-x',
        },
        '.touch-pan-y': {
          'touch-action': 'pan-y',
        },
        '.touch-pinch-zoom': {
          'touch-action': 'pinch-zoom',
        },
        
        // iOS-style safe area utilities
        '.safe-top': {
          'padding-top': 'env(safe-area-inset-top)',
        },
        '.safe-bottom': {
          'padding-bottom': 'env(safe-area-inset-bottom)',
        },
        '.safe-left': {
          'padding-left': 'env(safe-area-inset-left)',
        },
        '.safe-right': {
          'padding-right': 'env(safe-area-inset-right)',
        },
        '.safe-x': {
          'padding-left': 'env(safe-area-inset-left)',
          'padding-right': 'env(safe-area-inset-right)',
        },
        '.safe-y': {
          'padding-top': 'env(safe-area-inset-top)',
          'padding-bottom': 'env(safe-area-inset-bottom)',
        },
        '.safe-all': {
          'padding-top': 'env(safe-area-inset-top)',
          'padding-bottom': 'env(safe-area-inset-bottom)',
          'padding-left': 'env(safe-area-inset-left)',
          'padding-right': 'env(safe-area-inset-right)',
        },
        
        // Performance optimized transforms
        '.gpu-accelerated': {
          'transform': 'translate3d(0, 0, 0)',
          'backface-visibility': 'hidden',
          'perspective': '1000px',
        },
        
        // Content visibility for performance
        '.content-visibility-auto': {
          'content-visibility': 'auto',
        },
        '.contain-layout': {
          'contain': 'layout',
        },
        '.contain-paint': {
          'contain': 'paint',
        },
        '.contain-size': {
          'contain': 'size',
        },
        '.contain-strict': {
          'contain': 'strict',
        },
        
        // Modern CSS features
        '.will-change-transform': {
          'will-change': 'transform',
        },
        '.will-change-opacity': {
          'will-change': 'opacity',
        },
        '.will-change-auto': {
          'will-change': 'auto',
        },
      }
      
      addUtilities(newUtilities)
    },
  ],
}
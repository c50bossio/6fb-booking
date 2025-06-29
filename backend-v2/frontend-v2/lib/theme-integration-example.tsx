// Example integration for layout.tsx
// This shows how to integrate the theme system into your app

import { ThemeProvider } from './theme-provider';
import { ThemeToggle, SimpleThemeToggle } from '../components/ThemeToggle';

// 1. Wrap your app with ThemeProvider in layout.tsx
export function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#ffffff" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('dark')
                } else {
                  document.documentElement.classList.remove('dark')
                }
              } catch (_) {}
            `,
          }}
        />
      </head>
      <body className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white transition-colors">
        <ThemeProvider
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange={false}
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}

// 2. Add theme toggle to your header/navbar
export function Header() {
  return (
    <header className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
              6FB Booking
            </h1>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Simple toggle for header */}
            <SimpleThemeToggle />
            
            {/* Or full toggle with options */}
            <ThemeToggle variant="buttons" />
          </div>
        </div>
      </div>
    </header>
  );
}

// 3. Use theme in components
import { useTheme, useThemeStyles } from '../hooks/useTheme';

export function ExampleComponent() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const { isDark, colors, getClass } = useThemeStyles();
  
  return (
    <div className={`p-6 rounded-lg ${colors.background.card} ${colors.border.default} border`}>
      <h2 className={colors.text.primary}>
        Current theme: {theme} (resolved: {resolvedTheme})
      </h2>
      
      <p className={colors.text.secondary}>
        This component adapts to the current theme automatically.
      </p>
      
      <button
        onClick={() => setTheme(isDark ? 'light' : 'dark')}
        className={`
          mt-4 px-4 py-2 rounded-md transition-colors
          ${getClass(
            'bg-teal-600 hover:bg-teal-700 text-white',
            'bg-teal-500 hover:bg-teal-600 text-white'
          )}
        `}
      >
        Toggle Theme
      </button>
      
      {/* Theme-aware settings panel */}
      <div className="mt-6">
        <h3 className={`text-lg font-medium ${colors.text.primary} mb-4`}>
          Theme Settings
        </h3>
        <ThemeToggle variant="buttons" showLabel />
      </div>
    </div>
  );
}

// 4. Theme-aware form components
export function ThemedInput({ ...props }) {
  const { colors } = useThemeStyles();
  
  return (
    <input
      {...props}
      className={`
        w-full px-3 py-2 rounded-md border transition-colors
        ${colors.background.primary} ${colors.text.primary} ${colors.border.default}
        focus:ring-2 focus:ring-teal-500 focus:border-transparent
        placeholder:${colors.text.muted}
      `}
    />
  );
}

// 5. Conditional rendering based on theme
export function ThemeSpecificContent() {
  const { resolvedTheme } = useTheme();
  
  if (resolvedTheme === 'dark') {
    return (
      <div className="bg-gray-800 text-white p-4 rounded-lg">
        <h3>Dark Mode Content</h3>
        <p>This content only shows in dark mode.</p>
      </div>
    );
  }
  
  return (
    <div className="bg-white text-gray-900 p-4 rounded-lg border">
      <h3>Light Mode Content</h3>
      <p>This content only shows in light mode.</p>
    </div>
  );
}
/**
 * Minimal layout for debugging - bypasses all complex systems
 * No providers, no error boundaries, no auth, no theme providers
 */

export default function DebugLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <title>Debug - Agents</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body style={{ 
        fontFamily: 'system-ui, sans-serif',
        margin: 0,
        padding: '20px',
        backgroundColor: '#f9fafb',
        lineHeight: 1.6
      }}>
        <div style={{
          maxWidth: '800px',
          margin: '0 auto',
          backgroundColor: 'white',
          padding: '24px',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          {children}
        </div>
      </body>
    </html>
  )
}
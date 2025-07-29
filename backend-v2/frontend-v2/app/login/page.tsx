export default function LoginPage() {
  return (
    <div style={{ 
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f8fafc',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '3rem 2rem',
        borderRadius: '12px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        width: '100%',
        maxWidth: '400px',
        textAlign: 'center'
      }}>
        <h1 style={{ 
          fontSize: '2rem', 
          fontWeight: 'bold', 
          color: '#1e293b',
          margin: '0 0 1rem 0'
        }}>
          BOOKEDBARBER
        </h1>
        
        <div style={{
          padding: '1rem',
          backgroundColor: '#fef3c7',
          border: '1px solid #f59e0b',
          borderRadius: '8px',
          marginBottom: '2rem'
        }}>
          <h2 style={{ 
            fontSize: '1.25rem',
            color: '#92400e',
            margin: '0 0 0.5rem 0'
          }}>
            Authentication Temporarily Disabled
          </h2>
          <p style={{ color: '#92400e', margin: 0, fontSize: '0.875rem' }}>
            Login system being rebuilt for better stability
          </p>
        </div>
        
        <a 
          href="/dashboard" 
          style={{
            display: 'inline-block',
            padding: '0.75rem 1.5rem',
            backgroundColor: '#14b8a6',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '6px',
            fontWeight: '500',
            marginBottom: '1rem'
          }}
        >
          Continue to Dashboard
        </a>
        
        <div style={{ marginTop: '1rem' }}>
          <a href="/" style={{ 
            color: '#64748b', 
            fontSize: '0.875rem', 
            textDecoration: 'none'
          }}>
            ← Back to home
          </a>
        </div>
      </div>
    </div>
  )
}
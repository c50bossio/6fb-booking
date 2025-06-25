'use client'

export default function CalendarDebugPage() {
  return (
    <div style={{ padding: '2rem', backgroundColor: '#171717', color: '#ffffff', minHeight: '100vh' }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Calendar Debug Page</h1>
      <p>If you can see this, React routing is working!</p>
      <div style={{
        marginTop: '2rem',
        padding: '1rem',
        backgroundColor: '#2a2a2a',
        borderRadius: '0.5rem'
      }}>
        <h2>Premium Theme Test</h2>
        <p style={{ color: '#ffffff' }}>This text should be bright white</p>
        <p style={{ color: '#10b981' }}>This text should be teal accent</p>
      </div>
    </div>
  )
}

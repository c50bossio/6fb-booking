import { ImageResponse } from 'next/og'

// Route segment config
export const runtime = 'edge'

// Image metadata for default icon
export const size = {
  width: 32,
  height: 32,
}
export const contentType = 'image/png'

// Default static icon generation (32x32)
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 16,
          background: '#14b8a6',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontWeight: 'bold',
          borderRadius: '6px',
        }}
      >
        BB
      </div>
    ),
    {
      ...size,
    }
  )
}
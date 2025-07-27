import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

// Route segment config
export const runtime = 'edge'

// Dynamic icon generation via API route
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const sizeParam = searchParams.get('size')
  const requestedSize = sizeParam ? parseInt(sizeParam, 10) : 32
  
  // Validate size - must be between 16 and 512 pixels
  const iconSize = Math.min(Math.max(requestedSize, 16), 512)
  
  // Calculate font size proportional to icon size
  const fontSize = Math.max(Math.round(iconSize * 0.4), 8)
  
  // Calculate border radius proportional to icon size
  const borderRadius = Math.max(Math.round(iconSize * 0.125), 2)

  return new ImageResponse(
    (
      <div
        style={{
          fontSize: fontSize,
          background: '#14b8a6',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontWeight: 'bold',
          borderRadius: `${borderRadius}px`,
        }}
      >
        BB
      </div>
    ),
    {
      width: iconSize,
      height: iconSize,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    }
  )
}
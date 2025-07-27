import { ImageResponse } from 'next/og'

// Route segment config
export const runtime = 'edge'

// Image metadata - Dynamic size based on request
export const size = {
  width: 32,
  height: 32,
}
export const contentType = 'image/png'

// Image generation with dynamic sizing
export default function Icon({ searchParams }: { searchParams: { size?: string } }) {
  // Parse size from query parameter, default to 32
  const requestedSize = searchParams?.size ? parseInt(searchParams.size, 10) : 32
  
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
    }
  )
}
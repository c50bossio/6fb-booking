import { renderHook, act, waitFor } from '@testing-library/react'
import { useWebSocket } from '../useWebSocket'
import WS from 'jest-websocket-mock'

// Mock auth context
jest.mock('../useAuth', () => ({
  useAuth: () => ({
    user: { id: 1, name: 'Test User' },
    token: 'test-token'
  })
}))

describe('useWebSocket', () => {
  let server: WS
  const wsUrl = 'ws://localhost:8000/api/v1/ws'

  beforeEach(async () => {
    // Create mock WebSocket server
    server = new WS(wsUrl, { jsonProtocol: true })
  })

  afterEach(() => {
    WS.clean()
    jest.clearAllMocks()
  })

  it('connects to WebSocket server on mount', async () => {
    const { result } = renderHook(() => useWebSocket())

    await waitFor(() => {
      expect(result.current.connectionStatus).toBe('connecting')
    })

    // Wait for connection
    await server.connected

    act(() => {
      server.send({ type: 'connection', data: { status: 'connected' } })
    })

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true)
      expect(result.current.connectionStatus).toBe('connected')
    })
  })

  it('handles disconnection and reconnection', async () => {
    const { result } = renderHook(() => useWebSocket())

    // Wait for initial connection
    await server.connected

    act(() => {
      server.send({ type: 'connection', data: { status: 'connected' } })
    })

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true)
    })

    // Simulate disconnection
    act(() => {
      server.close()
    })

    await waitFor(() => {
      expect(result.current.isConnected).toBe(false)
      expect(result.current.connectionStatus).toBe('disconnected')
    })

    // Should attempt to reconnect
    await waitFor(() => {
      expect(result.current.connectionStatus).toBe('connecting')
    }, { timeout: 3000 })
  })

  it('receives and processes messages', async () => {
    const { result } = renderHook(() => useWebSocket())

    await server.connected

    const testMessage = {
      type: 'notification',
      data: {
        id: '123',
        title: 'Test Notification',
        message: 'This is a test'
      }
    }

    act(() => {
      server.send(testMessage)
    })

    await waitFor(() => {
      expect(result.current.lastMessage).toEqual(testMessage)
    })
  })

  it('sends messages through WebSocket', async () => {
    const { result } = renderHook(() => useWebSocket())

    await server.connected

    const testMessage = {
      type: 'subscribe',
      channel: 'analytics'
    }

    act(() => {
      result.current.sendMessage(testMessage)
    })

    await expect(server).toReceiveMessage(testMessage)
  })

  it('handles heartbeat/ping messages', async () => {
    const { result } = renderHook(() => useWebSocket())

    await server.connected

    // Send ping
    act(() => {
      server.send({ type: 'ping' })
    })

    // Should respond with pong
    await expect(server).toReceiveMessage({ type: 'pong' })
  })

  it('manages message history correctly', async () => {
    const { result } = renderHook(() => useWebSocket())

    await server.connected

    // Send multiple messages
    const messages = [
      { type: 'notification', data: { id: 1 } },
      { type: 'notification', data: { id: 2 } },
      { type: 'notification', data: { id: 3 } }
    ]

    messages.forEach(msg => {
      act(() => {
        server.send(msg)
      })
    })

    await waitFor(() => {
      expect(result.current.messages).toHaveLength(3)
      expect(result.current.messages).toEqual(messages)
    })
  })

  it('cleans up on unmount', async () => {
    const { result, unmount } = renderHook(() => useWebSocket())

    await server.connected

    unmount()

    await waitFor(() => {
      expect(server).toHaveReceivedMessages([
        expect.objectContaining({ type: 'disconnect' })
      ])
    })
  })

  it('handles authentication token in connection', async () => {
    renderHook(() => useWebSocket())

    await server.connected

    // Check that token was sent in connection URL
    const connectionUrl = server.url
    expect(connectionUrl).toContain('token=test-token')
  })

  it('respects max reconnection attempts', async () => {
    const { result } = renderHook(() => useWebSocket())

    // Close server immediately
    server.close()

    // Wait for multiple reconnection attempts
    await waitFor(() => {
      expect(result.current.reconnectAttempt).toBeGreaterThan(0)
    }, { timeout: 5000 })

    // Should eventually give up
    await waitFor(() => {
      expect(result.current.connectionStatus).toBe('failed')
    }, { timeout: 10000 })
  })
})

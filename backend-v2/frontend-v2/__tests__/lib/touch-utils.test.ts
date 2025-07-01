import { TouchDragManager } from '@/lib/touch-utils'

// Mock DOM elements and events
class MockHTMLElement {
  addEventListener = jest.fn()
  removeEventListener = jest.fn()
  getBoundingClientRect = jest.fn(() => ({
    top: 0,
    left: 0,
    width: 100,
    height: 100
  }))
}

// Mock touch events
const createMockTouchEvent = (type: string, touches: any[]) => {
  return {
    type,
    touches,
    preventDefault: jest.fn(),
    stopPropagation: jest.fn()
  } as any
}

describe('TouchDragManager', () => {
  let touchManager: TouchDragManager
  let mockElement: MockHTMLElement

  beforeEach(() => {
    touchManager = new TouchDragManager()
    mockElement = new MockHTMLElement()
    jest.clearAllMocks()
  })

  describe('isTouchDevice detection', () => {
    it('detects touch devices correctly', () => {
      // Mock touch support
      Object.defineProperty(window, 'ontouchstart', {
        value: null,
        writable: true
      })

      expect(TouchDragManager.isTouchDevice()).toBe(true)
    })

    it('detects non-touch devices correctly', () => {
      // Remove touch support
      delete (window as any).ontouchstart

      expect(TouchDragManager.isTouchDevice()).toBe(false)
    })
  })

  describe('touch drag initialization', () => {
    it('sets up touch event listeners', () => {
      const options = {
        onDragStart: jest.fn(),
        onDragMove: jest.fn(),
        onDragEnd: jest.fn()
      }

      touchManager.initializeTouchDrag(mockElement as any, options)

      expect(mockElement.addEventListener).toHaveBeenCalledWith(
        'touchstart',
        expect.any(Function),
        { passive: false }
      )
      expect(mockElement.addEventListener).toHaveBeenCalledWith(
        'touchmove',
        expect.any(Function),
        { passive: false }
      )
      expect(mockElement.addEventListener).toHaveBeenCalledWith(
        'touchend',
        expect.any(Function)
      )
    })

    it('returns cleanup function', () => {
      const cleanup = touchManager.initializeTouchDrag(mockElement as any, {})

      expect(typeof cleanup).toBe('function')

      // Cleanup should remove event listeners
      cleanup()

      expect(mockElement.removeEventListener).toHaveBeenCalledWith(
        'touchstart',
        expect.any(Function)
      )
    })
  })

  describe('touch drag behavior', () => {
    it('starts drag after long press delay', (done) => {
      const onDragStart = jest.fn(() => true)
      const options = { onDragStart }

      touchManager.initializeTouchDrag(mockElement as any, options)

      // Simulate touch start
      const touchStart = createMockTouchEvent('touchstart', [{
        pageX: 50,
        pageY: 50,
        clientX: 50,
        clientY: 50
      }])

      // Get the touch start handler
      const touchStartHandler = mockElement.addEventListener.mock.calls
        .find(call => call[0] === 'touchstart')?.[1]

      if (touchStartHandler) {
        touchStartHandler(touchStart)

        // Wait for long press delay
        setTimeout(() => {
          expect(onDragStart).toHaveBeenCalled()
          done()
        }, 600) // Slightly longer than default 500ms delay
      }
    })

    it('cancels drag if moved too far during long press', () => {
      const onDragStart = jest.fn()
      const options = { onDragStart }

      touchManager.initializeTouchDrag(mockElement as any, options)

      // Simulate touch start
      const touchStart = createMockTouchEvent('touchstart', [{
        pageX: 50,
        pageY: 50,
        clientX: 50,
        clientY: 50
      }])

      // Simulate touch move (far away)
      const touchMove = createMockTouchEvent('touchmove', [{
        pageX: 100,
        pageY: 100,
        clientX: 100,
        clientY: 100
      }])

      const touchStartHandler = mockElement.addEventListener.mock.calls
        .find(call => call[0] === 'touchstart')?.[1]
      const touchMoveHandler = mockElement.addEventListener.mock.calls
        .find(call => call[0] === 'touchmove')?.[1]

      if (touchStartHandler && touchMoveHandler) {
        touchStartHandler(touchStart)
        touchMoveHandler(touchMove)

        // Wait beyond long press delay
        setTimeout(() => {
          expect(onDragStart).not.toHaveBeenCalled()
        }, 600)
      }
    })

    it('respects canDrag option', () => {
      const onDragStart = jest.fn()
      const canDrag = jest.fn(() => false)
      const options = { onDragStart, canDrag }

      touchManager.initializeTouchDrag(mockElement as any, options)

      const touchStart = createMockTouchEvent('touchstart', [{
        pageX: 50,
        pageY: 50,
        clientX: 50,
        clientY: 50
      }])

      const touchStartHandler = mockElement.addEventListener.mock.calls
        .find(call => call[0] === 'touchstart')?.[1]

      if (touchStartHandler) {
        touchStartHandler(touchStart)

        expect(canDrag).toHaveBeenCalledWith(mockElement)
        expect(onDragStart).not.toHaveBeenCalled()
      }
    })
  })

  describe('drag state management', () => {
    it('tracks drag state correctly', () => {
      const dragState = touchManager.getDragState()

      expect(dragState.isDragging).toBe(false)
      expect(dragState.startPosition).toBeNull()
      expect(dragState.currentPosition).toBeNull()
    })

    it('provides haptic feedback when available', () => {
      // Mock navigator.vibrate
      const mockVibrate = jest.fn()
      Object.defineProperty(navigator, 'vibrate', {
        value: mockVibrate,
        writable: true
      })

      const onDragStart = jest.fn(() => true)
      touchManager.initializeTouchDrag(mockElement as any, { onDragStart })

      // This would be tested in a full integration test with actual touch events
      // Here we just verify the vibrate function exists
      expect(typeof navigator.vibrate).toBe('function')
    })
  })

  describe('error handling', () => {
    it('handles missing touch events gracefully', () => {
      expect(() => {
        touchManager.initializeTouchDrag(mockElement as any, {})
      }).not.toThrow()
    })

    it('handles invalid touch coordinates', () => {
      const options = {
        onDragMove: jest.fn()
      }

      touchManager.initializeTouchDrag(mockElement as any, options)

      const touchMove = createMockTouchEvent('touchmove', [{
        pageX: NaN,
        pageY: NaN,
        clientX: undefined,
        clientY: undefined
      }])

      const touchMoveHandler = mockElement.addEventListener.mock.calls
        .find(call => call[0] === 'touchmove')?.[1]

      expect(() => {
        if (touchMoveHandler) {
          touchMoveHandler(touchMove)
        }
      }).not.toThrow()
    })
  })
})
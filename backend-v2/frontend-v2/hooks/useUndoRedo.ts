import { useState, useCallback, useRef } from 'react'

interface HistoryState<T> {
  past: T[]
  present: T
  future: T[]
}

interface UndoRedoOptions {
  maxHistorySize?: number
  onUndo?: () => void
  onRedo?: () => void
  onUpdate?: (state: any) => void
}

export function useUndoRedo<T>(
  initialState: T,
  options: UndoRedoOptions = {}
) {
  const { 
    maxHistorySize = 50, 
    onUndo, 
    onRedo, 
    onUpdate 
  } = options

  const [history, setHistory] = useState<HistoryState<T>>({
    past: [],
    present: initialState,
    future: []
  })

  const isUpdating = useRef(false)

  const canUndo = history.past.length > 0
  const canRedo = history.future.length > 0

  const update = useCallback((newState: T | ((prev: T) => T)) => {
    if (isUpdating.current) return

    setHistory(prevHistory => {
      const resolvedState = typeof newState === 'function' 
        ? (newState as (prev: T) => T)(prevHistory.present)
        : newState

      // Don't add to history if state hasn't changed
      if (JSON.stringify(resolvedState) === JSON.stringify(prevHistory.present)) {
        return prevHistory
      }

      const newPast = [...prevHistory.past, prevHistory.present]
      
      // Limit history size
      if (newPast.length > maxHistorySize) {
        newPast.shift()
      }

      const newHistory = {
        past: newPast,
        present: resolvedState,
        future: [] // Clear future when new action is performed
      }

      // Call update callback
      if (onUpdate) {
        Promise.resolve().then(() => {
          isUpdating.current = true
          onUpdate(resolvedState)
          isUpdating.current = false
        })
      }

      return newHistory
    })
  }, [maxHistorySize, onUpdate])

  const undo = useCallback(() => {
    if (!canUndo) return

    setHistory(prevHistory => {
      const previous = prevHistory.past[prevHistory.past.length - 1]
      const newPast = prevHistory.past.slice(0, prevHistory.past.length - 1)

      const newHistory = {
        past: newPast,
        present: previous,
        future: [prevHistory.present, ...prevHistory.future]
      }

      // Call callbacks
      if (onUndo) {
        Promise.resolve().then(() => {
          isUpdating.current = true
          onUndo()
          isUpdating.current = false
        })
      }

      if (onUpdate) {
        Promise.resolve().then(() => {
          isUpdating.current = true
          onUpdate(previous)
          isUpdating.current = false
        })
      }

      return newHistory
    })
  }, [canUndo, onUndo, onUpdate])

  const redo = useCallback(() => {
    if (!canRedo) return

    setHistory(prevHistory => {
      const next = prevHistory.future[0]
      const newFuture = prevHistory.future.slice(1)

      const newHistory = {
        past: [...prevHistory.past, prevHistory.present],
        present: next,
        future: newFuture
      }

      // Call callbacks
      if (onRedo) {
        Promise.resolve().then(() => {
          isUpdating.current = true
          onRedo()
          isUpdating.current = false
        })
      }

      if (onUpdate) {
        Promise.resolve().then(() => {
          isUpdating.current = true
          onUpdate(next)
          isUpdating.current = false
        })
      }

      return newHistory
    })
  }, [canRedo, onRedo, onUpdate])

  const reset = useCallback((newInitialState?: T) => {
    setHistory({
      past: [],
      present: newInitialState || initialState,
      future: []
    })
  }, [initialState])

  const jumpToState = useCallback((index: number) => {
    setHistory(prevHistory => {
      const allStates = [
        ...prevHistory.past,
        prevHistory.present,
        ...prevHistory.future
      ]

      if (index < 0 || index >= allStates.length) {
        return prevHistory
      }

      const newPresent = allStates[index]
      const newPast = allStates.slice(0, index)
      const newFuture = allStates.slice(index + 1)

      return {
        past: newPast,
        present: newPresent,
        future: newFuture
      }
    })
  }, [])

  return {
    state: history.present,
    setState: update,
    undo,
    redo,
    canUndo,
    canRedo,
    reset,
    jumpToState,
    history: {
      past: history.past,
      future: history.future,
      total: history.past.length + 1 + history.future.length
    }
  }
}
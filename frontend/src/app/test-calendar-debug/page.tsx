'use client'

import { useState } from 'react'

export default function TestCalendarDebugPage() {
  const [logs, setLogs] = useState<string[]>([])

  const addLog = (message: string) => {
    console.log(message)
    setLogs(prev => [...prev, `${new Date().toISOString().substr(11, 8)} - ${message}`])
  }

  const appointment = {
    id: 'test-1',
    client: 'John Doe',
    service: 'Haircut',
    __dragProps: {
      draggable: true,
      onDragStart: (e: React.DragEvent) => {
        addLog('✅ onDragStart fired from __dragProps!')
        e.dataTransfer.setData('text/plain', 'test-1')
      },
      onDragEnd: () => {
        addLog('✅ onDragEnd fired from __dragProps!')
      }
    }
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Calendar Debug Test</h1>

      <div className="grid grid-cols-2 gap-8">
        <div>
          <h2 className="text-lg font-semibold mb-4">Test Cases</h2>

          {/* Test 1: Direct drag handlers */}
          <div className="mb-4">
            <h3 className="font-medium mb-2">1. Direct Handlers</h3>
            <div
              className="p-3 bg-blue-500 text-white rounded cursor-move"
              draggable={true}
              onDragStart={(e) => {
                addLog('✅ Direct onDragStart fired!')
                e.dataTransfer.setData('text/plain', 'direct')
              }}
              onDragEnd={() => addLog('✅ Direct onDragEnd fired!')}
              onMouseDown={() => addLog('Mouse down on direct')}
            >
              Direct Drag Handlers
            </div>
          </div>

          {/* Test 2: Spread operator */}
          <div className="mb-4">
            <h3 className="font-medium mb-2">2. Spread Operator</h3>
            <div
              className="p-3 bg-green-500 text-white rounded cursor-move"
              onClick={() => addLog('Click on spread')}
              {...appointment.__dragProps}
            >
              Spread: {appointment.client}
            </div>
          </div>

          {/* Test 3: Spread at end (current approach) */}
          <div className="mb-4">
            <h3 className="font-medium mb-2">3. Spread at End</h3>
            <div
              className="p-3 bg-purple-500 text-white rounded cursor-move"
              onClick={() => addLog('Click on spread-end')}
              onMouseEnter={() => addLog('Mouse enter on spread-end')}
              {...appointment.__dragProps}
            >
              Spread End: {appointment.client}
            </div>
          </div>

          {/* Test 4: Explicit props (current calendar approach) */}
          <div className="mb-4">
            <h3 className="font-medium mb-2">4. Explicit Props</h3>
            <div
              className="p-3 bg-orange-500 text-white rounded cursor-move"
              onClick={() => addLog('Click on explicit')}
              draggable={appointment.__dragProps?.draggable}
              onDragStart={appointment.__dragProps?.onDragStart}
              onDragEnd={appointment.__dragProps?.onDragEnd}
            >
              Explicit: {appointment.client}
            </div>
          </div>

          {/* Drop Zone */}
          <div
            className="mt-8 p-4 border-2 border-dashed border-gray-300 rounded min-h-[100px]"
            onDragOver={(e) => {
              e.preventDefault()
              addLog('Drag over drop zone')
            }}
            onDrop={(e) => {
              e.preventDefault()
              const data = e.dataTransfer.getData('text/plain')
              addLog(`✅ Dropped: ${data}`)
            }}
          >
            Drop Zone
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-4">Event Log</h2>
          <div className="bg-gray-100 rounded p-4 h-96 overflow-y-auto font-mono text-sm">
            {logs.length === 0 ? (
              <p className="text-gray-500">No events yet...</p>
            ) : (
              logs.map((log, i) => (
                <div key={i} className="mb-1">{log}</div>
              ))
            )}
          </div>
          <button
            onClick={() => setLogs([])}
            className="mt-2 px-4 py-2 bg-gray-500 text-white rounded"
          >
            Clear Logs
          </button>
        </div>
      </div>
    </div>
  )
}

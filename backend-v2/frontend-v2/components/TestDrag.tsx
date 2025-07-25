'use client'

import { useState } from 'react'

export default function TestDrag() {
  const [draggedItem, setDraggedItem] = useState<string | null>(null)
  
  return (
    <div className="fixed bottom-4 right-4 bg-white dark:bg-gray-800 p-4 rounded shadow-lg z-50 w-96">
      <h3 className="font-bold mb-2">Drag Test Component</h3>
      
      {/* Test items */}
      <div className="space-y-2 mb-4">
        {['Item A', 'Item B', 'Item C'].map((item) => (
          <div
            key={item}
            draggable
            onDragStart={(e) => {
              setDraggedItem(item)
              e.dataTransfer.effectAllowed = 'move'
              e.dataTransfer.setData('text/plain', item)
            }}
            onDragEnd={() => {
              setDraggedItem(null)
            }}
            className={`p-2 bg-blue-500 text-white rounded cursor-move ${
              draggedItem === item ? 'opacity-50' : ''
            }`}
          >
            {item} - Drag me
          </div>
        ))}
      </div>
      
      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault()
          e.currentTarget.style.backgroundColor = '#fef3c7'
        }}
        onDragLeave={(e) => {
          e.currentTarget.style.backgroundColor = ''
        }}
        onDrop={(e) => {
          e.preventDefault()
          e.currentTarget.style.backgroundColor = ''
          const data = e.dataTransfer.getData('text/plain')
          alert(`Dropped: ${data}`)
        }}
        className="border-2 border-dashed border-gray-400 p-4 rounded"
      >
        Drop here
      </div>
      
      <div className="mt-2 text-xs text-gray-600">
        Currently dragging: {draggedItem || 'None'}
      </div>
    </div>
  )
}
'use client'

import { useState } from 'react'

export default function TestDragDropPage() {
  const [draggedItem, setDraggedItem] = useState<string | null>(null)
  const [items, setItems] = useState([
    { id: '1', text: 'Item 1', slot: 'slot1' },
    { id: '2', text: 'Item 2', slot: 'slot1' },
    { id: '3', text: 'Item 3', slot: 'slot2' },
  ])

  const handleDragStart = (e: React.DragEvent, itemId: string) => {
    console.log('🎯 Drag started:', itemId)
    setDraggedItem(itemId)
    e.dataTransfer.setData('text/plain', itemId)
  }

  const handleDragEnd = (e: React.DragEvent) => {
    console.log('🎯 Drag ended')
    setDraggedItem(null)
  }

  const handleDrop = (e: React.DragEvent, slotId: string) => {
    e.preventDefault()
    const itemId = e.dataTransfer.getData('text/plain')
    console.log('🎯 Dropped:', itemId, 'in', slotId)

    setItems(prev => prev.map(item =>
      item.id === itemId ? { ...item, slot: slotId } : item
    ))
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-8">Drag & Drop Test</h1>

      <div className="grid grid-cols-2 gap-8">
        {['slot1', 'slot2'].map(slotId => (
          <div
            key={slotId}
            className="min-h-[300px] p-4 border-2 border-dashed border-gray-300 rounded-lg"
            onDrop={(e) => handleDrop(e, slotId)}
            onDragOver={handleDragOver}
          >
            <h2 className="text-lg font-semibold mb-4">Slot {slotId}</h2>
            {items.filter(item => item.slot === slotId).map(item => (
              <div
                key={item.id}
                draggable
                onDragStart={(e) => handleDragStart(e, item.id)}
                onDragEnd={handleDragEnd}
                className={`p-3 mb-2 bg-blue-500 text-white rounded cursor-move ${
                  draggedItem === item.id ? 'opacity-50' : ''
                }`}
              >
                {item.text}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

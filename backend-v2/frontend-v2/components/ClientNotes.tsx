'use client'

import { useState, useEffect } from 'react'
import { addClientNote, type Client } from '@/lib/api'

interface NotesProps {
  clientId: number
  client: Client
  onRefresh: () => void
}

interface Note {
  id: number
  content: string
  note_type: string
  created_at: string
  updated_at: string
  created_by: {
    id: number
    name: string
    role: string
  }
  is_private: boolean
  tags: string[]
}

const noteTypes = [
  { value: 'general', label: 'General', color: 'blue', icon: '📝' },
  { value: 'service', label: 'Service Related', color: 'green', icon: '✂️' },
  { value: 'preference', label: 'Preference', color: 'purple', icon: '💜' },
  { value: 'issue', label: 'Issue/Concern', color: 'red', icon: '⚠️' },
  { value: 'compliment', label: 'Compliment', color: 'yellow', icon: '⭐' },
  { value: 'appointment', label: 'Appointment Notes', color: 'indigo', icon: '📅' },
  { value: 'payment', label: 'Payment/Billing', color: 'gray', icon: '💳' },
  { value: 'referral', label: 'Referral', color: 'pink', icon: '👥' }
]

export default function ClientNotes({ clientId, client, onRefresh }: NotesProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [notes, setNotes] = useState<Note[]>([])
  const [filteredNotes, setFilteredNotes] = useState<Note[]>([])
  
  // Form state
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingNote, setEditingNote] = useState<Note | null>(null)
  const [newNote, setNewNote] = useState({
    content: '',
    note_type: 'general',
    is_private: false,
    tags: [] as string[]
  })
  
  // Filter state
  const [typeFilter, setTypeFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [showPrivate, setShowPrivate] = useState(true)
  const [sortBy, setSortBy] = useState('newest')

  useEffect(() => {
    loadNotes()
  }, [clientId])

  useEffect(() => {
    applyFilters()
  }, [notes, typeFilter, searchTerm, showPrivate, sortBy])

  const loadNotes = async () => {
    // Mock notes data - in real app, this would come from an API
    const mockNotes: Note[] = [
      {
        id: 1,
        content: "Client prefers shorter haircuts and doesn't like too much taken off the sides. Very particular about the fade.",
        note_type: 'preference',
        created_at: '2024-06-25T10:30:00Z',
        updated_at: '2024-06-25T10:30:00Z',
        created_by: { id: 1, name: 'John Barber', role: 'barber' },
        is_private: false,
        tags: ['haircut', 'fade', 'preferences']
      },
      {
        id: 2,
        content: "Excellent client - always on time, tips well, and refers friends. Mentioned he works in tech downtown.",
        note_type: 'compliment',
        created_at: '2024-06-20T14:15:00Z',
        updated_at: '2024-06-20T14:15:00Z',
        created_by: { id: 1, name: 'John Barber', role: 'barber' },
        is_private: false,
        tags: ['punctual', 'referrals', 'tech']
      },
      {
        id: 3,
        content: "Had an issue with the last haircut - said it was too short on top. Offered a complimentary touch-up next visit.",
        note_type: 'issue',
        created_at: '2024-06-18T16:45:00Z',
        updated_at: '2024-06-18T16:45:00Z',
        created_by: { id: 2, name: 'Manager Mike', role: 'manager' },
        is_private: true,
        tags: ['complaint', 'comped', 'haircut']
      },
      {
        id: 4,
        content: "Referred three new clients this month - John Smith, Mike Jones, and Sarah Wilson. Eligible for referral reward.",
        note_type: 'referral',
        created_at: '2024-06-15T11:00:00Z',
        updated_at: '2024-06-15T11:00:00Z',
        created_by: { id: 1, name: 'John Barber', role: 'barber' },
        is_private: false,
        tags: ['referrals', 'reward', 'bonus']
      }
    ]
    
    setNotes(mockNotes)
  }

  const applyFilters = () => {
    let filtered = [...notes]

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(note => note.note_type === typeFilter)
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(note =>
        note.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        note.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }

    // Private notes filter
    if (!showPrivate) {
      filtered = filtered.filter(note => !note.is_private)
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        case 'type':
          return a.note_type.localeCompare(b.note_type)
        case 'author':
          return a.created_by.name.localeCompare(b.created_by.name)
        default:
          return 0
      }
    })

    setFilteredNotes(filtered)
  }

  const handleAddNote = async () => {
    if (!newNote.content.trim()) return

    try {
      setLoading(true)
      setError('')
      
      // In real app, this would call the API
      await addClientNote(clientId, newNote.content, newNote.note_type)
      
      // Mock adding to local state
      const mockNewNote: Note = {
        id: Date.now(),
        content: newNote.content,
        note_type: newNote.note_type,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: { id: 1, name: 'Current User', role: 'barber' },
        is_private: newNote.is_private,
        tags: newNote.tags
      }
      
      setNotes(prev => [mockNewNote, ...prev])
      setSuccess('Note added successfully!')
      setShowAddModal(false)
      setNewNote({ content: '', note_type: 'general', is_private: false, tags: [] })
      onRefresh()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError('Failed to add note: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleEditNote = async () => {
    if (!editingNote || !editingNote.content.trim()) return

    try {
      setLoading(true)
      setError('')
      
      // Mock editing in local state
      setNotes(prev => prev.map(note => 
        note.id === editingNote.id 
          ? { ...editingNote, updated_at: new Date().toISOString() }
          : note
      ))
      
      setSuccess('Note updated successfully!')
      setEditingNote(null)
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError('Failed to update note: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteNote = async (noteId: number) => {
    if (!confirm('Are you sure you want to delete this note?')) return

    try {
      setLoading(true)
      setError('')
      
      // Mock deleting from local state
      setNotes(prev => prev.filter(note => note.id !== noteId))
      setSuccess('Note deleted successfully!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError('Failed to delete note: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getNoteTypeInfo = (type: string) => {
    return noteTypes.find(nt => nt.value === type) || noteTypes[0]
  }

  const addTag = (tag: string) => {
    if (tag && !newNote.tags.includes(tag)) {
      setNewNote(prev => ({
        ...prev,
        tags: [...prev.tags, tag]
      }))
    }
  }

  const removeTag = (tagToRemove: string) => {
    setNewNote(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Client Notes</h2>
            <p className="text-gray-600 mt-1">Manage notes and observations for {client.first_name} {client.last_name}</p>
          </div>
          <button 
            onClick={() => setShowAddModal(true)}
            className="mt-4 md:mt-0 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Note
          </button>
        </div>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
          <div className="flex items-center">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {success}
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          <div className="flex items-center">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            {error}
            <button 
              onClick={() => setError('')}
              className="ml-auto text-red-500 hover:text-red-700"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Filter & Search Notes</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Search</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search notes and tags..."
              className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Note Type</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            >
              <option value="all">All Types</option>
              {noteTypes.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sort By</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="type">By Type</option>
              <option value="author">By Author</option>
            </select>
          </div>

          <div className="flex items-center mt-6">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={showPrivate}
                onChange={(e) => setShowPrivate(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Show Private Notes</span>
            </label>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => {
                setTypeFilter('all')
                setSearchTerm('')
                setSortBy('newest')
                setShowPrivate(true)
              }}
              className="w-full px-4 py-2 bg-gray-100 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 transition-colors text-sm"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Notes List */}
      <div className="space-y-4">
        {filteredNotes.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 text-gray-400">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-gray-500">No notes found matching your filters</p>
          </div>
        ) : (
          filteredNotes.map((note) => {
            const typeInfo = getNoteTypeInfo(note.note_type)
            return (
              <div key={note.id} className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center space-x-3">
                    <span className={`inline-flex items-center px-3 py-1 text-sm font-medium rounded-full bg-${typeInfo.color}-100 text-${typeInfo.color}-800`}>
                      <span className="mr-1">{typeInfo.icon}</span>
                      {typeInfo.label}
                    </span>
                    {note.is_private && (
                      <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                        🔒 Private
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setEditingNote(note)}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteNote(note.id)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                
                <div className="prose max-w-none">
                  <p className="text-gray-900 leading-relaxed">{note.content}</p>
                </div>
                
                {note.tags.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {note.tags.map((tag, index) => (
                      <span key={index} className="inline-flex px-2 py-1 text-xs bg-gray-100 text-gray-700 dark:text-gray-300 rounded-full">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
                
                <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center text-sm text-gray-500">
                  <div className="flex items-center space-x-4">
                    <span>By {note.created_by.name} ({note.created_by.role})</span>
                    {note.updated_at !== note.created_at && (
                      <span>• Edited {formatDate(note.updated_at)}</span>
                    )}
                  </div>
                  <span>{formatDate(note.created_at)}</span>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Add Note Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-medium text-gray-900">Add New Note</h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Note Type</label>
                  <select
                    value={newNote.note_type}
                    onChange={(e) => setNewNote(prev => ({ ...prev, note_type: e.target.value }))}
                    className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {noteTypes.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.icon} {type.label}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Note Content</label>
                  <textarea
                    value={newNote.content}
                    onChange={(e) => setNewNote(prev => ({ ...prev, content: e.target.value }))}
                    rows={6}
                    className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter your note here..."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tags</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {newNote.tags.map((tag, index) => (
                      <span key={index} className="inline-flex items-center px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                        #{tag}
                        <button
                          onClick={() => removeTag(tag)}
                          className="ml-1 text-blue-600 hover:text-blue-800"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  <input
                    type="text"
                    placeholder="Add tags (press Enter)"
                    className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        const tag = e.currentTarget.value.trim()
                        if (tag) {
                          addTag(tag)
                          e.currentTarget.value = ''
                        }
                      }
                    }}
                  />
                </div>
                
                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={newNote.is_private}
                      onChange={(e) => setNewNote(prev => ({ ...prev, is_private: e.target.checked }))}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                      Make this note private (only visible to managers and above)
                    </span>
                  </label>
                </div>
                
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 bg-gray-300 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddNote}
                    disabled={loading || !newNote.content.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loading ? 'Adding...' : 'Add Note'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Note Modal */}
      {editingNote && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-medium text-gray-900">Edit Note</h3>
                <button
                  onClick={() => setEditingNote(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Note Type</label>
                  <select
                    value={editingNote.note_type}
                    onChange={(e) => setEditingNote(prev => prev ? { ...prev, note_type: e.target.value } : null)}
                    className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {noteTypes.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.icon} {type.label}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Note Content</label>
                  <textarea
                    value={editingNote.content}
                    onChange={(e) => setEditingNote(prev => prev ? { ...prev, content: e.target.value } : null)}
                    rows={6}
                    className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter your note here..."
                  />
                </div>
                
                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={editingNote.is_private}
                      onChange={(e) => setEditingNote(prev => prev ? { ...prev, is_private: e.target.checked } : null)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                      Make this note private (only visible to managers and above)
                    </span>
                  </label>
                </div>
                
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    onClick={() => setEditingNote(null)}
                    className="px-4 py-2 bg-gray-300 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleEditNote}
                    disabled={loading || !editingNote.content.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
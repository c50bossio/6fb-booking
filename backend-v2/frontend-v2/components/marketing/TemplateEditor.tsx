'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { 
  BoldIcon,
  ItalicIcon,
  LinkIcon,
  ListBulletIcon,
  PhotoIcon,
  VariableIcon,
  EyeIcon,
  SaveIcon,
  XMarkIcon,
  CodeBracketIcon,
  AtSymbolIcon
} from '@heroicons/react/24/outline'

interface TemplateEditorProps {
  template?: {
    id?: string
    name: string
    type: 'email' | 'sms'
    subject?: string
    content: string
    variables?: string[]
  }
  onSave: (template: any) => void
  onCancel: () => void
}

export default function TemplateEditor({ template, onSave, onCancel }: TemplateEditorProps) {
  const [name, setName] = useState(template?.name || '')
  const [type, setType] = useState<'email' | 'sms'>(template?.type || 'email')
  const [subject, setSubject] = useState(template?.subject || '')
  const [content, setContent] = useState(template?.content || '')
  const [showPreview, setShowPreview] = useState(false)
  const [availableVariables] = useState([
    { key: 'client_name', label: 'Client Name' },
    { key: 'business_name', label: 'Business Name' },
    { key: 'appointment_date', label: 'Appointment Date' },
    { key: 'appointment_time', label: 'Appointment Time' },
    { key: 'service_name', label: 'Service Name' },
    { key: 'price', label: 'Price' },
    { key: 'business_phone', label: 'Business Phone' },
    { key: 'business_address', label: 'Business Address' }
  ])
  
  const contentRef = useRef<HTMLTextAreaElement>(null)

  const insertVariable = (variable: string) => {
    const textarea = contentRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const newContent = content.slice(0, start) + `{{${variable}}}` + content.slice(end)
    
    setContent(newContent)
    
    // Set cursor position after the inserted variable
    setTimeout(() => {
      textarea.focus()
      const newPosition = start + variable.length + 4 // +4 for {{}}
      textarea.setSelectionRange(newPosition, newPosition)
    }, 0)
  }

  const insertFormatting = (tag: string) => {
    const textarea = contentRef.current
    if (!textarea || type !== 'email') return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = content.slice(start, end)
    
    let newText = ''
    switch (tag) {
      case 'bold':
        newText = `<strong>${selectedText || 'text'}</strong>`
        break
      case 'italic':
        newText = `<em>${selectedText || 'text'}</em>`
        break
      case 'link':
        newText = `<a href="https://example.com">${selectedText || 'link text'}</a>`
        break
      case 'list':
        newText = `<ul>\n  <li>${selectedText || 'item'}</li>\n</ul>`
        break
    }
    
    const newContent = content.slice(0, start) + newText + content.slice(end)
    setContent(newContent)
  }

  const handleSave = () => {
    if (!name || !content) {
      alert('Please provide a template name and content')
      return
    }

    const variables = content.match(/\{\{(\w+)\}\}/g)?.map(v => v.replace(/[{}]/g, '')) || []
    
    onSave({
      id: template?.id,
      name,
      type,
      subject: type === 'email' ? subject : undefined,
      content,
      variables
    })
  }

  const renderPreview = () => {
    let previewContent = content
    
    // Replace variables with sample data
    availableVariables.forEach(variable => {
      const sampleData: Record<string, string> = {
        client_name: 'John Doe',
        business_name: 'Your Business',
        appointment_date: 'January 15, 2025',
        appointment_time: '2:00 PM',
        service_name: 'Haircut & Style',
        price: '$45',
        business_phone: '(555) 123-4567',
        business_address: '123 Main St, City, ST 12345'
      }
      previewContent = previewContent.replace(
        new RegExp(`{{${variable.key}}}`, 'g'),
        sampleData[variable.key] || variable.key
      )
    })

    if (type === 'email') {
      return (
        <div className="space-y-4">
          <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">From: Your Business Name</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">To: client@example.com</p>
            <p className="text-sm font-medium mt-2">Subject: {subject || 'Email Subject'}</p>
          </div>
          <div 
            className="prose dark:prose-dark max-w-none"
            dangerouslySetInnerHTML={{ __html: previewContent }}
          />
        </div>
      )
    } else {
      return (
        <div className="max-w-sm mx-auto">
          <div className="bg-white dark:bg-gray-900 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <p className="text-sm whitespace-pre-wrap">{previewContent}</p>
          </div>
          <div className="mt-2 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {previewContent.length} characters
            </p>
          </div>
        </div>
      )
    }
  }

  return (
    <div className="space-y-6">
      {/* Editor Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          {template?.id ? 'Edit Template' : 'Create New Template'}
        </h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowPreview(!showPreview)}>
            <EyeIcon className="w-5 h-5 mr-2" />
            {showPreview ? 'Hide' : 'Show'} Preview
          </Button>
          <Button onClick={handleSave}>
            <SaveIcon className="w-5 h-5 mr-2" />
            Save Template
          </Button>
          <Button variant="ghost" onClick={onCancel}>
            <XMarkIcon className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Editor Panel */}
        <div className="space-y-4">
          {/* Template Settings */}
          <Card>
            <CardContent className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Template Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Welcome New Client"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Type
                </label>
                <div className="flex gap-2">
                  <Button
                    variant={type === 'email' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setType('email')}
                    className="flex-1"
                  >
                    <EnvelopeIcon className="w-4 h-4 mr-1" />
                    Email
                  </Button>
                  <Button
                    variant={type === 'sms' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setType('sms')}
                    className="flex-1"
                  >
                    <DevicePhoneMobileIcon className="w-4 h-4 mr-1" />
                    SMS
                  </Button>
                </div>
              </div>

              {type === 'email' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Subject Line
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g., Welcome to {{business_name}}!"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Editor Toolbar */}
          {type === 'email' && (
            <Card>
              <CardContent className="p-2">
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => insertFormatting('bold')}
                    title="Bold"
                  >
                    <BoldIcon className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => insertFormatting('italic')}
                    title="Italic"
                  >
                    <ItalicIcon className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => insertFormatting('link')}
                    title="Insert Link"
                  >
                    <LinkIcon className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => insertFormatting('list')}
                    title="Bullet List"
                  >
                    <ListBulletIcon className="w-4 h-4" />
                  </Button>
                  <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => alert('Image upload would be implemented here')}
                    title="Insert Image"
                  >
                    <PhotoIcon className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Content Editor */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Content</CardTitle>
            </CardHeader>
            <CardContent>
              <textarea
                ref={contentRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={type === 'email' 
                  ? "Hi {{client_name}},\n\nWrite your email content here..."
                  : "Hi {{client_name}}, this is a reminder about your appointment on {{appointment_date}} at {{appointment_time}}."
                }
                className="w-full h-64 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
              />
              {type === 'sms' && (
                <div className="mt-2 text-right">
                  <span className={`text-xs ${content.length > 160 ? 'text-red-600' : 'text-gray-500'}`}>
                    {content.length} / 160 characters
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Variables */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <CodeBracketIcon className="w-4 h-4" />
                Available Variables
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {availableVariables.map(variable => (
                  <Button
                    key={variable.key}
                    variant="outline"
                    size="sm"
                    onClick={() => insertVariable(variable.key)}
                    className="justify-start text-xs"
                  >
                    <AtSymbolIcon className="w-3 h-3 mr-1" />
                    {variable.label}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
                Click to insert a variable. Variables will be replaced with actual data when sending.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Preview Panel */}
        {showPreview && (
          <div className="lg:sticky lg:top-4">
            <Card>
              <CardHeader>
                <CardTitle>Preview</CardTitle>
              </CardHeader>
              <CardContent>
                {renderPreview()}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}

// Fix missing imports
import { EnvelopeIcon, DevicePhoneMobileIcon } from '@heroicons/react/24/outline'
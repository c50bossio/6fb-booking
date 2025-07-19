'use client'

import { useState, useEffect, useRef } from 'react'
import { formatDistanceToNow, format } from 'date-fns'
import { 
  getSMSConversations, 
  getSMSConversation, 
  getConversationMessages, 
  sendSMSMessage,
  markSMSMessagesAsRead,
  type SMSConversation,
  type SMSMessage 
} from '../lib/api'

interface SMSConversationViewProps {
  onClose?: () => void
}

export default function SMSConversationView({ onClose }: SMSConversationViewProps) {
  const [conversations, setConversations] = useState<SMSConversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<SMSConversation | null>(null)
  const [messages, setMessages] = useState<SMSMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingConversations, setLoadingConversations] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Load conversations on mount
  useEffect(() => {
    loadConversations()
  }, [])

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.id)
    }
  }, [selectedConversation])

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const loadConversations = async () => {
    try {
      setLoadingConversations(true)
      setError(null)
      const data = await getSMSConversations(50, 'active', false)
      setConversations(data)
    } catch (err) {
      setError('Failed to load conversations')
      } finally {
      setLoadingConversations(false)
    }
  }

  const loadMessages = async (conversationId: number) => {
    try {
      setLoading(true)
      setError(null)
      const data = await getConversationMessages(conversationId)
      setMessages(data)
      
      // Mark messages as read
      const unreadMessageIds = data
        .filter(msg => msg.direction === 'inbound' && !msg.read_at)
        .map(msg => msg.id)
      
      if (unreadMessageIds.length > 0) {
        await markSMSMessagesAsRead(conversationId.toString())
        // Update local conversation state
        setConversations(prev => 
          prev.map(conv => 
            conv.id === conversationId 
              ? { ...conv, unread_customer_messages: 0 }
              : conv
          )
        )
      }
    } catch (err) {
      setError('Failed to load messages')
      } finally {
      setLoading(false)
    }
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || sending) return

    setSending(true)
    setError(null)
    
    try {
      const sentMessage = await sendSMSMessage(selectedConversation.id, {
        body: newMessage,
        from_phone: '' // Will be set by backend based on business phone
      })

      // Add the new message to the list
      setMessages(prev => [...prev, sentMessage])
      setNewMessage('')
      
      // Update conversation
      setConversations(prev => 
        prev.map(conv => 
          conv.id === selectedConversation.id 
            ? { 
                ...conv, 
                last_message_at: new Date().toISOString(), 
                last_message_from: 'business', 
                total_messages: conv.total_messages + 1 
              }
            : conv
        )
      )
    } catch (err) {
      setError('Failed to send message')
      } finally {
      setSending(false)
    }
  }

  const getStatusIndicator = (message: SMSMessage) => {
    if (message.direction === 'outbound') {
      if (message.failed_at) return '✗'
      if (message.delivered_at) return '✓✓'
      if (message.sent_at) return '✓'
      return '⏳'
    }
    return null
  }

  const formatMessageTime = (dateString: string) => {
    const now = new Date()
    const messageDate = new Date(dateString)
    
    if (now.toDateString() === messageDate.toDateString()) {
      return format(messageDate, 'h:mm a')
    } else {
      return format(messageDate, 'MMM d, h:mm a')
    }
  }

  return (
    <div className="bg-white shadow-lg rounded-lg overflow-hidden" style={{ height: '700px' }}>
      <div className="flex h-full">
        {/* Conversations List */}
        <div className="w-1/3 border-r border-gray-200 flex flex-col">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-900">SMS Conversations</h3>
              <span className="text-xs text-gray-500">{conversations.length} active</span>
            </div>
            <p className="text-xs text-gray-600 mt-1">Click to view conversation thread</p>
          </div>

          {/* Conversations */}
          <div className="flex-1 overflow-y-auto">
            {loadingConversations ? (
              <div className="p-4 text-center text-gray-500">Loading conversations...</div>
            ) : error ? (
              <div className="p-4 text-center text-red-500">{error}</div>
            ) : conversations.length === 0 ? (
              <div className="p-4 text-center text-gray-500">No active conversations</div>
            ) : (
              conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  onClick={() => setSelectedConversation(conversation)}
                  className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                    selectedConversation?.id === conversation.id ? 'bg-teal-50 border-teal-200' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <h4 className="text-sm font-medium text-gray-900 truncate">
                          {conversation.customer_name || 'Unknown Customer'}
                        </h4>
                        {conversation.unread_customer_messages > 0 && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-red-100 text-red-800">
                            {conversation.unread_customer_messages} new
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 font-mono">
                        📱 {conversation.customer_phone}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-gray-500">
                          {conversation.total_messages} messages
                        </span>
                        <span className="text-xs text-gray-500">
                          {conversation.last_message_at && 
                            formatDistanceToNow(new Date(conversation.last_message_at), { addSuffix: true })}
                        </span>
                      </div>
                      {conversation.last_message_from && (
                        <div className="flex items-center mt-1">
                          <span className={`w-2 h-2 rounded-full mr-2 ${
                            conversation.last_message_from === 'customer' ? 'bg-blue-400' : 'bg-green-400'
                          }`}></span>
                          <span className="text-xs text-gray-600">
                            Last: {conversation.last_message_from === 'customer' ? 'Customer' : 'You'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">
                      {selectedConversation.customer_name || 'Unknown Customer'}
                    </h3>
                    <p className="text-sm text-gray-600 font-mono">
                      📱 {selectedConversation.customer_phone}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                      Real SMS Thread
                    </span>
                    <button className="text-xs text-gray-500 hover:text-gray-700">
                      View Profile
                    </button>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                {loading ? (
                  <div className="text-center text-gray-500">Loading messages...</div>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.direction === 'inbound' ? 'justify-start' : 'justify-end'}`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                          message.direction === 'inbound'
                            ? 'bg-white border border-gray-200 text-gray-900'
                            : 'bg-teal-600 text-white'
                        }`}
                      >
                        <p className="text-sm">{message.body}</p>
                        <div className={`text-xs mt-1 flex items-center justify-between ${
                          message.direction === 'inbound' ? 'text-gray-500' : 'text-teal-100'
                        }`}>
                          <span>{formatMessageTime(message.created_at)}</span>
                          {message.direction === 'outbound' && (
                            <span className="ml-2">{getStatusIndicator(message)}</span>
                          )}
                          {message.direction === 'inbound' && !message.read_at && (
                            <span className="ml-2 w-2 h-2 bg-blue-500 rounded-full"></span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="p-4 border-t border-gray-200 bg-white">
                <div className="flex space-x-3">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Type your SMS message to this customer..."
                    className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    disabled={sending}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={sending || !newMessage.trim()}
                    className="px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-md hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {sending ? 'Sending...' : '📱 Send SMS'}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  ⚠️ This will send a REAL text message to {selectedConversation.customer_phone}
                </p>
              </div>
            </>
          ) : (
            /* No Conversation Selected */
            <div className="flex-1 flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <div className="text-4xl mb-4">📱</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Select an SMS Conversation</h3>
                <p className="text-gray-600 max-w-md">
                  Choose a conversation from the list to view the text message thread and continue the conversation with your customer.
                </p>
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <strong>Real SMS Communication:</strong> These are actual text message conversations with customers' mobile phones. 
                    Messages sent here will be delivered as real SMS.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
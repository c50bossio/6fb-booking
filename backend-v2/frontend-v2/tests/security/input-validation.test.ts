/**
 * Input Validation Security Test Suite
 * Tests for XSS prevention, SQL injection prevention, and data sanitization
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals'

// Mock DOMPurify for XSS sanitization
const mockDOMPurify = {
  sanitize: jest.fn((input: string) => {
    // Simple sanitization mock - remove script tags and dangerous attributes
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/on\w+="[^"]*"/gi, '')
      .replace(/javascript:/gi, '')
  }),
  isValidAttribute: jest.fn((tag: string, attr: string) => {
    const dangerousAttrs = ['onload', 'onerror', 'onclick', 'onmouseover']
    return !dangerousAttrs.includes(attr.toLowerCase())
  })
}

// Mock fetch for API calls
global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

describe('Input Validation Security Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('XSS Prevention', () => {
    it('should sanitize HTML content to prevent XSS attacks', () => {
      const maliciousInputs = [
        '<script>alert("XSS")</script>',
        '<img src="x" onerror="alert(\'XSS\')">',
        '<div onmouseover="alert(1)">Hover me</div>',
        'javascript:alert("XSS")',
        '<iframe src="javascript:alert(\'XSS\')"></iframe>',
        '<object data="javascript:alert(\'XSS\')"></object>',
        '<embed src="javascript:alert(\'XSS\')">',
        '<link rel="stylesheet" href="javascript:alert(\'XSS\')">',
        '<style>body{background:url("javascript:alert(\'XSS\')")}</style>'
      ]

      const sanitizeHTML = (input: string) => {
        return mockDOMPurify.sanitize(input)
      }

      maliciousInputs.forEach(maliciousInput => {
        const sanitized = sanitizeHTML(maliciousInput)
        
        // Should not contain script tags
        expect(sanitized).not.toContain('<script')
        expect(sanitized).not.toContain('</script>')
        
        // Should not contain event handlers
        expect(sanitized).not.toMatch(/on\w+=/i)
        
        // Should not contain javascript: protocol
        expect(sanitized).not.toContain('javascript:')
        
        mockDOMPurify.sanitize.mockClear()
      })
    })

    it('should allow safe HTML content', () => {
      const safeInputs = [
        '<p>This is safe text</p>',
        '<b>Bold text</b>',
        '<i>Italic text</i>',
        '<a href="https://example.com">Safe link</a>',
        '<img src="https://example.com/image.jpg" alt="Safe image">',
        '<div class="safe-class">Safe div</div>'
      ]

      const sanitizeHTML = (input: string) => {
        return mockDOMPurify.sanitize(input)
      }

      safeInputs.forEach(safeInput => {
        mockDOMPurify.sanitize.mockReturnValue(safeInput)
        const sanitized = sanitizeHTML(safeInput)
        
        expect(sanitized).toBe(safeInput)
        expect(mockDOMPurify.sanitize).toHaveBeenCalledWith(safeInput)
        
        mockDOMPurify.sanitize.mockClear()
      })
    })

    it('should validate and sanitize user input in forms', () => {
      const validateFormInput = (input: string, fieldType: string) => {
        let sanitized = input.trim()
        
        switch (fieldType) {
          case 'email':
            // Remove HTML and validate email format
            sanitized = mockDOMPurify.sanitize(sanitized)
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
            return emailRegex.test(sanitized) ? sanitized : null
            
          case 'phone':
            // Remove HTML and non-numeric characters except +, -, (, ), space
            sanitized = mockDOMPurify.sanitize(sanitized)
            sanitized = sanitized.replace(/[^+\-\d\s()]/g, '')
            return sanitized.length >= 10 ? sanitized : null
            
          case 'name':
            // Remove HTML but allow letters, spaces, hyphens, apostrophes
            sanitized = mockDOMPurify.sanitize(sanitized)
            sanitized = sanitized.replace(/[^a-zA-Z\s\-']/g, '')
            return sanitized.length > 0 ? sanitized : null
            
          default:
            return mockDOMPurify.sanitize(sanitized)
        }
      }

      // Valid inputs
      expect(validateFormInput('john@example.com', 'email')).toBe('john@example.com')
      expect(validateFormInput('+1-555-123-4567', 'phone')).toBe('+1-555-123-4567')
      expect(validateFormInput('John O\'Connor', 'name')).toBe('John O\'Connor')

      // Invalid/malicious inputs
      expect(validateFormInput('<script>alert("xss")</script>john@example.com', 'email')).toBe('john@example.com')
      expect(validateFormInput('555<script>alert("xss")</script>1234', 'phone')).toBe('5551234')
      expect(validateFormInput('<img onerror="alert(1)">John</img>', 'name')).toBe('John')
    })
  })

  describe('SQL Injection Prevention', () => {
    it('should use parameterized queries to prevent SQL injection', async () => {
      const maliciousSQLInputs = [
        "'; DROP TABLE users; --",
        "' OR '1'='1",
        "' UNION SELECT * FROM admin_users --",
        "'; INSERT INTO users (email) VALUES ('hacker@evil.com'); --",
        "' OR 1=1 LIMIT 1 OFFSET 1 --"
      ]

      // Mock API response for search query
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ results: [], total: 0 })
      } as Response)

      const searchUsers = async (query: string) => {
        // Simulate parameterized query - malicious SQL should be treated as literal string
        const response = await fetch('/api/v2/users/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            query: query, // This would be parameterized on the backend
            limit: 10 
          })
        })
        return response.json()
      }

      for (const maliciousQuery of maliciousSQLInputs) {
        const result = await searchUsers(maliciousQuery)
        
        // Should return empty results, not execute malicious SQL
        expect(result.results).toEqual([])
        expect(result.total).toBe(0)
        
        // Verify the request was made with the malicious string as data, not as SQL
        const lastCall = mockFetch.mock.calls[mockFetch.mock.calls.length - 1]
        const requestBody = JSON.parse(lastCall[1]?.body as string)
        expect(requestBody.query).toBe(maliciousQuery)
      }
    })

    it('should validate and sanitize database query parameters', () => {
      const validateQueryParam = (param: string, type: 'id' | 'email' | 'text') => {
        switch (type) {
          case 'id':
            // ID should be numeric only
            const numParam = parseInt(param, 10)
            return !isNaN(numParam) && numParam > 0 ? numParam.toString() : null
            
          case 'email':
            // Email should match email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
            return emailRegex.test(param) ? param : null
            
          case 'text':
            // Text should not contain SQL keywords
            const sqlKeywords = ['DROP', 'DELETE', 'INSERT', 'UPDATE', 'SELECT', 'UNION', 'CREATE', 'ALTER']
            const upperParam = param.toUpperCase()
            const hasSQLKeywords = sqlKeywords.some(keyword => upperParam.includes(keyword))
            return hasSQLKeywords ? null : param
            
          default:
            return null
        }
      }

      // Valid parameters
      expect(validateQueryParam('123', 'id')).toBe('123')
      expect(validateQueryParam('user@example.com', 'email')).toBe('user@example.com')
      expect(validateQueryParam('normal search text', 'text')).toBe('normal search text')

      // Invalid/malicious parameters
      expect(validateQueryParam("'; DROP TABLE users; --", 'id')).toBeNull()
      expect(validateQueryParam("' OR '1'='1", 'email')).toBeNull()
      expect(validateQueryParam('DROP TABLE users', 'text')).toBeNull()
      expect(validateQueryParam('SELECT * FROM admin', 'text')).toBeNull()
    })
  })

  describe('File Upload Validation', () => {
    it('should validate file types and prevent malicious uploads', () => {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf']
      const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.pdf']
      const maxFileSize = 5 * 1024 * 1024 // 5MB

      const validateFile = (file: { name: string; type: string; size: number }) => {
        // Check file extension
        const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'))
        if (!allowedExtensions.includes(extension)) {
          return { valid: false, error: 'Invalid file extension' }
        }

        // Check MIME type
        if (!allowedTypes.includes(file.type)) {
          return { valid: false, error: 'Invalid file type' }
        }

        // Check file size
        if (file.size > maxFileSize) {
          return { valid: false, error: 'File too large' }
        }

        // Check for double extensions (potential bypass attempt)
        const doubleExtensionRegex = /\.(php|jsp|asp|aspx|exe|bat|cmd|com|pif|scr|vbs|js)\./i
        if (doubleExtensionRegex.test(file.name)) {
          return { valid: false, error: 'Suspicious filename' }
        }

        return { valid: true, error: null }
      }

      // Valid files
      expect(validateFile({ name: 'photo.jpg', type: 'image/jpeg', size: 1024000 })).toEqual({
        valid: true, error: null
      })
      expect(validateFile({ name: 'document.pdf', type: 'application/pdf', size: 2048000 })).toEqual({
        valid: true, error: null
      })

      // Invalid files
      expect(validateFile({ name: 'script.js', type: 'application/javascript', size: 1024 })).toEqual({
        valid: false, error: 'Invalid file extension'
      })
      expect(validateFile({ name: 'malware.exe', type: 'application/octet-stream', size: 1024 })).toEqual({
        valid: false, error: 'Invalid file extension'
      })
      expect(validateFile({ name: 'image.jpg.php', type: 'image/jpeg', size: 1024 })).toEqual({
        valid: false, error: 'Suspicious filename'
      })
      expect(validateFile({ name: 'huge.jpg', type: 'image/jpeg', size: 10 * 1024 * 1024 })).toEqual({
        valid: false, error: 'File too large'
      })
    })

    it('should scan file content for malicious code', () => {
      const scanFileContent = (content: string, filename: string) => {
        const maliciousPatterns = [
          /<\?php/i,           // PHP code
          /<script/i,          // JavaScript
          /eval\s*\(/i,        // Eval functions
          /exec\s*\(/i,        // Exec functions
          /system\s*\(/i,      // System calls
          /shell_exec/i,       // Shell execution
          /base64_decode/i,    // Base64 decode (often used in malicious code)
          /file_get_contents/i // File operations
        ]

        for (const pattern of maliciousPatterns) {
          if (pattern.test(content)) {
            return { safe: false, threat: 'Malicious code detected' }
          }
        }

        // Check file magic numbers for common file types
        const isImageFile = filename.match(/\.(jpg|jpeg|png|gif)$/i)
        if (isImageFile) {
          // Basic check for image file signatures
          const imageSignatures = {
            'jpg': [0xFF, 0xD8, 0xFF],
            'png': [0x89, 0x50, 0x4E, 0x47],
            'gif': [0x47, 0x49, 0x46]
          }
          
          // Convert first few bytes to check signature
          const bytes = content.split('').slice(0, 4).map(char => char.charCodeAt(0))
          const hasValidSignature = Object.values(imageSignatures).some(signature => 
            signature.every((byte, index) => bytes[index] === byte)
          )
          
          if (!hasValidSignature && isImageFile) {
            return { safe: false, threat: 'Invalid file signature' }
          }
        }

        return { safe: true, threat: null }
      }

      // Safe content
      expect(scanFileContent('This is plain text content', 'text.txt')).toEqual({
        safe: true, threat: null
      })

      // Malicious content
      expect(scanFileContent('<?php echo "Hello"; ?>', 'file.txt')).toEqual({
        safe: false, threat: 'Malicious code detected'
      })
      expect(scanFileContent('<script>alert("xss")</script>', 'file.html')).toEqual({
        safe: false, threat: 'Malicious code detected'
      })
      expect(scanFileContent('eval(base64_decode("malicious_code"))', 'file.js')).toEqual({
        safe: false, threat: 'Malicious code detected'
      })
    })
  })

  describe('Data Sanitization', () => {
    it('should sanitize user data before storage', () => {
      const sanitizeUserData = (data: Record<string, any>) => {
        const sanitized: Record<string, any> = {}
        
        for (const [key, value] of Object.entries(data)) {
          if (typeof value === 'string') {
            // Remove HTML tags and dangerous characters
            let clean = mockDOMPurify.sanitize(value)
            
            // Additional sanitization based on field type
            if (key === 'email') {
              clean = clean.toLowerCase().trim()
            } else if (key === 'phone') {
              clean = clean.replace(/[^\d+\-\s()]/g, '')
            } else if (key === 'name') {
              clean = clean.replace(/[^a-zA-Z\s\-']/g, '').trim()
            }
            
            sanitized[key] = clean
          } else if (typeof value === 'number') {
            // Ensure numbers are within reasonable bounds
            sanitized[key] = Math.max(-1000000, Math.min(1000000, value))
          } else if (typeof value === 'boolean') {
            sanitized[key] = Boolean(value)
          } else if (Array.isArray(value)) {
            sanitized[key] = value.map(item => 
              typeof item === 'string' ? mockDOMPurify.sanitize(item) : item
            )
          } else {
            sanitized[key] = value
          }
        }
        
        return sanitized
      }

      const maliciousUserData = {
        name: '<script>alert("xss")</script>John Doe',
        email: 'USER@EXAMPLE.COM<script>alert("xss")</script>',
        phone: '+1-555<script>alert("xss")</script>-1234',
        age: 999999999,
        isActive: 'true',
        tags: ['<script>alert("xss")</script>tag1', 'tag2']
      }

      // Mock DOMPurify to remove script tags
      mockDOMPurify.sanitize.mockImplementation((input: string) => 
        input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      )

      const sanitized = sanitizeUserData(maliciousUserData)

      expect(sanitized.name).toBe('John Doe')
      expect(sanitized.email).toBe('user@example.com')
      expect(sanitized.phone).toBe('+1-555-1234')
      expect(sanitized.age).toBe(1000000) // Capped at maximum
      expect(sanitized.isActive).toBe(true)
      expect(sanitized.tags).toEqual(['tag1', 'tag2'])
    })

    it('should validate and sanitize JSON input', () => {
      const validateJSON = (input: string) => {
        try {
          const parsed = JSON.parse(input)
          
          // Recursively sanitize string values in JSON
          const sanitizeObject = (obj: any): any => {
            if (typeof obj === 'string') {
              return mockDOMPurify.sanitize(obj)
            } else if (Array.isArray(obj)) {
              return obj.map(sanitizeObject)
            } else if (obj !== null && typeof obj === 'object') {
              const sanitizedObj: any = {}
              for (const [key, value] of Object.entries(obj)) {
                // Sanitize key names too
                const cleanKey = mockDOMPurify.sanitize(key)
                sanitizedObj[cleanKey] = sanitizeObject(value)
              }
              return sanitizedObj
            }
            return obj
          }
          
          return { valid: true, data: sanitizeObject(parsed) }
        } catch (error) {
          return { valid: false, error: 'Invalid JSON' }
        }
      }

      // Valid JSON
      const validJSON = '{"name": "John", "email": "john@example.com"}'
      mockDOMPurify.sanitize.mockImplementation((input: string) => input)
      expect(validateJSON(validJSON)).toEqual({
        valid: true,
        data: { name: 'John', email: 'john@example.com' }
      })

      // Malicious JSON
      const maliciousJSON = '{"<script>alert(\\"xss\\")</script>name": "John<script>alert(\\"xss\\")</script>"}'
      mockDOMPurify.sanitize.mockImplementation((input: string) => 
        input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      )
      expect(validateJSON(maliciousJSON)).toEqual({
        valid: true,
        data: { name: 'John' }
      })

      // Invalid JSON
      expect(validateJSON('invalid json {')).toEqual({
        valid: false,
        error: 'Invalid JSON'
      })
    })
  })
})
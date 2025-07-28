import { validators } from '@/hooks/useFormValidation'

describe('Email Validation Unit Tests', () => {
  const emailValidator = validators.email()

  describe('Valid Email Cases', () => {
    const validEmails = [
      'admin@bookedbarber.com',
      'test@example.com',
      'user.name@domain.co.uk',
      'user+tag@domain.com',
      'user123@test-domain.org',
      'valid.email.with.dots@domain.com',
      'email@subdomain.domain.com',
      'firstname-lastname@domain.com'
    ]

    validEmails.forEach(email => {
      test(`should validate ${email} as valid`, () => {
        expect(emailValidator.validate(email)).toBe(true)
      })
    })
  })

  describe('Invalid Email Cases - Edge Cases Fixed', () => {
    const invalidEmails = [
      // Leading/trailing spaces (fixed in validation)
      ' admin@bookedbarber.com',
      'admin@bookedbarber.com ',
      ' admin@bookedbarber.com ',
      
      // Consecutive dots (fixed in validation) 
      'user..name@domain.com',
      'user...name@domain.com',
      'test@domain..com',
      
      // Leading/trailing dots (fixed in validation)
      '.user@domain.com',
      'user.@domain.com',
      'user@.domain.com',
      'user@domain.com.',
      
      // Dots adjacent to @ (fixed in validation)
      'user.@domain.com',
      'user@.domain.com',
      
      // Basic format violations
      'plainaddress',
      'missing@domain',
      'missing.domain.com',
      '@domain.com',
      'user@',
      'user@@domain.com',
      'user@domain@com',
      '',
      null,
      undefined
    ]

    invalidEmails.forEach(email => {
      test(`should validate "${email}" as invalid`, () => {
        expect(emailValidator.validate(email)).toBe(false)
      })
    })
  })

  describe('Error Handling in Email Validation', () => {
    test('should handle validation errors gracefully', () => {
      // Mock console.error to capture error logs
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()
      
      // Create a scenario that might cause an error in validation
      const problematicInput = { toString: () => { throw new Error('toString error') } }
      
      // Should fallback to basic regex validation
      const result = emailValidator.validate(problematicInput as any)
      
      // Should handle the error and fallback
      expect(consoleErrorSpy).toHaveBeenCalledWith('Email validation error:', expect.any(Error))
      expect(typeof result).toBe('boolean')
      
      consoleErrorSpy.mockRestore()
    })

    test('should handle empty values correctly', () => {
      // Empty values should return true (let required validator handle them)
      expect(emailValidator.validate('')).toBe(true)
      expect(emailValidator.validate(null)).toBe(true)
      expect(emailValidator.validate(undefined)).toBe(true)
    })
  })

  describe('Admin Email Specific Tests', () => {
    test('should validate admin@bookedbarber.com correctly', () => {
      expect(emailValidator.validate('admin@bookedbarber.com')).toBe(true)
    })

    test('should reject admin@bookedbarber.com with spaces', () => {
      expect(emailValidator.validate(' admin@bookedbarber.com')).toBe(false)
      expect(emailValidator.validate('admin@bookedbarber.com ')).toBe(false)
    })

    test('should reject admin@bookedbarber.com with consecutive dots', () => {
      expect(emailValidator.validate('admin..test@bookedbarber.com')).toBe(false)
      expect(emailValidator.validate('admin@bookedbarber..com')).toBe(false)
    })
  })
})

describe('Form Validation Hook Unit Tests', () => {
  describe('Required Validation', () => {
    const requiredValidator = validators.required('Field is required')

    test('should validate non-empty strings as valid', () => {
      expect(requiredValidator.validate('test')).toBe(true)
      expect(requiredValidator.validate('admin@bookedbarber.com')).toBe(true)
    })

    test('should validate empty values as invalid', () => {
      expect(requiredValidator.validate('')).toBe(false)
      expect(requiredValidator.validate('   ')).toBe(false) // Only whitespace
      expect(requiredValidator.validate(null)).toBe(false)
      expect(requiredValidator.validate(undefined)).toBe(false)
    })

    test('should validate arrays correctly', () => {
      expect(requiredValidator.validate(['item'])).toBe(true)
      expect(requiredValidator.validate([])).toBe(false)
    })
  })

  describe('Password Validation', () => {
    const passwordValidator = validators.password()

    test('should validate strong passwords as valid', () => {
      expect(passwordValidator.validate('Password123')).toBe(true)
      expect(passwordValidator.validate('StrongPass1')).toBe(true)
      expect(passwordValidator.validate('MySecret123')).toBe(true)
    })

    test('should validate weak passwords as invalid', () => {
      expect(passwordValidator.validate('password')).toBe(false) // No uppercase/number
      expect(passwordValidator.validate('PASSWORD')).toBe(false) // No lowercase/number
      expect(passwordValidator.validate('Password')).toBe(false) // No number
      expect(passwordValidator.validate('pass123')).toBe(false) // No uppercase
      expect(passwordValidator.validate('Pass1')).toBe(false) // Too short
    })

    test('should handle empty passwords correctly', () => {
      // Empty values should return true (let required validator handle them)
      expect(passwordValidator.validate('')).toBe(true)
      expect(passwordValidator.validate(null)).toBe(true)
      expect(passwordValidator.validate(undefined)).toBe(true)
    })
  })

  describe('MinLength Validation', () => {
    const minLengthValidator = validators.minLength(6)

    test('should validate strings meeting minimum length', () => {
      expect(minLengthValidator.validate('123456')).toBe(true)
      expect(minLengthValidator.validate('password')).toBe(true)
    })

    test('should validate strings below minimum length as invalid', () => {
      expect(minLengthValidator.validate('12345')).toBe(false)
      expect(minLengthValidator.validate('abc')).toBe(false)
    })

    test('should handle empty values correctly', () => {
      expect(minLengthValidator.validate('')).toBe(true)
      expect(minLengthValidator.validate(null)).toBe(true)
      expect(minLengthValidator.validate(undefined)).toBe(true)
    })
  })
})
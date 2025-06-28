import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from '../../rules/no-copy-paste-code';

const ruleTester = new RuleTester({
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
});

ruleTester.run('no-copy-paste-code', rule, {
  valid: [
    // Different code blocks
    {
      code: `
        function add(a, b) {
          return a + b;
        }
        
        function subtract(a, b) {
          return a - b;
        }
      `,
    },
    // Code blocks under minimum lines
    {
      code: `
        function short1() {
          return 1;
        }
        
        function short2() {
          return 1;
        }
      `,
      options: [{ minLines: 5 }],
    },
    // Similar but not duplicate with comments ignored
    {
      code: `
        function process1() {
          // Process data
          const result = data.map(x => x * 2);
          return result;
        }
        
        function process2() {
          // Transform data
          const result = data.map(x => x * 2);
          return result;
        }
      `,
      options: [{ ignoreComments: true, threshold: 0.9 }],
    },
    // Import statements ignored
    {
      code: `
        import { useState } from 'react';
        import { useEffect } from 'react';
        import { useState } from 'react';
        import { useEffect } from 'react';
      `,
      options: [{ ignoreImports: true }],
    },
  ],
  invalid: [
    // Exact duplicate function bodies
    {
      code: `
        function process1(data) {
          const filtered = data.filter(x => x > 0);
          const mapped = filtered.map(x => x * 2);
          const sorted = mapped.sort((a, b) => a - b);
          return sorted;
        }
        
        function process2(data) {
          const filtered = data.filter(x => x > 0);
          const mapped = filtered.map(x => x * 2);
          const sorted = mapped.sort((a, b) => a - b);
          return sorted;
        }
      `,
      options: [{ minLines: 3 }],
      errors: [
        {
          messageId: 'duplicateCode',
          data: {
            location: expect.stringContaining('line'),
          },
        },
      ],
    },
    // Similar code patterns
    {
      code: `
        function handleClick1() {
          setLoading(true);
          fetchData()
            .then(result => setData(result))
            .catch(error => setError(error))
            .finally(() => setLoading(false));
        }
        
        function handleClick2() {
          setLoading(true);
          fetchUsers()
            .then(result => setUsers(result))
            .catch(error => setError(error))
            .finally(() => setLoading(false));
        }
      `,
      options: [{ minLines: 3, threshold: 0.7 }],
      errors: [
        {
          messageId: 'similarPattern',
        },
      ],
    },
    // Duplicate JSX blocks
    {
      code: `
        function Component1() {
          return (
            <div className="container">
              <h1>Title</h1>
              <p>Description</p>
              <button onClick={handleClick}>Click me</button>
            </div>
          );
        }
        
        function Component2() {
          return (
            <div className="container">
              <h1>Title</h1>
              <p>Description</p>
              <button onClick={handleClick}>Click me</button>
            </div>
          );
        }
      `,
      options: [{ minLines: 4 }],
      errors: [
        {
          messageId: 'duplicateCode',
        },
      ],
    },
    // Duplicate conditional blocks
    {
      code: `
        if (user.role === 'admin') {
          permissions.push('read');
          permissions.push('write');
          permissions.push('delete');
          permissions.push('manage');
          return permissions;
        }
        
        if (currentUser.role === 'admin') {
          permissions.push('read');
          permissions.push('write');
          permissions.push('delete');
          permissions.push('manage');
          return permissions;
        }
      `,
      options: [{ minLines: 4 }],
      errors: [
        {
          messageId: 'duplicateCode',
        },
      ],
    },
    // Duplicate try-catch blocks
    {
      code: `
        function save1() {
          try {
            validateData(data);
            const result = api.save(data);
            showSuccess('Saved successfully');
            return result;
          } catch (error) {
            console.error('Save failed:', error);
            showError('Failed to save');
            throw error;
          }
        }
        
        function save2() {
          try {
            validateData(data);
            const result = api.save(data);
            showSuccess('Saved successfully');
            return result;
          } catch (error) {
            console.error('Save failed:', error);
            showError('Failed to save');
            throw error;
          }
        }
      `,
      options: [{ minLines: 3 }],
      errors: [
        {
          messageId: 'duplicateCode',
        },
        {
          messageId: 'duplicateCode',
        },
      ],
    },
  ],
});
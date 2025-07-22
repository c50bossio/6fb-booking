/**
 * Custom ESLint Rules for Homepage Consolidation Enforcement
 * 
 * These rules prevent hardcoded CTAs and enforce usage of the centralized CTA system.
 * Part of the permanent homepage consolidation enforcement infrastructure.
 */

module.exports = {
  rules: {
    // Prevent hardcoded CTA links
    'no-hardcoded-cta-links': {
      meta: {
        type: 'problem',
        docs: {
          description: 'Prevent hardcoded CTA links outside of the CTA system',
          category: 'Best Practices',
          recommended: true
        },
        fixable: 'code',
        schema: []
      },
      create(context) {
        const forbiddenRoutes = [
          '/auth/signup',
          '/auth/signin', 
          '/demo',
          '/try-demo',
          '/live-demo'
        ]
        
        const suspiciousCTATexts = [
          'Start Free Trial',
          'Try Live Demo',
          'Start 14-Day Free Trial',
          'Free Trial',
          'Demo',
          'Sign Up',
          'Register Now'
        ]
        
        return {
          JSXElement(node) {
            // Check for Link components with forbidden routes
            if (node.openingElement.name.name === 'Link') {
              const hrefAttr = node.openingElement.attributes.find(
                attr => attr.name && attr.name.name === 'href'
              )
              
              if (hrefAttr && hrefAttr.value) {
                const href = hrefAttr.value.value || hrefAttr.value.expression?.value
                
                if (forbiddenRoutes.includes(href)) {
                  context.report({
                    node,
                    message: `Hardcoded CTA link to '${href}' is forbidden. Use the CTA system instead.`,
                    fix(fixer) {
                      return fixer.replaceText(node, `<CTAButton ctaId="register" />`)
                    }
                  })
                }
              }
              
              // Check for suspicious CTA text in Link content
              const linkText = getNodeText(node)
              if (suspiciousCTATexts.some(text => linkText.includes(text))) {
                // Skip if it's already using CTA system
                const sourceCode = context.getSourceCode()
                const parent = sourceCode.getText(node.parent)
                
                if (!parent.includes('CTAButton') && !parent.includes('CTA')) {
                  context.report({
                    node,
                    message: `Potential hardcoded CTA detected: "${linkText}". Consider using the CTA system.`,
                  })
                }
              }
            }
            
            // Check for Button components with CTA-like text
            if (node.openingElement.name.name === 'Button') {
              const buttonText = getNodeText(node)
              
              if (suspiciousCTATexts.some(text => buttonText.includes(text))) {
                context.report({
                  node,
                  message: `Potential hardcoded CTA button: "${buttonText}". Consider using the CTA system.`,
                })
              }
            }
          }
        }
        
        function getNodeText(node) {
          const sourceCode = context.getSourceCode()
          return sourceCode.getText(node)
        }
      }
    },
    
    // Prevent duplicate CTA implementations
    'no-duplicate-cta-implementations': {
      meta: {
        type: 'problem',
        docs: {
          description: 'Prevent duplicate CTA implementations',
          category: 'Best Practices',
          recommended: true
        },
        schema: []
      },
      create(context) {
        const ctaPatterns = new Map()
        
        return {
          JSXElement(node) {
            // Track CTA patterns to detect duplicates
            if (node.openingElement.name.name === 'Link' || 
                node.openingElement.name.name === 'Button') {
              
              const text = getNodeText(node)
              const key = text.toLowerCase().replace(/\s+/g, '')
              
              if (ctaPatterns.has(key)) {
                const existingLocation = ctaPatterns.get(key)
                context.report({
                  node,
                  message: `Duplicate CTA detected. Similar CTA already exists at line ${existingLocation}.`,
                })
              } else {
                ctaPatterns.set(key, node.loc.start.line)
              }
            }
          }
        }
        
        function getNodeText(node) {
          const sourceCode = context.getSourceCode()
          return sourceCode.getText(node)
        }
      }
    },
    
    // Enforce CTA system usage
    'enforce-cta-system-usage': {
      meta: {
        type: 'suggestion',
        docs: {
          description: 'Encourage usage of the centralized CTA system',
          category: 'Best Practices',
          recommended: true
        },
        schema: []
      },
      create(context) {
        let hasCTASystemImport = false
        
        return {
          ImportDeclaration(node) {
            if (node.source.value.includes('CTASystem')) {
              hasCTASystemImport = true
            }
          },
          
          'Program:exit'() {
            // Check if file has CTA-like elements but no CTA system import
            const sourceCode = context.getSourceCode()
            const text = sourceCode.getText()
            
            const hasCTALikeElements = [
              'Start Free Trial',
              'Login',
              'Register',
              'Demo'
            ].some(cta => text.includes(cta))
            
            if (hasCTALikeElements && !hasCTASystemImport) {
              context.report({
                node: context.getSourceCode().ast,
                message: 'This file contains CTA-like elements but does not import the CTA system. Consider using centralized CTAs.',
              })
            }
          }
        }
      }
    }
  }
}
const natural = require('natural');
const crypto = require('crypto');
const CodePattern = require('../models/CodePattern');
const logger = require('../utils/logger');

class PatternExtractor {
  constructor() {
    this.tfidf = new natural.TfIdf();
    this.stemmer = natural.PorterStemmer;
    
    // Code pattern detection rules
    this.patterns = {
      database: {
        connection_pooling: /pool\.query|createPool|pgBouncer/gi,
        prepared_statements: /\$\d+|\?|prepare\(/gi,
        transactions: /BEGIN|COMMIT|ROLLBACK|transaction/gi,
        indexing: /CREATE\s+INDEX|INDEX\s+ON/gi,
        optimization: /EXPLAIN\s+ANALYZE|EXPLAIN\s+PLAN/gi
      },
      api: {
        rate_limiting: /rateLimit|limiter|throttle/gi,
        validation: /joi\.|validate|schema/gi,
        error_handling: /try\s*{|catch\s*\(|throw\s+/gi,
        middleware: /app\.use|middleware|next\(\)/gi,
        async_await: /async\s+function|await\s+/gi
      },
      frontend: {
        lazy_loading: /React\.lazy|lazy\(\)|loadable/gi,
        memoization: /React\.memo|useMemo|useCallback/gi,
        state_management: /useState|useReducer|Redux|Zustand/gi,
        performance: /React\.Profiler|performance\.mark/gi
      },
      security: {
        authentication: /jwt|bcrypt|passport|auth/gi,
        authorization: /role|permission|acl/gi,
        input_validation: /sanitize|escape|xss|csrf/gi,
        encryption: /crypto|encrypt|decrypt|hash/gi
      },
      performance: {
        caching: /cache|redis|memcached/gi,
        compression: /gzip|compress|minify/gi,
        optimization: /optimize|performance|benchmark/gi,
        monitoring: /metric|monitor|trace|profile/gi
      }
    };
  }

  async extractPattern(code, metadata = {}) {
    try {
      // Generate unique pattern ID
      const patternId = this.generatePatternId(code);
      
      // Check if pattern already exists
      const existingPattern = await CodePattern.findOne({ pattern_id: patternId });
      if (existingPattern) {
        // Update usage metrics
        await this.updatePatternUsage(patternId, metadata);
        return existingPattern;
      }

      // Analyze code to extract pattern details
      const analysis = await this.analyzeCode(code, metadata);
      
      // Create new pattern
      const pattern = new CodePattern({
        pattern_id: patternId,
        name: analysis.name,
        description: analysis.description,
        category: analysis.category,
        subcategory: analysis.subcategory,
        language: analysis.language,
        framework: analysis.framework,
        code_snippet: code,
        usage_example: metadata.usage_example || '',
        context: {
          problem_solved: metadata.problem_solved || analysis.problem_solved,
          use_cases: metadata.use_cases || analysis.use_cases,
          prerequisites: metadata.prerequisites || [],
          alternatives: metadata.alternatives || []
        },
        quality_indicators: analysis.quality_indicators,
        tags: analysis.tags,
        created_by: metadata.created_by || 'system'
      });

      await pattern.save();
      logger.info(`Extracted new pattern: ${analysis.name} (${patternId})`);
      
      return pattern;

    } catch (error) {
      logger.error('Failed to extract pattern:', error);
      throw error;
    }
  }

  generatePatternId(code) {
    // Create hash of normalized code
    const normalizedCode = code
      .replace(/\s+/g, ' ')
      .replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '') // Remove comments
      .trim()
      .toLowerCase();
    
    return crypto.createHash('md5').update(normalizedCode).digest('hex').substring(0, 16);
  }

  async analyzeCode(code, metadata) {
    // Detect language
    const language = this.detectLanguage(code, metadata.language);
    
    // Detect framework
    const framework = this.detectFramework(code, metadata.framework);
    
    // Categorize pattern
    const category = this.categorizePattern(code);
    
    // Extract key components
    const components = this.extractComponents(code);
    
    // Generate name and description
    const name = metadata.name || this.generatePatternName(category, components);
    const description = metadata.description || this.generateDescription(code, category);
    
    // Analyze quality indicators
    const quality_indicators = this.analyzeQuality(code);
    
    // Extract tags
    const tags = this.extractTags(code, category, language, framework);
    
    return {
      name,
      description,
      category: category.main,
      subcategory: category.sub,
      language,
      framework,
      quality_indicators,
      tags,
      problem_solved: this.inferProblemSolved(code, category),
      use_cases: this.inferUseCases(code, category)
    };
  }

  detectLanguage(code, hintLanguage) {
    if (hintLanguage) return hintLanguage;
    
    // Simple language detection based on syntax
    if (code.includes('def ') && code.includes(':')) return 'python';
    if (code.includes('function') || code.includes('=>') || code.includes('const ')) return 'javascript';
    if (code.includes('interface ') || code.includes(': string') || code.includes(': number')) return 'typescript';
    if (code.includes('SELECT') || code.includes('INSERT') || code.includes('UPDATE')) return 'sql';
    if (code.includes('#!/bin/bash') || code.includes('#!/bin/sh')) return 'bash';
    
    return 'general';
  }

  detectFramework(code, hintFramework) {
    if (hintFramework) return hintFramework;
    
    // Framework detection
    if (code.includes('React.') || code.includes('useState') || code.includes('useEffect')) return 'React';
    if (code.includes('express()') || code.includes('app.get') || code.includes('app.post')) return 'Express';
    if (code.includes('FastAPI') || code.includes('@app.') || code.includes('from fastapi')) return 'FastAPI';
    if (code.includes('mongoose.') || code.includes('Schema(')) return 'Mongoose';
    if (code.includes('pg.Pool') || code.includes('pool.query')) return 'PostgreSQL';
    
    return null;
  }

  categorizePattern(code) {
    let maxMatches = 0;
    let bestCategory = { main: 'general', sub: 'utility' };
    
    Object.entries(this.patterns).forEach(([category, subcategories]) => {
      Object.entries(subcategories).forEach(([subcategory, regex]) => {
        const matches = (code.match(regex) || []).length;
        if (matches > maxMatches) {
          maxMatches = matches;
          bestCategory = { main: category, sub: subcategory };
        }
      });
    });
    
    return bestCategory;
  }

  extractComponents(code) {
    const components = [];
    
    // Extract function names
    const functions = code.match(/function\s+(\w+)|const\s+(\w+)\s*=|def\s+(\w+)/g);
    if (functions) {
      components.push(...functions.map(f => f.replace(/(function\s+|const\s+|def\s+|=)/g, '').trim()));
    }
    
    // Extract class names
    const classes = code.match(/class\s+(\w+)/g);
    if (classes) {
      components.push(...classes.map(c => c.replace('class ', '')));
    }
    
    // Extract important keywords
    const keywords = code.match(/\b(async|await|Promise|Observable|Stream)\b/g);
    if (keywords) {
      components.push(...keywords);
    }
    
    return [...new Set(components)]; // Remove duplicates
  }

  generatePatternName(category, components) {
    const categoryNames = {
      database: 'Database',
      api: 'API',
      frontend: 'Frontend',
      security: 'Security',
      performance: 'Performance'
    };
    
    const mainCategory = categoryNames[category.main] || 'Code';
    const mainComponent = components[0] || category.sub.replace('_', ' ');
    
    return `${mainCategory} ${mainComponent} Pattern`;
  }

  generateDescription(code, category) {
    const descriptions = {
      database: {
        connection_pooling: 'Implements database connection pooling for better resource management',
        prepared_statements: 'Uses prepared statements to prevent SQL injection and improve performance',
        transactions: 'Handles database transactions with proper commit/rollback logic',
        indexing: 'Creates database indexes for query optimization',
        optimization: 'Analyzes and optimizes database query performance'
      },
      api: {
        rate_limiting: 'Implements API rate limiting to prevent abuse',
        validation: 'Validates input data using schema validation',
        error_handling: 'Provides comprehensive error handling and logging',
        middleware: 'Creates reusable middleware for request processing',
        async_await: 'Uses async/await for asynchronous operations'
      },
      frontend: {
        lazy_loading: 'Implements lazy loading for better performance',
        memoization: 'Uses memoization to optimize React component rendering',
        state_management: 'Manages application state efficiently',
        performance: 'Optimizes frontend performance'
      },
      security: {
        authentication: 'Implements user authentication and authorization',
        authorization: 'Handles role-based access control',
        input_validation: 'Validates and sanitizes user input',
        encryption: 'Provides data encryption and security'
      },
      performance: {
        caching: 'Implements caching strategy for improved performance',
        compression: 'Compresses data for faster transmission',
        optimization: 'Optimizes code for better performance',
        monitoring: 'Monitors application performance and metrics'
      }
    };
    
    return descriptions[category.main]?.[category.sub] || 
           `A ${category.main} pattern for ${category.sub.replace('_', ' ')}`;
  }

  analyzeQuality(code) {
    // Simple quality analysis based on code characteristics
    let maintainability = 7;
    let readability = 7;
    let testability = 7;
    let security = 7;
    
    // Maintainability factors
    if (code.includes('class ') || code.includes('function ')) maintainability += 1;
    if (code.split('\n').length > 100) maintainability -= 1;
    if (code.includes('// ') || code.includes('/* ')) maintainability += 1;
    
    // Readability factors
    if (code.includes('\n  ') || code.includes('\n    ')) readability += 1; // Indentation
    if (code.match(/\w{20,}/)) readability -= 1; // Very long variable names
    if (code.includes('const ') || code.includes('let ')) readability += 1;
    
    // Testability factors
    if (code.includes('test(') || code.includes('describe(') || code.includes('it(')) testability += 2;
    if (code.includes('mock') || code.includes('stub')) testability += 1;
    if (code.includes('return ')) testability += 1;
    
    // Security factors
    if (code.includes('sanitize') || code.includes('validate')) security += 1;
    if (code.includes('eval(') || code.includes('innerHTML')) security -= 2;
    if (code.includes('bcrypt') || code.includes('crypto')) security += 1;
    if (code.includes('jwt') || code.includes('auth')) security += 1;
    
    return {
      maintainability_score: Math.max(1, Math.min(10, maintainability)),
      readability_score: Math.max(1, Math.min(10, readability)),
      testability_score: Math.max(1, Math.min(10, testability)),
      security_score: Math.max(1, Math.min(10, security))
    };
  }

  extractTags(code, category, language, framework) {
    const tags = [category.main, category.sub];
    
    if (language) tags.push(language);
    if (framework) tags.push(framework.toLowerCase());
    
    // Add specific tags based on content
    if (code.includes('async') || code.includes('await')) tags.push('async');
    if (code.includes('Promise')) tags.push('promises');
    if (code.includes('cache')) tags.push('caching');
    if (code.includes('test') || code.includes('spec')) tags.push('testing');
    if (code.includes('optimize') || code.includes('performance')) tags.push('optimization');
    if (code.includes('security') || code.includes('auth')) tags.push('security');
    
    return [...new Set(tags)];
  }

  inferProblemSolved(code, category) {
    const problems = {
      database: {
        connection_pooling: 'Database connection exhaustion and poor resource utilization',
        prepared_statements: 'SQL injection vulnerabilities and poor query performance',
        transactions: 'Data consistency issues in multi-step operations',
        indexing: 'Slow database queries and poor search performance',
        optimization: 'Inefficient database queries causing performance bottlenecks'
      },
      api: {
        rate_limiting: 'API abuse and server overload from excessive requests',
        validation: 'Invalid or malicious input data causing errors',
        error_handling: 'Poor error handling leading to crashes and poor UX',
        middleware: 'Code duplication in request processing logic',
        async_await: 'Callback hell and complex asynchronous code management'
      }
    };
    
    return problems[category.main]?.[category.sub] || 
           `Common issues in ${category.main} ${category.sub.replace('_', ' ')} implementation`;
  }

  inferUseCases(code, category) {
    const useCases = {
      database: ['High-traffic applications', 'Data-intensive operations', 'Multi-user systems'],
      api: ['REST APIs', 'Microservices', 'Web applications'],
      frontend: ['React applications', 'Performance-critical UIs', 'Large-scale web apps'],
      security: ['User authentication systems', 'Data protection', 'Secure applications'],
      performance: ['High-performance applications', 'Optimization projects', 'Scalable systems']
    };
    
    return useCases[category.main] || ['General software development'];
  }

  async updatePatternUsage(patternId, metadata) {
    try {
      const updateData = {
        $inc: { 'success_metrics.usage_count': 1 }
      };
      
      // Update success rate if outcome is provided
      if (metadata.success !== undefined) {
        const pattern = await CodePattern.findOne({ pattern_id: patternId });
        if (pattern) {
          const currentUsage = pattern.success_metrics.usage_count;
          const currentSuccessRate = pattern.success_metrics.success_rate;
          const newSuccessRate = (currentSuccessRate * currentUsage + (metadata.success ? 1 : 0)) / (currentUsage + 1);
          updateData['success_metrics.success_rate'] = newSuccessRate;
        }
      }
      
      // Update implementation time
      if (metadata.implementation_time) {
        updateData['success_metrics.avg_implementation_time'] = metadata.implementation_time;
      }
      
      await CodePattern.updateOne({ pattern_id: patternId }, updateData);
      
    } catch (error) {
      logger.error('Failed to update pattern usage:', error);
    }
  }

  async ratePatternSuccess(patternId, outcome) {
    try {
      await this.updatePatternUsage(patternId, { success: outcome.success });
      
      if (outcome.feedback) {
        await CodePattern.updateOne(
          { pattern_id: patternId },
          {
            $push: {
              feedback: {
                user_id: outcome.user_id || 'anonymous',
                rating: outcome.rating,
                comment: outcome.comment,
                implementation_difficulty: outcome.difficulty,
                effectiveness: outcome.effectiveness
              }
            }
          }
        );
      }
      
      logger.info(`Updated success rating for pattern ${patternId}`);
      
    } catch (error) {
      logger.error('Failed to rate pattern success:', error);
      throw error;
    }
  }

  async getRecommendedPatterns(context) {
    try {
      const { category, language, framework, problem, tags } = context;
      
      let query = { status: 'active' };
      
      if (category) query.category = category;
      if (language) query.language = language;
      if (framework) query.framework = new RegExp(framework, 'i');
      if (tags) query.tags = { $in: tags };
      
      const patterns = await CodePattern.find(query)
        .sort({ 'success_metrics.success_rate': -1, 'success_metrics.usage_count': -1 })
        .limit(10);
      
      // If we have a specific problem, use text search
      if (problem) {
        const searchResults = await CodePattern.find({
          $text: { $search: problem },
          ...query
        }).sort({ score: { $meta: 'textScore' } });
        
        // Merge with category-based results
        const combined = [...searchResults, ...patterns];
        const unique = combined.filter((pattern, index, self) => 
          index === self.findIndex(p => p.pattern_id === pattern.pattern_id)
        );
        
        return unique.slice(0, 10);
      }
      
      return patterns;
      
    } catch (error) {
      logger.error('Failed to get recommended patterns:', error);
      throw error;
    }
  }

  async updateAgentKnowledge(agentName, patterns) {
    // This would integrate with the agent optimization system
    // to update the agent's prompt with learned patterns
    logger.info(`Updating agent ${agentName} knowledge with ${patterns.length} patterns`);
    
    // Implementation would depend on how agents are stored and updated
    // This is a placeholder for the integration point
  }
}

module.exports = PatternExtractor;
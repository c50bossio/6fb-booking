const natural = require('natural');
const { pgPool } = require('../config/database');
const logger = require('../utils/logger');
const { getVersionControl } = require('./PromptVersionControl');

class FeedbackProcessor {
  constructor() {
    this.sentimentAnalyzer = new natural.SentimentAnalyzer('English', 
      natural.PorterStemmer, 'afinn');
    this.tokenizer = new natural.WordTokenizer();
  }

  async collectFeedback(projectId, agentName, feedbackData, userId = 'anonymous') {
    try {
      const client = await pgPool.connect();
      
      // Get agent ID and current version
      const agentResult = await client.query(
        'SELECT id, current_version FROM agents WHERE name = $1',
        [agentName]
      );
      
      if (agentResult.rows.length === 0) {
        throw new Error(`Agent ${agentName} not found`);
      }
      
      const { id: agentId, current_version: version } = agentResult.rows[0];

      // Insert feedback record
      const feedbackResult = await client.query(`
        INSERT INTO feedback (
          agent_id, project_id, version, corrections_needed, missing_capabilities,
          successful_patterns, time_to_completion, quality_score, cost_score,
          user_satisfaction, notes, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id
      `, [
        agentId,
        projectId,
        version,
        feedbackData.corrections_needed || [],
        feedbackData.missing_capabilities || [],
        feedbackData.successful_patterns || [],
        feedbackData.time_to_completion,
        feedbackData.quality_score,
        feedbackData.cost_score,
        feedbackData.user_satisfaction,
        feedbackData.notes || '',
        userId
      ]);

      client.release();

      // Process feedback for patterns
      await this.analyzePatterns(agentName, feedbackData);

      // Check if immediate optimization is needed
      await this.checkOptimizationTriggers(agentName);

      logger.info(`Feedback collected for ${agentName}, project ${projectId}`);
      return {
        feedbackId: feedbackResult.rows[0].id,
        agentName,
        projectId,
        processed: true
      };

    } catch (error) {
      logger.error('Failed to collect feedback:', error);
      throw error;
    }
  }

  async analyzePatterns(agentName, feedbackData) {
    try {
      // Extract patterns from corrections and missing capabilities
      const corrections = feedbackData.corrections_needed || [];
      const missing = feedbackData.missing_capabilities || [];
      const successful = feedbackData.successful_patterns || [];

      // Categorize feedback using NLP
      const categories = {
        performance: [],
        functionality: [],
        accuracy: [],
        usability: [],
        security: []
      };

      // Keywords for categorization
      const keywords = {
        performance: ['slow', 'fast', 'speed', 'optimization', 'cache', 'database', 'query', 'response time'],
        functionality: ['feature', 'function', 'capability', 'missing', 'implement', 'add'],
        accuracy: ['wrong', 'correct', 'error', 'bug', 'fix', 'mistake', 'accurate'],
        usability: ['user', 'interface', 'experience', 'easy', 'difficult', 'intuitive'],
        security: ['security', 'auth', 'permission', 'vulnerability', 'safe', 'protect']
      };

      // Categorize corrections and missing capabilities
      [...corrections, ...missing].forEach(item => {
        const tokens = this.tokenizer.tokenize(item.toLowerCase());
        let bestCategory = 'functionality';
        let maxMatches = 0;

        Object.keys(keywords).forEach(category => {
          const matches = tokens.filter(token => 
            keywords[category].some(keyword => token.includes(keyword))
          ).length;
          
          if (matches > maxMatches) {
            maxMatches = matches;
            bestCategory = category;
          }
        });

        categories[bestCategory].push(item);
      });

      // Store pattern analysis
      await this.storePatternAnalysis(agentName, {
        categories,
        corrections_count: corrections.length,
        missing_count: missing.length,
        successful_count: successful.length,
        sentiment: this.analyzeSentiment(feedbackData.notes || ''),
        analyzed_at: new Date().toISOString()
      });

      return categories;

    } catch (error) {
      logger.error('Failed to analyze patterns:', error);
      throw error;
    }
  }

  async storePatternAnalysis(agentName, analysis) {
    try {
      const PatternAnalysis = require('../models/PatternAnalysis');
      
      const patternDoc = new PatternAnalysis({
        agent_name: agentName,
        analysis_date: new Date(),
        pattern_categories: analysis.categories,
        correction_patterns: analysis.categories.functionality.concat(analysis.categories.accuracy),
        performance_issues: analysis.categories.performance,
        security_concerns: analysis.categories.security,
        sentiment_score: analysis.sentiment,
        metadata: {
          corrections_count: analysis.corrections_count,
          missing_count: analysis.missing_count,
          successful_count: analysis.successful_count
        }
      });

      await patternDoc.save();
      logger.info(`Stored pattern analysis for ${agentName}`);

    } catch (error) {
      logger.error('Failed to store pattern analysis:', error);
    }
  }

  analyzeSentiment(text) {
    if (!text || text.trim().length === 0) return 0;
    
    const tokens = this.tokenizer.tokenize(text.toLowerCase());
    const sentiment = this.sentimentAnalyzer.getSentiment(tokens);
    return sentiment;
  }

  async generateImprovements(agentName, timeframe = '30 days') {
    try {
      const client = await pgPool.connect();
      
      // Get feedback patterns for the timeframe
      const feedbackResult = await client.query(`
        SELECT 
          f.*,
          COUNT(*) OVER (PARTITION BY f.corrections_needed) as correction_frequency,
          COUNT(*) OVER (PARTITION BY f.missing_capabilities) as missing_frequency,
          AVG(f.quality_score) OVER () as avg_quality,
          AVG(f.time_to_completion) OVER () as avg_time
        FROM feedback f
        JOIN agents a ON f.agent_id = a.id
        WHERE a.name = $1 
        AND f.created_at >= NOW() - INTERVAL '${timeframe}'
        ORDER BY f.created_at DESC
      `, [agentName]);

      const feedbacks = feedbackResult.rows;
      client.release();

      if (feedbacks.length === 0) {
        return { improvements: [], message: 'No feedback data available for analysis' };
      }

      // Analyze common issues
      const commonCorrections = this.extractCommonPatterns(
        feedbacks.flatMap(f => f.corrections_needed || [])
      );
      
      const commonMissing = this.extractCommonPatterns(
        feedbacks.flatMap(f => f.missing_capabilities || [])
      );

      // Generate improvement suggestions
      const improvements = [];

      // Quality score improvements
      const avgQuality = feedbacks[0].avg_quality;
      if (avgQuality < 7) {
        improvements.push({
          type: 'quality',
          priority: 'high',
          description: `Quality score is below target (${avgQuality.toFixed(1)}/10). Focus on accuracy and completeness.`,
          suggestions: commonCorrections.slice(0, 3),
          impact_score: 0.8
        });
      }

      // Time to completion improvements
      const avgTime = feedbacks[0].avg_time;
      if (avgTime > 60) { // More than 1 hour
        improvements.push({
          type: 'performance',
          priority: 'medium',
          description: `Average completion time is high (${Math.round(avgTime)} minutes). Consider optimization.`,
          suggestions: ['Add common patterns to prompt', 'Improve initial guidance', 'Add performance shortcuts'],
          impact_score: 0.6
        });
      }

      // Missing capabilities
      if (commonMissing.length > 0) {
        improvements.push({
          type: 'functionality',
          priority: 'high',
          description: 'Frequently missing capabilities detected',
          suggestions: commonMissing.slice(0, 5),
          impact_score: 0.9
        });
      }

      // Store improvement suggestions
      await this.storeImprovementSuggestions(agentName, improvements);

      return { improvements, feedbackCount: feedbacks.length };

    } catch (error) {
      logger.error('Failed to generate improvements:', error);
      throw error;
    }
  }

  extractCommonPatterns(items, minFrequency = 2) {
    const frequency = {};
    
    items.forEach(item => {
      const key = item.toLowerCase().trim();
      frequency[key] = (frequency[key] || 0) + 1;
    });

    return Object.entries(frequency)
      .filter(([_, count]) => count >= minFrequency)
      .sort((a, b) => b[1] - a[1])
      .map(([pattern, count]) => ({ pattern, frequency: count }));
  }

  async storeImprovementSuggestions(agentName, improvements) {
    try {
      const client = await pgPool.connect();
      
      // Get agent ID
      const agentResult = await client.query(
        'SELECT id FROM agents WHERE name = $1',
        [agentName]
      );
      
      if (agentResult.rows.length === 0) {
        throw new Error(`Agent ${agentName} not found`);
      }
      
      const agentId = agentResult.rows[0].id;

      // Insert suggestions
      for (const improvement of improvements) {
        await client.query(`
          INSERT INTO optimization_suggestions (
            agent_id, suggestion_type, description, impact_score, 
            implementation_effort, status
          ) VALUES ($1, $2, $3, $4, $5, 'pending')
        `, [
          agentId,
          improvement.type,
          improvement.description,
          improvement.impact_score,
          improvement.priority
        ]);
      }

      client.release();
      logger.info(`Stored ${improvements.length} improvement suggestions for ${agentName}`);

    } catch (error) {
      logger.error('Failed to store improvement suggestions:', error);
    }
  }

  async checkOptimizationTriggers(agentName) {
    try {
      const client = await pgPool.connect();
      
      // Check recent feedback quality
      const recentFeedback = await client.query(`
        SELECT AVG(quality_score) as avg_quality, COUNT(*) as feedback_count
        FROM feedback f
        JOIN agents a ON f.agent_id = a.id
        WHERE a.name = $1 
        AND f.created_at >= NOW() - INTERVAL '7 days'
      `, [agentName]);

      const { avg_quality, feedback_count } = recentFeedback.rows[0];
      
      client.release();

      // Trigger optimization if quality is low and we have enough data
      if (feedback_count >= 3 && avg_quality < parseFloat(process.env.AUTO_OPTIMIZE_THRESHOLD || '0.75') * 10) {
        logger.info(`Quality threshold triggered for ${agentName}: ${avg_quality}/10`);
        
        // Generate and apply improvements
        const improvements = await this.generateImprovements(agentName, '7 days');
        
        if (improvements.improvements.length > 0) {
          await this.autoUpdatePrompt(agentName, improvements.improvements);
        }
      }

    } catch (error) {
      logger.error('Failed to check optimization triggers:', error);
    }
  }

  async autoUpdatePrompt(agentName, improvements) {
    try {
      const versionControl = getVersionControl();
      if (!versionControl) {
        logger.warn('Version control not initialized, skipping auto-update');
        return;
      }

      // Get current prompt
      const client = await pgPool.connect();
      const promptResult = await client.query(`
        SELECT content FROM prompt_versions pv
        JOIN agents a ON pv.agent_id = a.id
        WHERE a.name = $1 AND pv.is_active = true
      `, [agentName]);

      if (promptResult.rows.length === 0) {
        throw new Error(`No active prompt found for ${agentName}`);
      }

      let currentPrompt = promptResult.rows[0].content;
      client.release();

      // Apply improvements to prompt
      const improvementSection = this.generateImprovementSection(improvements);
      
      // Add improvements section to the prompt
      const updatedPrompt = `${currentPrompt}\n\n${improvementSection}`;
      
      const changelog = `Auto-optimization based on feedback analysis:
${improvements.map(imp => `- ${imp.description}`).join('\n')}`;

      // Create new version
      await versionControl.createVersion(
        agentName,
        updatedPrompt,
        changelog,
        { versionType: 'minor', auto_generated: true }
      );

      logger.info(`Auto-updated prompt for ${agentName} with ${improvements.length} improvements`);

    } catch (error) {
      logger.error('Failed to auto-update prompt:', error);
    }
  }

  generateImprovementSection(improvements) {
    const sections = {
      quality: [],
      performance: [],
      functionality: []
    };

    improvements.forEach(imp => {
      if (imp.suggestions) {
        sections[imp.type] = sections[imp.type] || [];
        sections[imp.type].push(...(Array.isArray(imp.suggestions) ? imp.suggestions : [imp.suggestions]));
      }
    });

    let section = '\n## LEARNED IMPROVEMENTS (Auto-generated)\n';
    
    if (sections.functionality.length > 0) {
      section += '\n### Missing Capabilities to Address:\n';
      sections.functionality.forEach(item => {
        const pattern = typeof item === 'object' ? item.pattern : item;
        section += `- ${pattern}\n`;
      });
    }

    if (sections.quality.length > 0) {
      section += '\n### Quality Improvements:\n';
      sections.quality.forEach(item => {
        const pattern = typeof item === 'object' ? item.pattern : item;
        section += `- ${pattern}\n`;
      });
    }

    if (sections.performance.length > 0) {
      section += '\n### Performance Optimizations:\n';
      sections.performance.forEach(item => {
        const pattern = typeof item === 'object' ? item.pattern : item;
        section += `- ${pattern}\n`;
      });
    }

    return section;
  }

  async scheduleWeeklyReview() {
    try {
      const client = await pgPool.connect();
      
      // Get all active agents
      const agentsResult = await client.query(
        'SELECT name FROM agents WHERE status = $1',
        ['active']
      );

      client.release();

      // Generate improvements for each agent
      for (const agent of agentsResult.rows) {
        try {
          await this.generateImprovements(agent.name, '7 days');
          logger.info(`Weekly review completed for ${agent.name}`);
        } catch (error) {
          logger.error(`Weekly review failed for ${agent.name}:`, error);
        }
      }

    } catch (error) {
      logger.error('Failed to run weekly review:', error);
    }
  }
}

module.exports = FeedbackProcessor;
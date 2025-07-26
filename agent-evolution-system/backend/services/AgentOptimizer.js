const natural = require('natural');
const { pgPool } = require('../config/database');
const CodePattern = require('../models/CodePattern');
const PatternAnalysis = require('../models/PatternAnalysis');
const { getVersionControl } = require('./PromptVersionControl');
const logger = require('../utils/logger');

class AgentOptimizer {
  constructor() {
    this.similarityThreshold = parseFloat(process.env.PATTERN_SIMILARITY_THRESHOLD) || 0.85;
    this.classifier = new natural.BayesClassifier();
    this.stemmer = natural.PorterStemmer;
    
    // Initialize with training data
    this.initializeClassifier();
  }

  async initializeClassifier() {
    try {
      // Train classifier with existing feedback patterns
      const patterns = await PatternAnalysis.find().limit(1000);
      
      patterns.forEach(pattern => {
        // Train on correction patterns
        pattern.correction_patterns.forEach(correction => {
          this.classifier.addDocument(correction.pattern, 'needs_improvement');
        });
        
        // Train on performance issues
        pattern.performance_issues.forEach(issue => {
          this.classifier.addDocument(issue.issue, 'performance_issue');
        });
        
        // Train on security concerns
        pattern.security_concerns.forEach(concern => {
          this.classifier.addDocument(concern.concern, 'security_issue');
        });
      });

      this.classifier.train();
      logger.info('Agent optimizer classifier trained');
      
    } catch (error) {
      logger.error('Failed to initialize classifier:', error);
    }
  }

  async analyzeFailurePatterns(agentName = null, timeframe = '30 days') {
    try {
      const client = await pgPool.connect();
      
      let query = `
        SELECT 
          a.name as agent_name,
          f.corrections_needed,
          f.missing_capabilities,
          f.quality_score,
          f.time_to_completion,
          f.created_at
        FROM feedback f
        JOIN agents a ON f.agent_id = a.id
        WHERE f.created_at >= NOW() - INTERVAL '${timeframe}'
      `;
      const params = [];

      if (agentName) {
        query += ` AND a.name = $1`;
        params.push(agentName);
      }

      query += ` ORDER BY f.created_at DESC`;

      const result = await client.query(query, params);
      client.release();

      const feedbacks = result.rows;
      
      if (feedbacks.length === 0) {
        return { patterns: [], insights: [] };
      }

      // Analyze failure patterns
      const failurePatterns = this.extractFailurePatterns(feedbacks);
      const insights = this.generateInsights(failurePatterns, feedbacks);

      return { patterns: failurePatterns, insights };

    } catch (error) {
      logger.error('Failed to analyze failure patterns:', error);
      throw error;
    }
  }

  extractFailurePatterns(feedbacks) {
    const patterns = {
      common_corrections: {},
      missing_capabilities: {},
      quality_issues: {},
      performance_issues: {}
    };

    feedbacks.forEach(feedback => {
      // Count correction patterns
      if (feedback.corrections_needed) {
        feedback.corrections_needed.forEach(correction => {
          patterns.common_corrections[correction] = 
            (patterns.common_corrections[correction] || 0) + 1;
        });
      }

      // Count missing capabilities
      if (feedback.missing_capabilities) {
        feedback.missing_capabilities.forEach(capability => {
          patterns.missing_capabilities[capability] = 
            (patterns.missing_capabilities[capability] || 0) + 1;
        });
      }

      // Categorize quality issues
      if (feedback.quality_score < 7) {
        const category = this.categorizeQualityIssue(feedback);
        patterns.quality_issues[category] = 
          (patterns.quality_issues[category] || 0) + 1;
      }

      // Categorize performance issues
      if (feedback.time_to_completion > 60) { // More than 1 hour
        const category = this.categorizePerformanceIssue(feedback);
        patterns.performance_issues[category] = 
          (patterns.performance_issues[category] || 0) + 1;
      }
    });

    // Sort by frequency
    Object.keys(patterns).forEach(key => {
      patterns[key] = Object.entries(patterns[key])
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10) // Top 10
        .map(([pattern, count]) => ({ pattern, frequency: count }));
    });

    return patterns;
  }

  categorizeQualityIssue(feedback) {
    const corrections = feedback.corrections_needed || [];
    const missing = feedback.missing_capabilities || [];
    const allIssues = [...corrections, ...missing].join(' ').toLowerCase();

    // Use NLP to categorize
    const classification = this.classifier.classify(allIssues);
    
    // Fallback to keyword matching
    if (allIssues.includes('error') || allIssues.includes('bug')) return 'bugs';
    if (allIssues.includes('incomplete') || allIssues.includes('missing')) return 'incomplete';
    if (allIssues.includes('wrong') || allIssues.includes('incorrect')) return 'accuracy';
    
    return classification || 'general';
  }

  categorizePerformanceIssue(feedback) {
    const corrections = feedback.corrections_needed || [];
    const allIssues = corrections.join(' ').toLowerCase();

    if (allIssues.includes('slow') || allIssues.includes('performance')) return 'speed';
    if (allIssues.includes('complex') || allIssues.includes('difficult')) return 'complexity';
    if (allIssues.includes('time') || allIssues.includes('delay')) return 'efficiency';
    
    return 'general';
  }

  generateInsights(patterns, feedbacks) {
    const insights = [];
    const totalFeedbacks = feedbacks.length;

    // Quality insights
    const avgQuality = feedbacks.reduce((sum, f) => sum + f.quality_score, 0) / totalFeedbacks;
    if (avgQuality < 7) {
      insights.push({
        type: 'quality',
        severity: 'high',
        message: `Average quality score is ${avgQuality.toFixed(1)}/10, below target of 7.0`,
        recommendation: 'Focus on accuracy and completeness improvements',
        impact_score: 0.9
      });
    }

    // Performance insights
    const avgTime = feedbacks.reduce((sum, f) => sum + (f.time_to_completion || 0), 0) / totalFeedbacks;
    if (avgTime > 60) {
      insights.push({
        type: 'performance',
        severity: 'medium',
        message: `Average completion time is ${Math.round(avgTime)} minutes, above target of 60`,
        recommendation: 'Add common patterns and shortcuts to prompt',
        impact_score: 0.7
      });
    }

    // Pattern frequency insights
    if (patterns.common_corrections.length > 0) {
      const topCorrection = patterns.common_corrections[0];
      if (topCorrection.frequency > totalFeedbacks * 0.3) {
        insights.push({
          type: 'pattern',
          severity: 'high',
          message: `"${topCorrection.pattern}" appears in ${topCorrection.frequency}/${totalFeedbacks} feedbacks`,
          recommendation: 'Add specific guidance for this issue to the prompt',
          impact_score: 0.8
        });
      }
    }

    return insights;
  }

  async suggestPromptImprovements(agentName) {
    try {
      const { patterns, insights } = await this.analyzeFailurePatterns(agentName);
      
      // Get current prompt
      const client = await pgPool.connect();
      const promptResult = await client.query(`
        SELECT pv.content, a.category
        FROM prompt_versions pv
        JOIN agents a ON pv.agent_id = a.id
        WHERE a.name = $1 AND pv.is_active = true
      `, [agentName]);

      if (promptResult.rows.length === 0) {
        throw new Error(`No active prompt found for ${agentName}`);
      }

      const { content: currentPrompt, category } = promptResult.rows[0];
      client.release();

      // Get recommended patterns
      const recommendedPatterns = await this.getRecommendedPatterns(category, patterns);
      
      // Generate improvement suggestions
      const improvements = {
        missing_capabilities: this.generateCapabilityImprovements(patterns.missing_capabilities),
        common_fixes: this.generateFixImprovements(patterns.common_corrections),
        performance_optimizations: this.generatePerformanceImprovements(patterns.performance_issues),
        recommended_patterns: recommendedPatterns,
        insights: insights
      };

      // Generate updated prompt
      const updatedPrompt = await this.generateOptimizedPrompt(currentPrompt, improvements);

      return {
        current_prompt: currentPrompt,
        suggested_prompt: updatedPrompt,
        improvements,
        confidence_score: this.calculateConfidenceScore(improvements, insights)
      };

    } catch (error) {
      logger.error('Failed to suggest prompt improvements:', error);
      throw error;
    }
  }

  async getRecommendedPatterns(category, patterns) {
    try {
      // Get patterns relevant to common issues
      const issues = [
        ...patterns.common_corrections.map(p => p.pattern),
        ...patterns.missing_capabilities.map(p => p.pattern)
      ];

      const searchTerms = issues.join(' ');
      
      const recommendedPatterns = await CodePattern.find({
        $or: [
          { category: category },
          { $text: { $search: searchTerms } },
          { tags: { $in: [category] } }
        ],
        status: 'active'
      })
      .sort({ 'success_metrics.success_rate': -1 })
      .limit(5);

      return recommendedPatterns.map(pattern => ({
        pattern_id: pattern.pattern_id,
        name: pattern.name,
        description: pattern.description,
        success_rate: pattern.success_metrics.success_rate,
        usage_count: pattern.success_metrics.usage_count
      }));

    } catch (error) {
      logger.error('Failed to get recommended patterns:', error);
      return [];
    }
  }

  generateCapabilityImprovements(missingCapabilities) {
    return missingCapabilities.slice(0, 5).map(capability => ({
      capability: capability.pattern,
      frequency: capability.frequency,
      suggestion: `Add explicit guidance for: ${capability.pattern}`,
      priority: capability.frequency > 3 ? 'high' : 'medium'
    }));
  }

  generateFixImprovements(commonCorrections) {
    return commonCorrections.slice(0, 5).map(correction => ({
      issue: correction.pattern,
      frequency: correction.frequency,
      suggestion: `Add preventive guidance: Always check for ${correction.pattern}`,
      priority: correction.frequency > 3 ? 'high' : 'medium'
    }));
  }

  generatePerformanceImprovements(performanceIssues) {
    return performanceIssues.slice(0, 3).map(issue => ({
      issue: issue.pattern,
      frequency: issue.frequency,
      suggestion: `Optimize for ${issue.pattern} by adding shortcuts and common patterns`,
      priority: 'medium'
    }));
  }

  async generateOptimizedPrompt(currentPrompt, improvements) {
    let optimizedPrompt = currentPrompt;

    // Add missing capabilities section
    if (improvements.missing_capabilities.length > 0) {
      const capabilitiesSection = `\n\n## ENHANCED CAPABILITIES (Auto-added based on feedback):\n${
        improvements.missing_capabilities
          .filter(cap => cap.priority === 'high')
          .map(cap => `- ${cap.capability}`)
          .join('\n')
      }\n`;
      optimizedPrompt += capabilitiesSection;
    }

    // Add common fixes section
    if (improvements.common_fixes.length > 0) {
      const fixesSection = `\n\n## COMMON ISSUES TO AVOID (Auto-added based on feedback):\n${
        improvements.common_fixes
          .filter(fix => fix.priority === 'high')
          .map(fix => `- Always verify: ${fix.issue}`)
          .join('\n')
      }\n`;
      optimizedPrompt += fixesSection;
    }

    // Add performance optimizations
    if (improvements.performance_optimizations.length > 0) {
      const perfSection = `\n\n## PERFORMANCE SHORTCUTS (Auto-added based on feedback):\n${
        improvements.performance_optimizations
          .map(perf => `- Optimize ${perf.issue} by using efficient patterns`)
          .join('\n')
      }\n`;
      optimizedPrompt += perfSection;
    }

    // Add recommended patterns
    if (improvements.recommended_patterns.length > 0) {
      const patternsSection = `\n\n## RECOMMENDED PATTERNS (Auto-added based on success rates):\n${
        improvements.recommended_patterns
          .map(pattern => `- ${pattern.name}: ${pattern.description} (Success rate: ${(pattern.success_rate * 100).toFixed(1)}%)`)
          .join('\n')
      }\n`;
      optimizedPrompt += patternsSection;
    }

    return optimizedPrompt;
  }

  calculateConfidenceScore(improvements, insights) {
    let score = 0.5; // Base confidence

    // Increase confidence based on data quality
    const totalImprovements = 
      improvements.missing_capabilities.length +
      improvements.common_fixes.length +
      improvements.performance_optimizations.length;

    if (totalImprovements > 5) score += 0.2;
    if (totalImprovements > 10) score += 0.1;

    // Increase confidence based on insight severity
    const highSeverityInsights = insights.filter(i => i.severity === 'high').length;
    score += highSeverityInsights * 0.1;

    // Increase confidence based on pattern usage
    const highUsagePatterns = improvements.recommended_patterns.filter(p => p.usage_count > 10).length;
    score += highUsagePatterns * 0.05;

    return Math.min(1.0, score);
  }

  async predictPerformanceImpact(agentName, proposedChanges) {
    try {
      // Get historical performance data
      const client = await pgPool.connect();
      const historicalData = await client.query(`
        SELECT 
          AVG(quality_score) as avg_quality,
          AVG(time_to_completion) as avg_time,
          COUNT(*) as feedback_count
        FROM feedback f
        JOIN agents a ON f.agent_id = a.id
        WHERE a.name = $1
        AND f.created_at >= NOW() - INTERVAL '30 days'
      `, [agentName]);

      client.release();

      const current = historicalData.rows[0];
      
      // Predict improvements based on change types
      let qualityImprovement = 0;
      let timeImprovement = 0;

      proposedChanges.forEach(change => {
        switch (change.type) {
          case 'missing_capability':
            qualityImprovement += 0.5;
            timeImprovement += 0.1;
            break;
          case 'common_fix':
            qualityImprovement += 0.3;
            break;
          case 'performance_optimization':
            timeImprovement += 0.2;
            break;
          case 'recommended_pattern':
            qualityImprovement += 0.2;
            timeImprovement += 0.15;
            break;
        }
      });

      return {
        current_metrics: {
          quality_score: parseFloat(current.avg_quality) || 0,
          completion_time: parseFloat(current.avg_time) || 0,
          feedback_count: parseInt(current.feedback_count) || 0
        },
        predicted_metrics: {
          quality_score: Math.min(10, (parseFloat(current.avg_quality) || 0) + qualityImprovement),
          completion_time: Math.max(5, (parseFloat(current.avg_time) || 0) - (timeImprovement * 10)), // 10 minutes per 0.1 improvement
        },
        confidence: this.calculateConfidenceScore({ recommended_patterns: [] }, [])
      };

    } catch (error) {
      logger.error('Failed to predict performance impact:', error);
      throw error;
    }
  }

  async optimizeForMetric(agentName, targetMetric) {
    try {
      const validMetrics = ['quality', 'speed', 'cost', 'satisfaction'];
      if (!validMetrics.includes(targetMetric)) {
        throw new Error(`Invalid metric: ${targetMetric}. Must be one of: ${validMetrics.join(', ')}`);
      }

      const { patterns, insights } = await this.analyzeFailurePatterns(agentName);
      
      let optimizations = [];

      switch (targetMetric) {
        case 'quality':
          optimizations = await this.optimizeForQuality(patterns, insights);
          break;
        case 'speed':
          optimizations = await this.optimizeForSpeed(patterns, insights);
          break;
        case 'cost':
          optimizations = await this.optimizeForCost(patterns, insights);
          break;
        case 'satisfaction':
          optimizations = await this.optimizeForSatisfaction(patterns, insights);
          break;
      }

      return {
        target_metric: targetMetric,
        optimizations,
        predicted_impact: await this.predictPerformanceImpact(agentName, optimizations)
      };

    } catch (error) {
      logger.error('Failed to optimize for metric:', error);
      throw error;
    }
  }

  async optimizeForQuality(patterns, insights) {
    const optimizations = [];

    // Focus on most common corrections
    patterns.common_corrections.slice(0, 3).forEach(correction => {
      optimizations.push({
        type: 'common_fix',
        description: `Add explicit check for: ${correction.pattern}`,
        priority: 'high',
        impact: 0.7
      });
    });

    // Add missing capabilities
    patterns.missing_capabilities.slice(0, 3).forEach(capability => {
      optimizations.push({
        type: 'missing_capability',
        description: `Add capability: ${capability.pattern}`,
        priority: 'high',
        impact: 0.8
      });
    });

    return optimizations;
  }

  async optimizeForSpeed(patterns, insights) {
    const optimizations = [];

    // Add performance shortcuts
    optimizations.push({
      type: 'performance_optimization',
      description: 'Add common code patterns to reduce thinking time',
      priority: 'high',
      impact: 0.6
    });

    // Add quick reference guides
    optimizations.push({
      type: 'performance_optimization',
      description: 'Add quick reference for common tasks',
      priority: 'medium',
      impact: 0.5
    });

    return optimizations;
  }

  async optimizeForCost(patterns, insights) {
    const optimizations = [];

    // Reduce token usage
    optimizations.push({
      type: 'cost_optimization',
      description: 'Optimize prompt length while maintaining quality',
      priority: 'medium',
      impact: 0.4
    });

    return optimizations;
  }

  async optimizeForSatisfaction(patterns, insights) {
    const optimizations = [];

    // Combine quality and speed optimizations
    const qualityOpts = await this.optimizeForQuality(patterns, insights);
    const speedOpts = await this.optimizeForSpeed(patterns, insights);

    return [...qualityOpts.slice(0, 2), ...speedOpts.slice(0, 2)];
  }

  async generateMonthlyReport() {
    try {
      const client = await pgPool.connect();
      
      // Get all active agents
      const agentsResult = await client.query(
        'SELECT name, id FROM agents WHERE status = $1',
        ['active']
      );

      const report = {
        generated_at: new Date().toISOString(),
        period: '30 days',
        agents: []
      };

      for (const agent of agentsResult.rows) {
        try {
          const agentReport = await this.generateAgentReport(agent.name);
          report.agents.push(agentReport);
        } catch (error) {
          logger.error(`Failed to generate report for ${agent.name}:`, error);
        }
      }

      client.release();

      // Store report (could be saved to file or database)
      logger.info(`Generated monthly report with ${report.agents.length} agents`);
      
      return report;

    } catch (error) {
      logger.error('Failed to generate monthly report:', error);
      throw error;
    }
  }

  async generateAgentReport(agentName) {
    const { patterns, insights } = await this.analyzeFailurePatterns(agentName, '30 days');
    const improvements = await this.suggestPromptImprovements(agentName);
    
    return {
      agent_name: agentName,
      failure_patterns: patterns,
      insights: insights,
      suggested_improvements: improvements.improvements,
      confidence_score: improvements.confidence_score,
      generated_at: new Date().toISOString()
    };
  }

  async runWeeklyOptimization() {
    try {
      const client = await pgPool.connect();
      
      // Get agents that need optimization (low quality scores)
      const agentsNeedingOptimization = await client.query(`
        SELECT a.name, AVG(f.quality_score) as avg_quality
        FROM agents a
        JOIN feedback f ON a.id = f.agent_id
        WHERE a.status = 'active'
        AND f.created_at >= NOW() - INTERVAL '7 days'
        GROUP BY a.id, a.name
        HAVING AVG(f.quality_score) < 7.5
        ORDER BY avg_quality ASC
      `);

      client.release();

      const optimizationResults = [];

      for (const agent of agentsNeedingOptimization.rows) {
        try {
          const improvements = await this.suggestPromptImprovements(agent.name);
          
          // Auto-apply if confidence is high enough
          if (improvements.confidence_score > 0.8) {
            const versionControl = getVersionControl();
            if (versionControl) {
              await versionControl.createVersion(
                agent.name,
                improvements.suggested_prompt,
                'Weekly auto-optimization based on feedback analysis',
                { 
                  versionType: 'minor', 
                  auto_generated: true,
                  confidence_score: improvements.confidence_score
                }
              );
              
              optimizationResults.push({
                agent: agent.name,
                action: 'auto_optimized',
                confidence: improvements.confidence_score
              });
            }
          } else {
            optimizationResults.push({
              agent: agent.name,
              action: 'manual_review_needed',
              confidence: improvements.confidence_score
            });
          }
          
        } catch (error) {
          logger.error(`Weekly optimization failed for ${agent.name}:`, error);
        }
      }

      logger.info(`Weekly optimization completed: ${optimizationResults.length} agents processed`);
      return optimizationResults;

    } catch (error) {
      logger.error('Failed to run weekly optimization:', error);
      throw error;
    }
  }
}

module.exports = AgentOptimizer;
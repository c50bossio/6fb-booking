const { pgPool } = require('../config/database');
const CodePattern = require('../models/CodePattern');
const PatternAnalysis = require('../models/PatternAnalysis');
const FeedbackProcessor = require('./FeedbackProcessor');
const AgentOptimizer = require('./AgentOptimizer');
const logger = require('../utils/logger');

class ScheduledTasks {
  constructor() {
    this.feedbackProcessor = new FeedbackProcessor();
    this.optimizer = new AgentOptimizer();
  }

  async runDailyAnalysis() {
    try {
      logger.info('Starting daily analysis...');

      // Collect performance metrics
      await this.collectDailyMetrics();

      // Log any failures or corrections from recent feedback
      await this.logDailyFeedback();

      // Update pattern success rates
      await this.updatePatternSuccessRates();

      // Check for agents needing immediate attention
      await this.checkAgentHealth();

      logger.info('Daily analysis completed successfully');

    } catch (error) {
      logger.error('Daily analysis failed:', error);
      throw error;
    }
  }

  async collectDailyMetrics() {
    try {
      const client = await pgPool.connect();

      // Calculate daily metrics for each agent
      const metricsResult = await client.query(`
        INSERT INTO performance_metrics (agent_id, version, metric_type, metric_value, metric_unit, context)
        SELECT 
          a.id as agent_id,
          a.current_version as version,
          'daily_quality_score' as metric_type,
          AVG(f.quality_score) as metric_value,
          'score' as metric_unit,
          jsonb_build_object(
            'feedback_count', COUNT(f.id),
            'date', CURRENT_DATE,
            'auto_generated', true
          ) as context
        FROM agents a
        LEFT JOIN feedback f ON a.id = f.agent_id
        AND f.created_at >= CURRENT_DATE
        AND f.created_at < CURRENT_DATE + INTERVAL '1 day'
        WHERE a.status = 'active'
        GROUP BY a.id, a.current_version
        HAVING COUNT(f.id) > 0
        RETURNING agent_id, metric_value
      `);

      // Calculate daily completion time metrics
      await client.query(`
        INSERT INTO performance_metrics (agent_id, version, metric_type, metric_value, metric_unit, context)
        SELECT 
          a.id as agent_id,
          a.current_version as version,
          'daily_completion_time' as metric_type,
          AVG(f.time_to_completion) as metric_value,
          'minutes' as metric_unit,
          jsonb_build_object(
            'feedback_count', COUNT(f.id),
            'date', CURRENT_DATE,
            'auto_generated', true
          ) as context
        FROM agents a
        LEFT JOIN feedback f ON a.id = f.agent_id
        AND f.created_at >= CURRENT_DATE
        AND f.created_at < CURRENT_DATE + INTERVAL '1 day'
        WHERE a.status = 'active'
        AND f.time_to_completion IS NOT NULL
        GROUP BY a.id, a.current_version
        HAVING COUNT(f.id) > 0
      `);

      // Calculate user satisfaction metrics
      await client.query(`
        INSERT INTO performance_metrics (agent_id, version, metric_type, metric_value, metric_unit, context)
        SELECT 
          a.id as agent_id,
          a.current_version as version,
          'daily_user_satisfaction' as metric_type,
          AVG(f.user_satisfaction) as metric_value,
          'score' as metric_unit,
          jsonb_build_object(
            'feedback_count', COUNT(f.id),
            'date', CURRENT_DATE,
            'auto_generated', true
          ) as context
        FROM agents a
        LEFT JOIN feedback f ON a.id = f.agent_id
        AND f.created_at >= CURRENT_DATE
        AND f.created_at < CURRENT_DATE + INTERVAL '1 day'
        WHERE a.status = 'active'
        AND f.user_satisfaction IS NOT NULL
        GROUP BY a.id, a.current_version
        HAVING COUNT(f.id) > 0
      `);

      client.release();

      logger.info(`Collected daily metrics for ${metricsResult.rowCount} agents`);

    } catch (error) {
      logger.error('Failed to collect daily metrics:', error);
      throw error;
    }
  }

  async logDailyFeedback() {
    try {
      const client = await pgPool.connect();

      // Get today's feedback summary
      const feedbackSummary = await client.query(`
        SELECT 
          a.name as agent_name,
          COUNT(f.id) as feedback_count,
          AVG(f.quality_score) as avg_quality,
          COUNT(CASE WHEN array_length(f.corrections_needed, 1) > 0 THEN 1 END) as corrections_count,
          COUNT(CASE WHEN array_length(f.missing_capabilities, 1) > 0 THEN 1 END) as missing_count
        FROM feedback f
        JOIN agents a ON f.agent_id = a.id
        WHERE f.created_at >= CURRENT_DATE
        AND f.created_at < CURRENT_DATE + INTERVAL '1 day'
        GROUP BY a.id, a.name
        ORDER BY feedback_count DESC
      `);

      client.release();

      // Log summary information
      feedbackSummary.rows.forEach(row => {
        logger.info(`Daily feedback summary for ${row.agent_name}: ` +
          `${row.feedback_count} feedback items, ` +
          `avg quality: ${parseFloat(row.avg_quality).toFixed(1)}, ` +
          `${row.corrections_count} with corrections, ` +
          `${row.missing_count} with missing capabilities`);
      });

    } catch (error) {
      logger.error('Failed to log daily feedback:', error);
      throw error;
    }
  }

  async updatePatternSuccessRates() {
    try {
      // Get patterns that had new feedback today
      const patterns = await CodePattern.find({
        status: 'active',
        'feedback.created_at': {
          $gte: new Date(new Date().setHours(0, 0, 0, 0)),
          $lt: new Date(new Date().setHours(23, 59, 59, 999))
        }
      });

      for (const pattern of patterns) {
        // Calculate new success rate
        const totalFeedback = pattern.feedback.length;
        const successfulFeedback = pattern.feedback.filter(f => f.effectiveness >= 4).length;
        const newSuccessRate = totalFeedback > 0 ? successfulFeedback / totalFeedback : 0;

        // Update the pattern
        await CodePattern.updateOne(
          { _id: pattern._id },
          { 
            'success_metrics.success_rate': newSuccessRate,
            'success_metrics.usage_count': totalFeedback
          }
        );
      }

      logger.info(`Updated success rates for ${patterns.length} patterns`);

    } catch (error) {
      logger.error('Failed to update pattern success rates:', error);
      throw error;
    }
  }

  async checkAgentHealth() {
    try {
      const client = await pgPool.connect();

      // Find agents with low quality scores in the last 24 hours
      const unhealthyAgents = await client.query(`
        SELECT 
          a.name,
          AVG(f.quality_score) as avg_quality,
          COUNT(f.id) as feedback_count
        FROM agents a
        JOIN feedback f ON a.id = f.agent_id
        WHERE f.created_at >= NOW() - INTERVAL '24 hours'
        AND a.status = 'active'
        GROUP BY a.id, a.name
        HAVING AVG(f.quality_score) < 6.0 AND COUNT(f.id) >= 3
        ORDER BY avg_quality ASC
      `);

      client.release();

      // Alert for unhealthy agents
      for (const agent of unhealthyAgents.rows) {
        logger.warn(`Agent health alert: ${agent.name} has quality score ${parseFloat(agent.avg_quality).toFixed(1)} ` +
          `with ${agent.feedback_count} feedback items in the last 24 hours`);
        
        // Could trigger notifications here (Slack, email, etc.)
      }

      // Find agents with high completion times
      const slowAgents = await client.query(`
        SELECT 
          a.name,
          AVG(f.time_to_completion) as avg_time,
          COUNT(f.id) as feedback_count
        FROM agents a
        JOIN feedback f ON a.id = f.agent_id
        WHERE f.created_at >= NOW() - INTERVAL '24 hours'
        AND a.status = 'active'
        AND f.time_to_completion IS NOT NULL
        GROUP BY a.id, a.name
        HAVING AVG(f.time_to_completion) > 90 AND COUNT(f.id) >= 2
        ORDER BY avg_time DESC
      `);

      for (const agent of slowAgents.rows) {
        logger.warn(`Agent performance alert: ${agent.name} has average completion time ` +
          `${Math.round(agent.avg_time)} minutes with ${agent.feedback_count} feedback items`);
      }

    } catch (error) {
      logger.error('Failed to check agent health:', error);
      throw error;
    }
  }

  async runWeeklyAnalysis() {
    try {
      logger.info('Starting weekly analysis...');

      // Generate improvements for all agents
      await this.analyzeWeeklyPatterns();

      // Test prompt optimizations
      await this.testPromptOptimizations();

      // Update knowledge base
      await this.updateKnowledgeBase();

      // Generate weekly report
      await this.generateWeeklyReport();

      logger.info('Weekly analysis completed successfully');

    } catch (error) {
      logger.error('Weekly analysis failed:', error);
      throw error;
    }
  }

  async analyzeWeeklyPatterns() {
    try {
      const client = await pgPool.connect();
      
      // Get all active agents
      const agents = await client.query(
        'SELECT name FROM agents WHERE status = $1',
        ['active']
      );

      client.release();

      // Generate improvements for each agent
      for (const agent of agents.rows) {
        try {
          await this.feedbackProcessor.generateImprovements(agent.name, '7 days');
          logger.info(`Weekly pattern analysis completed for ${agent.name}`);
        } catch (error) {
          logger.error(`Weekly analysis failed for ${agent.name}:`, error);
        }
      }

    } catch (error) {
      logger.error('Failed to analyze weekly patterns:', error);
      throw error;
    }
  }

  async testPromptOptimizations() {
    try {
      // This would implement A/B testing for prompt optimizations
      logger.info('Prompt optimization testing would be implemented here');
      
      // For now, just run optimization analysis
      const results = await this.optimizer.runWeeklyOptimization();
      logger.info(`Weekly optimization completed with ${results.length} results`);

    } catch (error) {
      logger.error('Failed to test prompt optimizations:', error);
      throw error;
    }
  }

  async updateKnowledgeBase() {
    try {
      // Find new successful patterns from this week
      const newPatterns = await CodePattern.find({
        createdAt: {
          $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        },
        'success_metrics.success_rate': { $gte: 0.8 },
        'success_metrics.usage_count': { $gte: 3 }
      });

      logger.info(`Found ${newPatterns.length} new successful patterns this week`);

      // Update pattern relationships based on co-usage
      for (const pattern of newPatterns) {
        // Find related patterns (simplified implementation)
        const relatedPatterns = await CodePattern.find({
          _id: { $ne: pattern._id },
          category: pattern.category,
          language: pattern.language,
          'success_metrics.success_rate': { $gte: 0.7 }
        }).limit(5);

        // Update related patterns
        await CodePattern.updateOne(
          { _id: pattern._id },
          { 
            related_patterns: relatedPatterns.map(p => p.pattern_id),
            updatedAt: new Date()
          }
        );
      }

    } catch (error) {
      logger.error('Failed to update knowledge base:', error);
      throw error;
    }
  }

  async generateWeeklyReport() {
    try {
      const report = await this.optimizer.generateMonthlyReport();
      
      // Here you would typically:
      // 1. Save the report to a file or database
      // 2. Send notifications to stakeholders
      // 3. Update dashboards
      
      logger.info('Weekly report generated successfully');
      return report;

    } catch (error) {
      logger.error('Failed to generate weekly report:', error);
      throw error;
    }
  }

  async runMonthlyCleanup() {
    try {
      logger.info('Starting monthly cleanup...');

      // Clean up old metrics (keep last 6 months)
      await this.cleanupOldMetrics();

      // Archive old feedback (keep last 1 year)
      await this.archiveOldFeedback();

      // Clean up unused patterns
      await this.cleanupUnusedPatterns();

      // Optimize database
      await this.optimizeDatabase();

      logger.info('Monthly cleanup completed successfully');

    } catch (error) {
      logger.error('Monthly cleanup failed:', error);
      throw error;
    }
  }

  async cleanupOldMetrics() {
    try {
      const client = await pgPool.connect();

      const result = await client.query(`
        DELETE FROM performance_metrics
        WHERE measured_at < NOW() - INTERVAL '6 months'
      `);

      client.release();

      logger.info(`Cleaned up ${result.rowCount} old performance metrics`);

    } catch (error) {
      logger.error('Failed to cleanup old metrics:', error);
      throw error;
    }
  }

  async archiveOldFeedback() {
    try {
      const client = await pgPool.connect();

      // First, count what we'll archive
      const countResult = await client.query(`
        SELECT COUNT(*) FROM feedback
        WHERE created_at < NOW() - INTERVAL '1 year'
      `);

      // For now, just delete (in production, you'd move to archive table)
      const result = await client.query(`
        DELETE FROM feedback
        WHERE created_at < NOW() - INTERVAL '1 year'
      `);

      client.release();

      logger.info(`Archived ${result.rowCount} old feedback records`);

    } catch (error) {
      logger.error('Failed to archive old feedback:', error);
      throw error;
    }
  }

  async cleanupUnusedPatterns() {
    try {
      // Mark patterns as deprecated if they haven't been used in 3 months
      const result = await CodePattern.updateMany(
        {
          'success_metrics.usage_count': 0,
          updatedAt: { $lt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
          status: 'active'
        },
        {
          status: 'deprecated',
          updatedAt: new Date()
        }
      );

      logger.info(`Deprecated ${result.modifiedCount} unused patterns`);

    } catch (error) {
      logger.error('Failed to cleanup unused patterns:', error);
      throw error;
    }
  }

  async optimizeDatabase() {
    try {
      const client = await pgPool.connect();

      // Run VACUUM ANALYZE on main tables
      await client.query('VACUUM ANALYZE feedback');
      await client.query('VACUUM ANALYZE performance_metrics');
      await client.query('VACUUM ANALYZE agents');
      await client.query('VACUUM ANALYZE prompt_versions');

      client.release();

      logger.info('Database optimization completed');

    } catch (error) {
      logger.error('Failed to optimize database:', error);
      throw error;
    }
  }
}

// Export functions for cron jobs
const scheduledTasks = new ScheduledTasks();

module.exports = {
  runDailyAnalysis: () => scheduledTasks.runDailyAnalysis(),
  runWeeklyAnalysis: () => scheduledTasks.runWeeklyAnalysis(),
  runMonthlyCleanup: () => scheduledTasks.runMonthlyCleanup(),
  ScheduledTasks
};
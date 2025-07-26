const express = require('express');
const { pgPool } = require('../config/database');
const CodePattern = require('../models/CodePattern');
const PatternAnalysis = require('../models/PatternAnalysis');
const logger = require('../utils/logger');

const router = express.Router();

// GET /api/analytics/dashboard - Get dashboard data
router.get('/dashboard', async (req, res) => {
  try {
    const client = await pgPool.connect();
    
    // Get basic stats
    const statsResult = await client.query(`
      SELECT 
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_agents,
        AVG(CASE WHEN f.quality_score IS NOT NULL THEN f.quality_score END) as avg_quality_score
      FROM agents a
      LEFT JOIN feedback f ON a.id = f.agent_id 
      AND f.created_at >= NOW() - INTERVAL '30 days'
    `);

    // Get total patterns
    const patternCount = await CodePattern.countDocuments({ status: 'active' });

    // Get total feedback
    const feedbackResult = await client.query(`
      SELECT COUNT(*) as total_feedback
      FROM feedback
      WHERE created_at >= NOW() - INTERVAL '30 days'
    `);

    // Get quality trends (last 7 days)
    const qualityTrendsResult = await client.query(`
      SELECT 
        DATE(created_at) as date,
        AVG(quality_score) as avg_quality
      FROM feedback
      WHERE created_at >= NOW() - INTERVAL '7 days'
      GROUP BY DATE(created_at)
      ORDER BY date
    `);

    // Get agent performance
    const agentPerformanceResult = await client.query(`
      SELECT 
        a.name,
        AVG(f.quality_score) as avg_quality,
        COUNT(f.id) as feedback_count
      FROM agents a
      LEFT JOIN feedback f ON a.id = f.agent_id
      AND f.created_at >= NOW() - INTERVAL '30 days'
      WHERE a.status = 'active'
      GROUP BY a.id, a.name
      ORDER BY avg_quality DESC NULLS LAST
      LIMIT 10
    `);

    // Get pattern usage by category
    const patternUsage = await CodePattern.aggregate([
      { $match: { status: 'active' } },
      { 
        $group: { 
          _id: '$category', 
          count: { $sum: 1 },
          total_usage: { $sum: '$success_metrics.usage_count' }
        } 
      },
      { $sort: { total_usage: -1 } }
    ]);

    // Get recent activity
    const recentActivityResult = await client.query(`
      SELECT 
        'Feedback submitted for ' || a.name as description,
        f.created_at as timestamp
      FROM feedback f
      JOIN agents a ON f.agent_id = a.id
      WHERE f.created_at >= NOW() - INTERVAL '24 hours'
      
      UNION ALL
      
      SELECT 
        'New version created for ' || a.name as description,
        pv.created_at as timestamp
      FROM prompt_versions pv
      JOIN agents a ON pv.agent_id = a.id
      WHERE pv.created_at >= NOW() - INTERVAL '24 hours'
      
      ORDER BY timestamp DESC
      LIMIT 10
    `);

    client.release();

    const stats = statsResult.rows[0];

    res.json({
      active_agents: parseInt(stats.active_agents) || 0,
      total_patterns: patternCount,
      total_feedback: parseInt(feedbackResult.rows[0].total_feedback) || 0,
      avg_quality_score: parseFloat(stats.avg_quality_score) || 0,
      quality_trends: {
        labels: qualityTrendsResult.rows.map(row => row.date),
        data: qualityTrendsResult.rows.map(row => parseFloat(row.avg_quality))
      },
      agent_performance: {
        labels: agentPerformanceResult.rows.map(row => row.name),
        data: agentPerformanceResult.rows.map(row => parseFloat(row.avg_quality) || 0)
      },
      pattern_usage: patternUsage.map(item => item.total_usage || 0),
      recent_activity: recentActivityResult.rows.map(row => ({
        description: row.description,
        timestamp: new Date(row.timestamp).toLocaleString()
      }))
    });

  } catch (error) {
    logger.error('Failed to get dashboard analytics:', error);
    res.status(500).json({ error: 'Failed to retrieve analytics data' });
  }
});

// GET /api/analytics/agents/:agentName - Get agent-specific analytics
router.get('/agents/:agentName', async (req, res) => {
  try {
    const { agentName } = req.params;
    const { days = 30 } = req.query;

    const client = await pgPool.connect();

    // Quality trend over time
    const qualityTrendResult = await client.query(`
      SELECT 
        DATE(f.created_at) as date,
        AVG(f.quality_score) as avg_quality,
        AVG(f.user_satisfaction) as avg_satisfaction,
        AVG(f.time_to_completion) as avg_time
      FROM feedback f
      JOIN agents a ON f.agent_id = a.id
      WHERE a.name = $1
      AND f.created_at >= NOW() - INTERVAL '${days} days'
      GROUP BY DATE(f.created_at)
      ORDER BY date
    `, [agentName]);

    // Version performance comparison
    const versionPerformanceResult = await client.query(`
      SELECT 
        pv.version,
        AVG(f.quality_score) as avg_quality,
        COUNT(f.id) as feedback_count,
        AVG(f.time_to_completion) as avg_time
      FROM prompt_versions pv
      LEFT JOIN feedback f ON f.agent_id = pv.agent_id AND f.version = pv.version
      JOIN agents a ON pv.agent_id = a.id
      WHERE a.name = $1
      AND pv.created_at >= NOW() - INTERVAL '${days} days'
      GROUP BY pv.version, pv.created_at
      ORDER BY pv.created_at DESC
      LIMIT 10
    `, [agentName]);

    // Feedback distribution
    const feedbackDistributionResult = await client.query(`
      SELECT 
        CASE 
          WHEN quality_score >= 9 THEN 'Excellent (9-10)'
          WHEN quality_score >= 7 THEN 'Good (7-8)'
          WHEN quality_score >= 5 THEN 'Average (5-6)'
          ELSE 'Poor (1-4)'
        END as quality_range,
        COUNT(*) as count
      FROM feedback f
      JOIN agents a ON f.agent_id = a.id
      WHERE a.name = $1
      AND f.created_at >= NOW() - INTERVAL '${days} days'
      GROUP BY quality_range
      ORDER BY MIN(quality_score) DESC
    `, [agentName]);

    // Common correction patterns
    const correctionPatternsResult = await client.query(`
      SELECT 
        unnest(corrections_needed) as correction,
        COUNT(*) as frequency
      FROM feedback f
      JOIN agents a ON f.agent_id = a.id
      WHERE a.name = $1
      AND f.created_at >= NOW() - INTERVAL '${days} days'
      AND corrections_needed IS NOT NULL
      GROUP BY unnest(corrections_needed)
      ORDER BY frequency DESC
      LIMIT 10
    `, [agentName]);

    client.release();

    res.json({
      agent_name: agentName,
      quality_trend: qualityTrendResult.rows,
      version_performance: versionPerformanceResult.rows,
      feedback_distribution: feedbackDistributionResult.rows,
      correction_patterns: correctionPatternsResult.rows
    });

  } catch (error) {
    logger.error('Failed to get agent analytics:', error);
    res.status(500).json({ error: 'Failed to retrieve agent analytics' });
  }
});

// GET /api/analytics/patterns - Get pattern analytics
router.get('/patterns', async (req, res) => {
  try {
    // Category distribution
    const categoryStats = await CodePattern.aggregate([
      { $match: { status: 'active' } },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          avg_success_rate: { $avg: '$success_metrics.success_rate' },
          total_usage: { $sum: '$success_metrics.usage_count' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Language distribution
    const languageStats = await CodePattern.aggregate([
      { $match: { status: 'active' } },
      {
        $group: {
          _id: '$language',
          count: { $sum: 1 },
          avg_success_rate: { $avg: '$success_metrics.success_rate' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Top performing patterns
    const topPatterns = await CodePattern.find({ status: 'active' })
      .sort({ 'success_metrics.success_rate': -1, 'success_metrics.usage_count': -1 })
      .limit(10)
      .select('name category success_metrics quality_indicators');

    // Usage trends over time
    const usageTrends = await PatternAnalysis.aggregate([
      {
        $match: {
          analysis_date: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$analysis_date' } },
            category: '$pattern_categories'
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.date': 1 } }
    ]);

    res.json({
      category_stats: categoryStats,
      language_stats: languageStats,
      top_patterns: topPatterns,
      usage_trends: usageTrends
    });

  } catch (error) {
    logger.error('Failed to get pattern analytics:', error);
    res.status(500).json({ error: 'Failed to retrieve pattern analytics' });
  }
});

// GET /api/analytics/performance - Get system performance analytics
router.get('/performance', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const client = await pgPool.connect();

    // System-wide metrics
    const systemMetricsResult = await client.query(`
      SELECT 
        COUNT(DISTINCT a.id) as total_agents,
        COUNT(f.id) as total_feedback,
        AVG(f.quality_score) as avg_quality,
        AVG(f.user_satisfaction) as avg_satisfaction,
        AVG(f.time_to_completion) as avg_completion_time
      FROM agents a
      LEFT JOIN feedback f ON a.id = f.agent_id
      AND f.created_at >= NOW() - INTERVAL '${days} days'
      WHERE a.status = 'active'
    `);

    // Performance trends
    const performanceTrendsResult = await client.query(`
      SELECT 
        DATE(created_at) as date,
        AVG(quality_score) as avg_quality,
        AVG(user_satisfaction) as avg_satisfaction,
        AVG(time_to_completion) as avg_time,
        COUNT(*) as feedback_count
      FROM feedback
      WHERE created_at >= NOW() - INTERVAL '${days} days'
      GROUP BY DATE(created_at)
      ORDER BY date
    `);

    // Agent performance comparison
    const agentComparisonResult = await client.query(`
      SELECT 
        a.name,
        a.category,
        COUNT(f.id) as feedback_count,
        AVG(f.quality_score) as avg_quality,
        AVG(f.user_satisfaction) as avg_satisfaction,
        AVG(f.time_to_completion) as avg_time
      FROM agents a
      LEFT JOIN feedback f ON a.id = f.agent_id
      AND f.created_at >= NOW() - INTERVAL '${days} days'
      WHERE a.status = 'active'
      GROUP BY a.id, a.name, a.category
      ORDER BY avg_quality DESC NULLS LAST
    `);

    // Improvement suggestions status
    const improvementsResult = await client.query(`
      SELECT 
        suggestion_type,
        status,
        COUNT(*) as count,
        AVG(impact_score) as avg_impact
      FROM optimization_suggestions
      WHERE created_at >= NOW() - INTERVAL '${days} days'
      GROUP BY suggestion_type, status
      ORDER BY suggestion_type, status
    `);

    client.release();

    res.json({
      system_metrics: systemMetricsResult.rows[0],
      performance_trends: performanceTrendsResult.rows,
      agent_comparison: agentComparisonResult.rows,
      improvement_suggestions: improvementsResult.rows
    });

  } catch (error) {
    logger.error('Failed to get performance analytics:', error);
    res.status(500).json({ error: 'Failed to retrieve performance analytics' });
  }
});

// POST /api/analytics/export - Export analytics data
router.post('/export', async (req, res) => {
  try {
    const { type, format = 'json', filters = {} } = req.body;
    
    let data;
    
    switch (type) {
      case 'dashboard':
        data = await getDashboardData(filters);
        break;
      case 'agents':
        data = await getAgentAnalytics(filters);
        break;
      case 'patterns':
        data = await getPatternAnalytics(filters);
        break;
      case 'performance':
        data = await getPerformanceAnalytics(filters);
        break;
      default:
        return res.status(400).json({ error: 'Invalid export type' });
    }

    if (format === 'csv') {
      // Convert to CSV format
      const csv = convertToCSV(data);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${type}_analytics.csv"`);
      res.send(csv);
    } else {
      res.json({
        type,
        exported_at: new Date().toISOString(),
        data
      });
    }

  } catch (error) {
    logger.error('Failed to export analytics:', error);
    res.status(500).json({ error: 'Failed to export analytics data' });
  }
});

// Helper functions
async function getDashboardData(filters) {
  // Implementation would mirror the dashboard endpoint
  return {};
}

async function getAgentAnalytics(filters) {
  // Implementation would get all agent analytics
  return {};
}

async function getPatternAnalytics(filters) {
  // Implementation would get pattern analytics
  return {};
}

async function getPerformanceAnalytics(filters) {
  // Implementation would get performance analytics
  return {};
}

function convertToCSV(data) {
  // Simple CSV conversion - would need proper implementation
  if (Array.isArray(data) && data.length > 0) {
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => row[header]).join(','))
    ].join('\n');
    return csvContent;
  }
  return '';
}

module.exports = router;
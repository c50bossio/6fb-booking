const express = require('express');
const Joi = require('joi');
const AgentOptimizer = require('../services/AgentOptimizer');
const logger = require('../utils/logger');

const router = express.Router();

const optimizer = new AgentOptimizer();

const suggestSchema = Joi.object({
  agent_name: Joi.string().required(),
  target_metric: Joi.string().valid('quality', 'speed', 'cost', 'satisfaction'),
  timeframe: Joi.string().default('30 days')
});

const predictSchema = Joi.object({
  agent_name: Joi.string().required(),
  proposed_changes: Joi.array().items(Joi.object({
    type: Joi.string().required(),
    description: Joi.string().required(),
    impact: Joi.number()
  })).required()
});

// POST /api/optimization/suggest - Get optimization suggestions
router.post('/suggest', async (req, res) => {
  try {
    const { error, value } = suggestSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { agent_name, target_metric, timeframe } = value;

    let result;
    if (target_metric) {
      result = await optimizer.optimizeForMetric(agent_name, target_metric);
    } else {
      result = await optimizer.suggestPromptImprovements(agent_name);
    }

    logger.info(`Generated optimization suggestions for ${agent_name}`);
    res.json(result);

  } catch (error) {
    logger.error('Failed to generate optimization suggestions:', error);
    res.status(500).json({ error: 'Failed to generate suggestions' });
  }
});

// POST /api/optimization/predict - Predict performance impact
router.post('/predict', async (req, res) => {
  try {
    const { error, value } = predictSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { agent_name, proposed_changes } = value;

    const prediction = await optimizer.predictPerformanceImpact(agent_name, proposed_changes);

    res.json(prediction);

  } catch (error) {
    logger.error('Failed to predict performance impact:', error);
    res.status(500).json({ error: 'Failed to predict impact' });
  }
});

// GET /api/optimization/failures/:agentName - Analyze failure patterns
router.get('/failures/:agentName', async (req, res) => {
  try {
    const { agentName } = req.params;
    const { timeframe = '30 days' } = req.query;

    const analysis = await optimizer.analyzeFailurePatterns(agentName, timeframe);

    res.json({
      agent_name: agentName,
      timeframe,
      ...analysis
    });

  } catch (error) {
    logger.error('Failed to analyze failure patterns:', error);
    res.status(500).json({ error: 'Failed to analyze patterns' });
  }
});

// GET /api/optimization/failures - Analyze all agents' failure patterns
router.get('/failures', async (req, res) => {
  try {
    const { timeframe = '30 days' } = req.query;

    const analysis = await optimizer.analyzeFailurePatterns(null, timeframe);

    res.json({
      timeframe,
      system_wide: true,
      ...analysis
    });

  } catch (error) {
    logger.error('Failed to analyze system failure patterns:', error);
    res.status(500).json({ error: 'Failed to analyze patterns' });
  }
});

// POST /api/optimization/apply - Apply optimization suggestions
router.post('/apply', async (req, res) => {
  try {
    const { agent_name, optimization_id, auto_apply = false } = req.body;

    if (!agent_name) {
      return res.status(400).json({ error: 'agent_name is required' });
    }

    // Get optimization suggestions
    const suggestions = await optimizer.suggestPromptImprovements(agent_name);

    if (auto_apply && suggestions.confidence_score > 0.8) {
      // Auto-apply if confidence is high
      const { getVersionControl } = require('../services/PromptVersionControl');
      const versionControl = getVersionControl();
      
      if (!versionControl) {
        return res.status(503).json({ error: 'Version control not available' });
      }

      const result = await versionControl.createVersion(
        agent_name,
        suggestions.suggested_prompt,
        'Auto-applied optimization suggestions',
        { 
          versionType: 'minor',
          auto_generated: true,
          confidence_score: suggestions.confidence_score,
          applied_by: req.user?.id || 'api'
        }
      );

      logger.info(`Auto-applied optimization for ${agent_name}`);
      res.json({
        applied: true,
        version: result.version,
        confidence_score: suggestions.confidence_score
      });

    } else {
      // Return suggestions for manual review
      res.json({
        applied: false,
        suggestions,
        reason: suggestions.confidence_score <= 0.8 ? 'Low confidence score' : 'Manual application required'
      });
    }

  } catch (error) {
    logger.error('Failed to apply optimization:', error);
    res.status(500).json({ error: 'Failed to apply optimization' });
  }
});

// GET /api/optimization/reports/monthly - Get monthly optimization report
router.get('/reports/monthly', async (req, res) => {
  try {
    const report = await optimizer.generateMonthlyReport();
    
    res.json(report);

  } catch (error) {
    logger.error('Failed to generate monthly report:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

// POST /api/optimization/reports/monthly - Generate and save monthly report
router.post('/reports/monthly', async (req, res) => {
  try {
    const report = await optimizer.generateMonthlyReport();
    
    // Here you could save the report to a file or database
    // For now, we'll just return it
    
    logger.info('Generated monthly optimization report');
    res.json({
      generated: true,
      report_id: `monthly_${new Date().toISOString().slice(0, 7)}`,
      report
    });

  } catch (error) {
    logger.error('Failed to generate monthly report:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

// POST /api/optimization/weekly-run - Trigger weekly optimization
router.post('/weekly-run', async (req, res) => {
  try {
    const results = await optimizer.runWeeklyOptimization();
    
    logger.info('Weekly optimization run completed');
    res.json({
      completed: true,
      timestamp: new Date().toISOString(),
      results
    });

  } catch (error) {
    logger.error('Failed to run weekly optimization:', error);
    res.status(500).json({ error: 'Failed to run optimization' });
  }
});

// GET /api/optimization/status - Get optimization system status
router.get('/status', async (req, res) => {
  try {
    const { pgPool } = require('../config/database');
    const client = await pgPool.connect();

    // Get recent optimization activity
    const recentOptimizations = await client.query(`
      SELECT 
        COUNT(*) as total_suggestions,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'implemented' THEN 1 END) as implemented,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as recent
      FROM optimization_suggestions
    `);

    // Get agent optimization needs
    const agentsNeedingOptimization = await client.query(`
      SELECT 
        a.name,
        AVG(f.quality_score) as avg_quality,
        COUNT(f.id) as feedback_count
      FROM agents a
      LEFT JOIN feedback f ON a.id = f.agent_id
      AND f.created_at >= NOW() - INTERVAL '7 days'
      WHERE a.status = 'active'
      GROUP BY a.id, a.name
      HAVING AVG(f.quality_score) < 7.5 OR COUNT(f.id) > 10
      ORDER BY avg_quality ASC NULLS LAST
    `);

    client.release();

    res.json({
      system_status: 'active',
      optimization_stats: recentOptimizations.rows[0],
      agents_needing_optimization: agentsNeedingOptimization.rows,
      last_weekly_run: new Date().toISOString(), // Would track actual last run
      classifier_status: 'trained'
    });

  } catch (error) {
    logger.error('Failed to get optimization status:', error);
    res.status(500).json({ error: 'Failed to get status' });
  }
});

module.exports = router;
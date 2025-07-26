const express = require('express');
const Joi = require('joi');
const FeedbackProcessor = require('../services/FeedbackProcessor');
const logger = require('../utils/logger');

const router = express.Router();

const feedbackSchema = Joi.object({
  agent_name: Joi.string().required(),
  project_id: Joi.string().required(),
  corrections_needed: Joi.array().items(Joi.string()),
  missing_capabilities: Joi.array().items(Joi.string()),
  successful_patterns: Joi.array().items(Joi.string()),
  time_to_completion: Joi.number().min(0),
  quality_score: Joi.number().min(1).max(10).required(),
  cost_score: Joi.number().min(1).max(10),
  user_satisfaction: Joi.number().min(1).max(10).required(),
  notes: Joi.string().max(2000)
});

const feedbackProcessor = new FeedbackProcessor();

// POST /api/feedback - Submit feedback for an agent
router.post('/', async (req, res) => {
  try {
    const { error, value } = feedbackSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { agent_name, project_id, ...feedbackData } = value;
    const userId = req.user?.id || req.ip;

    const result = await feedbackProcessor.collectFeedback(
      project_id,
      agent_name,
      feedbackData,
      userId
    );

    logger.info(`Feedback submitted for ${agent_name}, project ${project_id}`);
    res.status(201).json(result);

  } catch (error) {
    logger.error('Failed to submit feedback:', error);
    res.status(500).json({ error: 'Failed to submit feedback' });
  }
});

// GET /api/feedback/:agentName - Get feedback for specific agent
router.get('/:agentName', async (req, res) => {
  try {
    const { agentName } = req.params;
    const { 
      page = 1, 
      limit = 20, 
      quality_min, 
      quality_max,
      days = 30 
    } = req.query;

    const { pgPool } = require('../config/database');
    const client = await pgPool.connect();

    let query = `
      SELECT f.*, a.name as agent_name
      FROM feedback f
      JOIN agents a ON f.agent_id = a.id
      WHERE a.name = $1
      AND f.created_at >= NOW() - INTERVAL '${days} days'
    `;
    const params = [agentName];

    if (quality_min) {
      query += ` AND f.quality_score >= $${params.length + 1}`;
      params.push(quality_min);
    }

    if (quality_max) {
      query += ` AND f.quality_score <= $${params.length + 1}`;
      params.push(quality_max);
    }

    query += ` ORDER BY f.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, (page - 1) * limit);

    const result = await client.query(query, params);

    // Get total count
    let countQuery = `
      SELECT COUNT(*)
      FROM feedback f
      JOIN agents a ON f.agent_id = a.id
      WHERE a.name = $1
      AND f.created_at >= NOW() - INTERVAL '${days} days'
    `;
    const countParams = [agentName];

    if (quality_min) {
      countQuery += ` AND f.quality_score >= $${countParams.length + 1}`;
      countParams.push(quality_min);
    }

    if (quality_max) {
      countQuery += ` AND f.quality_score <= $${countParams.length + 1}`;
      countParams.push(quality_max);
    }

    const countResult = await client.query(countQuery, countParams);
    client.release();

    res.json({
      feedback: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].count),
        pages: Math.ceil(countResult.rows[0].count / limit)
      }
    });

  } catch (error) {
    logger.error('Failed to get feedback:', error);
    res.status(500).json({ error: 'Failed to retrieve feedback' });
  }
});

// GET /api/feedback/:agentName/summary - Get feedback summary and trends
router.get('/:agentName/summary', async (req, res) => {
  try {
    const { agentName } = req.params;
    const { days = 30 } = req.query;

    const { pgPool } = require('../config/database');
    const client = await pgPool.connect();

    // Get overall summary
    const summaryResult = await client.query(`
      SELECT 
        COUNT(*) as total_feedback,
        AVG(quality_score) as avg_quality,
        AVG(user_satisfaction) as avg_satisfaction,
        AVG(time_to_completion) as avg_completion_time,
        AVG(cost_score) as avg_cost_score,
        MIN(quality_score) as min_quality,
        MAX(quality_score) as max_quality,
        STDDEV(quality_score) as quality_stddev
      FROM feedback f
      JOIN agents a ON f.agent_id = a.id
      WHERE a.name = $1
      AND f.created_at >= NOW() - INTERVAL '${days} days'
    `, [agentName]);

    // Get trend data (daily averages)
    const trendResult = await client.query(`
      SELECT 
        DATE(f.created_at) as date,
        AVG(quality_score) as avg_quality,
        AVG(user_satisfaction) as avg_satisfaction,
        AVG(time_to_completion) as avg_completion_time,
        COUNT(*) as feedback_count
      FROM feedback f
      JOIN agents a ON f.agent_id = a.id
      WHERE a.name = $1
      AND f.created_at >= NOW() - INTERVAL '${days} days'
      GROUP BY DATE(f.created_at)
      ORDER BY date
    `, [agentName]);

    // Get most common corrections
    const correctionsResult = await client.query(`
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

    // Get most common missing capabilities
    const missingResult = await client.query(`
      SELECT 
        unnest(missing_capabilities) as capability,
        COUNT(*) as frequency
      FROM feedback f
      JOIN agents a ON f.agent_id = a.id
      WHERE a.name = $1
      AND f.created_at >= NOW() - INTERVAL '${days} days'
      AND missing_capabilities IS NOT NULL
      GROUP BY unnest(missing_capabilities)
      ORDER BY frequency DESC
      LIMIT 10
    `, [agentName]);

    client.release();

    res.json({
      summary: summaryResult.rows[0],
      trends: trendResult.rows,
      common_corrections: correctionsResult.rows,
      missing_capabilities: missingResult.rows
    });

  } catch (error) {
    logger.error('Failed to get feedback summary:', error);
    res.status(500).json({ error: 'Failed to retrieve feedback summary' });
  }
});

// POST /api/feedback/:agentName/analyze - Trigger pattern analysis
router.post('/:agentName/analyze', async (req, res) => {
  try {
    const { agentName } = req.params;
    const { timeframe = '30 days' } = req.body;

    const improvements = await feedbackProcessor.generateImprovements(agentName, timeframe);
    
    logger.info(`Generated improvements for ${agentName}`);
    res.json(improvements);

  } catch (error) {
    logger.error('Failed to analyze feedback:', error);
    res.status(500).json({ error: 'Failed to analyze feedback' });
  }
});

module.exports = router;
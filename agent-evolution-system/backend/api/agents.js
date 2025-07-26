const express = require('express');
const Joi = require('joi');
const { pgPool } = require('../config/database');
const { getVersionControl } = require('../services/PromptVersionControl');
const logger = require('../utils/logger');

const router = express.Router();

// Validation schemas
const createAgentSchema = Joi.object({
  name: Joi.string().required().min(1).max(255),
  description: Joi.string().max(1000),
  category: Joi.string().max(100),
  tags: Joi.array().items(Joi.string())
});

const updatePromptSchema = Joi.object({
  content: Joi.string().required(),
  changelog: Joi.string(),
  versionType: Joi.string().valid('major', 'minor', 'patch').default('patch'),
  metadata: Joi.object()
});

// GET /api/agents - List all agents
router.get('/', async (req, res) => {
  try {
    const { category, status = 'active', page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT a.*, 
             COUNT(pv.id) as version_count,
             MAX(pv.created_at) as last_updated
      FROM agents a
      LEFT JOIN prompt_versions pv ON a.id = pv.agent_id
      WHERE a.status = $1
    `;
    const params = [status];

    if (category) {
      query += ` AND a.category = $${params.length + 1}`;
      params.push(category);
    }

    query += `
      GROUP BY a.id
      ORDER BY a.updated_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    params.push(limit, offset);

    const client = await pgPool.connect();
    const result = await client.query(query, params);
    
    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM agents WHERE status = $1';
    const countParams = [status];
    
    if (category) {
      countQuery += ' AND category = $2';
      countParams.push(category);
    }
    
    const countResult = await client.query(countQuery, countParams);
    client.release();

    res.json({
      agents: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].count),
        pages: Math.ceil(countResult.rows[0].count / limit)
      }
    });

  } catch (error) {
    logger.error('Failed to list agents:', error);
    res.status(500).json({ error: 'Failed to retrieve agents' });
  }
});

// GET /api/agents/:name - Get specific agent details
router.get('/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const client = await pgPool.connect();

    // Get agent details with current prompt
    const agentResult = await client.query(`
      SELECT a.*, pv.content as current_prompt, pv.created_at as prompt_updated
      FROM agents a
      LEFT JOIN prompt_versions pv ON a.id = pv.agent_id AND pv.is_active = true
      WHERE a.name = $1
    `, [name]);

    if (agentResult.rows.length === 0) {
      client.release();
      return res.status(404).json({ error: 'Agent not found' });
    }

    const agent = agentResult.rows[0];

    // Get recent performance metrics
    const metricsResult = await client.query(`
      SELECT metric_type, AVG(metric_value) as avg_value, COUNT(*) as data_points
      FROM performance_metrics
      WHERE agent_id = $1 AND measured_at >= NOW() - INTERVAL '30 days'
      GROUP BY metric_type
      ORDER BY metric_type
    `, [agent.id]);

    // Get recent feedback summary
    const feedbackResult = await client.query(`
      SELECT 
        COUNT(*) as total_feedback,
        AVG(quality_score) as avg_quality,
        AVG(user_satisfaction) as avg_satisfaction,
        AVG(time_to_completion) as avg_completion_time
      FROM feedback
      WHERE agent_id = $1 AND created_at >= NOW() - INTERVAL '30 days'
    `, [agent.id]);

    client.release();

    res.json({
      ...agent,
      metrics: metricsResult.rows,
      feedback_summary: feedbackResult.rows[0]
    });

  } catch (error) {
    logger.error('Failed to get agent details:', error);
    res.status(500).json({ error: 'Failed to retrieve agent details' });
  }
});

// POST /api/agents - Create new agent
router.post('/', async (req, res) => {
  try {
    const { error, value } = createAgentSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { name, description, category, tags } = value;
    const client = await pgPool.connect();

    // Check if agent already exists
    const existingAgent = await client.query(
      'SELECT id FROM agents WHERE name = $1',
      [name]
    );

    if (existingAgent.rows.length > 0) {
      client.release();
      return res.status(409).json({ error: 'Agent with this name already exists' });
    }

    // Create agent
    const result = await client.query(`
      INSERT INTO agents (name, description, category, tags)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [name, description || '', category || 'general', tags || []]);

    client.release();

    logger.info(`Created new agent: ${name}`);
    res.status(201).json(result.rows[0]);

  } catch (error) {
    logger.error('Failed to create agent:', error);
    res.status(500).json({ error: 'Failed to create agent' });
  }
});

// PUT /api/agents/:name/prompt - Update agent prompt
router.put('/:name/prompt', async (req, res) => {
  try {
    const { error, value } = updatePromptSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { name } = req.params;
    const { content, changelog, versionType, metadata } = value;

    const versionControl = getVersionControl();
    if (!versionControl) {
      return res.status(503).json({ error: 'Version control system not available' });
    }

    // Create new version
    const result = await versionControl.createVersion(
      name,
      content,
      changelog || 'Prompt update via API',
      { versionType, ...metadata, created_by: req.user?.id || 'api' }
    );

    logger.info(`Updated prompt for agent ${name} to version ${result.version}`);
    res.json(result);

  } catch (error) {
    logger.error('Failed to update prompt:', error);
    res.status(500).json({ error: 'Failed to update prompt' });
  }
});

// GET /api/agents/:name/versions - Get version history
router.get('/:name/versions', async (req, res) => {
  try {
    const { name } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const versionControl = getVersionControl();
    if (!versionControl) {
      return res.status(503).json({ error: 'Version control system not available' });
    }

    const versions = await versionControl.getVersionHistory(name);
    
    // Paginate results
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedVersions = versions.slice(startIndex, endIndex);

    res.json({
      versions: paginatedVersions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: versions.length,
        pages: Math.ceil(versions.length / limit)
      }
    });

  } catch (error) {
    logger.error('Failed to get version history:', error);
    res.status(500).json({ error: 'Failed to retrieve version history' });
  }
});

// POST /api/agents/:name/rollback - Rollback to specific version
router.post('/:name/rollback', async (req, res) => {
  try {
    const { name } = req.params;
    const { version } = req.body;

    if (!version) {
      return res.status(400).json({ error: 'Version is required' });
    }

    const versionControl = getVersionControl();
    if (!versionControl) {
      return res.status(503).json({ error: 'Version control system not available' });
    }

    const result = await versionControl.rollback(name, version);
    
    logger.info(`Rolled back agent ${name} to version ${version}`);
    res.json(result);

  } catch (error) {
    logger.error('Failed to rollback:', error);
    res.status(500).json({ error: 'Failed to rollback agent' });
  }
});

// POST /api/agents/:name/ab-test - Start A/B test
router.post('/:name/ab-test', async (req, res) => {
  try {
    const { name } = req.params;
    const { versionA, versionB, criteria } = req.body;

    if (!versionA || !versionB || !criteria) {
      return res.status(400).json({ 
        error: 'versionA, versionB, and criteria are required' 
      });
    }

    const versionControl = getVersionControl();
    if (!versionControl) {
      return res.status(503).json({ error: 'Version control system not available' });
    }

    const result = await versionControl.runABTest(name, versionA, versionB, criteria);
    
    logger.info(`Started A/B test for ${name}: ${versionA} vs ${versionB}`);
    res.json(result);

  } catch (error) {
    logger.error('Failed to start A/B test:', error);
    res.status(500).json({ error: 'Failed to start A/B test' });
  }
});

// GET /api/agents/:name/metrics - Get performance metrics
router.get('/:name/metrics', async (req, res) => {
  try {
    const { name } = req.params;
    const { version, days = 30, metric_type } = req.query;

    const versionControl = getVersionControl();
    if (!versionControl) {
      return res.status(503).json({ error: 'Version control system not available' });
    }

    let metrics = await versionControl.getPerformanceMetrics(name, version);
    
    // Filter by time range
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));
    
    metrics = metrics.filter(m => new Date(m.measured_at) >= cutoffDate);
    
    // Filter by metric type if specified
    if (metric_type) {
      metrics = metrics.filter(m => m.metric_type === metric_type);
    }

    res.json({ metrics });

  } catch (error) {
    logger.error('Failed to get metrics:', error);
    res.status(500).json({ error: 'Failed to retrieve metrics' });
  }
});

// DELETE /api/agents/:name - Deactivate agent
router.delete('/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const client = await pgPool.connect();

    const result = await client.query(`
      UPDATE agents 
      SET status = 'inactive', updated_at = CURRENT_TIMESTAMP
      WHERE name = $1
      RETURNING *
    `, [name]);

    client.release();

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    logger.info(`Deactivated agent: ${name}`);
    res.json(result.rows[0]);

  } catch (error) {
    logger.error('Failed to deactivate agent:', error);
    res.status(500).json({ error: 'Failed to deactivate agent' });
  }
});

module.exports = router;
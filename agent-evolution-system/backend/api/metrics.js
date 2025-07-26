const express = require('express');
const Joi = require('joi');
const { pgPool } = require('../config/database');
const logger = require('../utils/logger');

const router = express.Router();

const recordMetricSchema = Joi.object({
  agent_name: Joi.string().required(),
  version: Joi.string(),
  metric_type: Joi.string().required(),
  metric_value: Joi.number().required(),
  metric_unit: Joi.string(),
  context: Joi.object()
});

// POST /api/metrics - Record a performance metric
router.post('/', async (req, res) => {
  try {
    const { error, value } = recordMetricSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { agent_name, version, metric_type, metric_value, metric_unit, context } = value;

    const client = await pgPool.connect();

    // Get agent ID and current version if not provided
    const agentResult = await client.query(
      'SELECT id, current_version FROM agents WHERE name = $1',
      [agent_name]
    );

    if (agentResult.rows.length === 0) {
      client.release();
      return res.status(404).json({ error: 'Agent not found' });
    }

    const { id: agentId, current_version } = agentResult.rows[0];
    const useVersion = version || current_version;

    // Insert metric
    const result = await client.query(`
      INSERT INTO performance_metrics (
        agent_id, version, metric_type, metric_value, metric_unit, context
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [agentId, useVersion, metric_type, metric_value, metric_unit || '', JSON.stringify(context || {})]);

    client.release();

    logger.info(`Recorded metric ${metric_type} for ${agent_name}: ${metric_value}`);
    res.status(201).json(result.rows[0]);

  } catch (error) {
    logger.error('Failed to record metric:', error);
    res.status(500).json({ error: 'Failed to record metric' });
  }
});

// GET /api/metrics/:agentName - Get metrics for specific agent
router.get('/:agentName', async (req, res) => {
  try {
    const { agentName } = req.params;
    const { 
      metric_type, 
      version, 
      days = 30, 
      aggregation = 'raw',
      page = 1,
      limit = 100
    } = req.query;

    const client = await pgPool.connect();

    let query = `
      SELECT pm.*, a.name as agent_name
      FROM performance_metrics pm
      JOIN agents a ON pm.agent_id = a.id
      WHERE a.name = $1
      AND pm.measured_at >= NOW() - INTERVAL '${days} days'
    `;
    const params = [agentName];

    if (metric_type) {
      query += ` AND pm.metric_type = $${params.length + 1}`;
      params.push(metric_type);
    }

    if (version) {
      query += ` AND pm.version = $${params.length + 1}`;
      params.push(version);
    }

    if (aggregation === 'hourly') {
      query = `
        SELECT 
          metric_type,
          version,
          DATE_TRUNC('hour', measured_at) as time_bucket,
          AVG(metric_value) as avg_value,
          MIN(metric_value) as min_value,
          MAX(metric_value) as max_value,
          COUNT(*) as data_points
        FROM performance_metrics pm
        JOIN agents a ON pm.agent_id = a.id
        WHERE a.name = $1
        AND pm.measured_at >= NOW() - INTERVAL '${days} days'
      `;
      
      if (metric_type) {
        query += ` AND pm.metric_type = $${params.length + 1}`;
        params.push(metric_type);
      }

      query += `
        GROUP BY metric_type, version, DATE_TRUNC('hour', measured_at)
        ORDER BY time_bucket DESC
      `;
    } else if (aggregation === 'daily') {
      query = `
        SELECT 
          metric_type,
          version,
          DATE(measured_at) as date,
          AVG(metric_value) as avg_value,
          MIN(metric_value) as min_value,
          MAX(metric_value) as max_value,
          COUNT(*) as data_points
        FROM performance_metrics pm
        JOIN agents a ON pm.agent_id = a.id
        WHERE a.name = $1
        AND pm.measured_at >= NOW() - INTERVAL '${days} days'
      `;
      
      if (metric_type) {
        query += ` AND pm.metric_type = $${params.length + 1}`;
        params.push(metric_type);
      }

      query += `
        GROUP BY metric_type, version, DATE(measured_at)
        ORDER BY date DESC
      `;
    } else {
      query += ` ORDER BY pm.measured_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limit, (page - 1) * limit);
    }

    const result = await client.query(query, params);

    // Get total count for pagination (only for raw data)
    let totalCount = 0;
    if (aggregation === 'raw') {
      let countQuery = `
        SELECT COUNT(*)
        FROM performance_metrics pm
        JOIN agents a ON pm.agent_id = a.id
        WHERE a.name = $1
        AND pm.measured_at >= NOW() - INTERVAL '${days} days'
      `;
      const countParams = [agentName];

      if (metric_type) {
        countQuery += ` AND pm.metric_type = $${countParams.length + 1}`;
        countParams.push(metric_type);
      }

      if (version) {
        countQuery += ` AND pm.version = $${countParams.length + 1}`;
        countParams.push(version);
      }

      const countResult = await client.query(countQuery, countParams);
      totalCount = parseInt(countResult.rows[0].count);
    }

    client.release();

    const response = {
      agent_name: agentName,
      aggregation,
      metrics: result.rows
    };

    if (aggregation === 'raw') {
      response.pagination = {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        pages: Math.ceil(totalCount / limit)
      };
    }

    res.json(response);

  } catch (error) {
    logger.error('Failed to get metrics:', error);
    res.status(500).json({ error: 'Failed to retrieve metrics' });
  }
});

// GET /api/metrics/:agentName/summary - Get metrics summary
router.get('/:agentName/summary', async (req, res) => {
  try {
    const { agentName } = req.params;
    const { days = 30 } = req.query;

    const client = await pgPool.connect();

    const summaryResult = await client.query(`
      SELECT 
        metric_type,
        COUNT(*) as data_points,
        AVG(metric_value) as avg_value,
        MIN(metric_value) as min_value,
        MAX(metric_value) as max_value,
        STDDEV(metric_value) as stddev_value,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY metric_value) as median_value,
        PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY metric_value) as p95_value
      FROM performance_metrics pm
      JOIN agents a ON pm.agent_id = a.id
      WHERE a.name = $1
      AND pm.measured_at >= NOW() - INTERVAL '${days} days'
      GROUP BY metric_type
      ORDER BY metric_type
    `, [agentName]);

    // Get trends (comparing current period to previous period)
    const trendsResult = await client.query(`
      WITH current_period AS (
        SELECT 
          metric_type,
          AVG(metric_value) as avg_value
        FROM performance_metrics pm
        JOIN agents a ON pm.agent_id = a.id
        WHERE a.name = $1
        AND pm.measured_at >= NOW() - INTERVAL '${days} days'
        GROUP BY metric_type
      ),
      previous_period AS (
        SELECT 
          metric_type,
          AVG(metric_value) as avg_value
        FROM performance_metrics pm
        JOIN agents a ON pm.agent_id = a.id
        WHERE a.name = $1
        AND pm.measured_at >= NOW() - INTERVAL '${days * 2} days'
        AND pm.measured_at < NOW() - INTERVAL '${days} days'
        GROUP BY metric_type
      )
      SELECT 
        c.metric_type,
        c.avg_value as current_avg,
        p.avg_value as previous_avg,
        CASE 
          WHEN p.avg_value > 0 THEN ((c.avg_value - p.avg_value) / p.avg_value) * 100
          ELSE NULL
        END as percent_change
      FROM current_period c
      LEFT JOIN previous_period p ON c.metric_type = p.metric_type
    `, [agentName]);

    client.release();

    res.json({
      agent_name: agentName,
      period_days: parseInt(days),
      summary: summaryResult.rows,
      trends: trendsResult.rows
    });

  } catch (error) {
    logger.error('Failed to get metrics summary:', error);
    res.status(500).json({ error: 'Failed to retrieve metrics summary' });
  }
});

// GET /api/metrics/:agentName/compare - Compare metrics across versions
router.get('/:agentName/compare', async (req, res) => {
  try {
    const { agentName } = req.params;
    const { versions, metric_type, days = 30 } = req.query;

    if (!versions) {
      return res.status(400).json({ error: 'versions parameter is required' });
    }

    const versionList = versions.split(',');
    const client = await pgPool.connect();

    let query = `
      SELECT 
        version,
        metric_type,
        COUNT(*) as data_points,
        AVG(metric_value) as avg_value,
        MIN(metric_value) as min_value,
        MAX(metric_value) as max_value,
        STDDEV(metric_value) as stddev_value
      FROM performance_metrics pm
      JOIN agents a ON pm.agent_id = a.id
      WHERE a.name = $1
      AND pm.version = ANY($2)
      AND pm.measured_at >= NOW() - INTERVAL '${days} days'
    `;
    const params = [agentName, versionList];

    if (metric_type) {
      query += ` AND pm.metric_type = $${params.length + 1}`;
      params.push(metric_type);
    }

    query += `
      GROUP BY version, metric_type
      ORDER BY version, metric_type
    `;

    const result = await client.query(query, params);
    client.release();

    // Group by metric type for easier comparison
    const comparison = {};
    result.rows.forEach(row => {
      if (!comparison[row.metric_type]) {
        comparison[row.metric_type] = [];
      }
      comparison[row.metric_type].push(row);
    });

    res.json({
      agent_name: agentName,
      versions: versionList,
      metric_type: metric_type || 'all',
      comparison
    });

  } catch (error) {
    logger.error('Failed to compare metrics:', error);
    res.status(500).json({ error: 'Failed to compare metrics' });
  }
});

// DELETE /api/metrics/:agentName - Delete metrics for agent
router.delete('/:agentName', async (req, res) => {
  try {
    const { agentName } = req.params;
    const { metric_type, version, older_than_days } = req.query;

    const client = await pgPool.connect();

    let query = `
      DELETE FROM performance_metrics pm
      USING agents a
      WHERE pm.agent_id = a.id
      AND a.name = $1
    `;
    const params = [agentName];

    if (metric_type) {
      query += ` AND pm.metric_type = $${params.length + 1}`;
      params.push(metric_type);
    }

    if (version) {
      query += ` AND pm.version = $${params.length + 1}`;
      params.push(version);
    }

    if (older_than_days) {
      query += ` AND pm.measured_at < NOW() - INTERVAL '${older_than_days} days'`;
    }

    const result = await client.query(query, params);
    client.release();

    logger.info(`Deleted ${result.rowCount} metrics for ${agentName}`);
    res.json({
      deleted: result.rowCount,
      agent_name: agentName
    });

  } catch (error) {
    logger.error('Failed to delete metrics:', error);
    res.status(500).json({ error: 'Failed to delete metrics' });
  }
});

// POST /api/metrics/bulk - Record multiple metrics at once
router.post('/bulk', async (req, res) => {
  try {
    const { metrics } = req.body;

    if (!Array.isArray(metrics) || metrics.length === 0) {
      return res.status(400).json({ error: 'metrics array is required' });
    }

    const client = await pgPool.connect();
    const results = [];

    try {
      await client.query('BEGIN');

      for (const metric of metrics) {
        const { error, value } = recordMetricSchema.validate(metric);
        if (error) {
          throw new Error(`Invalid metric: ${error.details[0].message}`);
        }

        const { agent_name, version, metric_type, metric_value, metric_unit, context } = value;

        // Get agent ID
        const agentResult = await client.query(
          'SELECT id, current_version FROM agents WHERE name = $1',
          [agent_name]
        );

        if (agentResult.rows.length === 0) {
          throw new Error(`Agent not found: ${agent_name}`);
        }

        const { id: agentId, current_version } = agentResult.rows[0];
        const useVersion = version || current_version;

        // Insert metric
        const result = await client.query(`
          INSERT INTO performance_metrics (
            agent_id, version, metric_type, metric_value, metric_unit, context
          ) VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING id
        `, [agentId, useVersion, metric_type, metric_value, metric_unit || '', JSON.stringify(context || {})]);

        results.push({
          agent_name,
          metric_type,
          metric_id: result.rows[0].id
        });
      }

      await client.query('COMMIT');
      client.release();

      logger.info(`Recorded ${results.length} metrics in bulk`);
      res.status(201).json({
        recorded: results.length,
        metrics: results
      });

    } catch (error) {
      await client.query('ROLLBACK');
      client.release();
      throw error;
    }

  } catch (error) {
    logger.error('Failed to record bulk metrics:', error);
    res.status(500).json({ error: 'Failed to record bulk metrics' });
  }
});

module.exports = router;
const request = require('supertest');
const app = require('../../server');
const { pgPool } = require('../setup');

describe('Agents API', () => {
  let testAgent;

  beforeEach(async () => {
    // Create a test agent
    const client = await pgPool().connect();
    const result = await client.query(
      'INSERT INTO agents (name, description, category) VALUES ($1, $2, $3) RETURNING *',
      ['test-agent-api', 'Test agent for API testing', 'testing']
    );
    testAgent = result.rows[0];
    client.release();
  });

  describe('GET /api/agents', () => {
    it('should return list of agents', async () => {
      const response = await request(app)
        .get('/api/agents')
        .expect(200);

      expect(response.body).toHaveProperty('agents');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.agents)).toBe(true);
      expect(response.body.agents.length).toBeGreaterThan(0);
      
      const agent = response.body.agents.find(a => a.name === 'test-agent-api');
      expect(agent).toBeDefined();
      expect(agent.category).toBe('testing');
    });

    it('should filter agents by category', async () => {
      const response = await request(app)
        .get('/api/agents?category=testing')
        .expect(200);

      expect(response.body.agents.length).toBeGreaterThan(0);
      response.body.agents.forEach(agent => {
        expect(agent.category).toBe('testing');
      });
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/agents?page=1&limit=1')
        .expect(200);

      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(1);
      expect(response.body.agents.length).toBeLessThanOrEqual(1);
    });
  });

  describe('GET /api/agents/:name', () => {
    it('should return specific agent details', async () => {
      const response = await request(app)
        .get(`/api/agents/${testAgent.name}`)
        .expect(200);

      expect(response.body.name).toBe(testAgent.name);
      expect(response.body.description).toBe(testAgent.description);
      expect(response.body.category).toBe(testAgent.category);
      expect(response.body).toHaveProperty('metrics');
      expect(response.body).toHaveProperty('feedback_summary');
    });

    it('should return 404 for non-existent agent', async () => {
      const response = await request(app)
        .get('/api/agents/non-existent-agent')
        .expect(404);

      expect(response.body.error).toBe('Agent not found');
    });
  });

  describe('POST /api/agents', () => {
    it('should create a new agent', async () => {
      const newAgent = {
        name: 'new-test-agent',
        description: 'A newly created test agent',
        category: 'testing',
        tags: ['test', 'api']
      };

      const response = await request(app)
        .post('/api/agents')
        .send(newAgent)
        .expect(201);

      expect(response.body.name).toBe(newAgent.name);
      expect(response.body.description).toBe(newAgent.description);
      expect(response.body.category).toBe(newAgent.category);
      expect(response.body.tags).toEqual(newAgent.tags);
    });

    it('should validate required fields', async () => {
      const invalidAgent = {
        description: 'Agent without name'
      };

      const response = await request(app)
        .post('/api/agents')
        .send(invalidAgent)
        .expect(400);

      expect(response.body.error).toContain('name');
    });

    it('should prevent duplicate agent names', async () => {
      const duplicateAgent = {
        name: testAgent.name,
        description: 'Duplicate agent'
      };

      const response = await request(app)
        .post('/api/agents')
        .send(duplicateAgent)
        .expect(409);

      expect(response.body.error).toContain('already exists');
    });
  });

  describe('PUT /api/agents/:name/prompt', () => {
    beforeEach(async () => {
      // Mock the version control system
      jest.doMock('../../services/PromptVersionControl', () => ({
        getVersionControl: () => ({
          createVersion: jest.fn().mockResolvedValue({
            version: '1.1.0',
            agentId: testAgent.id
          })
        })
      }));
    });

    it('should update agent prompt', async () => {
      const promptUpdate = {
        content: 'You are an improved test agent with better capabilities.',
        changelog: 'Added new features and improved responses',
        versionType: 'minor'
      };

      const response = await request(app)
        .put(`/api/agents/${testAgent.name}/prompt`)
        .send(promptUpdate)
        .expect(200);

      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('agentId');
    });

    it('should validate prompt content', async () => {
      const invalidUpdate = {
        changelog: 'No content provided'
      };

      const response = await request(app)
        .put(`/api/agents/${testAgent.name}/prompt`)
        .send(invalidUpdate)
        .expect(400);

      expect(response.body.error).toContain('content');
    });
  });

  describe('GET /api/agents/:name/metrics', () => {
    beforeEach(async () => {
      // Add some test metrics
      const client = await pgPool().connect();
      await client.query(`
        INSERT INTO performance_metrics (agent_id, version, metric_type, metric_value, metric_unit)
        VALUES 
        ($1, '1.0.0', 'quality_score', 8.5, 'score'),
        ($1, '1.0.0', 'completion_time', 45, 'minutes'),
        ($1, '1.0.0', 'success_rate', 0.85, 'percentage')
      `, [testAgent.id]);
      client.release();
    });

    it('should return agent metrics', async () => {
      const response = await request(app)
        .get(`/api/agents/${testAgent.name}/metrics`)
        .expect(200);

      expect(response.body).toHaveProperty('metrics');
      expect(Array.isArray(response.body.metrics)).toBe(true);
      expect(response.body.metrics.length).toBeGreaterThan(0);
      
      const qualityMetric = response.body.metrics.find(m => m.metric_type === 'quality_score');
      expect(qualityMetric).toBeDefined();
      expect(qualityMetric.metric_value).toBe('8.5000');
    });

    it('should filter metrics by type', async () => {
      const response = await request(app)
        .get(`/api/agents/${testAgent.name}/metrics?metric_type=quality_score`)
        .expect(200);

      expect(response.body.metrics.length).toBeGreaterThan(0);
      response.body.metrics.forEach(metric => {
        expect(metric.metric_type).toBe('quality_score');
      });
    });

    it('should filter metrics by time range', async () => {
      const response = await request(app)
        .get(`/api/agents/${testAgent.name}/metrics?days=7`)
        .expect(200);

      expect(response.body).toHaveProperty('metrics');
      expect(Array.isArray(response.body.metrics)).toBe(true);
    });
  });

  describe('DELETE /api/agents/:name', () => {
    it('should deactivate an agent', async () => {
      const response = await request(app)
        .delete(`/api/agents/${testAgent.name}`)
        .expect(200);

      expect(response.body.status).toBe('inactive');
      expect(response.body.name).toBe(testAgent.name);

      // Verify agent is deactivated in database
      const client = await pgPool().connect();
      const result = await client.query(
        'SELECT status FROM agents WHERE id = $1',
        [testAgent.id]
      );
      client.release();

      expect(result.rows[0].status).toBe('inactive');
    });

    it('should return 404 for non-existent agent', async () => {
      const response = await request(app)
        .delete('/api/agents/non-existent-agent')
        .expect(404);

      expect(response.body.error).toBe('Agent not found');
    });
  });

  describe('POST /api/agents/:name/rollback', () => {
    beforeEach(async () => {
      // Mock the version control system
      jest.doMock('../../services/PromptVersionControl', () => ({
        getVersionControl: () => ({
          rollback: jest.fn().mockResolvedValue({
            agentName: testAgent.name,
            version: '1.0.0'
          })
        })
      }));
    });

    it('should rollback to specified version', async () => {
      const rollbackData = {
        version: '1.0.0'
      };

      const response = await request(app)
        .post(`/api/agents/${testAgent.name}/rollback`)
        .send(rollbackData)
        .expect(200);

      expect(response.body.agentName).toBe(testAgent.name);
      expect(response.body.version).toBe('1.0.0');
    });

    it('should validate version parameter', async () => {
      const response = await request(app)
        .post(`/api/agents/${testAgent.name}/rollback`)
        .send({})
        .expect(400);

      expect(response.body.error).toContain('Version is required');
    });
  });
});
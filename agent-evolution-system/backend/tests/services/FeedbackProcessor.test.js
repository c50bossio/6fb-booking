const FeedbackProcessor = require('../../services/FeedbackProcessor');
const { pgPool } = require('../setup');

describe('FeedbackProcessor', () => {
  let feedbackProcessor;
  let testAgentId;

  beforeAll(() => {
    feedbackProcessor = new FeedbackProcessor();
  });

  beforeEach(async () => {
    // Create a test agent
    const client = await pgPool().connect();
    const result = await client.query(
      'INSERT INTO agents (name, description) VALUES ($1, $2) RETURNING id',
      ['test-agent', 'Test agent for feedback processing']
    );
    testAgentId = result.rows[0].id;
    client.release();
  });

  describe('collectFeedback', () => {
    it('should collect and store feedback successfully', async () => {
      const feedbackData = {
        corrections_needed: ['Fix error handling', 'Add validation'],
        missing_capabilities: ['Authentication support'],
        successful_patterns: ['Used good error messages'],
        time_to_completion: 45,
        quality_score: 8,
        cost_score: 7,
        user_satisfaction: 9,
        notes: 'Great work overall'
      };

      const result = await feedbackProcessor.collectFeedback(
        'test-project-1',
        'test-agent',
        feedbackData,
        'test-user'
      );

      expect(result).toHaveProperty('feedbackId');
      expect(result.agentName).toBe('test-agent');
      expect(result.projectId).toBe('test-project-1');
      expect(result.processed).toBe(true);
    });

    it('should handle missing agent gracefully', async () => {
      const feedbackData = {
        quality_score: 8,
        user_satisfaction: 9
      };

      await expect(
        feedbackProcessor.collectFeedback(
          'test-project-1',
          'nonexistent-agent',
          feedbackData
        )
      ).rejects.toThrow('Agent nonexistent-agent not found');
    });

    it('should validate required fields', async () => {
      const feedbackData = {
        // Missing required quality_score and user_satisfaction
        time_to_completion: 45
      };

      // This would typically be caught by the API validation layer
      // but we test the service's robustness
      await expect(
        feedbackProcessor.collectFeedback(
          'test-project-1',
          'test-agent',
          feedbackData
        )
      ).rejects.toThrow();
    });
  });

  describe('analyzePatterns', () => {
    it('should categorize feedback patterns correctly', async () => {
      const feedbackData = {
        corrections_needed: [
          'Database query is too slow',
          'Missing authentication check',
          'UI is confusing for users'
        ],
        missing_capabilities: [
          'Need caching functionality',
          'Add user permission system'
        ]
      };

      const categories = await feedbackProcessor.analyzePatterns('test-agent', feedbackData);

      expect(categories).toHaveProperty('performance');
      expect(categories).toHaveProperty('security');
      expect(categories).toHaveProperty('usability');
      expect(categories).toHaveProperty('functionality');

      // Check if patterns were categorized correctly
      expect(categories.performance.length).toBeGreaterThan(0);
      expect(categories.security.length).toBeGreaterThan(0);
      expect(categories.usability.length).toBeGreaterThan(0);
    });

    it('should handle empty feedback data', async () => {
      const feedbackData = {
        corrections_needed: [],
        missing_capabilities: []
      };

      const categories = await feedbackProcessor.analyzePatterns('test-agent', feedbackData);

      expect(categories).toHaveProperty('performance');
      expect(categories).toHaveProperty('functionality');
      expect(categories.performance).toEqual([]);
      expect(categories.functionality).toEqual([]);
    });
  });

  describe('generateImprovements', () => {
    beforeEach(async () => {
      // Add some test feedback data
      const client = await pgPool().connect();
      
      await client.query(`
        INSERT INTO feedback (
          agent_id, project_id, version, corrections_needed, missing_capabilities,
          quality_score, user_satisfaction, time_to_completion, created_at
        ) VALUES 
        ($1, 'proj1', '1.0.0', ARRAY['Fix validation', 'Add error handling'], ARRAY['Authentication'], 6, 7, 120, NOW() - INTERVAL '5 days'),
        ($1, 'proj2', '1.0.0', ARRAY['Fix validation', 'Improve performance'], ARRAY['Caching'], 5, 6, 90, NOW() - INTERVAL '3 days'),
        ($1, 'proj3', '1.0.0', ARRAY['Add logging'], ARRAY['Authentication', 'Authorization'], 7, 8, 60, NOW() - INTERVAL '1 day')
      `, [testAgentId]);

      client.release();
    });

    it('should generate improvement suggestions based on feedback patterns', async () => {
      const result = await feedbackProcessor.generateImprovements('test-agent', '7 days');

      expect(result).toHaveProperty('improvements');
      expect(result).toHaveProperty('feedbackCount');
      expect(result.feedbackCount).toBe(3);
      expect(Array.isArray(result.improvements)).toBe(true);

      // Should identify quality issues
      const qualityImprovement = result.improvements.find(imp => imp.type === 'quality');
      expect(qualityImprovement).toBeDefined();
      expect(qualityImprovement.priority).toBe('high');
    });

    it('should identify common correction patterns', async () => {
      const result = await feedbackProcessor.generateImprovements('test-agent', '7 days');

      // Should identify that "Fix validation" appears multiple times
      const functionalityImprovement = result.improvements.find(imp => imp.type === 'functionality');
      expect(functionalityImprovement).toBeDefined();
      
      if (functionalityImprovement && functionalityImprovement.suggestions) {
        const hasValidationSuggestion = functionalityImprovement.suggestions.some(s => 
          s.pattern && s.pattern.includes('validation')
        );
        expect(hasValidationSuggestion).toBe(true);
      }
    });

    it('should handle agents with no feedback', async () => {
      // Clear feedback for the agent
      const client = await pgPool().connect();
      await client.query('DELETE FROM feedback WHERE agent_id = $1', [testAgentId]);
      client.release();

      const result = await feedbackProcessor.generateImprovements('test-agent', '7 days');

      expect(result.feedbackCount).toBe(0);
      expect(result.improvements).toEqual([]);
      expect(result.message).toContain('No feedback data available');
    });
  });

  describe('extractCommonPatterns', () => {
    it('should identify frequently occurring patterns', async () => {
      const items = [
        'Fix validation error',
        'Add authentication',
        'Fix validation error',
        'Improve performance',
        'Add authentication',
        'Fix validation error'
      ];

      const patterns = feedbackProcessor.extractCommonPatterns(items, 2);

      expect(patterns.length).toBeGreaterThan(0);
      
      // 'Fix validation error' should be the most frequent
      expect(patterns[0].pattern).toBe('fix validation error');
      expect(patterns[0].frequency).toBe(3);
      
      // 'Add authentication' should be second
      expect(patterns[1].pattern).toBe('add authentication');
      expect(patterns[1].frequency).toBe(2);
    });

    it('should filter out infrequent patterns', async () => {
      const items = [
        'Common issue',
        'Common issue',
        'Common issue',
        'Rare issue'
      ];

      const patterns = feedbackProcessor.extractCommonPatterns(items, 2);

      expect(patterns.length).toBe(1);
      expect(patterns[0].pattern).toBe('common issue');
    });
  });

  describe('analyzeSentiment', () => {
    it('should analyze positive sentiment', () => {
      const text = 'Great work! Very helpful and accurate response.';
      const sentiment = feedbackProcessor.analyzeSentiment(text);
      
      expect(sentiment).toBeGreaterThan(0);
    });

    it('should analyze negative sentiment', () => {
      const text = 'Terrible response, completely wrong and unhelpful.';
      const sentiment = feedbackProcessor.analyzeSentiment(text);
      
      expect(sentiment).toBeLessThan(0);
    });

    it('should handle empty text', () => {
      const sentiment = feedbackProcessor.analyzeSentiment('');
      expect(sentiment).toBe(0);
    });

    it('should handle neutral text', () => {
      const text = 'The response was provided.';
      const sentiment = feedbackProcessor.analyzeSentiment(text);
      
      expect(sentiment).toBeCloseTo(0, 1);
    });
  });
});
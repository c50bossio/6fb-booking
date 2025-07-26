const { Pool } = require('pg');
const mongoose = require('mongoose');
const logger = require('../utils/logger');

// PostgreSQL connection for structured data
const pgPool = new Pool({
  host: process.env.POSTGRES_HOST,
  port: process.env.POSTGRES_PORT,
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// MongoDB connection for pattern storage
mongoose.set('strictQuery', false);

const connectDatabases = async () => {
  try {
    // Test PostgreSQL connection
    const client = await pgPool.connect();
    await client.query('SELECT NOW()');
    client.release();
    logger.info('Connected to PostgreSQL');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    logger.info('Connected to MongoDB');

    // Initialize database schemas
    await initializeTables();
    
  } catch (error) {
    logger.error('Database connection failed:', error);
    throw error;
  }
};

const initializeTables = async () => {
  const client = await pgPool.connect();
  
  try {
    // Agents table
    await client.query(`
      CREATE TABLE IF NOT EXISTS agents (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        current_version VARCHAR(50) NOT NULL DEFAULT '1.0.0',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(50) DEFAULT 'active',
        description TEXT,
        category VARCHAR(100),
        tags TEXT[]
      )
    `);

    // Prompt versions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS prompt_versions (
        id SERIAL PRIMARY KEY,
        agent_id INTEGER REFERENCES agents(id) ON DELETE CASCADE,
        version VARCHAR(50) NOT NULL,
        content TEXT NOT NULL,
        changelog TEXT,
        performance_score DECIMAL(5,4),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by VARCHAR(255) DEFAULT 'system',
        is_active BOOLEAN DEFAULT false,
        metadata JSONB DEFAULT '{}'
      )
    `);

    // Feedback table
    await client.query(`
      CREATE TABLE IF NOT EXISTS feedback (
        id SERIAL PRIMARY KEY,
        agent_id INTEGER REFERENCES agents(id) ON DELETE CASCADE,
        project_id VARCHAR(255),
        version VARCHAR(50),
        corrections_needed TEXT[],
        missing_capabilities TEXT[],
        successful_patterns TEXT[],
        time_to_completion INTEGER, -- in minutes
        quality_score INTEGER CHECK (quality_score >= 1 AND quality_score <= 10),
        cost_score INTEGER CHECK (cost_score >= 1 AND cost_score <= 10),
        user_satisfaction INTEGER CHECK (user_satisfaction >= 1 AND user_satisfaction <= 10),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by VARCHAR(255)
      )
    `);

    // Performance metrics table
    await client.query(`
      CREATE TABLE IF NOT EXISTS performance_metrics (
        id SERIAL PRIMARY KEY,
        agent_id INTEGER REFERENCES agents(id) ON DELETE CASCADE,
        version VARCHAR(50),
        metric_type VARCHAR(100) NOT NULL,
        metric_value DECIMAL(10,4),
        metric_unit VARCHAR(50),
        measured_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        context JSONB DEFAULT '{}'
      )
    `);

    // A/B tests table
    await client.query(`
      CREATE TABLE IF NOT EXISTS ab_tests (
        id SERIAL PRIMARY KEY,
        agent_id INTEGER REFERENCES agents(id) ON DELETE CASCADE,
        test_name VARCHAR(255) NOT NULL,
        version_a VARCHAR(50) NOT NULL,
        version_b VARCHAR(50) NOT NULL,
        criteria JSONB NOT NULL,
        results JSONB,
        status VARCHAR(50) DEFAULT 'running',
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ended_at TIMESTAMP,
        winner VARCHAR(50)
      )
    `);

    // Optimization suggestions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS optimization_suggestions (
        id SERIAL PRIMARY KEY,
        agent_id INTEGER REFERENCES agents(id) ON DELETE CASCADE,
        suggestion_type VARCHAR(100) NOT NULL,
        description TEXT NOT NULL,
        impact_score DECIMAL(3,2),
        implementation_effort VARCHAR(50),
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        implemented_at TIMESTAMP,
        results JSONB
      )
    `);

    // Create indexes for better performance
    await client.query('CREATE INDEX IF NOT EXISTS idx_agents_name ON agents(name)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_prompt_versions_agent_version ON prompt_versions(agent_id, version)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_feedback_agent_created ON feedback(agent_id, created_at)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_metrics_agent_type_measured ON performance_metrics(agent_id, metric_type, measured_at)');

    logger.info('Database tables initialized successfully');
    
  } finally {
    client.release();
  }
};

module.exports = {
  pgPool,
  mongoose,
  connectDatabases
};
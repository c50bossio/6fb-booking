const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const { Pool } = require('pg');

let mongoServer;
let pgPool;

// Setup test environment
beforeAll(async () => {
  // Setup MongoDB in-memory server
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  // Setup PostgreSQL test pool (you might want to use a test database)
  pgPool = new Pool({
    host: process.env.TEST_POSTGRES_HOST || 'localhost',
    port: process.env.TEST_POSTGRES_PORT || 5432,
    database: process.env.TEST_POSTGRES_DB || 'agent_evolution_test',
    user: process.env.TEST_POSTGRES_USER || 'postgres',
    password: process.env.TEST_POSTGRES_PASSWORD || 'password',
  });

  // Initialize test database schema
  await initializeTestSchema();
});

// Cleanup after tests
afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongoServer.stop();
  
  if (pgPool) {
    await pgPool.end();
  }
});

// Clear collections before each test
beforeEach(async () => {
  const collections = mongoose.connection.collections;
  
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }

  // Clear PostgreSQL tables
  if (pgPool) {
    await pgPool.query('TRUNCATE TABLE feedback, performance_metrics, prompt_versions, optimization_suggestions, ab_tests RESTART IDENTITY CASCADE');
  }
});

async function initializeTestSchema() {
  if (!pgPool) return;

  try {
    // Create test tables (simplified versions)
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS agents (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        current_version VARCHAR(50) NOT NULL DEFAULT '1.0.0',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(50) DEFAULT 'active',
        description TEXT,
        category VARCHAR(100)
      )
    `);

    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS feedback (
        id SERIAL PRIMARY KEY,
        agent_id INTEGER REFERENCES agents(id) ON DELETE CASCADE,
        project_id VARCHAR(255),
        version VARCHAR(50),
        corrections_needed TEXT[],
        missing_capabilities TEXT[],
        successful_patterns TEXT[],
        time_to_completion INTEGER,
        quality_score INTEGER CHECK (quality_score >= 1 AND quality_score <= 10),
        user_satisfaction INTEGER CHECK (user_satisfaction >= 1 AND user_satisfaction <= 10),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pgPool.query(`
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

    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS prompt_versions (
        id SERIAL PRIMARY KEY,
        agent_id INTEGER REFERENCES agents(id) ON DELETE CASCADE,
        version VARCHAR(50) NOT NULL,
        content TEXT NOT NULL,
        changelog TEXT,
        performance_score DECIMAL(5,4),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT false,
        metadata JSONB DEFAULT '{}'
      )
    `);

    console.log('Test database schema initialized');
  } catch (error) {
    console.error('Failed to initialize test schema:', error);
  }
}

module.exports = {
  pgPool: () => pgPool,
  mongoose
};
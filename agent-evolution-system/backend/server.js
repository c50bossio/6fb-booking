const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const { RateLimiterRedis } = require('rate-limiter-flexible');
const Redis = require('redis');
const cron = require('node-cron');
require('dotenv').config();

const logger = require('./utils/logger');
const { connectDatabases } = require('./config/database');
const { initializeGit } = require('./services/PromptVersionControl');

// Import routes
const agentRoutes = require('./api/agents');
const feedbackRoutes = require('./api/feedback');
const metricsRoutes = require('./api/metrics');
const patternsRoutes = require('./api/patterns');
const analyticsRoutes = require('./api/analytics');
const optimizationRoutes = require('./api/optimization');

// Import scheduled tasks
const { runDailyAnalysis } = require('./services/ScheduledTasks');
const { runWeeklyOptimization } = require('./services/AgentOptimizer');

const app = express();
const PORT = process.env.PORT || 3001;

// Redis client for rate limiting
const redisClient = Redis.createClient({
  url: process.env.REDIS_URL
});

// Rate limiter
const rateLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: 'api_limit',
  points: parseInt(process.env.API_RATE_LIMIT) || 100,
  duration: 60, // Per 60 seconds
});

// Middleware
app.use(helmet());
app.use(compression());
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://yourdomain.com'] 
    : ['http://localhost:3000'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting middleware
app.use(async (req, res, next) => {
  try {
    await rateLimiter.consume(req.ip);
    next();
  } catch (rejRes) {
    res.status(429).json({
      error: 'Too many requests',
      retryAfter: Math.round(rejRes.msBeforeNext / 1000)
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// API Routes
app.use('/api/agents', agentRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/metrics', metricsRoutes);
app.use('/api/patterns', patternsRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/optimization', optimizationRoutes);

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static('frontend/build'));
  
  app.get('*', (req, res) => {
    res.sendFile('frontend/build/index.html', { root: process.cwd() });
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Scheduled tasks
cron.schedule('0 2 * * *', () => {
  logger.info('Running daily analysis...');
  runDailyAnalysis().catch(err => logger.error('Daily analysis failed:', err));
});

cron.schedule('0 3 * * 0', () => {
  logger.info('Running weekly optimization...');
  runWeeklyOptimization().catch(err => logger.error('Weekly optimization failed:', err));
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    redisClient.quit();
    process.exit(0);
  });
});

// Initialize and start server
async function startServer() {
  try {
    // Connect to databases
    await connectDatabases();
    
    // Initialize Git repository
    await initializeGit();
    
    // Connect Redis
    await redisClient.connect();
    logger.info('Connected to Redis');
    
    // Start server
    const server = app.listen(PORT, () => {
      logger.info(`Agent Evolution System running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV}`);
    });
    
    return server;
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = app;
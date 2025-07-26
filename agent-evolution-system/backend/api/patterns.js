const express = require('express');
const Joi = require('joi');
const PatternExtractor = require('../services/PatternExtractor');
const CodePattern = require('../models/CodePattern');
const logger = require('../utils/logger');

const router = express.Router();

const extractPatternSchema = Joi.object({
  code: Joi.string().required(),
  name: Joi.string(),
  description: Joi.string(),
  category: Joi.string(),
  language: Joi.string(),
  framework: Joi.string(),
  problem_solved: Joi.string(),
  use_cases: Joi.array().items(Joi.string()),
  usage_example: Joi.string()
});

const ratePatternSchema = Joi.object({
  success: Joi.boolean().required(),
  rating: Joi.number().min(1).max(5),
  comment: Joi.string(),
  difficulty: Joi.number().min(1).max(5),
  effectiveness: Joi.number().min(1).max(5),
  implementation_time: Joi.number().min(0)
});

const patternExtractor = new PatternExtractor();

// POST /api/patterns/extract - Extract pattern from code
router.post('/extract', async (req, res) => {
  try {
    const { error, value } = extractPatternSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { code, ...metadata } = value;
    metadata.created_by = req.user?.id || 'api';

    const pattern = await patternExtractor.extractPattern(code, metadata);
    
    logger.info(`Extracted pattern: ${pattern.name} (${pattern.pattern_id})`);
    res.status(201).json(pattern);

  } catch (error) {
    logger.error('Failed to extract pattern:', error);
    res.status(500).json({ error: 'Failed to extract pattern' });
  }
});

// GET /api/patterns/recommend - Get recommended patterns
router.get('/recommend', async (req, res) => {
  try {
    const { 
      category, 
      language, 
      framework, 
      problem, 
      tags,
      limit = 10 
    } = req.query;

    const context = {
      category,
      language,
      framework,
      problem,
      tags: tags ? tags.split(',') : undefined
    };

    const patterns = await patternExtractor.getRecommendedPatterns(context);
    
    res.json({
      patterns: patterns.slice(0, parseInt(limit)),
      context
    });

  } catch (error) {
    logger.error('Failed to get recommended patterns:', error);
    res.status(500).json({ error: 'Failed to get recommendations' });
  }
});

// GET /api/patterns - Search and list patterns
router.get('/', async (req, res) => {
  try {
    const {
      category,
      language,
      framework,
      search,
      sort = 'success_rate',
      page = 1,
      limit = 20
    } = req.query;

    let query = { status: 'active' };
    
    if (category) query.category = category;
    if (language) query.language = language;
    if (framework) query.framework = new RegExp(framework, 'i');
    
    let sortOptions = {};
    switch (sort) {
      case 'usage':
        sortOptions = { 'success_metrics.usage_count': -1 };
        break;
      case 'quality':
        sortOptions = { 'quality_indicators.maintainability_score': -1 };
        break;
      case 'recent':
        sortOptions = { 'createdAt': -1 };
        break;
      case 'success_rate':
      default:
        sortOptions = { 'success_metrics.success_rate': -1 };
    }

    const skip = (page - 1) * limit;
    
    let patterns;
    if (search) {
      patterns = await CodePattern.find({
        $text: { $search: search },
        ...query
      })
      .sort({ score: { $meta: 'textScore' }, ...sortOptions })
      .skip(skip)
      .limit(parseInt(limit));
    } else {
      patterns = await CodePattern.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit));
    }

    const total = await CodePattern.countDocuments(query);

    res.json({
      patterns,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    logger.error('Failed to search patterns:', error);
    res.status(500).json({ error: 'Failed to search patterns' });
  }
});

// GET /api/patterns/:patternId - Get specific pattern
router.get('/:patternId', async (req, res) => {
  try {
    const { patternId } = req.params;
    
    const pattern = await CodePattern.findOne({ pattern_id: patternId });
    
    if (!pattern) {
      return res.status(404).json({ error: 'Pattern not found' });
    }

    // Get related patterns
    const relatedPatterns = await CodePattern.find({
      _id: { $in: pattern.related_patterns },
      status: 'active'
    }).limit(5);

    res.json({
      ...pattern.toObject(),
      related_patterns_data: relatedPatterns
    });

  } catch (error) {
    logger.error('Failed to get pattern:', error);
    res.status(500).json({ error: 'Failed to retrieve pattern' });
  }
});

// POST /api/patterns/:patternId/rate - Rate pattern success
router.post('/:patternId/rate', async (req, res) => {
  try {
    const { error, value } = ratePatternSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { patternId } = req.params;
    const userId = req.user?.id || 'anonymous';

    const outcome = {
      ...value,
      user_id: userId
    };

    await patternExtractor.ratePatternSuccess(patternId, outcome);
    
    logger.info(`Pattern ${patternId} rated by ${userId}`);
    res.json({ success: true, pattern_id: patternId });

  } catch (error) {
    logger.error('Failed to rate pattern:', error);
    res.status(500).json({ error: 'Failed to rate pattern' });
  }
});

// GET /api/patterns/categories/stats - Get category statistics
router.get('/categories/stats', async (req, res) => {
  try {
    const stats = await CodePattern.aggregate([
      { $match: { status: 'active' } },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          avg_success_rate: { $avg: '$success_metrics.success_rate' },
          avg_usage: { $avg: '$success_metrics.usage_count' },
          avg_quality: { $avg: '$quality_indicators.maintainability_score' }
        }
      },
      { $sort: { count: -1 } }
    ]);

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

    res.json({
      categories: stats,
      languages: languageStats
    });

  } catch (error) {
    logger.error('Failed to get category stats:', error);
    res.status(500).json({ error: 'Failed to get statistics' });
  }
});

// PUT /api/patterns/:patternId - Update pattern
router.put('/:patternId', async (req, res) => {
  try {
    const { patternId } = req.params;
    const updateData = req.body;
    
    // Remove fields that shouldn't be updated directly
    delete updateData.pattern_id;
    delete updateData.success_metrics;
    delete updateData.createdAt;
    
    updateData.last_updated_by = req.user?.id || 'api';
    updateData.updatedAt = new Date();

    const pattern = await CodePattern.findOneAndUpdate(
      { pattern_id: patternId },
      updateData,
      { new: true, runValidators: true }
    );

    if (!pattern) {
      return res.status(404).json({ error: 'Pattern not found' });
    }

    logger.info(`Updated pattern: ${patternId}`);
    res.json(pattern);

  } catch (error) {
    logger.error('Failed to update pattern:', error);
    res.status(500).json({ error: 'Failed to update pattern' });
  }
});

// DELETE /api/patterns/:patternId - Deprecate pattern
router.delete('/:patternId', async (req, res) => {
  try {
    const { patternId } = req.params;
    
    const pattern = await CodePattern.findOneAndUpdate(
      { pattern_id: patternId },
      { 
        status: 'deprecated',
        last_updated_by: req.user?.id || 'api',
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!pattern) {
      return res.status(404).json({ error: 'Pattern not found' });
    }

    logger.info(`Deprecated pattern: ${patternId}`);
    res.json(pattern);

  } catch (error) {
    logger.error('Failed to deprecate pattern:', error);
    res.status(500).json({ error: 'Failed to deprecate pattern' });
  }
});

module.exports = router;
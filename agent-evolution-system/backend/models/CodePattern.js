const mongoose = require('mongoose');

const CodePatternSchema = new mongoose.Schema({
  pattern_id: {
    type: String,
    unique: true,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: [
      'database',
      'api',
      'frontend',
      'backend',
      'security',
      'performance',
      'testing',
      'infrastructure',
      'architecture',
      'optimization'
    ]
  },
  subcategory: String,
  language: {
    type: String,
    enum: ['javascript', 'python', 'sql', 'bash', 'typescript', 'general']
  },
  framework: String, // React, Express, FastAPI, etc.
  
  code_snippet: {
    type: String,
    required: true
  },
  usage_example: String,
  
  success_metrics: {
    usage_count: { type: Number, default: 0 },
    success_rate: { type: Number, default: 0 }, // 0-1
    avg_implementation_time: Number, // minutes
    performance_improvement: Number, // percentage
    error_reduction: Number // percentage
  },
  
  context: {
    problem_solved: String,
    use_cases: [String],
    prerequisites: [String],
    alternatives: [String]
  },
  
  performance_data: {
    response_time_improvement: Number,
    memory_usage_change: Number,
    cpu_usage_change: Number,
    database_query_optimization: Number
  },
  
  quality_indicators: {
    maintainability_score: { type: Number, min: 1, max: 10 },
    readability_score: { type: Number, min: 1, max: 10 },
    testability_score: { type: Number, min: 1, max: 10 },
    security_score: { type: Number, min: 1, max: 10 }
  },
  
  tags: [String],
  
  feedback: [{
    user_id: String,
    rating: { type: Number, min: 1, max: 5 },
    comment: String,
    implementation_difficulty: { type: Number, min: 1, max: 5 },
    effectiveness: { type: Number, min: 1, max: 5 },
    created_at: { type: Date, default: Date.now }
  }],
  
  related_patterns: [String], // pattern_ids
  
  version: {
    type: String,
    default: '1.0.0'
  },
  
  status: {
    type: String,
    enum: ['active', 'deprecated', 'experimental'],
    default: 'active'
  },
  
  created_by: String,
  last_updated_by: String
}, {
  timestamps: true
});

// Indexes
CodePatternSchema.index({ category: 1, subcategory: 1 });
CodePatternSchema.index({ language: 1, framework: 1 });
CodePatternSchema.index({ tags: 1 });
CodePatternSchema.index({ 'success_metrics.success_rate': -1 });
CodePatternSchema.index({ 'quality_indicators.maintainability_score': -1 });

// Virtual for overall quality score
CodePatternSchema.virtual('overall_quality_score').get(function() {
  const scores = this.quality_indicators;
  return (scores.maintainability_score + scores.readability_score + 
          scores.testability_score + scores.security_score) / 4;
});

module.exports = mongoose.model('CodePattern', CodePatternSchema);
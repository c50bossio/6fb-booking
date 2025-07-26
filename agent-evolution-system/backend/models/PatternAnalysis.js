const mongoose = require('mongoose');

const PatternAnalysisSchema = new mongoose.Schema({
  agent_name: {
    type: String,
    required: true,
    index: true
  },
  analysis_date: {
    type: Date,
    default: Date.now,
    index: true
  },
  pattern_categories: {
    performance: [String],
    functionality: [String],
    accuracy: [String],
    usability: [String],
    security: [String]
  },
  correction_patterns: [{
    pattern: String,
    frequency: { type: Number, default: 1 },
    category: String,
    severity: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' }
  }],
  performance_issues: [{
    issue: String,
    impact: String,
    suggested_fix: String,
    frequency: { type: Number, default: 1 }
  }],
  security_concerns: [{
    concern: String,
    risk_level: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    mitigation: String
  }],
  sentiment_score: {
    type: Number,
    min: -1,
    max: 1,
    default: 0
  },
  metadata: {
    corrections_count: { type: Number, default: 0 },
    missing_count: { type: Number, default: 0 },
    successful_count: { type: Number, default: 0 },
    feedback_source: String,
    project_type: String
  }
}, {
  timestamps: true
});

// Indexes for better query performance
PatternAnalysisSchema.index({ agent_name: 1, analysis_date: -1 });
PatternAnalysisSchema.index({ 'pattern_categories.performance': 1 });
PatternAnalysisSchema.index({ sentiment_score: 1 });

module.exports = mongoose.model('PatternAnalysis', PatternAnalysisSchema);
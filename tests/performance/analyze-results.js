#!/usr/bin/env node

/**
 * Performance Test Results Analyzer
 * Analyzes k6 load test results and generates reports
 */

const fs = require('fs');
const path = require('path');

// Configuration
const THRESHOLDS = {
  response_time_p95: 1000,      // 95th percentile response time (ms)
  response_time_p99: 2000,      // 99th percentile response time (ms)
  error_rate_max: 0.02,         // Maximum error rate (2%)
  throughput_min: 10,           // Minimum requests per second
  availability_min: 0.99,       // Minimum availability (99%)
};

const SEVERITY_LEVELS = {
  CRITICAL: 'CRITICAL',
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW',
  INFO: 'INFO'
};

function analyzeResults(resultsFile) {
  try {
    console.log('📊 Analyzing performance test results...\n');
    
    // Read and parse results file
    const resultsData = JSON.parse(fs.readFileSync(resultsFile, 'utf8'));
    
    if (!resultsData.metrics) {
      throw new Error('Invalid results file format - missing metrics');
    }
    
    const analysis = {
      summary: {},
      performance: {},
      errors: {},
      recommendations: [],
      issues: [],
      timestamp: new Date().toISOString()
    };

    // Analyze performance metrics
    analyzePerformanceMetrics(resultsData.metrics, analysis);
    
    // Analyze error rates
    analyzeErrorRates(resultsData.metrics, analysis);
    
    // Generate recommendations
    generateRecommendations(analysis);
    
    // Generate summary
    generateSummary(analysis);
    
    // Output results
    outputResults(analysis);
    
    // Save detailed report
    saveDetailedReport(analysis, resultsFile);
    
    // Return exit code based on results
    return analysis.summary.overall_status === 'PASS' ? 0 : 1;
    
  } catch (error) {
    console.error('❌ Error analyzing results:', error.message);
    return 1;
  }
}

function analyzePerformanceMetrics(metrics, analysis) {
  console.log('🔍 Analyzing performance metrics...');
  
  // HTTP request duration analysis
  if (metrics.http_req_duration) {
    const duration = metrics.http_req_duration;
    analysis.performance.response_time = {
      avg: duration.avg || 0,
      min: duration.min || 0,
      max: duration.max || 0,
      p50: duration.med || 0,
      p90: duration['p(90)'] || 0,
      p95: duration['p(95)'] || 0,
      p99: duration['p(99)'] || 0
    };
    
    // Check thresholds
    if (analysis.performance.response_time.p95 > THRESHOLDS.response_time_p95) {
      analysis.issues.push({
        severity: SEVERITY_LEVELS.HIGH,
        category: 'Performance',
        message: `95th percentile response time (${analysis.performance.response_time.p95}ms) exceeds threshold (${THRESHOLDS.response_time_p95}ms)`,
        metric: 'response_time_p95',
        value: analysis.performance.response_time.p95,
        threshold: THRESHOLDS.response_time_p95
      });
    }
    
    if (analysis.performance.response_time.p99 > THRESHOLDS.response_time_p99) {
      analysis.issues.push({
        severity: SEVERITY_LEVELS.MEDIUM,
        category: 'Performance',
        message: `99th percentile response time (${analysis.performance.response_time.p99}ms) exceeds threshold (${THRESHOLDS.response_time_p99}ms)`,
        metric: 'response_time_p99',
        value: analysis.performance.response_time.p99,
        threshold: THRESHOLDS.response_time_p99
      });
    }
  }
  
  // HTTP request rate analysis
  if (metrics.http_reqs) {
    analysis.performance.throughput = {
      total_requests: metrics.http_reqs.count || 0,
      requests_per_second: metrics.http_reqs.rate || 0
    };
    
    if (analysis.performance.throughput.requests_per_second < THRESHOLDS.throughput_min) {
      analysis.issues.push({
        severity: SEVERITY_LEVELS.MEDIUM,
        category: 'Performance',
        message: `Throughput (${analysis.performance.throughput.requests_per_second} req/s) below minimum threshold (${THRESHOLDS.throughput_min} req/s)`,
        metric: 'throughput',
        value: analysis.performance.throughput.requests_per_second,
        threshold: THRESHOLDS.throughput_min
      });
    }
  }
  
  // Virtual users analysis
  if (metrics.vus) {
    analysis.performance.virtual_users = {
      max: metrics.vus.max || 0,
      avg: metrics.vus.avg || 0
    };
  }
  
  // Iteration duration analysis
  if (metrics.iteration_duration) {
    analysis.performance.iteration_duration = {
      avg: metrics.iteration_duration.avg || 0,
      max: metrics.iteration_duration.max || 0,
      p95: metrics.iteration_duration['p(95)'] || 0
    };
  }
}

function analyzeErrorRates(metrics, analysis) {
  console.log('🚨 Analyzing error rates...');
  
  // HTTP request failure rate
  if (metrics.http_req_failed) {
    analysis.errors.http_failures = {
      rate: metrics.http_req_failed.rate || 0,
      count: metrics.http_req_failed.passes || 0,
      total: (metrics.http_req_failed.passes || 0) + (metrics.http_req_failed.fails || 0)
    };
    
    if (analysis.errors.http_failures.rate > THRESHOLDS.error_rate_max) {
      analysis.issues.push({
        severity: SEVERITY_LEVELS.CRITICAL,
        category: 'Reliability',
        message: `HTTP failure rate (${(analysis.errors.http_failures.rate * 100).toFixed(2)}%) exceeds threshold (${(THRESHOLDS.error_rate_max * 100)}%)`,
        metric: 'error_rate',
        value: analysis.errors.http_failures.rate,
        threshold: THRESHOLDS.error_rate_max
      });
    }
  }
  
  // Custom error rate analysis
  if (metrics.error_rate) {
    analysis.errors.custom_errors = {
      rate: metrics.error_rate.rate || 0,
      count: metrics.error_rate.passes || 0
    };
  }
  
  // Calculate availability
  const totalRequests = (metrics.http_reqs && metrics.http_reqs.count) || 0;
  const failedRequests = (analysis.errors.http_failures && analysis.errors.http_failures.count) || 0;
  const successfulRequests = totalRequests - failedRequests;
  
  analysis.errors.availability = totalRequests > 0 ? successfulRequests / totalRequests : 1;
  
  if (analysis.errors.availability < THRESHOLDS.availability_min) {
    analysis.issues.push({
      severity: SEVERITY_LEVELS.CRITICAL,
      category: 'Reliability',
      message: `Availability (${(analysis.errors.availability * 100).toFixed(2)}%) below minimum threshold (${(THRESHOLDS.availability_min * 100)}%)`,
      metric: 'availability',
      value: analysis.errors.availability,
      threshold: THRESHOLDS.availability_min
    });
  }
}

function generateRecommendations(analysis) {
  console.log('💡 Generating recommendations...');
  
  const issues = analysis.issues;
  const recommendations = analysis.recommendations;
  
  // Performance recommendations
  const performanceIssues = issues.filter(i => i.category === 'Performance');
  if (performanceIssues.length > 0) {
    recommendations.push({
      category: 'Performance Optimization',
      priority: 'HIGH',
      recommendations: [
        'Consider implementing response caching for frequently accessed endpoints',
        'Review database query performance and add indexes where needed',
        'Optimize API payload sizes to reduce transfer time',
        'Consider implementing CDN for static assets',
        'Review and optimize application startup time'
      ]
    });
  }
  
  // Reliability recommendations
  const reliabilityIssues = issues.filter(i => i.category === 'Reliability');
  if (reliabilityIssues.length > 0) {
    recommendations.push({
      category: 'Reliability Improvements',
      priority: 'CRITICAL',
      recommendations: [
        'Implement circuit breaker pattern for external service calls',
        'Add comprehensive error handling and retry logic',
        'Review and improve health check endpoints',
        'Implement proper rate limiting to prevent service overload',
        'Consider implementing request queuing for high load scenarios'
      ]
    });
  }
  
  // Scalability recommendations
  if (analysis.performance.virtual_users && analysis.performance.virtual_users.max > 50) {
    recommendations.push({
      category: 'Scalability',
      priority: 'MEDIUM',
      recommendations: [
        'Consider implementing horizontal pod autoscaling',
        'Review database connection pooling configuration',
        'Implement session-less authentication for better scalability',
        'Consider microservices architecture for better resource utilization',
        'Implement proper load balancing strategies'
      ]
    });
  }
  
  // Monitoring recommendations
  recommendations.push({
    category: 'Monitoring & Observability',
    priority: 'MEDIUM',
    recommendations: [
      'Implement comprehensive application performance monitoring',
      'Add detailed logging for performance bottlenecks',
      'Set up alerting for key performance indicators',
      'Implement distributed tracing for complex request flows',
      'Create performance dashboards for real-time monitoring'
    ]
  });
}

function generateSummary(analysis) {
  const criticalIssues = analysis.issues.filter(i => i.severity === SEVERITY_LEVELS.CRITICAL);
  const highIssues = analysis.issues.filter(i => i.severity === SEVERITY_LEVELS.HIGH);
  const mediumIssues = analysis.issues.filter(i => i.severity === SEVERITY_LEVELS.MEDIUM);
  
  analysis.summary = {
    overall_status: criticalIssues.length === 0 && highIssues.length === 0 ? 'PASS' : 'FAIL',
    total_issues: analysis.issues.length,
    critical_issues: criticalIssues.length,
    high_issues: highIssues.length,
    medium_issues: mediumIssues.length,
    performance_score: calculatePerformanceScore(analysis),
    reliability_score: calculateReliabilityScore(analysis)
  };
}

function calculatePerformanceScore(analysis) {
  let score = 100;
  
  // Deduct points for response time issues
  if (analysis.performance.response_time) {
    const p95 = analysis.performance.response_time.p95;
    if (p95 > THRESHOLDS.response_time_p95) {
      score -= Math.min(30, (p95 - THRESHOLDS.response_time_p95) / 100);
    }
  }
  
  // Deduct points for throughput issues
  if (analysis.performance.throughput) {
    const rps = analysis.performance.throughput.requests_per_second;
    if (rps < THRESHOLDS.throughput_min) {
      score -= Math.min(20, (THRESHOLDS.throughput_min - rps) * 2);
    }
  }
  
  return Math.max(0, Math.round(score));
}

function calculateReliabilityScore(analysis) {
  let score = 100;
  
  // Deduct points for error rate
  if (analysis.errors.http_failures) {
    const errorRate = analysis.errors.http_failures.rate;
    if (errorRate > THRESHOLDS.error_rate_max) {
      score -= Math.min(50, (errorRate - THRESHOLDS.error_rate_max) * 1000);
    }
  }
  
  // Deduct points for availability
  if (analysis.errors.availability < THRESHOLDS.availability_min) {
    score -= (THRESHOLDS.availability_min - analysis.errors.availability) * 100;
  }
  
  return Math.max(0, Math.round(score));
}

function outputResults(analysis) {
  console.log('\n' + '='.repeat(80));
  console.log('📈 PERFORMANCE TEST ANALYSIS RESULTS');
  console.log('='.repeat(80));
  
  // Overall status
  const statusIcon = analysis.summary.overall_status === 'PASS' ? '✅' : '❌';
  console.log(`\n${statusIcon} Overall Status: ${analysis.summary.overall_status}`);
  
  // Scores
  console.log(`\n📊 Performance Score: ${analysis.summary.performance_score}/100`);
  console.log(`🛡️  Reliability Score: ${analysis.summary.reliability_score}/100`);
  
  // Performance metrics
  if (analysis.performance.response_time) {
    console.log('\n⚡ Response Time Metrics:');
    console.log(`   Average: ${Math.round(analysis.performance.response_time.avg)}ms`);
    console.log(`   95th percentile: ${Math.round(analysis.performance.response_time.p95)}ms`);
    console.log(`   99th percentile: ${Math.round(analysis.performance.response_time.p99)}ms`);
  }
  
  if (analysis.performance.throughput) {
    console.log('\n🚀 Throughput Metrics:');
    console.log(`   Total requests: ${analysis.performance.throughput.total_requests}`);
    console.log(`   Requests/second: ${analysis.performance.throughput.requests_per_second.toFixed(2)}`);
  }
  
  if (analysis.errors.availability !== undefined) {
    console.log('\n🎯 Reliability Metrics:');
    console.log(`   Availability: ${(analysis.errors.availability * 100).toFixed(2)}%`);
    if (analysis.errors.http_failures) {
      console.log(`   Error rate: ${(analysis.errors.http_failures.rate * 100).toFixed(2)}%`);
    }
  }
  
  // Issues
  if (analysis.issues.length > 0) {
    console.log('\n🚨 Issues Found:');
    analysis.issues.forEach((issue, index) => {
      const icon = getSeverityIcon(issue.severity);
      console.log(`   ${icon} [${issue.severity}] ${issue.message}`);
    });
  } else {
    console.log('\n✅ No issues found!');
  }
  
  // Recommendations
  if (analysis.recommendations.length > 0) {
    console.log('\n💡 Recommendations:');
    analysis.recommendations.forEach(rec => {
      console.log(`\n   📋 ${rec.category} (Priority: ${rec.priority}):`);
      rec.recommendations.forEach(r => {
        console.log(`      • ${r}`);
      });
    });
  }
  
  console.log('\n' + '='.repeat(80));
}

function getSeverityIcon(severity) {
  switch (severity) {
    case SEVERITY_LEVELS.CRITICAL: return '🔴';
    case SEVERITY_LEVELS.HIGH: return '🟠';
    case SEVERITY_LEVELS.MEDIUM: return '🟡';
    case SEVERITY_LEVELS.LOW: return '🔵';
    default: return 'ℹ️';
  }
}

function saveDetailedReport(analysis, resultsFile) {
  const reportFile = resultsFile.replace('.json', '-analysis.json');
  
  try {
    fs.writeFileSync(reportFile, JSON.stringify(analysis, null, 2));
    console.log(`\n📄 Detailed report saved to: ${reportFile}`);
  } catch (error) {
    console.warn(`⚠️  Failed to save detailed report: ${error.message}`);
  }
}

// Main execution
if (require.main === module) {
  const resultsFile = process.argv[2];
  
  if (!resultsFile) {
    console.error('Usage: node analyze-results.js <results-file.json>');
    process.exit(1);
  }
  
  if (!fs.existsSync(resultsFile)) {
    console.error(`Results file not found: ${resultsFile}`);
    process.exit(1);
  }
  
  const exitCode = analyzeResults(resultsFile);
  process.exit(exitCode);
}

module.exports = {
  analyzeResults,
  THRESHOLDS,
  SEVERITY_LEVELS
};
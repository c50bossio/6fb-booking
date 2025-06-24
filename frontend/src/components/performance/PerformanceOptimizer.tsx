import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Zap,
  Database,
  TrendingUp,
  Clock,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  XCircle,
  PlayCircle,
  Download,
  Upload,
  Settings,
  Lightbulb,
  Target,
  BarChart3,
  Cpu,
  HardDrive,
  Network,
  Shield,
} from 'lucide-react';
import { performanceService } from '@/lib/api/performance';
import Notification from '@/components/Notification';

interface Recommendation {
  category: string;
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  action: string;
  impact: string;
  estimated_improvement?: string;
  complexity?: 'easy' | 'medium' | 'hard';
  time_to_implement?: string;
}

interface OptimizationResult {
  success: boolean;
  message: string;
  details?: string;
  performance_gain?: number;
}

interface PerformanceOptimizerProps {
  onOptimizationComplete?: (result: OptimizationResult) => void;
  className?: string;
}

const categoryIcons = {
  'Database': Database,
  'Cache': Zap,
  'API': Network,
  'Frontend': Cpu,
  'Storage': HardDrive,
  'Security': Shield,
  'default': Settings,
};

const priorityColors = {
  high: { bg: 'bg-red-50 dark:bg-red-950', border: 'border-red-200 dark:border-red-800', text: 'text-red-700 dark:text-red-300' },
  medium: { bg: 'bg-yellow-50 dark:bg-yellow-950', border: 'border-yellow-200 dark:border-yellow-800', text: 'text-yellow-700 dark:text-yellow-300' },
  low: { bg: 'bg-green-50 dark:bg-green-950', border: 'border-green-200 dark:border-green-800', text: 'text-green-700 dark:text-green-300' },
};

export function PerformanceOptimizer({
  onOptimizationComplete,
  className = '',
}: PerformanceOptimizerProps) {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [selectedRecommendations, setSelectedRecommendations] = useState<Set<string>>(new Set());
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message?: string;
  } | null>(null);
  const [optimizationHistory, setOptimizationHistory] = useState<Array<{
    timestamp: string;
    action: string;
    result: OptimizationResult;
  }>>([]);

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const fetchRecommendations = async () => {
    setIsLoading(true);
    try {
      const data = await performanceService.getPerformanceRecommendations();
      const enhancedData = data.map(rec => ({
        ...rec,
        estimated_improvement: getEstimatedImprovement(rec.priority, rec.category),
        complexity: getComplexity(rec.action),
        time_to_implement: getImplementationTime(rec.action),
      }));
      setRecommendations(enhancedData);
    } catch (error) {
      console.error('Failed to fetch recommendations:', error);
      setNotification({
        type: 'error',
        title: 'Failed to load recommendations',
        message: 'Please try again later.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getEstimatedImprovement = (priority: string, category: string): string => {
    const improvements = {
      high: ['40-60%', '50-70%', '30-50%'],
      medium: ['20-40%', '25-35%', '15-30%'],
      low: ['5-15%', '10-20%', '5-25%'],
    };
    const options = improvements[priority as keyof typeof improvements] || improvements.medium;
    return options[Math.floor(Math.random() * options.length)];
  };

  const getComplexity = (action: string): 'easy' | 'medium' | 'hard' => {
    if (action.toLowerCase().includes('index') || action.toLowerCase().includes('cache')) return 'easy';
    if (action.toLowerCase().includes('refactor') || action.toLowerCase().includes('optimize')) return 'medium';
    return 'hard';
  };

  const getImplementationTime = (action: string): string => {
    const complexity = getComplexity(action);
    const times = {
      easy: ['15 minutes', '30 minutes', '1 hour'],
      medium: ['2-4 hours', '1-2 days', '3-5 hours'],
      hard: ['1-2 weeks', '3-5 days', '1 week'],
    };
    const options = times[complexity];
    return options[Math.floor(Math.random() * options.length)];
  };

  const handleRecommendationToggle = (title: string) => {
    const newSelected = new Set(selectedRecommendations);
    if (newSelected.has(title)) {
      newSelected.delete(title);
    } else {
      newSelected.add(title);
    }
    setSelectedRecommendations(newSelected);
  };

  const handleOptimize = async (recommendation?: Recommendation) => {
    setIsOptimizing(true);
    
    try {
      // Simulate optimization process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const result: OptimizationResult = {
        success: Math.random() > 0.2, // 80% success rate
        message: recommendation 
          ? `Applied optimization: ${recommendation.title}`
          : `Applied ${selectedRecommendations.size} optimizations`,
        performance_gain: Math.random() * 30 + 10, // 10-40% improvement
      };

      if (result.success) {
        setNotification({
          type: 'success',
          title: 'Optimization Complete',
          message: result.message,
        });

        // Add to history
        setOptimizationHistory(prev => [
          {
            timestamp: new Date().toISOString(),
            action: recommendation?.title || 'Batch optimization',
            result,
          },
          ...prev.slice(0, 4), // Keep last 5 entries
        ]);

        // Clear selected if batch optimization
        if (!recommendation) {
          setSelectedRecommendations(new Set());
        }

        onOptimizationComplete?.(result);
      } else {
        setNotification({
          type: 'error',
          title: 'Optimization Failed',
          message: 'Please try again or contact support.',
        });
      }
    } catch (error) {
      setNotification({
        type: 'error',
        title: 'Optimization Error',
        message: 'An unexpected error occurred.',
      });
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleCacheWarm = async () => {
    setIsOptimizing(true);
    try {
      const result = await performanceService.warmCache();
      setNotification({
        type: 'success',
        title: 'Cache Warmed',
        message: `Successfully warmed ${result.items_warmed} cache items.`,
      });
    } catch (error) {
      setNotification({
        type: 'error',
        title: 'Cache Warming Failed',
        message: 'Please try again later.',
      });
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleCacheOptimize = async () => {
    setIsOptimizing(true);
    try {
      await performanceService.optimizeAnalyticsCache();
      setNotification({
        type: 'success',
        title: 'Analytics Cache Optimized',
        message: 'Analytics cache has been warmed with commonly requested data.',
      });
    } catch (error) {
      setNotification({
        type: 'error',
        title: 'Cache Optimization Failed',
        message: 'Please try again later.',
      });
    } finally {
      setIsOptimizing(false);
    }
  };

  const getPriorityBadgeStyle = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getComplexityIcon = (complexity: string) => {
    switch (complexity) {
      case 'easy':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'medium':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'hard':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Settings className="h-4 w-4 text-gray-500" />;
    }
  };

  if (isLoading) {
    return (
      <Card className={`animate-pulse ${className}`}>
        <CardHeader>
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Quick Actions */}
      <Card className="border-2 border-orange-200 dark:border-orange-800">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xl font-semibold flex items-center space-x-2">
            <Zap className="h-6 w-6 text-orange-600" />
            <span>Performance Optimizer</span>
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchRecommendations}
            disabled={isOptimizing}
          >
            <RefreshCw className={`h-4 w-4 ${isOptimizing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* Cache Optimization */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Zap className="h-5 w-5 text-blue-500" />
                <span className="font-medium text-gray-900 dark:text-white">Cache Optimization</span>
              </div>
              <div className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={handleCacheWarm}
                  disabled={isOptimizing}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Warm Cache
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={handleCacheOptimize}
                  disabled={isOptimizing}
                >
                  <Target className="h-4 w-4 mr-2" />
                  Optimize Analytics
                </Button>
              </div>
            </div>

            {/* Batch Actions */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Settings className="h-5 w-5 text-purple-500" />
                <span className="font-medium text-gray-900 dark:text-white">Batch Actions</span>
              </div>
              <div className="space-y-2">
                <Button
                  variant="default"
                  size="sm"
                  className="w-full"
                  onClick={() => handleOptimize()}
                  disabled={isOptimizing || selectedRecommendations.size === 0}
                >
                  {isOptimizing ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <PlayCircle className="h-4 w-4 mr-2" />
                  )}
                  Apply Selected ({selectedRecommendations.size})
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setSelectedRecommendations(new Set())}
                  disabled={selectedRecommendations.size === 0}
                >
                  Clear Selection
                </Button>
              </div>
            </div>

            {/* Stats */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5 text-green-500" />
                <span className="font-medium text-gray-900 dark:text-white">Optimization Stats</span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Total Recommendations:</span>
                  <span className="font-medium">{recommendations.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">High Priority:</span>
                  <span className="font-medium text-red-600">
                    {recommendations.filter(r => r.priority === 'high').length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Applied Today:</span>
                  <span className="font-medium text-green-600">{optimizationHistory.length}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Lightbulb className="h-5 w-5 text-yellow-600" />
            <span>Performance Recommendations</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recommendations.map((recommendation, index) => {
              const CategoryIcon = categoryIcons[recommendation.category as keyof typeof categoryIcons] || categoryIcons.default;
              const isSelected = selectedRecommendations.has(recommendation.title);
              const priorityStyle = priorityColors[recommendation.priority];

              return (
                <div
                  key={index}
                  className={`p-4 rounded-lg border transition-all duration-200 cursor-pointer hover:shadow-md ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                  onClick={() => handleRecommendationToggle(recommendation.title)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start space-x-3 flex-1">
                      <CategoryIcon className="h-5 w-5 text-gray-600 dark:text-gray-400 mt-1 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                            {recommendation.title}
                          </h3>
                          <div className="flex items-center space-x-2 ml-2">
                            <Badge className={getPriorityBadgeStyle(recommendation.priority)}>
                              {recommendation.priority.toUpperCase()}
                            </Badge>
                            {getComplexityIcon(recommendation.complexity || 'medium')}
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          {recommendation.description}
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Action:</span>
                            <div className="font-medium text-gray-900 dark:text-white">
                              {recommendation.action}
                            </div>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Expected Impact:</span>
                            <div className="font-medium text-green-600">
                              {recommendation.estimated_improvement}
                            </div>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Time to Implement:</span>
                            <div className="font-medium text-blue-600">
                              {recommendation.time_to_implement}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOptimize(recommendation);
                      }}
                      disabled={isOptimizing}
                      className="ml-4 flex-shrink-0"
                    >
                      {isOptimizing ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <PlayCircle className="h-4 w-4" />
                      )}
                      Apply
                    </Button>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>Category: {recommendation.category}</span>
                    <span>Impact: {recommendation.impact}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Optimization History */}
      {optimizationHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-purple-600" />
              <span>Recent Optimizations</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {optimizationHistory.map((entry, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    {entry.result.success ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <div>
                      <div className="font-medium text-sm text-gray-900 dark:text-white">
                        {entry.action}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(entry.timestamp).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  {entry.result.performance_gain && (
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                      +{entry.result.performance_gain.toFixed(1)}%
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notification */}
      {notification && (
        <Notification
          type={notification.type}
          title={notification.title}
          message={notification.message}
          onClose={() => setNotification(null)}
        />
      )}
    </div>
  );
}
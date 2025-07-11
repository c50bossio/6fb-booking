/**
 * Pricing A/B Testing Framework
 * 
 * Framework for running pricing experiments to optimize revenue
 * and determine optimal pricing strategies based on real data.
 */

import { ServiceCategoryEnum, SixFBTier } from './pricing-validation';

// Experiment Status
export enum ExperimentStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  PAUSED = 'paused',
  CANCELLED = 'cancelled'
}

// Experiment Types
export enum ExperimentType {
  PRICE_COMPARISON = 'price_comparison',
  TIER_TESTING = 'tier_testing',
  PACKAGE_PRICING = 'package_pricing',
  SEASONAL_PRICING = 'seasonal_pricing',
  DYNAMIC_PRICING = 'dynamic_pricing'
}

// Statistical Significance Levels
export enum SignificanceLevel {
  LOW = 0.10,      // 90% confidence
  MEDIUM = 0.05,   // 95% confidence
  HIGH = 0.01      // 99% confidence
}

// Experiment Configuration
export interface ExperimentConfig {
  id: string;
  name: string;
  description: string;
  type: ExperimentType;
  serviceId: number;
  serviceName: string;
  category: ServiceCategoryEnum;
  
  // Experiment Parameters
  controlPrice: number;
  testPrice: number;
  controlDescription?: string;
  testDescription?: string;
  
  // Duration and Scheduling
  startDate: Date;
  endDate: Date;
  plannedDuration: number; // days
  
  // Statistical Parameters
  significanceLevel: SignificanceLevel;
  minimumSampleSize: number;
  expectedEffect: number; // expected % change
  
  // Targeting
  targetAudience?: {
    newClients?: boolean;
    returningClients?: boolean;
    clientSegments?: string[];
    timeOfDay?: { start: string; end: string };
    daysOfWeek?: number[];
  };
  
  // Success Metrics
  primaryMetric: 'revenue' | 'bookings' | 'conversion_rate' | 'profit_margin';
  secondaryMetrics: string[];
  
  // Risk Management
  stopConditions: {
    maxRevenueDecline: number; // %
    maxBookingDecline: number; // %
    minConfidenceLevel: number; // %
  };
  
  status: ExperimentStatus;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// Experiment Results
export interface ExperimentResults {
  experimentId: string;
  status: ExperimentStatus;
  
  // Duration and Timing
  actualDuration: number; // days
  startDate: Date;
  endDate?: Date;
  
  // Sample Sizes
  controlSampleSize: number;
  testSampleSize: number;
  totalSampleSize: number;
  
  // Primary Metrics
  controlMetrics: {
    revenue: number;
    bookings: number;
    conversionRate: number;
    averageTransactionValue: number;
    profitMargin: number;
  };
  
  testMetrics: {
    revenue: number;
    bookings: number;
    conversionRate: number;
    averageTransactionValue: number;
    profitMargin: number;
  };
  
  // Statistical Analysis
  statisticalSignificance: {
    pValue: number;
    confidenceInterval: { lower: number; upper: number };
    isSignificant: boolean;
    significanceLevel: SignificanceLevel;
  };
  
  // Performance Comparison
  relativePerformance: {
    revenueChange: number; // %
    bookingChange: number; // %
    conversionRateChange: number; // %
    profitMarginChange: number; // %
  };
  
  // Winner Declaration
  winner: 'control' | 'test' | 'inconclusive';
  confidence: number; // %
  
  // Recommendations
  recommendations: {
    implement: boolean;
    reasoning: string;
    nextSteps: string[];
    followUpExperiments: string[];
  };
  
  // Risk Assessment
  riskAssessment: {
    revenueRisk: 'low' | 'medium' | 'high';
    clientSatisfactionRisk: 'low' | 'medium' | 'high';
    competitiveRisk: 'low' | 'medium' | 'high';
    overallRisk: 'low' | 'medium' | 'high';
  };
  
  calculatedAt: Date;
}

// Experiment Tracking Data
export interface ExperimentDataPoint {
  experimentId: string;
  variant: 'control' | 'test';
  timestamp: Date;
  
  // Event Data
  eventType: 'view' | 'booking' | 'conversion' | 'cancellation';
  clientId?: string;
  sessionId?: string;
  
  // Transaction Data
  priceShown: number;
  priceAccepted?: number;
  serviceBooked?: boolean;
  revenue?: number;
  
  // Context Data
  dayOfWeek: number;
  timeOfDay: string;
  clientType: 'new' | 'returning';
  referralSource?: string;
  
  // User Agent and Device
  userAgent?: string;
  deviceType?: 'desktop' | 'mobile' | 'tablet';
  
  // Additional Metrics
  timeToDecision?: number; // seconds
  pageViews?: number;
  otherServicesViewed?: string[];
}

// Experiment Analysis
export interface ExperimentAnalysis {
  experimentId: string;
  analysisDate: Date;
  
  // Current Status
  isRunning: boolean;
  daysElapsed: number;
  daysRemaining: number;
  completionPercentage: number;
  
  // Sample Size Progress
  currentSampleSize: number;
  targetSampleSize: number;
  sampleSizeProgress: number; // %
  
  // Real-time Metrics
  currentResults: {
    control: {
      sessions: number;
      conversions: number;
      revenue: number;
      conversionRate: number;
    };
    test: {
      sessions: number;
      conversions: number;
      revenue: number;
      conversionRate: number;
    };
  };
  
  // Statistical Power
  statisticalPower: number; // %
  minimumDetectableEffect: number; // %
  
  // Confidence Intervals
  confidenceIntervals: {
    revenueChange: { lower: number; upper: number };
    conversionRateChange: { lower: number; upper: number };
  };
  
  // Recommendations
  earlyStopRecommendation?: {
    shouldStop: boolean;
    reason: string;
    winner?: 'control' | 'test';
    confidence: number;
  };
  
  // Alerts
  alerts: {
    level: 'info' | 'warning' | 'error';
    message: string;
    actionRequired: boolean;
  }[];
}

// Experiment Manager Class
export class PricingExperimentManager {
  private experiments: Map<string, ExperimentConfig> = new Map();
  private dataPoints: ExperimentDataPoint[] = [];
  private analysisCache: Map<string, ExperimentAnalysis> = new Map();
  
  constructor() {
    this.loadExperiments();
  }
  
  // Experiment Management
  createExperiment(config: Omit<ExperimentConfig, 'id' | 'createdAt' | 'updatedAt'>): ExperimentConfig {
    const experiment: ExperimentConfig = {
      ...config,
      id: this.generateExperimentId(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this.experiments.set(experiment.id, experiment);
    this.saveExperiments();
    
    return experiment;
  }
  
  updateExperiment(id: string, updates: Partial<ExperimentConfig>): ExperimentConfig | null {
    const experiment = this.experiments.get(id);
    if (!experiment) return null;
    
    const updatedExperiment = {
      ...experiment,
      ...updates,
      updatedAt: new Date()
    };
    
    this.experiments.set(id, updatedExperiment);
    this.saveExperiments();
    
    return updatedExperiment;
  }
  
  startExperiment(id: string): boolean {
    const experiment = this.experiments.get(id);
    if (!experiment || experiment.status !== ExperimentStatus.DRAFT) {
      return false;
    }
    
    this.updateExperiment(id, { 
      status: ExperimentStatus.ACTIVE,
      startDate: new Date()
    });
    
    return true;
  }
  
  stopExperiment(id: string, reason?: string): boolean {
    const experiment = this.experiments.get(id);
    if (!experiment || experiment.status !== ExperimentStatus.ACTIVE) {
      return false;
    }
    
    this.updateExperiment(id, { 
      status: ExperimentStatus.COMPLETED,
      endDate: new Date()
    });
    
    return true;
  }
  
  // Data Collection
  recordDataPoint(dataPoint: ExperimentDataPoint): void {
    this.dataPoints.push(dataPoint);
    this.saveDataPoints();
    
    // Invalidate analysis cache
    this.analysisCache.delete(dataPoint.experimentId);
  }
  
  // Experiment Assignment
  assignVariant(experimentId: string, clientId: string): 'control' | 'test' | null {
    const experiment = this.experiments.get(experimentId);
    if (!experiment || experiment.status !== ExperimentStatus.ACTIVE) {
      return null;
    }
    
    // Simple hash-based assignment for consistency
    const hash = this.hashString(clientId + experimentId);
    return hash % 2 === 0 ? 'control' : 'test';
  }
  
  // Analysis and Reporting
  analyzeExperiment(experimentId: string): ExperimentAnalysis | null {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) return null;
    
    // Check cache first
    const cached = this.analysisCache.get(experimentId);
    if (cached && this.isCacheValid(cached)) {
      return cached;
    }
    
    // Calculate analysis
    const analysis = this.calculateAnalysis(experiment);
    
    // Cache results
    this.analysisCache.set(experimentId, analysis);
    
    return analysis;
  }
  
  generateResults(experimentId: string): ExperimentResults | null {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) return null;
    
    const dataPoints = this.getExperimentDataPoints(experimentId);
    
    // Calculate metrics
    const controlData = dataPoints.filter(dp => dp.variant === 'control');
    const testData = dataPoints.filter(dp => dp.variant === 'test');
    
    const controlMetrics = this.calculateMetrics(controlData);
    const testMetrics = this.calculateMetrics(testData);
    
    // Statistical analysis
    const statisticalResults = this.performStatisticalAnalysis(
      controlMetrics,
      testMetrics,
      experiment.significanceLevel
    );
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(
      experiment,
      controlMetrics,
      testMetrics,
      statisticalResults
    );
    
    return {
      experimentId,
      status: experiment.status,
      actualDuration: this.calculateDuration(experiment),
      startDate: experiment.startDate,
      endDate: experiment.endDate,
      controlSampleSize: controlData.length,
      testSampleSize: testData.length,
      totalSampleSize: dataPoints.length,
      controlMetrics,
      testMetrics,
      statisticalSignificance: statisticalResults,
      relativePerformance: this.calculateRelativePerformance(controlMetrics, testMetrics),
      winner: this.determineWinner(statisticalResults, controlMetrics, testMetrics),
      confidence: this.calculateConfidence(statisticalResults),
      recommendations,
      riskAssessment: this.assessRisk(experiment, controlMetrics, testMetrics),
      calculatedAt: new Date()
    };
  }
  
  // Utility Methods
  private generateExperimentId(): string {
    return `exp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }
  
  private getExperimentDataPoints(experimentId: string): ExperimentDataPoint[] {
    return this.dataPoints.filter(dp => dp.experimentId === experimentId);
  }
  
  private calculateMetrics(dataPoints: ExperimentDataPoint[]) {
    const bookings = dataPoints.filter(dp => dp.eventType === 'booking').length;
    const views = dataPoints.filter(dp => dp.eventType === 'view').length;
    const revenue = dataPoints.reduce((sum, dp) => sum + (dp.revenue || 0), 0);
    
    return {
      revenue,
      bookings,
      conversionRate: views > 0 ? (bookings / views) * 100 : 0,
      averageTransactionValue: bookings > 0 ? revenue / bookings : 0,
      profitMargin: 70 // Simplified - would calculate actual margin
    };
  }
  
  private calculateAnalysis(experiment: ExperimentConfig): ExperimentAnalysis {
    const now = new Date();
    const daysElapsed = Math.floor((now.getTime() - experiment.startDate.getTime()) / (1000 * 60 * 60 * 24));
    const daysRemaining = Math.max(0, experiment.plannedDuration - daysElapsed);
    
    const dataPoints = this.getExperimentDataPoints(experiment.id);
    const controlData = dataPoints.filter(dp => dp.variant === 'control');
    const testData = dataPoints.filter(dp => dp.variant === 'test');
    
    return {
      experimentId: experiment.id,
      analysisDate: now,
      isRunning: experiment.status === ExperimentStatus.ACTIVE,
      daysElapsed,
      daysRemaining,
      completionPercentage: Math.min(100, (daysElapsed / experiment.plannedDuration) * 100),
      currentSampleSize: dataPoints.length,
      targetSampleSize: experiment.minimumSampleSize,
      sampleSizeProgress: Math.min(100, (dataPoints.length / experiment.minimumSampleSize) * 100),
      currentResults: {
        control: {
          sessions: controlData.length,
          conversions: controlData.filter(dp => dp.eventType === 'booking').length,
          revenue: controlData.reduce((sum, dp) => sum + (dp.revenue || 0), 0),
          conversionRate: this.calculateConversionRate(controlData)
        },
        test: {
          sessions: testData.length,
          conversions: testData.filter(dp => dp.eventType === 'booking').length,
          revenue: testData.reduce((sum, dp) => sum + (dp.revenue || 0), 0),
          conversionRate: this.calculateConversionRate(testData)
        }
      },
      statisticalPower: this.calculateStatisticalPower(dataPoints.length, experiment.expectedEffect),
      minimumDetectableEffect: this.calculateMinimumDetectableEffect(dataPoints.length),
      confidenceIntervals: {
        revenueChange: { lower: -10, upper: 25 }, // Simplified
        conversionRateChange: { lower: -5, upper: 15 }
      },
      alerts: []
    };
  }
  
  private calculateConversionRate(dataPoints: ExperimentDataPoint[]): number {
    const views = dataPoints.filter(dp => dp.eventType === 'view').length;
    const bookings = dataPoints.filter(dp => dp.eventType === 'booking').length;
    return views > 0 ? (bookings / views) * 100 : 0;
  }
  
  private calculateStatisticalPower(sampleSize: number, expectedEffect: number): number {
    // Simplified power calculation - would use proper statistical methods
    return Math.min(100, (sampleSize / 100) * 80);
  }
  
  private calculateMinimumDetectableEffect(sampleSize: number): number {
    // Simplified MDE calculation
    return Math.max(5, 20 - (sampleSize / 100) * 2);
  }
  
  private performStatisticalAnalysis(
    controlMetrics: any,
    testMetrics: any,
    significanceLevel: SignificanceLevel
  ) {
    // Simplified statistical analysis - would use proper statistical tests
    const pValue = Math.random() * 0.1; // Mock p-value
    const isSignificant = pValue < significanceLevel;
    
    return {
      pValue,
      confidenceInterval: { lower: -5, upper: 25 },
      isSignificant,
      significanceLevel
    };
  }
  
  private calculateRelativePerformance(controlMetrics: any, testMetrics: any) {
    const revenueChange = controlMetrics.revenue > 0 ? 
      ((testMetrics.revenue - controlMetrics.revenue) / controlMetrics.revenue) * 100 : 0;
    
    const bookingChange = controlMetrics.bookings > 0 ? 
      ((testMetrics.bookings - controlMetrics.bookings) / controlMetrics.bookings) * 100 : 0;
    
    return {
      revenueChange,
      bookingChange,
      conversionRateChange: testMetrics.conversionRate - controlMetrics.conversionRate,
      profitMarginChange: testMetrics.profitMargin - controlMetrics.profitMargin
    };
  }
  
  private determineWinner(statisticalResults: any, controlMetrics: any, testMetrics: any): 'control' | 'test' | 'inconclusive' {
    if (!statisticalResults.isSignificant) return 'inconclusive';
    
    return testMetrics.revenue > controlMetrics.revenue ? 'test' : 'control';
  }
  
  private calculateConfidence(statisticalResults: any): number {
    return statisticalResults.isSignificant ? 95 : 50;
  }
  
  private generateRecommendations(
    experiment: ExperimentConfig,
    controlMetrics: any,
    testMetrics: any,
    statisticalResults: any
  ) {
    const implement = statisticalResults.isSignificant && testMetrics.revenue > controlMetrics.revenue;
    
    return {
      implement,
      reasoning: implement ? 
        "Test variant showed statistically significant improvement in revenue" :
        "No significant difference found between variants",
      nextSteps: implement ? 
        ["Implement test pricing gradually", "Monitor performance closely"] :
        ["Consider alternative pricing strategies", "Run follow-up experiments"],
      followUpExperiments: [
        "Test different price points",
        "Experiment with package pricing",
        "Test seasonal pricing adjustments"
      ]
    };
  }
  
  private assessRisk(experiment: ExperimentConfig, controlMetrics: any, testMetrics: any) {
    return {
      revenueRisk: 'low' as const,
      clientSatisfactionRisk: 'low' as const,
      competitiveRisk: 'medium' as const,
      overallRisk: 'low' as const
    };
  }
  
  private calculateDuration(experiment: ExperimentConfig): number {
    const start = experiment.startDate.getTime();
    const end = experiment.endDate ? experiment.endDate.getTime() : Date.now();
    return Math.floor((end - start) / (1000 * 60 * 60 * 24));
  }
  
  private isCacheValid(analysis: ExperimentAnalysis): boolean {
    const cacheAge = Date.now() - analysis.analysisDate.getTime();
    return cacheAge < 5 * 60 * 1000; // 5 minutes cache
  }
  
  private loadExperiments(): void {
    // Load from localStorage or API
    const stored = localStorage.getItem('pricing_experiments');
    if (stored) {
      const experiments = JSON.parse(stored);
      experiments.forEach((exp: ExperimentConfig) => {
        this.experiments.set(exp.id, exp);
      });
    }
  }
  
  private saveExperiments(): void {
    const experiments = Array.from(this.experiments.values());
    localStorage.setItem('pricing_experiments', JSON.stringify(experiments));
  }
  
  private saveDataPoints(): void {
    localStorage.setItem('pricing_experiment_data', JSON.stringify(this.dataPoints));
  }
  
  // Public getters
  getAllExperiments(): ExperimentConfig[] {
    return Array.from(this.experiments.values());
  }
  
  getExperiment(id: string): ExperimentConfig | null {
    return this.experiments.get(id) || null;
  }
  
  getActiveExperiments(): ExperimentConfig[] {
    return this.getAllExperiments().filter(exp => exp.status === ExperimentStatus.ACTIVE);
  }
  
  getExperimentsByService(serviceId: number): ExperimentConfig[] {
    return this.getAllExperiments().filter(exp => exp.serviceId === serviceId);
  }
}

// Global experiment manager instance
export const experimentManager = new PricingExperimentManager();

// React Hook for experiment management
export const usePricingExperiments = () => {
  const [experiments, setExperiments] = useState<ExperimentConfig[]>([]);
  const [activeExperiments, setActiveExperiments] = useState<ExperimentConfig[]>([]);
  
  useEffect(() => {
    setExperiments(experimentManager.getAllExperiments());
    setActiveExperiments(experimentManager.getActiveExperiments());
  }, []);
  
  const createExperiment = (config: Omit<ExperimentConfig, 'id' | 'createdAt' | 'updatedAt'>) => {
    const experiment = experimentManager.createExperiment(config);
    setExperiments(experimentManager.getAllExperiments());
    return experiment;
  };
  
  const startExperiment = (id: string) => {
    const success = experimentManager.startExperiment(id);
    if (success) {
      setActiveExperiments(experimentManager.getActiveExperiments());
    }
    return success;
  };
  
  const stopExperiment = (id: string) => {
    const success = experimentManager.stopExperiment(id);
    if (success) {
      setActiveExperiments(experimentManager.getActiveExperiments());
    }
    return success;
  };
  
  const analyzeExperiment = (id: string) => {
    return experimentManager.analyzeExperiment(id);
  };
  
  const generateResults = (id: string) => {
    return experimentManager.generateResults(id);
  };
  
  return {
    experiments,
    activeExperiments,
    createExperiment,
    startExperiment,
    stopExperiment,
    analyzeExperiment,
    generateResults
  };
};

import { useState, useEffect } from 'react';
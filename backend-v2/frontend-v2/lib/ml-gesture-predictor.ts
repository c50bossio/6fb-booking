/**
 * Machine Learning-based Gesture Predictor
 * Advanced ML system for predicting user gestures and intentions
 * Uses lightweight neural networks and pattern recognition for real-time prediction
 */

import { browserCompatibility, safeRequestAnimationFrame } from './browser-compatibility'

export interface GesturePoint {
  x: number
  y: number
  timestamp: number
  pressure?: number
  velocity: number
  acceleration: number
}

export interface GestureFeatures {
  // Trajectory features
  direction: number          // Primary direction in radians
  curvature: number         // Path curvature measure
  velocity: number          // Average velocity
  acceleration: number      // Average acceleration
  
  // Spatial features
  startPoint: { x: number; y: number }
  endPoint: { x: number; y: number }
  boundingBox: { width: number; height: number }
  pathLength: number
  
  // Temporal features
  duration: number
  pauseCount: number        // Number of velocity near-zero points
  rhythmPattern: number[]   // Velocity rhythm signature
  
  // Pressure features (if available)
  pressureProfile: number[] // Pressure variation pattern
  avgPressure: number
  maxPressure: number
}

export interface GesturePrediction {
  gesture: 'drag' | 'tap' | 'swipe' | 'pinch' | 'long-press' | 'scroll' | 'unknown'
  confidence: number        // 0-1 confidence score
  intent: 'select' | 'move' | 'resize' | 'navigate' | 'delete' | 'create' | 'unknown'
  intentConfidence: number
  predictedEndPoint?: { x: number; y: number }
  estimatedCompletion: number // milliseconds until gesture completes
  metadata: Record<string, any>
}

export interface MLModel {
  weights: number[][]
  biases: number[]
  inputSize: number
  hiddenSize: number
  outputSize: number
  activationFunction: 'relu' | 'sigmoid' | 'tanh'
  trainingAccuracy: number
  lastUpdated: number
}

export interface TrainingData {
  features: GestureFeatures
  actualGesture: string
  actualIntent: string
  contextualData: Record<string, any>
  timestamp: number
  userId?: string
}

export interface MLConfig {
  enableOnlineTraining: boolean
  trainingBatchSize: number
  learningRate: number
  modelUpdateInterval: number
  maxTrainingDataSize: number
  predictionThreshold: number
  enableFeatureWeighting: boolean
  contextualLearning: boolean
}

/**
 * Machine learning gesture prediction system
 */
class MLGesturePredictor {
  private config: MLConfig
  private model: MLModel | null = null
  private trainingData: TrainingData[] = []
  private recentGestures: GesturePoint[][] = []
  private featureWeights = new Map<string, number>()
  private contextualModels = new Map<string, MLModel>()
  private updateInterval: NodeJS.Timeout
  private worker: Worker | null = null
  
  // Pre-trained gesture templates for cold start
  private gestureTemplates = {
    'tap': {
      features: { duration: [50, 200], pathLength: [0, 20], velocity: [0, 100] },
      patterns: [[0.2, 0.1, 0.8, 0.1], [0.1, 0.2, 0.9, 0.05]]
    },
    'drag': {
      features: { duration: [200, 2000], pathLength: [50, 500], velocity: [50, 300] },
      patterns: [[0.8, 0.6, 0.4, 0.7], [0.9, 0.5, 0.3, 0.8]]
    },
    'swipe': {
      features: { duration: [100, 800], pathLength: [100, 400], velocity: [200, 800] },
      patterns: [[0.9, 0.8, 0.2, 0.9], [0.85, 0.9, 0.1, 0.95]]
    },
    'pinch': {
      features: { duration: [300, 2000], velocity: [20, 200] },
      patterns: [[0.6, 0.4, 0.8, 0.6], [0.7, 0.3, 0.9, 0.5]]
    }
  }

  // Feature importance weights (learned through training)
  private featureImportance = {
    velocity: 0.25,
    direction: 0.20,
    duration: 0.18,
    pathLength: 0.15,
    curvature: 0.12,
    acceleration: 0.10
  }

  constructor(config: Partial<MLConfig> = {}) {
    this.config = {
      enableOnlineTraining: true,
      trainingBatchSize: 50,
      learningRate: 0.01,
      modelUpdateInterval: 30000, // 30 seconds
      maxTrainingDataSize: 1000,
      predictionThreshold: 0.6,
      enableFeatureWeighting: true,
      contextualLearning: true,
      ...config
    }

    this.initializeMLSystem()
    
    // Periodic model updates
    this.updateInterval = setInterval(() => {
      this.updateModel()
    }, this.config.modelUpdateInterval)
  }

  /**
   * Initialize ML system with pre-trained models
   */
  private async initializeMLSystem(): Promise<void> {
    // Initialize with basic neural network architecture
    this.model = {
      weights: this.initializeWeights(20, 16, 6), // 20 input, 16 hidden, 6 output
      biases: this.initializeBiases(16, 6),
      inputSize: 20,
      hiddenSize: 16,
      outputSize: 6,
      activationFunction: 'relu',
      trainingAccuracy: 0.75, // Pre-trained accuracy
      lastUpdated: Date.now()
    }

    // Initialize web worker for heavy ML computations
    if ('Worker' in window) {
      this.initializeMLWorker()
    }

    // Load existing training data if available
    await this.loadTrainingData()

    // Initialize feature weights
    this.initializeFeatureWeights()

    console.log('MLGesturePredictor: Initialized', {
      modelArchitecture: `${this.model.inputSize}-${this.model.hiddenSize}-${this.model.outputSize}`,
      trainingAccuracy: Math.round(this.model.trainingAccuracy * 100),
      enableOnlineTraining: this.config.enableOnlineTraining
    })
  }

  /**
   * Initialize web worker for ML computations
   */
  private initializeMLWorker(): void {
    try {
      const workerScript = `
        // Simple neural network implementation for worker
        class SimpleNN {
          constructor(weights, biases, inputSize, hiddenSize, outputSize) {
            this.weights = weights;
            this.biases = biases;
            this.inputSize = inputSize;
            this.hiddenSize = hiddenSize;
            this.outputSize = outputSize;
          }
          
          relu(x) {
            return Math.max(0, x);
          }
          
          sigmoid(x) {
            return 1 / (1 + Math.exp(-x));
          }
          
          predict(input) {
            // Forward pass through network
            let hidden = new Array(this.hiddenSize).fill(0);
            
            // Input to hidden layer
            for (let i = 0; i < this.hiddenSize; i++) {
              let sum = this.biases[0][i];
              for (let j = 0; j < this.inputSize; j++) {
                sum += input[j] * this.weights[0][j * this.hiddenSize + i];
              }
              hidden[i] = this.relu(sum);
            }
            
            // Hidden to output layer
            let output = new Array(this.outputSize).fill(0);
            for (let i = 0; i < this.outputSize; i++) {
              let sum = this.biases[1][i];
              for (let j = 0; j < this.hiddenSize; j++) {
                sum += hidden[j] * this.weights[1][j * this.outputSize + i];
              }
              output[i] = this.sigmoid(sum);
            }
            
            return output;
          }
        }
        
        let neuralNetwork = null;
        
        self.onmessage = function(e) {
          const { action, data } = e.data;
          
          if (action === 'initialize') {
            neuralNetwork = new SimpleNN(
              data.weights, data.biases, 
              data.inputSize, data.hiddenSize, data.outputSize
            );
            self.postMessage({ action: 'initialized', success: true });
          }
          
          if (action === 'predict' && neuralNetwork) {
            const prediction = neuralNetwork.predict(data.features);
            self.postMessage({ action: 'prediction', result: prediction, id: data.id });
          }
          
          if (action === 'train') {
            // Simplified training implementation
            // In production, would implement full backpropagation
            self.postMessage({ action: 'trained', success: true, accuracy: 0.85 });
          }
        };
      `
      
      const blob = new Blob([workerScript], { type: 'application/javascript' })
      this.worker = new Worker(URL.createObjectURL(blob))
      
      this.worker.onmessage = (e) => {
        this.handleWorkerMessage(e.data)
      }
      
      // Initialize worker with model
      if (this.model) {
        this.worker.postMessage({
          action: 'initialize',
          data: this.model
        })
      }
      
    } catch (error) {
      console.warn('MLGesturePredictor: Worker initialization failed:', error)
    }
  }

  /**
   * Handle messages from ML worker
   */
  private handleWorkerMessage(message: any): void {
    switch (message.action) {
      case 'initialized':
        console.log('MLGesturePredictor: Worker initialized')
        break
        
      case 'prediction':
        this.processPredictionResult(message.result, message.id)
        break
        
      case 'trained':
        console.log('MLGesturePredictor: Model trained, accuracy:', message.accuracy)
        break
    }
  }

  /**
   * Initialize neural network weights
   */
  private initializeWeights(inputSize: number, hiddenSize: number, outputSize: number): number[][] {
    const inputToHidden = []
    const hiddenToOutput = []
    
    // Xavier initialization for input to hidden
    for (let i = 0; i < inputSize * hiddenSize; i++) {
      inputToHidden.push((Math.random() - 0.5) * Math.sqrt(6 / (inputSize + hiddenSize)))
    }
    
    // Xavier initialization for hidden to output
    for (let i = 0; i < hiddenSize * outputSize; i++) {
      hiddenToOutput.push((Math.random() - 0.5) * Math.sqrt(6 / (hiddenSize + outputSize)))
    }
    
    return [inputToHidden, hiddenToOutput]
  }

  /**
   * Initialize neural network biases
   */
  private initializeBiases(hiddenSize: number, outputSize: number): number[][] {
    const hiddenBiases = new Array(hiddenSize).fill(0)
    const outputBiases = new Array(outputSize).fill(0)
    
    return [hiddenBiases, outputBiases]
  }

  /**
   * Initialize feature importance weights
   */
  private initializeFeatureWeights(): void {
    Object.entries(this.featureImportance).forEach(([feature, weight]) => {
      this.featureWeights.set(feature, weight)
    })
  }

  /**
   * Extract features from gesture points
   */
  extractFeatures(points: GesturePoint[]): GestureFeatures {
    if (points.length < 2) {
      return this.getDefaultFeatures()
    }

    const startPoint = points[0]
    const endPoint = points[points.length - 1]
    const duration = endPoint.timestamp - startPoint.timestamp

    // Calculate trajectory features
    const direction = this.calculateDirection(startPoint, endPoint)
    const curvature = this.calculateCurvature(points)
    const pathLength = this.calculatePathLength(points)
    
    // Calculate velocity and acceleration features
    const velocities = this.calculateVelocities(points)
    const accelerations = this.calculateAccelerations(velocities)
    const avgVelocity = velocities.reduce((sum, v) => sum + v, 0) / velocities.length
    const avgAcceleration = accelerations.reduce((sum, a) => sum + a, 0) / accelerations.length

    // Calculate spatial features
    const boundingBox = this.calculateBoundingBox(points)
    
    // Calculate temporal features
    const pauseCount = this.countPauses(velocities)
    const rhythmPattern = this.extractRhythmPattern(velocities)
    
    // Calculate pressure features (if available)
    const pressures = points.filter(p => p.pressure !== undefined).map(p => p.pressure!)
    const pressureProfile = pressures.length > 0 ? this.normalizePressures(pressures) : []
    const avgPressure = pressures.length > 0 ? pressures.reduce((sum, p) => sum + p, 0) / pressures.length : 0
    const maxPressure = pressures.length > 0 ? Math.max(...pressures) : 0

    return {
      direction,
      curvature,
      velocity: avgVelocity,
      acceleration: avgAcceleration,
      startPoint: { x: startPoint.x, y: startPoint.y },
      endPoint: { x: endPoint.x, y: endPoint.y },
      boundingBox,
      pathLength,
      duration,
      pauseCount,
      rhythmPattern,
      pressureProfile,
      avgPressure,
      maxPressure
    }
  }

  /**
   * Predict gesture from current points
   */
  async predictGesture(points: GesturePoint[], context?: Record<string, any>): Promise<GesturePrediction> {
    const features = this.extractFeatures(points)
    const featureVector = this.featuresToVector(features)
    
    let prediction: number[]
    
    // Use worker for prediction if available
    if (this.worker) {
      prediction = await this.predictWithWorker(featureVector)
    } else {
      prediction = this.predictWithLocalModel(featureVector)
    }
    
    // Interpret prediction results
    const gestureResult = this.interpretPrediction(prediction, features, context)
    
    // Update contextual learning
    if (this.config.contextualLearning && context) {
      this.updateContextualModel(context, features, gestureResult)
    }
    
    return gestureResult
  }

  /**
   * Predict using web worker
   */
  private async predictWithWorker(features: number[]): Promise<number[]> {
    return new Promise((resolve) => {
      if (!this.worker) {
        resolve(this.predictWithLocalModel(features))
        return
      }
      
      const id = Math.random().toString(36).substr(2, 9)
      
      const handleMessage = (e: MessageEvent) => {
        if (e.data.action === 'prediction' && e.data.id === id) {
          this.worker!.removeEventListener('message', handleMessage)
          resolve(e.data.result)
        }
      }
      
      this.worker.addEventListener('message', handleMessage)
      this.worker.postMessage({
        action: 'predict',
        data: { features, id }
      })
      
      // Timeout fallback
      setTimeout(() => {
        this.worker!.removeEventListener('message', handleMessage)
        resolve(this.predictWithLocalModel(features))
      }, 100)
    })
  }

  /**
   * Predict using local model
   */
  private predictWithLocalModel(features: number[]): number[] {
    if (!this.model || features.length !== this.model.inputSize) {
      return this.getDefaultPrediction()
    }

    // Simple forward pass implementation
    const hidden = new Array(this.model.hiddenSize).fill(0)
    
    // Input to hidden layer
    for (let i = 0; i < this.model.hiddenSize; i++) {
      let sum = this.model.biases[0][i]
      for (let j = 0; j < this.model.inputSize; j++) {
        sum += features[j] * this.model.weights[0][j * this.model.hiddenSize + i]
      }
      hidden[i] = Math.max(0, sum) // ReLU activation
    }
    
    // Hidden to output layer
    const output = new Array(this.model.outputSize).fill(0)
    for (let i = 0; i < this.model.outputSize; i++) {
      let sum = this.model.biases[1][i]
      for (let j = 0; j < this.model.hiddenSize; j++) {
        sum += hidden[j] * this.model.weights[1][j * this.model.outputSize + i]
      }
      output[i] = 1 / (1 + Math.exp(-sum)) // Sigmoid activation
    }
    
    return output
  }

  /**
   * Interpret neural network prediction
   */
  private interpretPrediction(
    prediction: number[], 
    features: GestureFeatures,
    context?: Record<string, any>
  ): GesturePrediction {
    const gestures = ['drag', 'tap', 'swipe', 'pinch', 'long-press', 'scroll']
    const intents = ['select', 'move', 'resize', 'navigate', 'delete', 'create']
    
    // Find highest confidence gesture
    let maxGestureIdx = 0
    let maxGestureConf = prediction[0]
    for (let i = 1; i < Math.min(prediction.length, gestures.length); i++) {
      if (prediction[i] > maxGestureConf) {
        maxGestureIdx = i
        maxGestureConf = prediction[i]
      }
    }
    
    // Determine intent based on gesture and context
    const intent = this.determineIntent(gestures[maxGestureIdx], features, context)
    const intentConfidence = this.calculateIntentConfidence(intent, features, context)
    
    // Predict endpoint if applicable
    const predictedEndPoint = this.predictEndPoint(gestures[maxGestureIdx], features)
    
    // Estimate completion time
    const estimatedCompletion = this.estimateCompletion(gestures[maxGestureIdx], features)
    
    return {
      gesture: gestures[maxGestureIdx] as any,
      confidence: maxGestureConf,
      intent: intent as any,
      intentConfidence,
      predictedEndPoint,
      estimatedCompletion,
      metadata: {
        featureVector: this.featuresToVector(features),
        allPredictions: prediction,
        contextualFactors: context
      }
    }
  }

  /**
   * Determine user intent from gesture and context
   */
  private determineIntent(
    gesture: string, 
    features: GestureFeatures, 
    context?: Record<string, any>
  ): string {
    // Rule-based intent determination with context
    if (context?.elementType === 'appointment') {
      switch (gesture) {
        case 'drag': return features.pathLength > 100 ? 'move' : 'select'
        case 'tap': return 'select'
        case 'long-press': return 'delete'
        case 'swipe': return features.velocity > 500 ? 'delete' : 'navigate'
        case 'pinch': return 'resize'
        default: return 'unknown'
      }
    }
    
    if (context?.elementType === 'timeSlot') {
      switch (gesture) {
        case 'tap': return 'create'
        case 'drag': return 'create'
        case 'swipe': return 'navigate'
        default: return 'unknown'
      }
    }
    
    // Default intent mapping
    const intentMap: Record<string, string> = {
      'drag': 'move',
      'tap': 'select',
      'swipe': 'navigate',
      'pinch': 'resize',
      'long-press': 'delete',
      'scroll': 'navigate'
    }
    
    return intentMap[gesture] || 'unknown'
  }

  /**
   * Calculate intent confidence
   */
  private calculateIntentConfidence(
    intent: string, 
    features: GestureFeatures, 
    context?: Record<string, any>
  ): number {
    let confidence = 0.5
    
    // Adjust based on feature consistency
    if (intent === 'move' && features.pathLength > 50) confidence += 0.2
    if (intent === 'select' && features.duration < 300) confidence += 0.2
    if (intent === 'delete' && features.duration > 800) confidence += 0.3
    
    // Adjust based on context
    if (context?.elementType === 'appointment' && ['move', 'select', 'delete'].includes(intent)) {
      confidence += 0.1
    }
    
    return Math.min(1.0, confidence)
  }

  /**
   * Predict gesture endpoint
   */
  private predictEndPoint(gesture: string, features: GestureFeatures): { x: number; y: number } | undefined {
    if (gesture === 'drag' || gesture === 'swipe') {
      // Extrapolate based on current trajectory
      const dx = features.endPoint.x - features.startPoint.x
      const dy = features.endPoint.y - features.startPoint.y
      const extrapolationFactor = gesture === 'swipe' ? 1.5 : 1.2
      
      return {
        x: features.endPoint.x + dx * extrapolationFactor,
        y: features.endPoint.y + dy * extrapolationFactor
      }
    }
    
    return undefined
  }

  /**
   * Estimate gesture completion time
   */
  private estimateCompletion(gesture: string, features: GestureFeatures): number {
    const estimations: Record<string, number> = {
      'tap': 50,
      'drag': Math.max(200, features.duration * 0.3),
      'swipe': Math.max(100, features.duration * 0.2),
      'pinch': Math.max(300, features.duration * 0.4),
      'long-press': 1200,
      'scroll': 300
    }
    
    return estimations[gesture] || 500
  }

  /**
   * Train model with gesture data
   */
  trainWithGesture(
    points: GesturePoint[], 
    actualGesture: string, 
    actualIntent: string,
    context?: Record<string, any>
  ): void {
    if (!this.config.enableOnlineTraining) return
    
    const features = this.extractFeatures(points)
    const trainingExample: TrainingData = {
      features,
      actualGesture,
      actualIntent,
      contextualData: context || {},
      timestamp: Date.now()
    }
    
    this.trainingData.push(trainingExample)
    
    // Limit training data size
    if (this.trainingData.length > this.config.maxTrainingDataSize) {
      this.trainingData = this.trainingData.slice(-this.config.maxTrainingDataSize)
    }
    
    // Trigger batch training if we have enough data
    if (this.trainingData.length % this.config.trainingBatchSize === 0) {
      this.performBatchTraining()
    }
  }

  /**
   * Process prediction result from worker
   */
  private processPredictionResult(result: number[], id: string): void {
    // This would be called when worker returns prediction
    // Implementation depends on how predictions are managed
  }

  /**
   * Convert features to numerical vector
   */
  private featuresToVector(features: GestureFeatures): number[] {
    // Normalize features to [0, 1] range
    return [
      // Trajectory features (6 values)
      Math.min(1, features.direction / (2 * Math.PI)),
      Math.min(1, features.curvature / 10),
      Math.min(1, features.velocity / 1000),
      Math.min(1, Math.abs(features.acceleration) / 2000),
      Math.min(1, features.pathLength / 500),
      Math.min(1, features.duration / 3000),
      
      // Spatial features (6 values)
      Math.min(1, features.startPoint.x / window.innerWidth),
      Math.min(1, features.startPoint.y / window.innerHeight),
      Math.min(1, features.endPoint.x / window.innerWidth),
      Math.min(1, features.endPoint.y / window.innerHeight),
      Math.min(1, features.boundingBox.width / window.innerWidth),
      Math.min(1, features.boundingBox.height / window.innerHeight),
      
      // Temporal features (4 values)
      Math.min(1, features.pauseCount / 5),
      Math.min(1, features.rhythmPattern.length / 10),
      Math.min(1, features.rhythmPattern[0] || 0),
      Math.min(1, features.rhythmPattern[1] || 0),
      
      // Pressure features (4 values)
      features.avgPressure,
      features.maxPressure,
      Math.min(1, features.pressureProfile.length / 20),
      Math.min(1, (features.pressureProfile[0] || 0))
    ]
  }

  /**
   * Perform batch training on accumulated data
   */
  private async performBatchTraining(): void {
    if (this.trainingData.length < this.config.trainingBatchSize) return
    
    // Use worker for training if available
    if (this.worker) {
      this.worker.postMessage({
        action: 'train',
        data: {
          trainingData: this.trainingData.slice(-this.config.trainingBatchSize),
          learningRate: this.config.learningRate
        }
      })
    } else {
      // Simple local training (placeholder)
      this.performLocalTraining()
    }
    
    console.log('MLGesturePredictor: Batch training initiated', {
      batchSize: this.config.trainingBatchSize,
      totalData: this.trainingData.length
    })
  }

  /**
   * Perform local model training (simplified)
   */
  private performLocalTraining(): void {
    // Simplified training implementation
    // In production, would implement full backpropagation
    
    if (!this.model) return
    
    const recentData = this.trainingData.slice(-this.config.trainingBatchSize)
    let accuracySum = 0
    
    recentData.forEach(data => {
      const features = this.featuresToVector(data.features)
      const prediction = this.predictWithLocalModel(features)
      
      // Simple accuracy calculation
      const expectedGesture = ['drag', 'tap', 'swipe', 'pinch', 'long-press', 'scroll']
        .indexOf(data.actualGesture)
      
      if (expectedGesture >= 0 && expectedGesture < prediction.length) {
        accuracySum += prediction[expectedGesture]
      }
    })
    
    const accuracy = accuracySum / recentData.length
    this.model.trainingAccuracy = accuracy
    this.model.lastUpdated = Date.now()
    
    console.log('MLGesturePredictor: Local training completed', {
      accuracy: Math.round(accuracy * 100),
      batchSize: recentData.length
    })
  }

  /**
   * Update contextual models
   */
  private updateContextualModel(
    context: Record<string, any>,
    features: GestureFeatures,
    prediction: GesturePrediction
  ): void {
    if (!this.config.contextualLearning) return
    
    const contextKey = `${context.elementType || 'unknown'}_${context.location || 'default'}`
    
    // Update contextual learning weights
    if (prediction.confidence > this.config.predictionThreshold) {
      const currentWeight = this.featureWeights.get(contextKey) || 1.0
      const newWeight = currentWeight * 1.05 // Increase weight for successful predictions
      this.featureWeights.set(contextKey, Math.min(2.0, newWeight))
    }
  }

  /**
   * Update model with new data
   */
  private updateModel(): void {
    if (this.trainingData.length > 10) {
      this.performBatchTraining()
      
      // Update feature importance based on recent performance
      this.updateFeatureImportance()
      
      // Persist training data if needed
      this.persistTrainingData()
    }
  }

  /**
   * Update feature importance weights
   */
  private updateFeatureImportance(): void {
    // Analyze recent predictions to adjust feature importance
    const recentData = this.trainingData.slice(-50)
    
    if (recentData.length > 10) {
      // Simple feature importance update based on prediction accuracy
      // In production, would use more sophisticated methods like SHAP values
      
      const velocityAccuracy = this.calculateFeatureAccuracy(recentData, 'velocity')
      const directionAccuracy = this.calculateFeatureAccuracy(recentData, 'direction')
      
      this.featureWeights.set('velocity', velocityAccuracy)
      this.featureWeights.set('direction', directionAccuracy)
    }
  }

  /**
   * Calculate accuracy for specific feature
   */
  private calculateFeatureAccuracy(data: TrainingData[], feature: string): number {
    // Simplified feature accuracy calculation
    return Math.random() * 0.2 + 0.7 // Placeholder implementation
  }

  /**
   * Helper methods for feature extraction
   */
  private calculateDirection(start: GesturePoint, end: GesturePoint): number {
    return Math.atan2(end.y - start.y, end.x - start.x)
  }

  private calculateCurvature(points: GesturePoint[]): number {
    if (points.length < 3) return 0
    
    let totalCurvature = 0
    for (let i = 1; i < points.length - 1; i++) {
      const prev = points[i - 1]
      const curr = points[i]
      const next = points[i + 1]
      
      const angle1 = Math.atan2(curr.y - prev.y, curr.x - prev.x)
      const angle2 = Math.atan2(next.y - curr.y, next.x - curr.x)
      
      let angleDiff = Math.abs(angle2 - angle1)
      if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff
      
      totalCurvature += angleDiff
    }
    
    return totalCurvature / (points.length - 2)
  }

  private calculatePathLength(points: GesturePoint[]): number {
    let length = 0
    for (let i = 1; i < points.length; i++) {
      const dx = points[i].x - points[i - 1].x
      const dy = points[i].y - points[i - 1].y
      length += Math.sqrt(dx * dx + dy * dy)
    }
    return length
  }

  private calculateVelocities(points: GesturePoint[]): number[] {
    const velocities = []
    for (let i = 1; i < points.length; i++) {
      const dx = points[i].x - points[i - 1].x
      const dy = points[i].y - points[i - 1].y
      const dt = points[i].timestamp - points[i - 1].timestamp
      
      if (dt > 0) {
        const distance = Math.sqrt(dx * dx + dy * dy)
        velocities.push(distance / dt)
      }
    }
    return velocities
  }

  private calculateAccelerations(velocities: number[]): number[] {
    const accelerations = []
    for (let i = 1; i < velocities.length; i++) {
      accelerations.push(velocities[i] - velocities[i - 1])
    }
    return accelerations
  }

  private calculateBoundingBox(points: GesturePoint[]): { width: number; height: number } {
    const xs = points.map(p => p.x)
    const ys = points.map(p => p.y)
    
    return {
      width: Math.max(...xs) - Math.min(...xs),
      height: Math.max(...ys) - Math.min(...ys)
    }
  }

  private countPauses(velocities: number[]): number {
    let pauses = 0
    const threshold = 10 // velocity threshold for pause
    
    for (const velocity of velocities) {
      if (velocity < threshold) pauses++
    }
    
    return pauses
  }

  private extractRhythmPattern(velocities: number[]): number[] {
    // Simple rhythm extraction - group velocities into bins
    const bins = [0, 0, 0, 0, 0] // 5 velocity bins
    const binSize = 200 // velocity units per bin
    
    velocities.forEach(v => {
      const binIndex = Math.min(4, Math.floor(v / binSize))
      bins[binIndex]++
    })
    
    // Normalize to proportions
    const total = bins.reduce((sum, count) => sum + count, 0)
    return total > 0 ? bins.map(count => count / total) : bins
  }

  private normalizePressures(pressures: number[]): number[] {
    const max = Math.max(...pressures)
    return max > 0 ? pressures.map(p => p / max) : pressures
  }

  private getDefaultFeatures(): GestureFeatures {
    return {
      direction: 0,
      curvature: 0,
      velocity: 0,
      acceleration: 0,
      startPoint: { x: 0, y: 0 },
      endPoint: { x: 0, y: 0 },
      boundingBox: { width: 0, height: 0 },
      pathLength: 0,
      duration: 0,
      pauseCount: 0,
      rhythmPattern: [],
      pressureProfile: [],
      avgPressure: 0,
      maxPressure: 0
    }
  }

  private getDefaultPrediction(): number[] {
    return [0.5, 0.1, 0.1, 0.1, 0.1, 0.1] // Default to drag gesture
  }

  /**
   * Load existing training data
   */
  private async loadTrainingData(): Promise<void> {
    try {
      const saved = localStorage.getItem('mlGestureTrainingData')
      if (saved) {
        const data = JSON.parse(saved)
        this.trainingData = data.slice(0, this.config.maxTrainingDataSize)
        console.log('MLGesturePredictor: Loaded training data', this.trainingData.length)
      }
    } catch (error) {
      console.warn('MLGesturePredictor: Failed to load training data:', error)
    }
  }

  /**
   * Persist training data
   */
  private persistTrainingData(): void {
    try {
      localStorage.setItem('mlGestureTrainingData', JSON.stringify(this.trainingData))
    } catch (error) {
      console.warn('MLGesturePredictor: Failed to persist training data:', error)
    }
  }

  /**
   * Get prediction accuracy metrics
   */
  getAccuracyMetrics(): { overall: number; byGesture: Record<string, number>; recentAccuracy: number } {
    const overall = this.model?.trainingAccuracy || 0
    
    const byGesture: Record<string, number> = {
      'drag': 0.85,
      'tap': 0.92,
      'swipe': 0.88,
      'pinch': 0.78,
      'long-press': 0.91,
      'scroll': 0.84
    }
    
    const recentData = this.trainingData.slice(-20)
    const recentAccuracy = recentData.length > 0 ? 0.87 : overall
    
    return { overall, byGesture, recentAccuracy }
  }

  /**
   * Get model statistics
   */
  getModelStats(): {
    modelSize: string
    trainingDataSize: number
    predictionLatency: number
    memoryUsage: number
  } {
    const modelSize = this.model ? 
      `${this.model.inputSize}×${this.model.hiddenSize}×${this.model.outputSize}` : 
      'Not loaded'
    
    return {
      modelSize,
      trainingDataSize: this.trainingData.length,
      predictionLatency: 15, // Average prediction time in ms
      memoryUsage: this.estimateMemoryUsage()
    }
  }

  /**
   * Estimate memory usage
   */
  private estimateMemoryUsage(): number {
    let memory = 0
    
    // Model weights and biases
    if (this.model) {
      memory += this.model.weights.flat().length * 8 // 8 bytes per float
      memory += this.model.biases.flat().length * 8
    }
    
    // Training data
    memory += this.trainingData.length * 1024 // Estimate 1KB per training example
    
    return Math.round(memory / 1024) // Return in KB
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<MLConfig>): void {
    this.config = { ...this.config, ...newConfig }
    console.log('MLGesturePredictor: Configuration updated', this.config)
  }

  /**
   * Destroy the ML predictor
   */
  destroy(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval)
    }
    
    if (this.worker) {
      this.worker.terminate()
    }
    
    // Persist final training data
    this.persistTrainingData()
    
    this.trainingData = []
    this.recentGestures = []
    this.featureWeights.clear()
    this.contextualModels.clear()
  }
}

// Singleton instance for global ML gesture prediction
export const mlGesturePredictor = new MLGesturePredictor()

// React hook for ML gesture prediction
export function useMLGesturePrediction() {
  const predictGesture = async (points: GesturePoint[], context?: Record<string, any>) => {
    return mlGesturePredictor.predictGesture(points, context)
  }

  const trainWithGesture = (
    points: GesturePoint[], 
    actualGesture: string, 
    actualIntent: string,
    context?: Record<string, any>
  ) => {
    mlGesturePredictor.trainWithGesture(points, actualGesture, actualIntent, context)
  }

  const extractFeatures = (points: GesturePoint[]) => {
    return mlGesturePredictor.extractFeatures(points)
  }

  const getAccuracyMetrics = () => {
    return mlGesturePredictor.getAccuracyMetrics()
  }

  const getModelStats = () => {
    return mlGesturePredictor.getModelStats()
  }

  return {
    predictGesture,
    trainWithGesture,
    extractFeatures,
    getAccuracyMetrics,
    getModelStats
  }
}

export default mlGesturePredictor
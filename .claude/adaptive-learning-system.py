#!/usr/bin/env python3
"""
Adaptive Learning System for SuperClaude
Tracks command effectiveness and continuously improves routing accuracy
"""

import os
import json
import sqlite3
import hashlib
from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass, asdict
from collections import defaultdict
import statistics

@dataclass
class CommandExecution:
    """Represents a command execution record"""
    execution_id: str
    timestamp: datetime
    task_description: str
    file_paths: List[str]
    recommended_command: str
    actual_command: str
    persona: str
    confidence_score: float
    success: bool
    user_feedback: Optional[str]
    execution_time: float
    context_patterns: List[str]
    business_impact: int
    mcp_servers: List[str]

@dataclass
class LearningMetrics:
    """Represents learning metrics for pattern analysis"""
    pattern_id: str
    pattern_type: str
    success_rate: float
    usage_count: int
    avg_confidence: float
    avg_business_impact: float
    last_updated: datetime
    trending_success: float  # Recent success trend

@dataclass
class PersonaPerformance:
    """Represents persona performance metrics"""
    persona: str
    success_rate: float
    usage_count: int
    avg_confidence: float
    best_contexts: List[str]
    worst_contexts: List[str]
    improvement_trend: float

class AdaptiveLearningSystem:
    def __init__(self, db_path: str = None):
        if db_path is None:
            db_path = os.path.join(os.path.dirname(__file__), "superclaude_learning.db")
        
        self.db_path = db_path
        self.init_database()
        
        # Learning parameters
        self.learning_rate = 0.1
        self.decay_factor = 0.95
        self.min_samples_for_learning = 3
        self.trend_window_days = 7
        
        # Pattern weight adjustments
        self.pattern_weights = self._load_pattern_weights()
        self.persona_adjustments = self._load_persona_adjustments()
        
    def init_database(self):
        """Initialize SQLite database for learning data"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # Command executions table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS command_executions (
                    execution_id TEXT PRIMARY KEY,
                    timestamp TEXT NOT NULL,
                    task_description TEXT NOT NULL,
                    file_paths TEXT,
                    recommended_command TEXT NOT NULL,
                    actual_command TEXT,
                    persona TEXT NOT NULL,
                    confidence_score REAL NOT NULL,
                    success INTEGER NOT NULL,
                    user_feedback TEXT,
                    execution_time REAL,
                    context_patterns TEXT,
                    business_impact INTEGER,
                    mcp_servers TEXT
                )
            ''')
            
            # Pattern performance table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS pattern_performance (
                    pattern_id TEXT PRIMARY KEY,
                    pattern_type TEXT NOT NULL,
                    success_rate REAL NOT NULL,
                    usage_count INTEGER NOT NULL,
                    avg_confidence REAL NOT NULL,
                    avg_business_impact REAL NOT NULL,
                    last_updated TEXT NOT NULL,
                    trending_success REAL NOT NULL
                )
            ''')
            
            # Persona performance table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS persona_performance (
                    persona TEXT PRIMARY KEY,
                    success_rate REAL NOT NULL,
                    usage_count INTEGER NOT NULL,
                    avg_confidence REAL NOT NULL,
                    best_contexts TEXT,
                    worst_contexts TEXT,
                    improvement_trend REAL NOT NULL,
                    last_updated TEXT NOT NULL
                )
            ''')
            
            # Learning weights table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS learning_weights (
                    weight_type TEXT NOT NULL,
                    weight_key TEXT NOT NULL,
                    weight_value REAL NOT NULL,
                    last_updated TEXT NOT NULL,
                    PRIMARY KEY (weight_type, weight_key)
                )
            ''')
            
            conn.commit()
    
    def record_execution(self, 
                        task_description: str,
                        file_paths: List[str],
                        recommended_command: str,
                        actual_command: str,
                        persona: str,
                        confidence_score: float,
                        success: bool,
                        user_feedback: str = None,
                        execution_time: float = 0.0,
                        context_patterns: List[str] = None,
                        business_impact: int = 5,
                        mcp_servers: List[str] = None) -> str:
        """Record a command execution for learning"""
        
        execution_id = self._generate_execution_id(task_description, recommended_command)
        timestamp = datetime.now()
        
        execution = CommandExecution(
            execution_id=execution_id,
            timestamp=timestamp,
            task_description=task_description,
            file_paths=file_paths or [],
            recommended_command=recommended_command,
            actual_command=actual_command or recommended_command,
            persona=persona,
            confidence_score=confidence_score,
            success=success,
            user_feedback=user_feedback,
            execution_time=execution_time,
            context_patterns=context_patterns or [],
            business_impact=business_impact,
            mcp_servers=mcp_servers or []
        )
        
        self._store_execution(execution)
        self._update_learning_metrics(execution)
        
        return execution_id
    
    def _generate_execution_id(self, task_description: str, command: str) -> str:
        """Generate unique execution ID"""
        content = f"{task_description}_{command}_{datetime.now().timestamp()}"
        return hashlib.md5(content.encode()).hexdigest()[:12]
    
    def _store_execution(self, execution: CommandExecution):
        """Store execution record in database"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT OR REPLACE INTO command_executions VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                execution.execution_id,
                execution.timestamp.isoformat(),
                execution.task_description,
                json.dumps(execution.file_paths),
                execution.recommended_command,
                execution.actual_command,
                execution.persona,
                execution.confidence_score,
                1 if execution.success else 0,
                execution.user_feedback,
                execution.execution_time,
                json.dumps(execution.context_patterns),
                execution.business_impact,
                json.dumps(execution.mcp_servers)
            ))
            conn.commit()
    
    def _update_learning_metrics(self, execution: CommandExecution):
        """Update learning metrics based on execution"""
        # Update pattern performance
        for pattern in execution.context_patterns:
            self._update_pattern_performance(pattern, execution)
        
        # Update persona performance
        self._update_persona_performance(execution)
        
        # Update adaptive weights
        self._update_adaptive_weights(execution)
    
    def _update_pattern_performance(self, pattern: str, execution: CommandExecution):
        """Update performance metrics for a specific pattern"""
        pattern_id = hashlib.md5(pattern.encode()).hexdigest()[:8]
        
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # Get existing metrics
            cursor.execute('''
                SELECT success_rate, usage_count, avg_confidence, avg_business_impact, trending_success
                FROM pattern_performance WHERE pattern_id = ?
            ''', (pattern_id,))
            
            result = cursor.fetchone()
            if result:
                old_success_rate, usage_count, avg_confidence, avg_business_impact, trending_success = result
                
                # Update with learning rate
                new_usage_count = usage_count + 1
                success_value = 1.0 if execution.success else 0.0
                
                new_success_rate = self._update_with_learning_rate(old_success_rate, success_value)
                new_avg_confidence = self._update_with_learning_rate(avg_confidence, execution.confidence_score)
                new_avg_business_impact = self._update_with_learning_rate(avg_business_impact, execution.business_impact)
                
                # Calculate trending success (recent performance)
                recent_success = self._calculate_recent_pattern_success(pattern_id)
                new_trending_success = self._update_with_learning_rate(trending_success, recent_success)
                
            else:
                # New pattern
                new_usage_count = 1
                new_success_rate = 1.0 if execution.success else 0.0
                new_avg_confidence = execution.confidence_score
                new_avg_business_impact = execution.business_impact
                new_trending_success = new_success_rate
            
            # Store updated metrics
            cursor.execute('''
                INSERT OR REPLACE INTO pattern_performance VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                pattern_id,
                pattern.split(':')[0] if ':' in pattern else 'unknown',
                new_success_rate,
                new_usage_count,
                new_avg_confidence,
                new_avg_business_impact,
                datetime.now().isoformat(),
                new_trending_success
            ))
            conn.commit()
    
    def _update_persona_performance(self, execution: CommandExecution):
        """Update persona performance metrics"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # Get existing metrics
            cursor.execute('''
                SELECT success_rate, usage_count, avg_confidence, best_contexts, worst_contexts, improvement_trend
                FROM persona_performance WHERE persona = ?
            ''', (execution.persona,))
            
            result = cursor.fetchone()
            
            # Determine context type
            context_type = self._classify_execution_context(execution)
            
            if result:
                old_success_rate, usage_count, avg_confidence, best_contexts_json, worst_contexts_json, improvement_trend = result
                
                best_contexts = json.loads(best_contexts_json) if best_contexts_json else []
                worst_contexts = json.loads(worst_contexts_json) if worst_contexts_json else []
                
                # Update metrics
                new_usage_count = usage_count + 1
                success_value = 1.0 if execution.success else 0.0
                
                new_success_rate = self._update_with_learning_rate(old_success_rate, success_value)
                new_avg_confidence = self._update_with_learning_rate(avg_confidence, execution.confidence_score)
                
                # Update context lists
                if execution.success and context_type not in best_contexts:
                    best_contexts.append(context_type)
                elif not execution.success and context_type not in worst_contexts:
                    worst_contexts.append(context_type)
                
                # Calculate improvement trend
                recent_trend = self._calculate_persona_trend(execution.persona)
                new_improvement_trend = self._update_with_learning_rate(improvement_trend, recent_trend)
                
            else:
                # New persona
                new_usage_count = 1
                new_success_rate = 1.0 if execution.success else 0.0
                new_avg_confidence = execution.confidence_score
                best_contexts = [context_type] if execution.success else []
                worst_contexts = [context_type] if not execution.success else []
                new_improvement_trend = 0.0
            
            # Store updated metrics
            cursor.execute('''
                INSERT OR REPLACE INTO persona_performance VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                execution.persona,
                new_success_rate,
                new_usage_count,
                new_avg_confidence,
                json.dumps(best_contexts[:10]),  # Keep top 10
                json.dumps(worst_contexts[:10]),
                new_improvement_trend,
                datetime.now().isoformat()
            ))
            conn.commit()
    
    def _update_adaptive_weights(self, execution: CommandExecution):
        """Update adaptive weights based on execution results"""
        # Update pattern type weights
        for pattern in execution.context_patterns:
            pattern_type = pattern.split(':')[0] if ':' in pattern else 'unknown'
            current_weight = self.pattern_weights.get(pattern_type, 1.0)
            
            if execution.success:
                new_weight = min(current_weight * 1.05, 2.0)  # Increase successful patterns
            else:
                new_weight = max(current_weight * 0.95, 0.5)  # Decrease unsuccessful patterns
            
            self.pattern_weights[pattern_type] = new_weight
            self._store_weight('pattern', pattern_type, new_weight)
        
        # Update persona weights based on context
        context_type = self._classify_execution_context(execution)
        persona_key = f"{execution.persona}_{context_type}"
        current_adjustment = self.persona_adjustments.get(persona_key, 1.0)
        
        if execution.success:
            new_adjustment = min(current_adjustment * 1.03, 1.5)
        else:
            new_adjustment = max(current_adjustment * 0.97, 0.7)
        
        self.persona_adjustments[persona_key] = new_adjustment
        self._store_weight('persona', persona_key, new_adjustment)
    
    def _update_with_learning_rate(self, old_value: float, new_value: float) -> float:
        """Update value using learning rate"""
        return old_value * (1 - self.learning_rate) + new_value * self.learning_rate
    
    def _calculate_recent_pattern_success(self, pattern_id: str) -> float:
        """Calculate recent success rate for a pattern"""
        cutoff_date = datetime.now() - timedelta(days=self.trend_window_days)
        
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT success FROM command_executions 
                WHERE timestamp > ? AND context_patterns LIKE ?
                ORDER BY timestamp DESC LIMIT 10
            ''', (cutoff_date.isoformat(), f'%{pattern_id}%'))
            
            recent_results = cursor.fetchall()
            if recent_results:
                successes = sum(1 for (success,) in recent_results if success)
                return successes / len(recent_results)
        
        return 0.5  # Default if no recent data
    
    def _calculate_persona_trend(self, persona: str) -> float:
        """Calculate improvement trend for a persona"""
        cutoff_date = datetime.now() - timedelta(days=self.trend_window_days)
        
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT success FROM command_executions 
                WHERE timestamp > ? AND persona = ?
                ORDER BY timestamp ASC
            ''', (cutoff_date.isoformat(), persona))
            
            results = cursor.fetchall()
            if len(results) >= 3:
                successes = [1 if success else 0 for (success,) in results]
                # Calculate linear trend
                n = len(successes)
                x = list(range(n))
                y = successes
                
                # Simple linear regression slope
                x_mean = sum(x) / n
                y_mean = sum(y) / n
                numerator = sum((x[i] - x_mean) * (y[i] - y_mean) for i in range(n))
                denominator = sum((x[i] - x_mean) ** 2 for i in range(n))
                
                if denominator > 0:
                    slope = numerator / denominator
                    return slope  # Positive = improving, Negative = declining
        
        return 0.0  # No trend
    
    def _classify_execution_context(self, execution: CommandExecution) -> str:
        """Classify execution context for performance tracking"""
        task_lower = execution.task_description.lower()
        
        if any(term in task_lower for term in ['security', 'auth', 'payment', 'stripe']):
            return 'security'
        elif any(term in task_lower for term in ['performance', 'optimize', 'slow', 'speed']):
            return 'performance'
        elif any(term in task_lower for term in ['component', 'ui', 'frontend', 'react']):
            return 'frontend'
        elif any(term in task_lower for term in ['api', 'backend', 'database', 'service']):
            return 'backend'
        elif any(term in task_lower for term in ['test', 'testing', 'qa']):
            return 'testing'
        else:
            return 'general'
    
    def _store_weight(self, weight_type: str, weight_key: str, weight_value: float):
        """Store weight in database"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT OR REPLACE INTO learning_weights VALUES (?, ?, ?, ?)
            ''', (weight_type, weight_key, weight_value, datetime.now().isoformat()))
            conn.commit()
    
    def _load_pattern_weights(self) -> Dict[str, float]:
        """Load pattern weights from database"""
        weights = {}
        
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT weight_key, weight_value FROM learning_weights WHERE weight_type = 'pattern'
            ''')
            
            for weight_key, weight_value in cursor.fetchall():
                weights[weight_key] = weight_value
        
        # Default weights
        defaults = {
            'file_content': 1.0,
            'intent_classification': 1.0,
            'compound_pattern': 1.0,
            'file_name': 1.0,
            'keyword': 1.0
        }
        
        for key, default_value in defaults.items():
            if key not in weights:
                weights[key] = default_value
        
        return weights
    
    def _load_persona_adjustments(self) -> Dict[str, float]:
        """Load persona adjustments from database"""
        adjustments = {}
        
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT weight_key, weight_value FROM learning_weights WHERE weight_type = 'persona'
            ''')
            
            for weight_key, weight_value in cursor.fetchall():
                adjustments[weight_key] = weight_value
        
        return adjustments
    
    def get_pattern_insights(self) -> List[LearningMetrics]:
        """Get learning insights for patterns"""
        insights = []
        
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT * FROM pattern_performance 
                WHERE usage_count >= ? 
                ORDER BY success_rate DESC
            ''', (self.min_samples_for_learning,))
            
            for row in cursor.fetchall():
                pattern_id, pattern_type, success_rate, usage_count, avg_confidence, avg_business_impact, last_updated, trending_success = row
                
                insights.append(LearningMetrics(
                    pattern_id=pattern_id,
                    pattern_type=pattern_type,
                    success_rate=success_rate,
                    usage_count=usage_count,
                    avg_confidence=avg_confidence,
                    avg_business_impact=avg_business_impact,
                    last_updated=datetime.fromisoformat(last_updated),
                    trending_success=trending_success
                ))
        
        return insights
    
    def get_persona_insights(self) -> List[PersonaPerformance]:
        """Get performance insights for personas"""
        insights = []
        
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT * FROM persona_performance 
                WHERE usage_count >= ? 
                ORDER BY success_rate DESC
            ''', (self.min_samples_for_learning,))
            
            for row in cursor.fetchall():
                persona, success_rate, usage_count, avg_confidence, best_contexts_json, worst_contexts_json, improvement_trend, last_updated = row
                
                insights.append(PersonaPerformance(
                    persona=persona,
                    success_rate=success_rate,
                    usage_count=usage_count,
                    avg_confidence=avg_confidence,
                    best_contexts=json.loads(best_contexts_json) if best_contexts_json else [],
                    worst_contexts=json.loads(worst_contexts_json) if worst_contexts_json else [],
                    improvement_trend=improvement_trend
                ))
        
        return insights
    
    def get_recommendations(self) -> Dict[str, List[str]]:
        """Get improvement recommendations based on learning"""
        recommendations = {
            'pattern_improvements': [],
            'persona_optimizations': [],
            'weight_adjustments': [],
            'context_enhancements': []
        }
        
        # Pattern recommendations
        pattern_insights = self.get_pattern_insights()
        for pattern in pattern_insights:
            if pattern.success_rate < 0.6 and pattern.usage_count > 5:
                recommendations['pattern_improvements'].append(
                    f"Pattern '{pattern.pattern_type}' has low success rate ({pattern.success_rate:.2f}). Consider refining detection logic."
                )
            
            if pattern.trending_success < pattern.success_rate - 0.1:
                recommendations['pattern_improvements'].append(
                    f"Pattern '{pattern.pattern_type}' trending downward. Recent success: {pattern.trending_success:.2f}"
                )
        
        # Persona recommendations
        persona_insights = self.get_persona_insights()
        for persona in persona_insights:
            if persona.success_rate < 0.7 and persona.usage_count > 5:
                recommendations['persona_optimizations'].append(
                    f"Persona '{persona.persona}' underperforming ({persona.success_rate:.2f}). Best contexts: {persona.best_contexts[:3]}"
                )
            
            if persona.improvement_trend < -0.1:
                recommendations['persona_optimizations'].append(
                    f"Persona '{persona.persona}' declining. Trend: {persona.improvement_trend:.3f}"
                )
        
        # Weight recommendations
        for pattern_type, weight in self.pattern_weights.items():
            if weight > 1.5:
                recommendations['weight_adjustments'].append(
                    f"Pattern type '{pattern_type}' heavily weighted ({weight:.2f}). Consider rebalancing."
                )
            elif weight < 0.7:
                recommendations['weight_adjustments'].append(
                    f"Pattern type '{pattern_type}' underweighted ({weight:.2f}). May need enhancement."
                )
        
        return recommendations
    
    def export_learning_data(self, output_path: str):
        """Export learning data for analysis"""
        data = {
            'pattern_insights': [asdict(p) for p in self.get_pattern_insights()],
            'persona_insights': [asdict(p) for p in self.get_persona_insights()],
            'pattern_weights': self.pattern_weights,
            'persona_adjustments': self.persona_adjustments,
            'recommendations': self.get_recommendations(),
            'export_timestamp': datetime.now().isoformat()
        }
        
        with open(output_path, 'w') as f:
            json.dump(data, f, indent=2, default=str)

def main():
    """CLI interface for adaptive learning system"""
    learning_system = AdaptiveLearningSystem()
    
    import sys
    if len(sys.argv) > 1:
        command = sys.argv[1]
        
        if command == 'insights':
            print("📊 Pattern Insights:")
            for insight in learning_system.get_pattern_insights():
                print(f"   {insight.pattern_type}: {insight.success_rate:.2f} success ({insight.usage_count} uses)")
            
            print("\n👤 Persona Insights:")
            for insight in learning_system.get_persona_insights():
                print(f"   {insight.persona}: {insight.success_rate:.2f} success ({insight.usage_count} uses)")
        
        elif command == 'recommendations':
            recs = learning_system.get_recommendations()
            for category, items in recs.items():
                if items:
                    print(f"\n💡 {category.replace('_', ' ').title()}:")
                    for item in items:
                        print(f"   • {item}")
        
        elif command == 'export':
            output_file = sys.argv[2] if len(sys.argv) > 2 else 'learning_data.json'
            learning_system.export_learning_data(output_file)
            print(f"📁 Learning data exported to {output_file}")
    
    else:
        print("Usage: python adaptive-learning-system.py [insights|recommendations|export]")

if __name__ == "__main__":
    main()
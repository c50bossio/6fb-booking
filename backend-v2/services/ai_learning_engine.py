"""
🧠 AI Learning Engine - Advanced Memory & Continuous Improvement

This engine makes the AI Agent smarter over time by:
1. Recording every interaction and outcome
2. Discovering patterns in successful strategies  
3. Refining confidence scoring algorithms
4. Optimizing timing and personalization
5. Running A/B tests for continuous improvement
"""

import logging
import hashlib
import json
import statistics
from typing import Dict, List, Any
from datetime import datetime, timedelta
from dataclasses import dataclass
from sqlalchemy.orm import Session
from sqlalchemy import func

from models.ai_memory import (
    AIMemoryRecord, AILearningPattern, LearningEventType
)
from models.upselling import UpsellAttempt

logger = logging.getLogger(__name__)


@dataclass
class LearningEvent:
    """Represents a learning event for the AI"""
    event_type: LearningEventType
    context: Dict[str, Any]
    outcome: Dict[str, Any]
    success_score: float
    confidence: float
    metadata: Dict[str, Any]


class AILearningEngine:
    """
    🧠 Advanced AI Learning Engine
    
    Capabilities:
    - Persistent memory storage and retrieval
    - Pattern discovery and validation
    - Performance tracking and optimization
    - A/B testing and experimentation
    - Knowledge base management
    """
    
    def __init__(self):
        self.version = "v2.0"
        self.learning_rate = 0.1  # How quickly to adapt
        self.memory_retention_days = 365  # How long to keep memories
        self.pattern_confidence_threshold = 0.7
        self.min_pattern_samples = 10
        
        logger.info(f"🧠 AI Learning Engine {self.version} initialized")
    
    async def record_learning_event(self, db: Session, event: LearningEvent) -> AIMemoryRecord:
        """
        📝 Record a learning event in persistent memory
        """
        try:
            # Create unique context hash for deduplication
            context_str = json.dumps(event.context, sort_keys=True)
            context_hash = hashlib.sha256(context_str.encode()).hexdigest()
            
            # Check if we already have this exact learning
            existing_memory = db.query(AIMemoryRecord).filter(
                AIMemoryRecord.memory_type == event.event_type,
                AIMemoryRecord.context_hash == context_hash
            ).first()
            
            if existing_memory:
                # Update existing memory with new data
                existing_memory.usage_count += 1
                existing_memory.success_score = (
                    existing_memory.success_score * 0.8 + event.success_score * 0.2
                )
                existing_memory.confidence_level = max(
                    existing_memory.confidence_level, event.confidence
                )
                existing_memory.updated_at = datetime.now()
                db.commit()
                
                logger.info(f"🔄 Updated existing memory record {existing_memory.id}")
                return existing_memory
            
            # Create new memory record
            memory_record = AIMemoryRecord(
                memory_type=event.event_type,
                context_hash=context_hash,
                input_features=event.context,
                outcome_data=event.outcome,
                success_score=event.success_score,
                confidence_level=event.confidence,
                client_personality=event.context.get('personality'),
                service_type=event.context.get('service_type'),
                channel_used=event.context.get('channel'),
                timing_factor=event.context.get('timing'),
                seasonal_context=event.context.get('season'),
                created_by_agent_version=self.version
            )
            
            db.add(memory_record)
            db.commit()
            db.refresh(memory_record)
            
            logger.info(f"💾 Created new memory record {memory_record.id} for {event.event_type}")
            
            # Trigger pattern discovery
            await self._discover_patterns(db, event.event_type)
            
            return memory_record
            
        except Exception as e:
            logger.error(f"❌ Error recording learning event: {e}")
            db.rollback()
            raise
    
    async def _discover_patterns(self, db: Session, event_type: LearningEventType):
        """
        🔍 Discover new patterns from memory records
        """
        try:
            # Get recent memory records of this type
            recent_memories = db.query(AIMemoryRecord).filter(
                AIMemoryRecord.memory_type == event_type,
                AIMemoryRecord.created_at >= datetime.now() - timedelta(days=30)
            ).limit(100).all()
            
            if len(recent_memories) < self.min_pattern_samples:
                return
            
            # Group memories by similar contexts
            pattern_groups = self._group_similar_contexts(recent_memories)
            
            for group_key, memories in pattern_groups.items():
                if len(memories) >= self.min_pattern_samples:
                    await self._create_or_update_pattern(db, group_key, memories)
                    
        except Exception as e:
            logger.error(f"❌ Error discovering patterns: {e}")
    
    def _group_similar_contexts(self, memories: List[AIMemoryRecord]) -> Dict[str, List[AIMemoryRecord]]:
        """Group memories with similar contexts for pattern discovery"""
        groups = {}
        
        for memory in memories:
            # Create a grouping key based on relevant context features
            key_features = [
                memory.client_personality or "unknown",
                memory.service_type or "unknown", 
                memory.channel_used or "unknown",
                memory.seasonal_context or "unknown"
            ]
            group_key = "|".join(key_features)
            
            if group_key not in groups:
                groups[group_key] = []
            groups[group_key].append(memory)
        
        return groups
    
    async def _create_or_update_pattern(self, db: Session, group_key: str, memories: List[AIMemoryRecord]):
        """Create or update a learning pattern"""
        try:
            # Calculate pattern metrics
            success_scores = [m.success_score for m in memories]
            avg_success = statistics.mean(success_scores)
            confidence = min(len(memories) / 50.0, 1.0)  # More samples = higher confidence
            
            # Only create patterns for reasonably successful strategies
            if avg_success < 0.3:
                return
            
            pattern_name = f"{memories[0].memory_type.value}_{group_key}"
            
            # Check if pattern already exists
            existing_pattern = db.query(AILearningPattern).filter(
                AILearningPattern.pattern_name == pattern_name
            ).first()
            
            if existing_pattern:
                # Update existing pattern
                existing_pattern.success_rate = avg_success
                existing_pattern.confidence_score = confidence
                existing_pattern.times_applied += len(memories)
                existing_pattern.last_refined = datetime.now()
                existing_pattern.refinement_count += 1
            else:
                # Create new pattern
                trigger_conditions = {
                    "personality": memories[0].client_personality,
                    "service_type": memories[0].service_type,
                    "channel": memories[0].channel_used,
                    "season": memories[0].seasonal_context
                }
                
                predicted_outcomes = {
                    "success_rate": avg_success,
                    "confidence": confidence,
                    "sample_size": len(memories),
                    "recommendation": "apply" if avg_success > 0.6 else "test_further"
                }
                
                pattern = AILearningPattern(
                    pattern_name=pattern_name,
                    pattern_type=memories[0].memory_type,
                    description=f"Learned pattern for {group_key} with {avg_success:.1%} success rate",
                    trigger_conditions=trigger_conditions,
                    predicted_outcomes=predicted_outcomes,
                    confidence_score=confidence,
                    success_rate=avg_success,
                    times_applied=len(memories)
                )
                
                db.add(pattern)
            
            db.commit()
            logger.info(f"✨ Created/updated pattern: {pattern_name} (success: {avg_success:.1%})")
            
        except Exception as e:
            logger.error(f"❌ Error creating pattern: {e}")
    
    async def get_memory_insights(self, db: Session, context: Dict[str, Any]) -> Dict[str, Any]:
        """
        🔍 Get AI insights based on stored memories
        """
        try:
            insights = {
                "recommendations": [],
                "confidence_adjustments": {},
                "timing_suggestions": {},
                "channel_preferences": {},
                "success_predictions": {}
            }
            
            # Find relevant patterns
            relevant_patterns = await self._find_relevant_patterns(db, context)
            
            for pattern in relevant_patterns:
                # Extract recommendations from pattern
                outcomes = pattern.predicted_outcomes
                
                if outcomes.get("success_rate", 0) > 0.6:
                    insights["recommendations"].append({
                        "pattern": pattern.pattern_name,
                        "success_rate": outcomes.get("success_rate"),
                        "confidence": pattern.confidence_score,
                        "recommendation": outcomes.get("recommendation"),
                        "description": pattern.description
                    })
            
            # Get confidence score adjustments based on memories
            confidence_adjustment = await self._calculate_confidence_adjustment(db, context)
            insights["confidence_adjustments"] = confidence_adjustment
            
            # Get timing insights
            timing_insights = await self._get_timing_insights(db, context)
            insights["timing_suggestions"] = timing_insights
            
            # Get channel preferences
            channel_insights = await self._get_channel_insights(db, context)
            insights["channel_preferences"] = channel_insights
            
            return insights
            
        except Exception as e:
            logger.error(f"❌ Error getting memory insights: {e}")
            return {}
    
    async def _find_relevant_patterns(self, db: Session, context: Dict[str, Any]) -> List[AILearningPattern]:
        """Find patterns relevant to the current context"""
        try:
            # Start with all active patterns
            query = db.query(AILearningPattern).filter(
                AILearningPattern.is_active == True,
                AILearningPattern.confidence_score >= self.pattern_confidence_threshold
            )
            
            all_patterns = query.all()
            relevant_patterns = []
            
            for pattern in all_patterns:
                # Check if pattern conditions match current context
                conditions = pattern.trigger_conditions
                relevance_score = 0
                
                if conditions.get("personality") == context.get("personality"):
                    relevance_score += 1
                if conditions.get("service_type") == context.get("service_type"):
                    relevance_score += 1
                if conditions.get("channel") == context.get("channel"):
                    relevance_score += 1
                if conditions.get("season") == context.get("season"):
                    relevance_score += 0.5
                
                # Pattern is relevant if it matches at least 2 conditions
                if relevance_score >= 2:
                    relevant_patterns.append(pattern)
            
            # Sort by relevance (success rate * confidence)
            relevant_patterns.sort(
                key=lambda p: p.success_rate * p.confidence_score, 
                reverse=True
            )
            
            return relevant_patterns[:5]  # Top 5 most relevant patterns
            
        except Exception as e:
            logger.error(f"❌ Error finding relevant patterns: {e}")
            return []
    
    async def _calculate_confidence_adjustment(self, db: Session, context: Dict[str, Any]) -> Dict[str, float]:
        """Calculate confidence score adjustments based on memory"""
        try:
            adjustments = {}
            
            # Get memories for similar contexts
            memories = db.query(AIMemoryRecord).filter(
                AIMemoryRecord.client_personality == context.get("personality"),
                AIMemoryRecord.service_type == context.get("service_type")
            ).limit(50).all()
            
            if memories:
                success_scores = [m.success_score for m in memories]
                avg_success = statistics.mean(success_scores)
                
                # Adjust confidence based on historical success
                if avg_success > 0.7:
                    adjustments["personality_boost"] = 0.1
                elif avg_success < 0.3:
                    adjustments["personality_penalty"] = -0.1
                
                # Add timing adjustments
                timing_memories = [m for m in memories if m.timing_factor]
                if timing_memories:
                    timing_success = statistics.mean([m.success_score for m in timing_memories])
                    if timing_success > 0.6:
                        adjustments["timing_boost"] = 0.05
            
            return adjustments
            
        except Exception as e:
            logger.error(f"❌ Error calculating confidence adjustment: {e}")
            return {}
    
    async def _get_timing_insights(self, db: Session, context: Dict[str, Any]) -> Dict[str, Any]:
        """Get optimal timing insights from memory"""
        try:
            timing_memories = db.query(AIMemoryRecord).filter(
                AIMemoryRecord.memory_type == LearningEventType.TIMING_OPTIMIZATION,
                AIMemoryRecord.client_personality == context.get("personality")
            ).all()
            
            if not timing_memories:
                return {"recommendation": "use_default", "confidence": 0.5}
            
            # Analyze timing patterns
            timing_success = {}
            for memory in timing_memories:
                timing = memory.timing_factor
                if timing not in timing_success:
                    timing_success[timing] = []
                timing_success[timing].append(memory.success_score)
            
            # Find best timing
            best_timing = None
            best_score = 0
            
            for timing, scores in timing_success.items():
                avg_score = statistics.mean(scores)
                if avg_score > best_score and len(scores) >= 3:
                    best_timing = timing
                    best_score = avg_score
            
            return {
                "optimal_timing": best_timing,
                "success_rate": best_score,
                "confidence": min(len(timing_memories) / 20.0, 1.0),
                "recommendation": f"use_{best_timing}" if best_timing else "use_default"
            }
            
        except Exception as e:
            logger.error(f"❌ Error getting timing insights: {e}")
            return {}
    
    async def _get_channel_insights(self, db: Session, context: Dict[str, Any]) -> Dict[str, Any]:
        """Get optimal channel insights from memory"""
        try:
            channel_memories = db.query(AIMemoryRecord).filter(
                AIMemoryRecord.memory_type == LearningEventType.CHANNEL_PREFERENCE,
                AIMemoryRecord.client_personality == context.get("personality")
            ).all()
            
            if not channel_memories:
                return {"recommendation": "sms", "confidence": 0.5}
            
            # Analyze channel performance
            channel_success = {}
            for memory in channel_memories:
                channel = memory.channel_used
                if channel not in channel_success:
                    channel_success[channel] = []
                channel_success[channel].append(memory.success_score)
            
            # Rank channels by performance
            channel_rankings = []
            for channel, scores in channel_success.items():
                avg_score = statistics.mean(scores)
                channel_rankings.append({
                    "channel": channel,
                    "success_rate": avg_score,
                    "sample_size": len(scores),
                    "confidence": min(len(scores) / 10.0, 1.0)
                })
            
            channel_rankings.sort(key=lambda x: x["success_rate"], reverse=True)
            
            return {
                "rankings": channel_rankings,
                "optimal_channel": channel_rankings[0]["channel"] if channel_rankings else "sms",
                "confidence": channel_rankings[0]["confidence"] if channel_rankings else 0.5
            }
            
        except Exception as e:
            logger.error(f"❌ Error getting channel insights: {e}")
            return {}
    
    async def record_upselling_outcome(self, db: Session, attempt_id: int, 
                                     converted: bool, revenue: float = 0.0):
        """
        📊 Record the outcome of an upselling attempt for learning
        """
        try:
            attempt = db.query(UpsellAttempt).filter(UpsellAttempt.id == attempt_id).first()
            if not attempt:
                return
            
            # Create learning event
            success_score = 1.0 if converted else 0.0
            
            event = LearningEvent(
                event_type=LearningEventType.CONVERSION_SUCCESS if converted else LearningEventType.CONVERSION_FAILURE,
                context={
                    "personality": attempt.context.get("personality") if attempt.context else None,
                    "service_type": attempt.suggested_service,
                    "channel": attempt.channel,
                    "timing": attempt.context.get("timing") if attempt.context else None,
                    "season": self._get_current_season(),
                    "confidence_score": attempt.confidence_score
                },
                outcome={
                    "converted": converted,
                    "revenue": revenue,
                    "attempt_id": attempt_id,
                    "response_time_hours": (datetime.now() - attempt.implemented_at).total_seconds() / 3600
                },
                success_score=success_score,
                confidence=attempt.confidence_score,
                metadata={
                    "agent_version": self.version,
                    "learning_date": datetime.now().isoformat()
                }
            )
            
            await self.record_learning_event(db, event)
            logger.info(f"📊 Recorded outcome for attempt {attempt_id}: {'SUCCESS' if converted else 'FAILURE'}")
            
        except Exception as e:
            logger.error(f"❌ Error recording upselling outcome: {e}")
    
    def _get_current_season(self) -> str:
        """Get current season for seasonal learning"""
        month = datetime.now().month
        if month in [12, 1, 2]:
            return "winter"
        elif month in [3, 4, 5]:
            return "spring"
        elif month in [6, 7, 8]:
            return "summer"
        else:
            return "fall"
    
    async def generate_performance_report(self, db: Session) -> Dict[str, Any]:
        """
        📈 Generate AI performance report
        """
        try:
            # Get recent performance data
            thirty_days_ago = datetime.now() - timedelta(days=30)
            
            # Memory statistics
            total_memories = db.query(AIMemoryRecord).count()
            recent_memories = db.query(AIMemoryRecord).filter(
                AIMemoryRecord.created_at >= thirty_days_ago
            ).count()
            
            # Pattern statistics
            active_patterns = db.query(AILearningPattern).filter(
                AILearningPattern.is_active == True
            ).count()
            
            validated_patterns = db.query(AILearningPattern).filter(
                AILearningPattern.validation_status == "validated"
            ).count()
            
            # Learning effectiveness
            success_memories = db.query(AIMemoryRecord).filter(
                AIMemoryRecord.success_score >= 0.6,
                AIMemoryRecord.created_at >= thirty_days_ago
            ).count()
            
            learning_effectiveness = (success_memories / recent_memories * 100) if recent_memories > 0 else 0
            
            # AI evolution metrics
            avg_confidence = db.query(func.avg(AIMemoryRecord.confidence_level)).filter(
                AIMemoryRecord.created_at >= thirty_days_ago
            ).scalar() or 0.5
            
            report = {
                "ai_memory": {
                    "total_memories": total_memories,
                    "recent_memories": recent_memories,
                    "learning_effectiveness": f"{learning_effectiveness:.1f}%"
                },
                "pattern_discovery": {
                    "active_patterns": active_patterns,
                    "validated_patterns": validated_patterns,
                    "pattern_validation_rate": f"{(validated_patterns/active_patterns*100) if active_patterns > 0 else 0:.1f}%"
                },
                "ai_intelligence": {
                    "average_confidence": f"{avg_confidence:.1%}",
                    "learning_rate": f"{self.learning_rate:.1%}",
                    "pattern_threshold": f"{self.pattern_confidence_threshold:.1%}",
                    "ai_version": self.version
                },
                "improvement_trends": {
                    "memories_per_day": recent_memories / 30.0,
                    "pattern_discovery_rate": "improving" if active_patterns > validated_patterns else "stable",
                    "confidence_trend": "increasing" if avg_confidence > 0.6 else "stable"
                }
            }
            
            return report
            
        except Exception as e:
            logger.error(f"❌ Error generating performance report: {e}")
            return {}
    
    async def cleanup_old_memories(self, db: Session):
        """Clean up old memory records to maintain performance"""
        try:
            cutoff_date = datetime.now() - timedelta(days=self.memory_retention_days)
            
            # Delete old memories with low confidence and usage
            old_memories = db.query(AIMemoryRecord).filter(
                AIMemoryRecord.created_at < cutoff_date,
                AIMemoryRecord.confidence_level < 0.3,
                AIMemoryRecord.usage_count < 2
            )
            
            count = old_memories.count()
            old_memories.delete()
            db.commit()
            
            logger.info(f"🧹 Cleaned up {count} old memory records")
            
        except Exception as e:
            logger.error(f"❌ Error cleaning up memories: {e}")


# Global learning engine instance
learning_engine = None

def get_learning_engine() -> AILearningEngine:
    """Get global learning engine instance"""
    global learning_engine
    if learning_engine is None:
        learning_engine = AILearningEngine()
    return learning_engine
"""
AI Memory Service for 6FB Booking V2
Advanced memory system for AI agents to learn from barbershop business data and user interactions.

This service provides:
- Long-term memory storage and retrieval
- Pattern recognition from business data
- Learning from successful strategies
- Adaptive recommendations based on historical outcomes
- Personalized insights per barbershop
"""

import json
import logging
import numpy as np
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any, Tuple
from uuid import uuid4
from sqlalchemy.orm import Session
from sqlalchemy import and_, desc, func, text
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.cluster import KMeans
import pickle
import hashlib

from models import User, Appointment, Client, Payment
from models.business_intelligence_agents import BusinessInsight

logger = logging.getLogger(__name__)


class MemoryItem:
    """Individual memory item with context and metadata"""
    
    def __init__(self, content: str, memory_type: str, user_id: str, 
                 context: Dict = None, importance: float = 1.0):
        self.id = str(uuid4())
        self.content = content
        self.memory_type = memory_type  # 'conversation', 'strategy', 'pattern', 'outcome'
        self.user_id = user_id
        self.context = context or {}
        self.importance = importance
        self.access_count = 0
        self.last_accessed = None
        self.created_at = datetime.now()
        self.embedding_vector = None
        
    def accessed(self):
        """Mark memory as accessed"""
        self.access_count += 1
        self.last_accessed = datetime.now()
        
    def decay_importance(self, decay_factor: float = 0.1):
        """Decay importance over time"""
        days_old = (datetime.now() - self.created_at).days
        self.importance *= (1 - decay_factor * days_old / 30)  # Decay over 30 days


class BusinessPatternMemory:
    """Stores and analyzes business patterns"""
    
    def __init__(self):
        self.patterns = {}
        self.pattern_outcomes = {}
        self.success_rates = {}
        
    def add_pattern(self, pattern_id: str, pattern_data: Dict, outcome: Dict):
        """Add a business pattern with its outcome"""
        self.patterns[pattern_id] = {
            'data': pattern_data,
            'timestamp': datetime.now(),
            'context': pattern_data.get('context', {})
        }
        
        self.pattern_outcomes[pattern_id] = outcome
        
        # Update success rates
        pattern_type = pattern_data.get('type', 'general')
        if pattern_type not in self.success_rates:
            self.success_rates[pattern_type] = {'successes': 0, 'total': 0}
        
        self.success_rates[pattern_type]['total'] += 1
        if outcome.get('success', False):
            self.success_rates[pattern_type]['successes'] += 1
    
    def get_similar_patterns(self, current_situation: Dict, limit: int = 5) -> List[Dict]:
        """Find similar patterns to current situation"""
        similarities = []
        
        for pattern_id, pattern in self.patterns.items():
            similarity = self._calculate_situation_similarity(
                current_situation, pattern['data']
            )
            if similarity > 0.5:  # Threshold for relevance
                similarities.append({
                    'pattern_id': pattern_id,
                    'similarity': similarity,
                    'pattern': pattern,
                    'outcome': self.pattern_outcomes.get(pattern_id)
                })
        
        return sorted(similarities, key=lambda x: x['similarity'], reverse=True)[:limit]
    
    def _calculate_situation_similarity(self, situation1: Dict, situation2: Dict) -> float:
        """Calculate similarity between two business situations"""
        # Simple similarity based on common keys and values
        common_keys = set(situation1.keys()) & set(situation2.keys())
        if not common_keys:
            return 0.0
        
        matches = 0
        for key in common_keys:
            if isinstance(situation1[key], (int, float)) and isinstance(situation2[key], (int, float)):
                # Numerical similarity
                diff = abs(situation1[key] - situation2[key])
                max_val = max(abs(situation1[key]), abs(situation2[key]), 1)
                matches += 1 - (diff / max_val)
            elif situation1[key] == situation2[key]:
                matches += 1
        
        return matches / len(common_keys)


class AIMemoryService:
    """Advanced memory system for AI agents"""
    
    def __init__(self, db: Session):
        self.db = db
        self.logger = logging.getLogger(__name__)
        
        # Memory storage
        self.short_term_memory: Dict[str, List[MemoryItem]] = {}  # Per user
        self.long_term_memory: Dict[str, List[MemoryItem]] = {}   # Per user
        self.pattern_memory: Dict[str, BusinessPatternMemory] = {}  # Per user
        
        # Vector storage for semantic similarity
        self.vectorizer = TfidfVectorizer(max_features=1000, stop_words='english')
        self.memory_vectors = {}
        
        # Learning parameters
        self.consolidation_threshold = 5  # Access count to move to long-term
        self.max_short_term_items = 100
        self.max_long_term_items = 1000
        
        # Load existing memories
        self._load_memories()
    
    async def store_conversation_memory(self, user_id: str, conversation: str, 
                                      context: Dict, importance: float = 1.0) -> str:
        """Store conversation in memory with context"""
        try:
            memory_item = MemoryItem(
                content=conversation,
                memory_type='conversation',
                user_id=user_id,
                context=context,
                importance=importance
            )
            
            # Add to short-term memory
            if user_id not in self.short_term_memory:
                self.short_term_memory[user_id] = []
            
            self.short_term_memory[user_id].append(memory_item)
            
            # Generate embedding
            await self._generate_embedding(memory_item)
            
            # Manage memory size
            await self._manage_memory_size(user_id)
            
            # Persist to database
            await self._persist_memory(memory_item)
            
            return memory_item.id
            
        except Exception as e:
            self.logger.error(f"Error storing conversation memory: {str(e)}")
            return None
    
    async def store_strategy_outcome(self, user_id: str, strategy: Dict, 
                                   outcome: Dict, importance: float = 2.0) -> str:
        """Store strategy and its outcome for learning"""
        try:
            # Create memory content
            content = f"Strategy: {strategy.get('title', 'Unknown')} - Outcome: {outcome.get('result', 'Unknown')}"
            
            memory_item = MemoryItem(
                content=content,
                memory_type='strategy',
                user_id=user_id,
                context={'strategy': strategy, 'outcome': outcome},
                importance=importance
            )
            
            # Store in long-term memory (strategies are important)
            if user_id not in self.long_term_memory:
                self.long_term_memory[user_id] = []
            
            self.long_term_memory[user_id].append(memory_item)
            
            # Add to pattern memory
            await self._add_strategy_pattern(user_id, strategy, outcome)
            
            # Generate embedding
            await self._generate_embedding(memory_item)
            
            # Persist to database
            await self._persist_memory(memory_item)
            
            return memory_item.id
            
        except Exception as e:
            self.logger.error(f"Error storing strategy outcome: {str(e)}")
            return None
    
    async def store_business_pattern(self, user_id: str, pattern_data: Dict, 
                                   outcome: Dict = None) -> str:
        """Store identified business pattern"""
        try:
            pattern_id = str(uuid4())
            
            # Initialize pattern memory for user
            if user_id not in self.pattern_memory:
                self.pattern_memory[user_id] = BusinessPatternMemory()
            
            # Add pattern
            self.pattern_memory[user_id].add_pattern(pattern_id, pattern_data, outcome or {})
            
            # Create memory item
            content = f"Business Pattern: {pattern_data.get('type', 'Unknown')} - {pattern_data.get('description', '')}"
            
            memory_item = MemoryItem(
                content=content,
                memory_type='pattern',
                user_id=user_id,
                context={'pattern_id': pattern_id, 'pattern_data': pattern_data, 'outcome': outcome},
                importance=1.5
            )
            
            # Store in long-term memory
            if user_id not in self.long_term_memory:
                self.long_term_memory[user_id] = []
            
            self.long_term_memory[user_id].append(memory_item)
            
            # Generate embedding
            await self._generate_embedding(memory_item)
            
            # Persist to database
            await self._persist_memory(memory_item)
            
            return pattern_id
            
        except Exception as e:
            self.logger.error(f"Error storing business pattern: {str(e)}")
            return None
    
    async def retrieve_relevant_memories(self, user_id: str, query: str, 
                                       memory_types: List[str] = None, 
                                       limit: int = 10) -> List[MemoryItem]:
        """Retrieve memories relevant to the query"""
        try:
            all_memories = []
            
            # Combine short-term and long-term memories
            if user_id in self.short_term_memory:
                all_memories.extend(self.short_term_memory[user_id])
            
            if user_id in self.long_term_memory:
                all_memories.extend(self.long_term_memory[user_id])
            
            # Filter by memory types if specified
            if memory_types:
                all_memories = [m for m in all_memories if m.memory_type in memory_types]
            
            if not all_memories:
                return []
            
            # Calculate relevance scores
            relevant_memories = []
            
            for memory in all_memories:
                relevance_score = await self._calculate_relevance(query, memory)
                if relevance_score > 0.1:  # Relevance threshold
                    memory.accessed()
                    relevant_memories.append((memory, relevance_score))
            
            # Sort by relevance and importance
            relevant_memories.sort(
                key=lambda x: x[1] * x[0].importance, 
                reverse=True
            )
            
            return [memory for memory, score in relevant_memories[:limit]]
            
        except Exception as e:
            self.logger.error(f"Error retrieving relevant memories: {str(e)}")
            return []
    
    async def learn_from_interaction(self, user_id: str, interaction_data: Dict):
        """Learn patterns from user interactions"""
        try:
            # Extract learning signals
            user_satisfaction = interaction_data.get('satisfaction', 0.5)
            query_type = interaction_data.get('query_type', 'general')
            response_effectiveness = interaction_data.get('effectiveness', 0.5)
            
            # Update agent performance memory
            agent_id = interaction_data.get('agent_id')
            if agent_id:
                await self._update_agent_performance_memory(
                    user_id, agent_id, user_satisfaction, query_type
                )
            
            # Learn response patterns
            if response_effectiveness > 0.7:
                await self._learn_successful_response_pattern(user_id, interaction_data)
            
            # Consolidate memories if needed
            await self._consolidate_memories(user_id)
            
        except Exception as e:
            self.logger.error(f"Error learning from interaction: {str(e)}")
    
    async def get_personalized_insights(self, user_id: str, context: Dict) -> List[Dict]:
        """Generate personalized insights based on memory"""
        try:
            insights = []
            
            # Get pattern-based insights
            if user_id in self.pattern_memory:
                pattern_insights = await self._generate_pattern_insights(user_id, context)
                insights.extend(pattern_insights)
            
            # Get memory-based insights
            memory_insights = await self._generate_memory_insights(user_id, context)
            insights.extend(memory_insights)
            
            # Get historical performance insights
            performance_insights = await self._generate_performance_insights(user_id, context)
            insights.extend(performance_insights)
            
            # Rank insights by relevance and importance
            ranked_insights = await self._rank_insights(insights, context)
            
            return ranked_insights[:5]  # Return top 5 insights
            
        except Exception as e:
            self.logger.error(f"Error generating personalized insights: {str(e)}")
            return []
    
    async def predict_strategy_success(self, user_id: str, proposed_strategy: Dict) -> Dict:
        """Predict likelihood of strategy success based on memory"""
        try:
            # Get similar past strategies
            similar_strategies = await self._find_similar_strategies(user_id, proposed_strategy)
            
            if not similar_strategies:
                return {
                    'confidence': 0.5,
                    'predicted_success_rate': 0.5,
                    'reasoning': 'No similar strategies found in memory',
                    'recommendations': []
                }
            
            # Calculate success rate from similar strategies
            total_strategies = len(similar_strategies)
            successful_strategies = sum(1 for s in similar_strategies 
                                      if s.get('outcome', {}).get('success', False))
            
            success_rate = successful_strategies / total_strategies
            
            # Calculate confidence based on sample size and recency
            confidence = min(0.9, 0.3 + (total_strategies * 0.1))
            
            # Generate recommendations
            recommendations = await self._generate_strategy_recommendations(
                similar_strategies, proposed_strategy
            )
            
            return {
                'confidence': confidence,
                'predicted_success_rate': success_rate,
                'reasoning': f'Based on {total_strategies} similar strategies with {successful_strategies} successes',
                'recommendations': recommendations,
                'similar_strategies_count': total_strategies
            }
            
        except Exception as e:
            self.logger.error(f"Error predicting strategy success: {str(e)}")
            return {'confidence': 0.0, 'predicted_success_rate': 0.5}
    
    async def adapt_to_user_preferences(self, user_id: str) -> Dict:
        """Adapt AI behavior based on user's historical preferences"""
        try:
            # Analyze conversation patterns
            conversation_memories = await self.retrieve_relevant_memories(
                user_id, "", memory_types=['conversation'], limit=50
            )
            
            preferences = {
                'communication_style': 'balanced',
                'detail_level': 'medium',
                'preferred_topics': [],
                'effective_agents': [],
                'response_length': 'medium'
            }
            
            if not conversation_memories:
                return preferences
            
            # Analyze communication preferences
            preferences = await self._analyze_communication_preferences(
                conversation_memories, preferences
            )
            
            # Analyze topic preferences
            preferences = await self._analyze_topic_preferences(
                conversation_memories, preferences
            )
            
            # Analyze agent effectiveness
            preferences = await self._analyze_agent_effectiveness(
                user_id, preferences
            )
            
            return preferences
            
        except Exception as e:
            self.logger.error(f"Error adapting to user preferences: {str(e)}")
            return {}
    
    async def generate_learning_summary(self, user_id: str) -> Dict:
        """Generate summary of what AI has learned about the user's business"""
        try:
            summary = {
                'total_memories': 0,
                'conversation_count': 0,
                'strategies_learned': 0,
                'patterns_identified': 0,
                'key_insights': [],
                'business_characteristics': {},
                'improvement_areas': [],
                'success_factors': []
            }
            
            # Count memories
            if user_id in self.short_term_memory:
                summary['total_memories'] += len(self.short_term_memory[user_id])
                summary['conversation_count'] += len([
                    m for m in self.short_term_memory[user_id] 
                    if m.memory_type == 'conversation'
                ])
            
            if user_id in self.long_term_memory:
                summary['total_memories'] += len(self.long_term_memory[user_id])
                summary['strategies_learned'] += len([
                    m for m in self.long_term_memory[user_id] 
                    if m.memory_type == 'strategy'
                ])
                summary['patterns_identified'] += len([
                    m for m in self.long_term_memory[user_id] 
                    if m.memory_type == 'pattern'
                ])
            
            # Generate business characteristics
            summary['business_characteristics'] = await self._analyze_business_characteristics(user_id)
            
            # Generate key insights
            summary['key_insights'] = await self._generate_key_insights(user_id)
            
            # Identify improvement areas
            summary['improvement_areas'] = await self._identify_improvement_areas(user_id)
            
            # Identify success factors
            summary['success_factors'] = await self._identify_success_factors(user_id)
            
            return summary
            
        except Exception as e:
            self.logger.error(f"Error generating learning summary: {str(e)}")
            return {}
    
    # Private helper methods
    
    async def _generate_embedding(self, memory_item: MemoryItem):
        """Generate vector embedding for memory item"""
        try:
            # Simple TF-IDF embedding (could be replaced with more sophisticated embeddings)
            if memory_item.user_id not in self.memory_vectors:
                self.memory_vectors[memory_item.user_id] = {}
            
            # For now, use content hash as a simple embedding
            content_hash = hashlib.md5(memory_item.content.encode()).hexdigest()
            memory_item.embedding_vector = content_hash
            
            self.memory_vectors[memory_item.user_id][memory_item.id] = content_hash
            
        except Exception as e:
            self.logger.error(f"Error generating embedding: {str(e)}")
    
    async def _calculate_relevance(self, query: str, memory: MemoryItem) -> float:
        """Calculate relevance score between query and memory"""
        try:
            # Simple keyword-based relevance (could be enhanced with semantic similarity)
            query_words = set(query.lower().split())
            memory_words = set(memory.content.lower().split())
            
            if not query_words or not memory_words:
                return 0.0
            
            # Jaccard similarity
            intersection = len(query_words & memory_words)
            union = len(query_words | memory_words)
            
            base_relevance = intersection / union if union > 0 else 0.0
            
            # Boost relevance based on memory importance and recency
            importance_boost = memory.importance * 0.1
            
            # Recency boost (newer memories get slight boost)
            days_old = (datetime.now() - memory.created_at).days
            recency_boost = max(0, 0.1 - (days_old * 0.01))
            
            return min(1.0, base_relevance + importance_boost + recency_boost)
            
        except Exception as e:
            self.logger.error(f"Error calculating relevance: {str(e)}")
            return 0.0
    
    async def _manage_memory_size(self, user_id: str):
        """Manage memory size by consolidating or removing old memories"""
        try:
            # Consolidate frequently accessed short-term memories to long-term
            if user_id in self.short_term_memory:
                to_consolidate = [
                    m for m in self.short_term_memory[user_id]
                    if m.access_count >= self.consolidation_threshold
                ]
                
                for memory in to_consolidate:
                    if user_id not in self.long_term_memory:
                        self.long_term_memory[user_id] = []
                    
                    self.long_term_memory[user_id].append(memory)
                    self.short_term_memory[user_id].remove(memory)
                
                # Remove oldest short-term memories if over limit
                if len(self.short_term_memory[user_id]) > self.max_short_term_items:
                    # Sort by last accessed and importance
                    sorted_memories = sorted(
                        self.short_term_memory[user_id],
                        key=lambda m: (m.last_accessed or m.created_at, m.importance)
                    )
                    
                    # Keep most recent and important memories
                    self.short_term_memory[user_id] = sorted_memories[-self.max_short_term_items:]
            
            # Manage long-term memory size
            if user_id in self.long_term_memory and len(self.long_term_memory[user_id]) > self.max_long_term_items:
                # Decay importance over time
                for memory in self.long_term_memory[user_id]:
                    memory.decay_importance()
                
                # Keep most important memories
                self.long_term_memory[user_id].sort(key=lambda m: m.importance, reverse=True)
                self.long_term_memory[user_id] = self.long_term_memory[user_id][:self.max_long_term_items]
                
        except Exception as e:
            self.logger.error(f"Error managing memory size: {str(e)}")
    
    async def _persist_memory(self, memory_item: MemoryItem):
        """Persist memory to database"""
        try:
            # Create database record (would need appropriate table schema)
            memory_data = {
                'id': memory_item.id,
                'user_id': memory_item.user_id,
                'content': memory_item.content,
                'memory_type': memory_item.memory_type,
                'context': json.dumps(memory_item.context),
                'importance': memory_item.importance,
                'access_count': memory_item.access_count,
                'created_at': memory_item.created_at,
                'last_accessed': memory_item.last_accessed,
                'embedding_vector': memory_item.embedding_vector
            }
            
            # Insert into database (placeholder - would need actual table)
            # self.db.execute(text("INSERT INTO ai_memories (...) VALUES (...)"), memory_data)
            # self.db.commit()
            
        except Exception as e:
            self.logger.error(f"Error persisting memory: {str(e)}")
    
    async def _load_memories(self):
        """Load existing memories from database"""
        try:
            # Load memories from database (placeholder)
            # This would load existing memories on service startup
            pass
        except Exception as e:
            self.logger.error(f"Error loading memories: {str(e)}")
    
    # Additional helper methods would be implemented here for:
    # - _add_strategy_pattern
    # - _consolidate_memories
    # - _update_agent_performance_memory
    # - _learn_successful_response_pattern
    # - _generate_pattern_insights
    # - _generate_memory_insights
    # - _generate_performance_insights
    # - _rank_insights
    # - _find_similar_strategies
    # - _generate_strategy_recommendations
    # - _analyze_communication_preferences
    # - _analyze_topic_preferences
    # - _analyze_agent_effectiveness
    # - _analyze_business_characteristics
    # - _generate_key_insights
    # - _identify_improvement_areas
    # - _identify_success_factors
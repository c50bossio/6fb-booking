"""
Advanced Search Service for BookedBarber V2

Implements state-of-the-art search techniques:
- BM25 lexical search for precise keyword matching
- Cross-encoder reranking for ultimate precision
- Contextual retrieval with user preferences
- Query expansion with barbershop terminology
- Multi-index RAG pipeline
"""

import os
import logging
from typing import List, Dict, Any, Optional, Tuple, Union
from dataclasses import dataclass, field
import asyncio
import json
import re
from datetime import datetime

# Search libraries
from rank_bm25 import BM25Okapi
import numpy as np
from sentence_transformers import SentenceTransformer, CrossEncoder

# Database and models
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_

from models import User, Service, Appointment, SearchAnalytics
from services.enhanced_semantic_search_service import (
    enhanced_semantic_search, SearchContext, EnhancedSemanticMatch
)

logger = logging.getLogger(__name__)


@dataclass
class BM25Config:
    """Configuration for BM25 search"""
    k1: float = 1.2  # Term frequency saturation parameter
    b: float = 0.75  # Field length normalization parameter
    epsilon: float = 0.25  # IDF floor


@dataclass
class AdvancedSearchConfig:
    """Configuration for advanced search features"""
    # BM25 settings
    bm25: BM25Config = field(default_factory=BM25Config)
    
    # Reranking settings
    enable_reranking: bool = True
    rerank_top_k: int = 20  # Number of candidates to rerank
    rerank_model: str = "cross-encoder/ms-marco-MiniLM-L-12-v2"
    
    # Contextual retrieval
    enable_contextual: bool = True
    location_boost: float = 1.2
    time_preference_boost: float = 1.1
    history_boost: float = 1.15
    
    # Query expansion
    enable_query_expansion: bool = True
    synonym_boost: float = 0.8
    
    # Multi-index settings
    semantic_weight: float = 0.4
    bm25_weight: float = 0.3
    contextual_weight: float = 0.3


@dataclass
class RerankingResult:
    """Result with reranking score"""
    original_match: EnhancedSemanticMatch
    rerank_score: float
    final_score: float
    score_breakdown: Dict[str, float]


class BarbershopTermExpander:
    """Expand queries with barbershop-specific synonyms"""
    
    def __init__(self):
        self.synonyms = {
            # Haircut styles
            "fade": ["skin fade", "high fade", "low fade", "mid fade", "taper fade"],
            "haircut": ["cut", "trim", "style", "clipper cut"],
            "buzz": ["buzz cut", "crew cut", "military cut"],
            "pompadour": ["pomp", "classic pomp", "modern pompadour"],
            
            # Beard services  
            "beard": ["facial hair", "beard trim", "goatee", "mustache"],
            "trim": ["cleanup", "touch up", "maintenance"],
            "shape": ["sculpt", "define", "line up"],
            
            # Tools and techniques
            "straight razor": ["razor", "blade", "traditional shave"],
            "clipper": ["electric", "guards", "buzz"],
            "scissors": ["shear", "texturizing", "point cut"],
            
            # Experience levels
            "experienced": ["expert", "professional", "skilled", "master"],
            "specialist": ["expert", "professional", "focused on"],
            "master": ["expert", "experienced", "skilled"],
            
            # Service types
            "shave": ["wet shave", "hot towel", "traditional"],
            "styling": ["style", "finish", "product application"],
            "consultation": ["advice", "recommendation", "assessment"]
        }
    
    def expand_query(self, query: str) -> List[str]:
        """Expand query with relevant synonyms"""
        query_lower = query.lower()
        expanded_terms = [query]  # Original query first
        
        # Find synonyms for words in query
        for term, synonyms in self.synonyms.items():
            if term in query_lower:
                # Add variations
                for synonym in synonyms:
                    if synonym not in query_lower:  # Avoid duplicates
                        expanded_terms.append(
                            query_lower.replace(term, synonym)
                        )
        
        return expanded_terms[:5]  # Limit to prevent explosion


class BM25SearchIndex:
    """BM25 search index for barbershop content"""
    
    def __init__(self, config: BM25Config = None):
        self.config = config or BM25Config()
        self.index = None
        self.documents = []
        self.metadata = []
        self.term_expander = BarbershopTermExpander()
    
    def _preprocess_text(self, text: str) -> List[str]:
        """Preprocess text for BM25 indexing"""
        if not text:
            return []
        
        # Convert to lowercase and split
        text = text.lower()
        
        # Remove special characters but keep spaces
        text = re.sub(r'[^\w\s]', ' ', text)
        
        # Split and filter empty tokens
        tokens = [token for token in text.split() if len(token) > 1]
        
        return tokens
    
    def build_index(self, documents: List[Dict[str, Any]]):
        """Build BM25 index from documents"""
        self.documents = []
        self.metadata = []
        
        for doc in documents:
            # Combine all searchable fields
            searchable_text = []
            
            # Add bio/description with higher weight (repeat 2x)
            if doc.get('bio'):
                searchable_text.extend([doc['bio']] * 2)
            if doc.get('description'):
                searchable_text.extend([doc['description']] * 2)
            
            # Add specialties/skills
            if doc.get('specialties'):
                if isinstance(doc['specialties'], list):
                    searchable_text.extend(doc['specialties'])
                else:
                    searchable_text.append(str(doc['specialties']))
            
            # Add name
            if doc.get('first_name') and doc.get('last_name'):
                searchable_text.append(f"{doc['first_name']} {doc['last_name']}")
            elif doc.get('name'):
                searchable_text.append(doc['name'])
            
            # Add role/category context
            if doc.get('unified_role'):
                role_context = {
                    'BARBER': 'professional barber stylist',
                    'SHOP_OWNER': 'master barber shop owner experienced',
                    'INDIVIDUAL_BARBER': 'independent barber specialist'
                }.get(doc['unified_role'], '')
                if role_context:
                    searchable_text.append(role_context)
            
            if doc.get('category'):
                searchable_text.append(doc['category'])
            
            # Combine and preprocess
            combined_text = ' '.join(searchable_text)
            tokens = self._preprocess_text(combined_text)
            
            self.documents.append(tokens)
            self.metadata.append(doc)
        
        # Build BM25 index
        if self.documents:
            self.index = BM25Okapi(
                self.documents,
                k1=self.config.k1,
                b=self.config.b,
                epsilon=self.config.epsilon
            )
        
        logger.info(f"Built BM25 index with {len(self.documents)} documents")
    
    def search(self, query: str, top_k: int = 10) -> List[Tuple[Dict[str, Any], float]]:
        """Search using BM25"""
        if not self.index or not query:
            return []
        
        # Expand query with synonyms
        expanded_queries = self.term_expander.expand_query(query)
        
        all_scores = []
        
        for i, expanded_query in enumerate(expanded_queries):
            query_tokens = self._preprocess_text(expanded_query)
            if not query_tokens:
                continue
            
            # Get BM25 scores
            scores = self.index.get_scores(query_tokens)
            
            # Apply diminishing weight for expanded queries
            weight = 1.0 if i == 0 else 0.8 ** i
            scores = scores * weight
            
            all_scores.append(scores)
        
        if not all_scores:
            return []
        
        # Combine scores (max across all expansions)
        combined_scores = np.maximum.reduce(all_scores)
        
        # Get top results
        top_indices = np.argsort(combined_scores)[::-1][:top_k]
        
        results = []
        for idx in top_indices:
            if combined_scores[idx] > 0:  # Only positive scores
                results.append((self.metadata[idx], float(combined_scores[idx])))
        
        return results


class CrossEncoderReranker:
    """Rerank search results using cross-encoder models"""
    
    def __init__(self, model_name: str = "cross-encoder/ms-marco-MiniLM-L-12-v2"):
        self.model_name = model_name
        self.model = None
        self._initialize_model()
    
    def _initialize_model(self):
        """Initialize cross-encoder model"""
        try:
            self.model = CrossEncoder(self.model_name)
            logger.info(f"Initialized cross-encoder: {self.model_name}")
        except Exception as e:
            logger.error(f"Failed to initialize cross-encoder: {e}")
            self.model = None
    
    def is_available(self) -> bool:
        """Check if reranker is available"""
        return self.model is not None
    
    def rerank(
        self, 
        query: str, 
        candidates: List[EnhancedSemanticMatch],
        top_k: int = 10
    ) -> List[RerankingResult]:
        """Rerank candidates using cross-encoder"""
        if not self.is_available() or not candidates:
            # Return original results with identity reranking
            return [
                RerankingResult(
                    original_match=candidate,
                    rerank_score=candidate.similarity_score,
                    final_score=candidate.similarity_score,
                    score_breakdown={"original": candidate.similarity_score}
                )
                for candidate in candidates[:top_k]
            ]
        
        try:
            # Prepare query-document pairs
            pairs = []
            for candidate in candidates:
                # Create rich document representation
                doc_text = f"{candidate.title}. {candidate.description}"
                pairs.append([query, doc_text])
            
            # Get reranking scores
            rerank_scores = self.model.predict(pairs)
            
            # Combine with original scores
            results = []
            for i, candidate in enumerate(candidates):
                rerank_score = float(rerank_scores[i])
                
                # Weighted combination
                final_score = (
                    0.6 * rerank_score +  # Emphasize reranking
                    0.4 * candidate.similarity_score
                )
                
                results.append(RerankingResult(
                    original_match=candidate,
                    rerank_score=rerank_score,
                    final_score=final_score,
                    score_breakdown={
                        "rerank": rerank_score,
                        "original": candidate.similarity_score,
                        "final": final_score
                    }
                ))
            
            # Sort by final score
            results.sort(key=lambda x: x.final_score, reverse=True)
            
            return results[:top_k]
            
        except Exception as e:
            logger.error(f"Reranking failed: {e}")
            # Fallback to original results
            return [
                RerankingResult(
                    original_match=candidate,
                    rerank_score=candidate.similarity_score,
                    final_score=candidate.similarity_score,
                    score_breakdown={"original": candidate.similarity_score, "error": str(e)}
                )
                for candidate in candidates[:top_k]
            ]


class AdvancedSearchService:
    """
    Advanced search service combining multiple techniques
    """
    
    def __init__(self, config: AdvancedSearchConfig = None):
        self.config = config or AdvancedSearchConfig()
        self.bm25_barber_index = BM25SearchIndex(self.config.bm25)
        self.bm25_service_index = BM25SearchIndex(self.config.bm25)
        self.reranker = CrossEncoderReranker(self.config.rerank_model) if self.config.enable_reranking else None
        self.term_expander = BarbershopTermExpander()
        
        # Track index freshness
        self.barber_index_updated = None
        self.service_index_updated = None
    
    async def _ensure_fresh_indexes(self, db: Session):
        """Ensure BM25 indexes are up to date"""
        now = datetime.utcnow()
        
        # Rebuild indexes every hour or on first use
        needs_barber_update = (
            self.barber_index_updated is None or
            (now - self.barber_index_updated).total_seconds() > 3600
        )
        
        needs_service_update = (
            self.service_index_updated is None or
            (now - self.service_index_updated).total_seconds() > 3600
        )
        
        if needs_barber_update:
            await self._rebuild_barber_index(db)
            self.barber_index_updated = now
        
        if needs_service_update:
            await self._rebuild_service_index(db)
            self.service_index_updated = now
    
    async def _rebuild_barber_index(self, db: Session):
        """Rebuild BM25 index for barbers"""
        try:
            barbers = db.query(User).filter(
                User.unified_role.in_(["BARBER", "SHOP_OWNER"]),
                User.bio.isnot(None)
            ).all()
            
            documents = []
            for barber in barbers:
                doc = {
                    'id': barber.id,
                    'type': 'barber',
                    'first_name': barber.first_name,
                    'last_name': barber.last_name,
                    'bio': barber.bio,
                    'unified_role': barber.unified_role,
                    'specialties': getattr(barber, 'specialties', []),
                    'experience_years': getattr(barber, 'experience_years', None)
                }
                documents.append(doc)
            
            self.bm25_barber_index.build_index(documents)
            logger.info(f"Rebuilt barber BM25 index with {len(documents)} entries")
            
        except Exception as e:
            logger.error(f"Failed to rebuild barber index: {e}")
    
    async def _rebuild_service_index(self, db: Session):
        """Rebuild BM25 index for services"""
        try:
            services = db.query(Service).filter(
                Service.is_active == True
            ).all()
            
            documents = []
            for service in services:
                doc = {
                    'id': service.id,
                    'type': 'service',
                    'name': service.name,
                    'description': service.description,
                    'category': service.category,
                    'price': float(service.price),
                    'duration': service.duration
                }
                documents.append(doc)
            
            self.bm25_service_index.build_index(documents)
            logger.info(f"Rebuilt service BM25 index with {len(documents)} entries")
            
        except Exception as e:
            logger.error(f"Failed to rebuild service index: {e}")
    
    def _apply_contextual_boost(
        self, 
        results: List[EnhancedSemanticMatch], 
        context: SearchContext
    ) -> List[EnhancedSemanticMatch]:
        """Apply contextual boosting based on user preferences"""
        if not self.config.enable_contextual or not context:
            return results
        
        for result in results:
            boost_factor = 1.0
            
            # Location proximity boost
            if (context.filters and 
                context.filters.get('location_id') and 
                result.metadata.get('location_id') == context.filters['location_id']):
                boost_factor *= self.config.location_boost
            
            # Time preference boost (could be extended with actual time preferences)
            # For now, boost based on role compatibility
            if (context.user_role in ["SHOP_OWNER", "BARBER"] and 
                result.entity_type == "barber"):
                boost_factor *= self.config.time_preference_boost
            
            # Apply boost
            result.similarity_score *= boost_factor
            
            # Track boost in metadata
            if 'contextual_boost' not in result.metadata:
                result.metadata['contextual_boost'] = boost_factor
        
        return results
    
    async def advanced_search_barbers(
        self,
        query: str,
        db: Session,
        limit: int = 10,
        context: SearchContext = None
    ) -> List[RerankingResult]:
        """
        Advanced search combining semantic, BM25, and reranking
        """
        await self._ensure_fresh_indexes(db)
        
        # 1. Semantic search
        semantic_results = await enhanced_semantic_search.search_barbers(
            query=query,
            db=db,
            limit=self.config.rerank_top_k,
            search_type="semantic",
            context=context
        )
        
        # 2. BM25 search  
        bm25_results = self.bm25_barber_index.search(query, top_k=self.config.rerank_top_k)
        
        # 3. Convert BM25 results to EnhancedSemanticMatch format
        bm25_matches = []
        for doc, score in bm25_results:
            match = EnhancedSemanticMatch(
                entity_id=doc['id'],
                entity_type="barber",
                title=f"{doc.get('first_name', '')} {doc.get('last_name', '')}".strip(),
                description=doc.get('bio', ''),
                similarity_score=float(score),
                chunk_scores=[float(score)],
                search_type="bm25",
                metadata=doc
            )
            bm25_matches.append(match)
        
        # 4. Combine and deduplicate results
        all_results = {}  # entity_id -> best match
        
        # Add semantic results
        for result in semantic_results:
            result.similarity_score *= self.config.semantic_weight
            all_results[result.entity_id] = result
        
        # Add BM25 results (combine if duplicate)
        for result in bm25_matches:
            result.similarity_score *= self.config.bm25_weight
            
            if result.entity_id in all_results:
                # Combine scores
                existing = all_results[result.entity_id]
                combined_score = existing.similarity_score + result.similarity_score
                existing.similarity_score = combined_score
                existing.search_type = "hybrid"
                existing.metadata['bm25_score'] = result.similarity_score
            else:
                all_results[result.entity_id] = result
        
        # 5. Apply contextual boosting
        combined_results = list(all_results.values())
        combined_results = self._apply_contextual_boost(combined_results, context)
        
        # 6. Sort by combined score
        combined_results.sort(key=lambda x: x.similarity_score, reverse=True)
        
        # 7. Rerank top candidates
        if self.config.enable_reranking and self.reranker and self.reranker.is_available():
            top_candidates = combined_results[:self.config.rerank_top_k]
            reranked_results = self.reranker.rerank(query, top_candidates, limit)
            return reranked_results
        else:
            # Return without reranking
            return [
                RerankingResult(
                    original_match=result,
                    rerank_score=result.similarity_score,
                    final_score=result.similarity_score,
                    score_breakdown={"combined": result.similarity_score}
                )
                for result in combined_results[:limit]
            ]
    
    async def get_search_suggestions(self, partial_query: str, limit: int = 5) -> List[str]:
        """Get intelligent search suggestions"""
        if len(partial_query) < 2:
            return []
        
        # Basic barbershop suggestions
        base_suggestions = [
            "fade haircut",
            "beard trim", 
            "straight razor shave",
            "experienced barber",
            "classic haircut",
            "modern styling",
            "hot towel shave",
            "beard specialist"
        ]
        
        # Filter suggestions that match partial query
        partial_lower = partial_query.lower()
        suggestions = [
            suggestion for suggestion in base_suggestions
            if partial_lower in suggestion.lower()
        ]
        
        # Add query expansions
        expansions = self.term_expander.expand_query(partial_query)
        suggestions.extend(expansions[1:])  # Skip original query
        
        # Remove duplicates and limit
        seen = set()
        unique_suggestions = []
        for suggestion in suggestions:
            if suggestion.lower() not in seen:
                seen.add(suggestion.lower())
                unique_suggestions.append(suggestion)
        
        return unique_suggestions[:limit]


# Global instance
advanced_search = AdvancedSearchService()
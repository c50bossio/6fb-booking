"""
Semantic Search Service for BookedBarber V2

Provides intelligent search capabilities using Voyage.ai embeddings for:
- Barber skill matching
- Service discovery
- Client preference matching
- Content similarity search
"""

import os
import logging
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass
from datetime import datetime
import asyncio

import voyageai
import numpy as np
from sqlalchemy.orm import Session
from sqlalchemy import text

from models import User, Service, Appointment
from config import settings

logger = logging.getLogger(__name__)


@dataclass
class SemanticMatch:
    """Represents a semantic search match with similarity score"""
    entity_id: int
    entity_type: str  # "barber", "service", "client"
    title: str
    description: str
    similarity_score: float
    metadata: Dict[str, Any]


@dataclass
class SearchEmbedding:
    """Represents an embedding with metadata"""
    id: str
    embedding: List[float]
    text: str
    entity_type: str
    entity_id: int
    metadata: Dict[str, Any]
    created_at: datetime


class SemanticSearchService:
    """
    Semantic search service using Voyage.ai embeddings
    
    Provides intelligent matching between:
    - Clients and barbers based on skill descriptions
    - Services and user queries
    - Content similarity for recommendations
    """
    
    def __init__(self):
        self.client = None
        self.model = "voyage-3-large"  # State-of-the-art general-purpose model
        self.embedding_dimension = 1024  # Default dimension
        self._initialize_client()
    
    def _initialize_client(self):
        """Initialize Voyage.ai client with API key"""
        try:
            api_key = getattr(settings, 'voyage_api_key', None) or os.getenv('VOYAGE_API_KEY')
            if not api_key:
                logger.warning("VOYAGE_API_KEY not found. Semantic search will be disabled.")
                return
            
            self.client = voyageai.Client(api_key=api_key)
            logger.info("Voyage.ai client initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize Voyage.ai client: {e}")
            self.client = None
    
    def is_available(self) -> bool:
        """Check if semantic search is available"""
        return self.client is not None
    
    async def generate_embedding(self, text: str, input_type: str = "document") -> Optional[List[float]]:
        """
        Generate embedding for text using Voyage.ai
        
        Args:
            text: Text to embed
            input_type: "query" for search queries, "document" for content
            
        Returns:
            Embedding vector or None if failed
        """
        if not self.client:
            return None
        
        try:
            # Clean and prepare text
            cleaned_text = self._clean_text(text)
            if not cleaned_text:
                return None
            
            # Generate embedding
            response = self.client.embed(
                texts=[cleaned_text],
                model=self.model,
                input_type=input_type
            )
            
            if response and response.embeddings:
                return response.embeddings[0]
            
            return None
            
        except Exception as e:
            logger.error(f"Failed to generate embedding: {e}")
            return None
    
    async def generate_embeddings_batch(
        self, 
        texts: List[str], 
        input_type: str = "document"
    ) -> List[Optional[List[float]]]:
        """
        Generate embeddings for multiple texts efficiently
        
        Args:
            texts: List of texts to embed
            input_type: "query" for search queries, "document" for content
            
        Returns:
            List of embedding vectors (None for failed embeddings)
        """
        if not self.client or not texts:
            return [None] * len(texts)
        
        try:
            # Clean texts
            cleaned_texts = [self._clean_text(text) for text in texts]
            valid_texts = [text for text in cleaned_texts if text]
            
            if not valid_texts:
                return [None] * len(texts)
            
            # Generate embeddings in batch
            response = self.client.embed(
                texts=valid_texts,
                model=self.model,
                input_type=input_type
            )
            
            if response and response.embeddings:
                return response.embeddings
            
            return [None] * len(texts)
            
        except Exception as e:
            logger.error(f"Failed to generate batch embeddings: {e}")
            return [None] * len(texts)
    
    def calculate_similarity(self, embedding1: List[float], embedding2: List[float]) -> float:
        """
        Calculate cosine similarity between two embeddings
        
        Returns:
            Similarity score between 0 and 1
        """
        try:
            # Convert to numpy arrays
            vec1 = np.array(embedding1)
            vec2 = np.array(embedding2)
            
            # Calculate cosine similarity
            dot_product = np.dot(vec1, vec2)
            norm1 = np.linalg.norm(vec1)
            norm2 = np.linalg.norm(vec2)
            
            if norm1 == 0 or norm2 == 0:
                return 0.0
            
            similarity = dot_product / (norm1 * norm2)
            
            # Convert to 0-1 range (cosine similarity is -1 to 1)
            return float((similarity + 1) / 2)
            
        except Exception as e:
            logger.error(f"Failed to calculate similarity: {e}")
            return 0.0
    
    async def find_similar_barbers(
        self, 
        query: str, 
        db: Session,
        limit: int = 10,
        min_similarity: float = 0.6
    ) -> List[SemanticMatch]:
        """
        Find barbers with skills/descriptions similar to query
        
        Args:
            query: Search query (e.g., "experienced in fades and beard trimming")
            db: Database session
            limit: Maximum number of results
            min_similarity: Minimum similarity threshold
            
        Returns:
            List of matching barbers with similarity scores
        """
        if not self.is_available():
            logger.warning("Semantic search not available, falling back to keyword search")
            return await self._fallback_barber_search(query, db, limit)
        
        try:
            # Generate query embedding
            query_embedding = await self.generate_embedding(query, input_type="query")
            if not query_embedding:
                return await self._fallback_barber_search(query, db, limit)
            
            # Get barbers with descriptions
            barbers = db.query(User).filter(
                User.unified_role.in_(["BARBER", "SHOP_OWNER"]),
                User.bio.isnot(None)
            ).all()
            
            matches = []
            
            for barber in barbers:
                # Create barber description for embedding
                description_text = self._create_barber_description(barber)
                
                # Generate barber embedding
                barber_embedding = await self.generate_embedding(description_text)
                if not barber_embedding:
                    continue
                
                # Calculate similarity
                similarity = self.calculate_similarity(query_embedding, barber_embedding)
                
                if similarity >= min_similarity:
                    matches.append(SemanticMatch(
                        entity_id=barber.id,
                        entity_type="barber",
                        title=f"{barber.first_name} {barber.last_name}".strip(),
                        description=description_text,
                        similarity_score=similarity,
                        metadata={
                            "email": barber.email,
                            "bio": barber.bio,
                            "experience_years": getattr(barber, 'experience_years', None),
                            "specialties": getattr(barber, 'specialties', [])
                        }
                    ))
            
            # Sort by similarity score
            matches.sort(key=lambda x: x.similarity_score, reverse=True)
            return matches[:limit]
            
        except Exception as e:
            logger.error(f"Failed to find similar barbers: {e}")
            return await self._fallback_barber_search(query, db, limit)
    
    async def find_similar_services(
        self, 
        query: str, 
        db: Session,
        limit: int = 10,
        min_similarity: float = 0.5
    ) -> List[SemanticMatch]:
        """
        Find services similar to query
        
        Args:
            query: Search query (e.g., "quick haircut for business meeting")
            db: Database session
            limit: Maximum number of results
            min_similarity: Minimum similarity threshold
            
        Returns:
            List of matching services with similarity scores
        """
        if not self.is_available():
            return await self._fallback_service_search(query, db, limit)
        
        try:
            # Generate query embedding
            query_embedding = await self.generate_embedding(query, input_type="query")
            if not query_embedding:
                return await self._fallback_service_search(query, db, limit)
            
            # Get services
            services = db.query(Service).filter(
                Service.is_active == True
            ).all()
            
            matches = []
            
            for service in services:
                # Create service description for embedding
                description_text = self._create_service_description(service)
                
                # Generate service embedding
                service_embedding = await self.generate_embedding(description_text)
                if not service_embedding:
                    continue
                
                # Calculate similarity
                similarity = self.calculate_similarity(query_embedding, service_embedding)
                
                if similarity >= min_similarity:
                    matches.append(SemanticMatch(
                        entity_id=service.id,
                        entity_type="service",
                        title=service.name,
                        description=description_text,
                        similarity_score=similarity,
                        metadata={
                            "price": float(service.price),
                            "duration": service.duration,
                            "category": service.category,
                            "description": service.description
                        }
                    ))
            
            # Sort by similarity score
            matches.sort(key=lambda x: x.similarity_score, reverse=True)
            return matches[:limit]
            
        except Exception as e:
            logger.error(f"Failed to find similar services: {e}")
            return await self._fallback_service_search(query, db, limit)
    
    async def recommend_barber_for_client(
        self, 
        client_id: int, 
        db: Session,
        limit: int = 5
    ) -> List[SemanticMatch]:
        """
        Recommend barbers for a client based on appointment history and preferences
        
        Args:
            client_id: Client user ID
            db: Database session
            limit: Maximum number of recommendations
            
        Returns:
            List of recommended barbers with similarity scores
        """
        try:
            # Get client's appointment history
            appointments = db.query(Appointment).filter(
                Appointment.client_id == client_id
            ).order_by(Appointment.appointment_date.desc()).limit(10).all()
            
            if not appointments:
                # No history - return popular barbers
                return await self._get_popular_barbers(db, limit)
            
            # Extract client preferences from appointment history
            client_preferences = self._extract_client_preferences(appointments)
            
            # Find similar barbers
            return await self.find_similar_barbers(
                client_preferences, 
                db, 
                limit=limit,
                min_similarity=0.4  # Lower threshold for recommendations
            )
            
        except Exception as e:
            logger.error(f"Failed to recommend barbers for client {client_id}: {e}")
            return await self._get_popular_barbers(db, limit)
    
    def _clean_text(self, text: str) -> str:
        """Clean and prepare text for embedding"""
        if not text:
            return ""
        
        # Remove extra whitespace and normalize
        cleaned = " ".join(text.strip().split())
        
        # Limit length (Voyage.ai has token limits)
        max_length = 8000  # Conservative limit
        if len(cleaned) > max_length:
            cleaned = cleaned[:max_length].rsplit(' ', 1)[0]  # Cut at word boundary
        
        return cleaned
    
    def _create_barber_description(self, barber: User) -> str:
        """Create searchable description for a barber"""
        parts = []
        
        if barber.bio:
            parts.append(barber.bio)
        
        # Add role info
        if barber.unified_role == "SHOP_OWNER":
            parts.append("Shop owner and experienced barber")
        else:
            parts.append("Professional barber")
        
        # Add specialties if available
        if hasattr(barber, 'specialties') and barber.specialties:
            parts.append(f"Specializes in: {', '.join(barber.specialties)}")
        
        # Add experience if available
        if hasattr(barber, 'experience_years') and barber.experience_years:
            parts.append(f"{barber.experience_years} years of experience")
        
        return ". ".join(parts)
    
    def _create_service_description(self, service: Service) -> str:
        """Create searchable description for a service"""
        parts = [service.name]
        
        if service.description:
            parts.append(service.description)
        
        if service.category:
            parts.append(f"Category: {service.category}")
        
        parts.append(f"Duration: {service.duration} minutes")
        parts.append(f"Price: ${service.price}")
        
        return ". ".join(parts)
    
    def _extract_client_preferences(self, appointments: List[Appointment]) -> str:
        """Extract client preferences from appointment history"""
        services = []
        notes = []
        
        for appointment in appointments:
            if appointment.service_name:
                services.append(appointment.service_name)
            if appointment.notes:
                notes.append(appointment.notes)
        
        # Create preference text
        parts = []
        
        if services:
            parts.append(f"Previously booked: {', '.join(set(services))}")
        
        if notes:
            parts.append(f"Client notes: {'. '.join(notes)}")
        
        return ". ".join(parts) if parts else "Regular client seeking quality barbering services"
    
    async def _fallback_barber_search(self, query: str, db: Session, limit: int) -> List[SemanticMatch]:
        """Fallback keyword search for barbers"""
        search_term = f"%{query.lower()}%"
        
        barbers = db.query(User).filter(
            User.unified_role.in_(["BARBER", "SHOP_OWNER"]),
            User.bio.ilike(search_term)
        ).limit(limit).all()
        
        matches = []
        for barber in barbers:
            matches.append(SemanticMatch(
                entity_id=barber.id,
                entity_type="barber",
                title=f"{barber.first_name} {barber.last_name}".strip(),
                description=barber.bio or "Professional barber",
                similarity_score=0.5,  # Default score for keyword matches
                metadata={"email": barber.email, "bio": barber.bio}
            ))
        
        return matches
    
    async def _fallback_service_search(self, query: str, db: Session, limit: int) -> List[SemanticMatch]:
        """Fallback keyword search for services"""
        search_term = f"%{query.lower()}%"
        
        services = db.query(Service).filter(
            Service.is_active == True,
            Service.name.ilike(search_term) | Service.description.ilike(search_term)
        ).limit(limit).all()
        
        matches = []
        for service in services:
            matches.append(SemanticMatch(
                entity_id=service.id,
                entity_type="service",
                title=service.name,
                description=service.description or "",
                similarity_score=0.5,  # Default score for keyword matches
                metadata={
                    "price": float(service.price),
                    "duration": service.duration,
                    "category": service.category
                }
            ))
        
        return matches
    
    async def _get_popular_barbers(self, db: Session, limit: int) -> List[SemanticMatch]:
        """Get popular barbers based on appointment count"""
        # Get barbers with most appointments
        result = db.execute(text("""
            SELECT u.id, u.first_name, u.last_name, u.bio, COUNT(a.id) as appointment_count
            FROM users u
            LEFT JOIN appointments a ON u.id = a.barber_id
            WHERE u.unified_role IN ('BARBER', 'SHOP_OWNER')
            GROUP BY u.id, u.first_name, u.last_name, u.bio
            ORDER BY appointment_count DESC
            LIMIT :limit
        """), {"limit": limit})
        
        matches = []
        for row in result:
            matches.append(SemanticMatch(
                entity_id=row.id,
                entity_type="barber",
                title=f"{row.first_name} {row.last_name}".strip(),
                description=row.bio or "Popular barber",
                similarity_score=0.7,  # Higher score for popular barbers
                metadata={
                    "bio": row.bio,
                    "appointment_count": row.appointment_count
                }
            ))
        
        return matches


# Global instance
semantic_search = SemanticSearchService()
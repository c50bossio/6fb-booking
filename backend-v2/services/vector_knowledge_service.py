"""
Vector Knowledge Service for 6FB Booking V2
Advanced RAG (Retrieval Augmented Generation) system for business intelligence.

This service provides:
- Vector database integration for semantic search
- Business knowledge storage and retrieval
- Context-aware document processing
- Intelligent similarity matching
- Knowledge graph construction
"""

import json
import logging
import numpy as np
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any, Tuple
from uuid import uuid4
from sqlalchemy.orm import Session
from sqlalchemy import and_, desc, func, text
import hashlib
import pickle
from pathlib import Path

# Vector database imports (ChromaDB for local, could use Pinecone for cloud)
try:
    import chromadb
    from chromadb.config import Settings
    from chromadb.utils import embedding_functions
    CHROMA_AVAILABLE = True
except ImportError:
    CHROMA_AVAILABLE = False
    logging.warning("ChromaDB not available. Vector operations will be limited.")

# Embedding imports
try:
    from sentence_transformers import SentenceTransformer
    SENTENCE_TRANSFORMERS_AVAILABLE = True
except ImportError:
    SENTENCE_TRANSFORMERS_AVAILABLE = False
    logging.warning("SentenceTransformers not available. Using fallback embeddings.")

from models import User, Appointment, Client, Payment
from models.ai_memory_models import AIMemory, BusinessPattern, StrategyOutcome

logger = logging.getLogger(__name__)


class VectorDocument:
    """Represents a document in the vector database"""
    
    def __init__(self, content: str, doc_type: str, metadata: Dict = None, 
                 user_id: str = None, source_id: str = None):
        self.id = str(uuid4())
        self.content = content
        self.doc_type = doc_type  # 'business_data', 'strategy', 'conversation', 'insight'
        self.metadata = metadata or {}
        self.user_id = user_id
        self.source_id = source_id
        self.created_at = datetime.now()
        self.embedding = None
        
    def to_dict(self) -> Dict:
        """Convert to dictionary for storage"""
        return {
            'id': self.id,
            'content': self.content,
            'doc_type': self.doc_type,
            'metadata': self.metadata,
            'user_id': self.user_id,
            'source_id': self.source_id,
            'created_at': self.created_at.isoformat()
        }


class BusinessKnowledgeExtractor:
    """Extracts structured knowledge from business data"""
    
    def __init__(self, db: Session):
        self.db = db
    
    async def extract_appointment_patterns(self, user_id: str) -> List[VectorDocument]:
        """Extract patterns from appointment data"""
        try:
            # Get appointment data for analysis
            appointments = self.db.query(Appointment).filter(
                and_(
                    Appointment.barber_id == user_id,
                    Appointment.start_time >= datetime.now() - timedelta(days=90),
                    Appointment.status.in_(["confirmed", "completed"])
                )
            ).all()
            
            documents = []
            
            if appointments:
                # Analyze booking patterns
                patterns = self._analyze_booking_patterns(appointments)
                for pattern_type, pattern_data in patterns.items():
                    doc = VectorDocument(
                        content=f"Booking Pattern: {pattern_type} - {pattern_data['description']}",
                        doc_type='business_data',
                        metadata={
                            'pattern_type': pattern_type,
                            'data': pattern_data,
                            'source': 'appointments'
                        },
                        user_id=user_id,
                        source_id=f"appointment_pattern_{pattern_type}"
                    )
                    documents.append(doc)
                
                # Analyze service preferences
                service_insights = self._analyze_service_preferences(appointments)
                for service, insight in service_insights.items():
                    doc = VectorDocument(
                        content=f"Service Insight: {service} - {insight['description']}",
                        doc_type='business_data',
                        metadata={
                            'service_name': service,
                            'insight_data': insight,
                            'source': 'service_analysis'
                        },
                        user_id=user_id,
                        source_id=f"service_insight_{service}"
                    )
                    documents.append(doc)
            
            return documents
            
        except Exception as e:
            logger.error(f"Error extracting appointment patterns: {str(e)}")
            return []
    
    async def extract_revenue_insights(self, user_id: str) -> List[VectorDocument]:
        """Extract insights from revenue data"""
        try:
            # Get payment data
            payments = self.db.query(Payment).filter(
                and_(
                    Payment.user_id == user_id,
                    Payment.created_at >= datetime.now() - timedelta(days=90),
                    Payment.status == "completed"
                )
            ).all()
            
            documents = []
            
            if payments:
                # Revenue trend analysis
                revenue_trends = self._analyze_revenue_trends(payments)
                doc = VectorDocument(
                    content=f"Revenue Analysis: {revenue_trends['summary']}",
                    doc_type='business_data',
                    metadata={
                        'trends': revenue_trends,
                        'source': 'revenue_analysis'
                    },
                    user_id=user_id,
                    source_id="revenue_trends"
                )
                documents.append(doc)
                
                # Pricing insights
                pricing_insights = self._analyze_pricing_patterns(payments)
                doc = VectorDocument(
                    content=f"Pricing Insights: {pricing_insights['summary']}",
                    doc_type='business_data',
                    metadata={
                        'pricing_data': pricing_insights,
                        'source': 'pricing_analysis'
                    },
                    user_id=user_id,
                    source_id="pricing_insights"
                )
                documents.append(doc)
            
            return documents
            
        except Exception as e:
            logger.error(f"Error extracting revenue insights: {str(e)}")
            return []
    
    async def extract_client_behavior_patterns(self, user_id: str) -> List[VectorDocument]:
        """Extract patterns from client behavior"""
        try:
            # Get client appointment history
            client_data = self.db.query(Client, func.count(Appointment.id).label('appointment_count')).join(
                Appointment, Client.id == Appointment.client_id
            ).filter(
                and_(
                    Appointment.barber_id == user_id,
                    Appointment.start_time >= datetime.now() - timedelta(days=180)
                )
            ).group_by(Client.id).all()
            
            documents = []
            
            if client_data:
                # Client retention patterns
                retention_analysis = self._analyze_client_retention([data[0] for data in client_data])
                doc = VectorDocument(
                    content=f"Client Retention: {retention_analysis['summary']}",
                    doc_type='business_data',
                    metadata={
                        'retention_data': retention_analysis,
                        'source': 'client_analysis'
                    },
                    user_id=user_id,
                    source_id="client_retention"
                )
                documents.append(doc)
                
                # Client value analysis
                value_analysis = self._analyze_client_value(client_data)
                doc = VectorDocument(
                    content=f"Client Value Analysis: {value_analysis['summary']}",
                    doc_type='business_data',
                    metadata={
                        'value_data': value_analysis,
                        'source': 'client_value'
                    },
                    user_id=user_id,
                    source_id="client_value"
                )
                documents.append(doc)
            
            return documents
            
        except Exception as e:
            logger.error(f"Error extracting client behavior patterns: {str(e)}")
            return []
    
    def _analyze_booking_patterns(self, appointments: List[Appointment]) -> Dict:
        """Analyze booking patterns from appointments"""
        patterns = {}
        
        # Time-based patterns
        hour_counts = {}
        day_counts = {}
        
        for appointment in appointments:
            hour = appointment.start_time.hour
            day = appointment.start_time.strftime('%A')
            
            hour_counts[hour] = hour_counts.get(hour, 0) + 1
            day_counts[day] = day_counts.get(day, 0) + 1
        
        # Peak hours
        if hour_counts:
            peak_hour = max(hour_counts.items(), key=lambda x: x[1])
            patterns['peak_hours'] = {
                'description': f"Peak booking time is {peak_hour[0]}:00 with {peak_hour[1]} appointments",
                'hour': peak_hour[0],
                'count': peak_hour[1],
                'distribution': hour_counts
            }
        
        # Peak days
        if day_counts:
            peak_day = max(day_counts.items(), key=lambda x: x[1])
            patterns['peak_days'] = {
                'description': f"Peak booking day is {peak_day[0]} with {peak_day[1]} appointments",
                'day': peak_day[0],
                'count': peak_day[1],
                'distribution': day_counts
            }
        
        return patterns
    
    def _analyze_service_preferences(self, appointments: List[Appointment]) -> Dict:
        """Analyze service preferences"""
        service_counts = {}
        service_durations = {}
        
        for appointment in appointments:
            service = appointment.service_name or "Unknown Service"
            service_counts[service] = service_counts.get(service, 0) + 1
            
            if appointment.duration:
                if service not in service_durations:
                    service_durations[service] = []
                service_durations[service].append(appointment.duration)
        
        insights = {}
        for service, count in service_counts.items():
            avg_duration = None
            if service in service_durations:
                avg_duration = sum(service_durations[service]) / len(service_durations[service])
            
            insights[service] = {
                'description': f"{service} booked {count} times",
                'count': count,
                'avg_duration': avg_duration,
                'popularity_rank': sorted(service_counts.items(), key=lambda x: x[1], reverse=True).index((service, count)) + 1
            }
        
        return insights
    
    def _analyze_revenue_trends(self, payments: List[Payment]) -> Dict:
        """Analyze revenue trends"""
        monthly_revenue = {}
        
        for payment in payments:
            month_key = payment.created_at.strftime('%Y-%m')
            monthly_revenue[month_key] = monthly_revenue.get(month_key, 0) + float(payment.amount)
        
        # Calculate trend
        months = sorted(monthly_revenue.keys())
        if len(months) >= 2:
            recent_month = monthly_revenue[months[-1]]
            previous_month = monthly_revenue[months[-2]]
            growth = ((recent_month - previous_month) / previous_month) * 100 if previous_month > 0 else 0
            
            trend_desc = "increasing" if growth > 5 else "decreasing" if growth < -5 else "stable"
            
            return {
                'summary': f"Revenue is {trend_desc} with {growth:.1f}% change from last month",
                'growth_rate': growth,
                'monthly_data': monthly_revenue,
                'trend': trend_desc
            }
        
        return {
            'summary': "Insufficient data for trend analysis",
            'monthly_data': monthly_revenue
        }
    
    def _analyze_pricing_patterns(self, payments: List[Payment]) -> Dict:
        """Analyze pricing patterns"""
        amounts = [float(payment.amount) for payment in payments]
        
        if amounts:
            avg_amount = sum(amounts) / len(amounts)
            min_amount = min(amounts)
            max_amount = max(amounts)
            
            # Price distribution
            price_ranges = {
                'under_50': len([a for a in amounts if a < 50]),
                '50_to_100': len([a for a in amounts if 50 <= a < 100]),
                '100_to_150': len([a for a in amounts if 100 <= a < 150]),
                'over_150': len([a for a in amounts if a >= 150])
            }
            
            return {
                'summary': f"Average service price is ${avg_amount:.2f}, ranging from ${min_amount:.2f} to ${max_amount:.2f}",
                'average': avg_amount,
                'min': min_amount,
                'max': max_amount,
                'distribution': price_ranges
            }
        
        return {'summary': "No pricing data available"}
    
    def _analyze_client_retention(self, clients: List[Client]) -> Dict:
        """Analyze client retention patterns"""
        # Simple retention analysis based on created date
        now = datetime.now()
        retention_periods = {
            'new': 0,      # < 30 days
            'returning': 0, # 30-90 days
            'loyal': 0     # > 90 days
        }
        
        for client in clients:
            days_since_first = (now - client.created_at).days
            
            if days_since_first < 30:
                retention_periods['new'] += 1
            elif days_since_first < 90:
                retention_periods['returning'] += 1
            else:
                retention_periods['loyal'] += 1
        
        total_clients = len(clients)
        loyal_percentage = (retention_periods['loyal'] / total_clients * 100) if total_clients > 0 else 0
        
        return {
            'summary': f"{loyal_percentage:.1f}% of clients are loyal (90+ days), with {retention_periods['loyal']} loyal clients",
            'distribution': retention_periods,
            'loyal_percentage': loyal_percentage
        }
    
    def _analyze_client_value(self, client_data: List[Tuple]) -> Dict:
        """Analyze client value patterns"""
        values = []
        for client, appointment_count in client_data:
            values.append(appointment_count)
        
        if values:
            avg_appointments = sum(values) / len(values)
            high_value_clients = len([v for v in values if v >= avg_appointments * 1.5])
            
            return {
                'summary': f"Average {avg_appointments:.1f} appointments per client, {high_value_clients} high-value clients identified",
                'average_appointments': avg_appointments,
                'high_value_count': high_value_clients,
                'total_clients': len(values)
            }
        
        return {'summary': "No client value data available"}


class VectorKnowledgeService:
    """Main service for vector-based knowledge management"""
    
    def __init__(self, db: Session, storage_path: str = "./vector_storage"):
        self.db = db
        self.storage_path = Path(storage_path)
        self.storage_path.mkdir(exist_ok=True)
        
        self.logger = logging.getLogger(__name__)
        self.knowledge_extractor = BusinessKnowledgeExtractor(db)
        
        # Initialize embedding model
        self.embedding_model = None
        if SENTENCE_TRANSFORMERS_AVAILABLE:
            try:
                self.embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
                self.logger.info("Loaded SentenceTransformer embedding model")
            except Exception as e:
                self.logger.error(f"Error loading SentenceTransformer: {str(e)}")
        
        # Initialize vector database
        self.vector_db = None
        self.collections = {}
        if CHROMA_AVAILABLE:
            try:
                self.vector_db = chromadb.PersistentClient(
                    path=str(self.storage_path / "chroma"),
                    settings=Settings(anonymized_telemetry=False)
                )
                self.logger.info("Initialized ChromaDB vector database")
            except Exception as e:
                self.logger.error(f"Error initializing ChromaDB: {str(e)}")
    
    async def initialize_user_knowledge_base(self, user_id: str) -> bool:
        """Initialize knowledge base for a user by extracting business data"""
        try:
            self.logger.info(f"Initializing knowledge base for user {user_id}")
            
            # Extract business knowledge
            documents = []
            
            # Extract appointment patterns
            appointment_docs = await self.knowledge_extractor.extract_appointment_patterns(user_id)
            documents.extend(appointment_docs)
            
            # Extract revenue insights
            revenue_docs = await self.knowledge_extractor.extract_revenue_insights(user_id)
            documents.extend(revenue_docs)
            
            # Extract client behavior patterns
            client_docs = await self.knowledge_extractor.extract_client_behavior_patterns(user_id)
            documents.extend(client_docs)
            
            # Store documents in vector database
            if documents:
                await self.store_documents(user_id, documents)
                self.logger.info(f"Stored {len(documents)} knowledge documents for user {user_id}")
            
            return True
            
        except Exception as e:
            self.logger.error(f"Error initializing knowledge base: {str(e)}")
            return False
    
    async def store_documents(self, user_id: str, documents: List[VectorDocument]) -> bool:
        """Store documents in vector database"""
        try:
            if not self.vector_db:
                self.logger.warning("Vector database not available")
                return False
            
            collection_name = f"user_{user_id.replace('-', '_')}"
            
            # Get or create collection
            try:
                collection = self.vector_db.get_collection(collection_name)
            except:
                collection = self.vector_db.create_collection(
                    collection_name,
                    embedding_function=embedding_functions.SentenceTransformerEmbeddingFunction(
                        model_name="all-MiniLM-L6-v2"
                    ) if SENTENCE_TRANSFORMERS_AVAILABLE else None
                )
            
            # Prepare documents for storage
            doc_ids = []
            doc_contents = []
            doc_metadatas = []
            
            for doc in documents:
                doc_ids.append(doc.id)
                doc_contents.append(doc.content)
                
                metadata = doc.metadata.copy()
                metadata.update({
                    'doc_type': doc.doc_type,
                    'user_id': doc.user_id,
                    'source_id': doc.source_id,
                    'created_at': doc.created_at.isoformat()
                })
                doc_metadatas.append(metadata)
            
            # Add to collection
            collection.add(
                documents=doc_contents,
                metadatas=doc_metadatas,
                ids=doc_ids
            )
            
            self.collections[user_id] = collection
            return True
            
        except Exception as e:
            self.logger.error(f"Error storing documents: {str(e)}")
            return False
    
    async def retrieve_relevant_knowledge(self, user_id: str, query: str, 
                                        doc_types: List[str] = None, 
                                        limit: int = 5) -> List[Dict]:
        """Retrieve relevant knowledge for a query"""
        try:
            if not self.vector_db:
                self.logger.warning("Vector database not available")
                return []
            
            collection_name = f"user_{user_id.replace('-', '_')}"
            
            try:
                collection = self.vector_db.get_collection(collection_name)
            except:
                self.logger.warning(f"No knowledge collection found for user {user_id}")
                return []
            
            # Build filter for document types
            where_filter = {}
            if doc_types:
                where_filter["doc_type"] = {"$in": doc_types}
            
            # Query the collection
            results = collection.query(
                query_texts=[query],
                n_results=limit,
                where=where_filter if where_filter else None
            )
            
            # Format results
            relevant_docs = []
            if results['documents'] and results['documents'][0]:
                for i, doc_content in enumerate(results['documents'][0]):
                    metadata = results['metadatas'][0][i] if results['metadatas'] and results['metadatas'][0] else {}
                    distance = results['distances'][0][i] if results['distances'] and results['distances'][0] else 1.0
                    
                    relevant_docs.append({
                        'content': doc_content,
                        'metadata': metadata,
                        'relevance_score': 1.0 - distance,  # Convert distance to relevance
                        'doc_id': results['ids'][0][i] if results['ids'] and results['ids'][0] else None
                    })
            
            return relevant_docs
            
        except Exception as e:
            self.logger.error(f"Error retrieving relevant knowledge: {str(e)}")
            return []
    
    async def update_knowledge_from_interaction(self, user_id: str, interaction_data: Dict) -> bool:
        """Update knowledge base from user interactions"""
        try:
            # Create document from interaction
            content = f"User Interaction: {interaction_data.get('query', '')}"
            if interaction_data.get('response'):
                content += f" | AI Response effectiveness: {interaction_data.get('effectiveness', 0.5)}"
            
            doc = VectorDocument(
                content=content,
                doc_type='conversation',
                metadata={
                    'interaction_data': interaction_data,
                    'effectiveness': interaction_data.get('effectiveness', 0.5),
                    'query_type': interaction_data.get('query_type', 'general')
                },
                user_id=user_id,
                source_id=f"interaction_{datetime.now().isoformat()}"
            )
            
            # Store the interaction
            return await self.store_documents(user_id, [doc])
            
        except Exception as e:
            self.logger.error(f"Error updating knowledge from interaction: {str(e)}")
            return False
    
    async def update_knowledge_from_strategy_outcome(self, user_id: str, strategy: Dict, outcome: Dict) -> bool:
        """Update knowledge base from strategy outcomes"""
        try:
            success_indicator = "successful" if outcome.get('success', False) else "unsuccessful"
            
            content = f"Strategy Outcome: {strategy.get('title', 'Unknown')} was {success_indicator}"
            if outcome.get('roi_percentage'):
                content += f" with {outcome['roi_percentage']:.1f}% ROI"
            
            doc = VectorDocument(
                content=content,
                doc_type='strategy',
                metadata={
                    'strategy': strategy,
                    'outcome': outcome,
                    'success': outcome.get('success', False),
                    'roi': outcome.get('roi_percentage', 0)
                },
                user_id=user_id,
                source_id=f"strategy_{strategy.get('id', uuid4())}"
            )
            
            return await self.store_documents(user_id, [doc])
            
        except Exception as e:
            self.logger.error(f"Error updating knowledge from strategy outcome: {str(e)}")
            return False
    
    async def generate_contextual_insights(self, user_id: str, current_situation: Dict) -> List[Dict]:
        """Generate insights based on current situation and historical knowledge"""
        try:
            # Build query from current situation
            situation_query = self._build_situation_query(current_situation)
            
            # Retrieve relevant knowledge
            relevant_knowledge = await self.retrieve_relevant_knowledge(
                user_id=user_id,
                query=situation_query,
                doc_types=['business_data', 'strategy'],
                limit=10
            )
            
            # Generate insights
            insights = []
            for knowledge in relevant_knowledge[:5]:  # Top 5 most relevant
                if knowledge['relevance_score'] > 0.3:  # Relevance threshold
                    insight = {
                        'type': 'contextual_insight',
                        'title': self._extract_insight_title(knowledge['content']),
                        'description': knowledge['content'],
                        'relevance_score': knowledge['relevance_score'],
                        'source_metadata': knowledge['metadata'],
                        'actionable': True
                    }
                    insights.append(insight)
            
            return insights
            
        except Exception as e:
            self.logger.error(f"Error generating contextual insights: {str(e)}")
            return []
    
    async def find_similar_strategies(self, user_id: str, proposed_strategy: Dict) -> List[Dict]:
        """Find similar strategies from knowledge base"""
        try:
            # Build query from strategy
            strategy_query = f"{proposed_strategy.get('type', '')} {proposed_strategy.get('title', '')} {proposed_strategy.get('description', '')}"
            
            # Retrieve similar strategies
            similar_docs = await self.retrieve_relevant_knowledge(
                user_id=user_id,
                query=strategy_query,
                doc_types=['strategy'],
                limit=10
            )
            
            # Filter and format results
            similar_strategies = []
            for doc in similar_docs:
                if doc['relevance_score'] > 0.4:  # Higher threshold for strategy similarity
                    similar_strategies.append({
                        'content': doc['content'],
                        'metadata': doc['metadata'],
                        'similarity_score': doc['relevance_score'],
                        'outcome': doc['metadata'].get('outcome', {}),
                        'success': doc['metadata'].get('success', False)
                    })
            
            return similar_strategies
            
        except Exception as e:
            self.logger.error(f"Error finding similar strategies: {str(e)}")
            return []
    
    async def get_knowledge_summary(self, user_id: str) -> Dict:
        """Get summary of knowledge base for user"""
        try:
            if not self.vector_db:
                return {'error': 'Vector database not available'}
            
            collection_name = f"user_{user_id.replace('-', '_')}"
            
            try:
                collection = self.vector_db.get_collection(collection_name)
                
                # Get all documents to analyze
                all_docs = collection.get()
                
                if not all_docs['metadatas']:
                    return {'total_documents': 0, 'doc_types': {}}
                
                # Analyze document types
                doc_type_counts = {}
                for metadata in all_docs['metadatas']:
                    doc_type = metadata.get('doc_type', 'unknown')
                    doc_type_counts[doc_type] = doc_type_counts.get(doc_type, 0) + 1
                
                return {
                    'total_documents': len(all_docs['metadatas']),
                    'doc_types': doc_type_counts,
                    'collection_name': collection_name,
                    'last_updated': datetime.now().isoformat()
                }
                
            except:
                return {'total_documents': 0, 'doc_types': {}, 'error': 'Collection not found'}
                
        except Exception as e:
            self.logger.error(f"Error getting knowledge summary: {str(e)}")
            return {'error': str(e)}
    
    # Private helper methods
    
    def _build_situation_query(self, situation: Dict) -> str:
        """Build search query from current business situation"""
        query_parts = []
        
        if situation.get('low_revenue'):
            query_parts.append("revenue increase pricing optimization")
        
        if situation.get('low_client_retention'):
            query_parts.append("client retention customer loyalty")
        
        if situation.get('scheduling_issues'):
            query_parts.append("scheduling efficiency appointment optimization")
        
        if situation.get('service_quality_concerns'):
            query_parts.append("service quality customer satisfaction")
        
        # Default query if no specific situation
        if not query_parts:
            query_parts.append("business performance improvement")
        
        return " ".join(query_parts)
    
    def _extract_insight_title(self, content: str) -> str:
        """Extract a title from knowledge content"""
        # Simple title extraction
        if ':' in content:
            return content.split(':')[0].strip()
        else:
            return content[:50] + "..." if len(content) > 50 else content
    
    async def refresh_knowledge_base(self, user_id: str) -> bool:
        """Refresh knowledge base with latest business data"""
        try:
            # Re-extract all business knowledge
            success = await self.initialize_user_knowledge_base(user_id)
            
            if success:
                self.logger.info(f"Refreshed knowledge base for user {user_id}")
            
            return success
            
        except Exception as e:
            self.logger.error(f"Error refreshing knowledge base: {str(e)}")
            return False
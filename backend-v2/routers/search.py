"""
Global Search API endpoints for BookedBarber V2.

Provides unified search across appointments, clients, services, and other entities.
"""

from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_, func, and_
from pydantic import BaseModel
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

from db import get_db
from dependencies import get_current_user
from models import User, Appointment, Service
from utils.role_permissions import Permission, get_permission_checker, PermissionChecker
from services.semantic_search_service import semantic_search, SemanticMatch
from services.enhanced_semantic_search_service import enhanced_semantic_search, EnhancedSemanticMatch, SearchContext
from services.advanced_search_service import advanced_search, RerankingResult

router = APIRouter(prefix="/search", tags=["search"])

class SearchResult(BaseModel):
    """Individual search result item"""
    id: int
    type: str  # "appointment", "client", "service", etc.
    title: str
    subtitle: Optional[str] = None
    url: str
    metadata: Dict[str, Any] = {}
    score: float = 0.0

class SearchResponse(BaseModel):
    """Search response with results and metadata"""
    query: str
    results: List[SearchResult]
    total: int
    categories: Dict[str, int]
    took_ms: int

@router.get("/", response_model=SearchResponse)
async def global_search(
    q: str = Query(..., min_length=1, max_length=100, description="Search query"),
    limit: int = Query(20, ge=1, le=100, description="Maximum number of results"),
    category: Optional[str] = Query(None, description="Filter by category: appointments, clients, services"),
    current_user: User = Depends(get_current_user),
    permission_checker: PermissionChecker = Depends(get_permission_checker),
    db: Session = Depends(get_db)
):
    """
    Global search across user's data.
    
    Searches through appointments, clients, services based on user permissions.
    Returns unified results with relevance scoring.
    """
    start_time = datetime.now()
    
    results = []
    categories = {
        "appointments": 0,
        "clients": 0, 
        "services": 0
    }
    
    search_query = f"%{q.lower()}%"
    
    try:
        # Search Appointments (if user has permission)
        if (not category or category == "appointments") and \
           permission_checker.has_permission(Permission.VIEW_OWN_APPOINTMENTS):
            
            appointment_query = db.query(Appointment).filter(
                Appointment.client_id == current_user.id if current_user.unified_role == "CLIENT"
                else Appointment.barber_id == current_user.id if current_user.unified_role == "BARBER"
                else True  # Admin/Owner can see all
            ).filter(
                or_(
                    func.lower(Appointment.service_name).like(search_query),
                    func.lower(Appointment.notes).like(search_query),
                    func.lower(Appointment.status).like(search_query)
                )
            ).limit(limit // 3)
            
            for appointment in appointment_query.all():
                results.append(SearchResult(
                    id=appointment.id,
                    type="appointment",
                    title=f"{appointment.service_name}",
                    subtitle=f"{appointment.start_time.strftime('%B %d, %Y at %I:%M %p')}",
                    url=f"/calendar?appointment={appointment.id}",
                    metadata={
                        "date": appointment.start_time.date().isoformat(),
                        "time": appointment.start_time.time().isoformat(),
                        "status": appointment.status,
                    },
                    score=1.0 if q.lower() in appointment.service_name.lower() else 0.5
                ))
                categories["appointments"] += 1
        
        # Search Clients (if user has permission)
        if (not category or category == "clients") and \
           permission_checker.has_permission(Permission.VIEW_ALL_CLIENTS):
            
            client_query = db.query(User).filter(
                User.unified_role == "CLIENT"
            ).filter(
                or_(
                    func.lower(User.first_name).like(search_query),
                    func.lower(User.last_name).like(search_query),
                    func.lower(User.email).like(search_query),
                    func.lower(func.concat(User.first_name, ' ', User.last_name)).like(search_query)
                )
            ).limit(limit // 3)
            
            for client in client_query.all():
                full_name = f"{client.first_name} {client.last_name}".strip()
                results.append(SearchResult(
                    id=client.id,
                    type="client",
                    title=full_name or client.email,
                    subtitle=client.email if full_name else "Client",
                    url=f"/clients/{client.id}",
                    metadata={
                        "email": client.email,
                        "phone": getattr(client, 'phone', None),
                        "last_appointment": None  # Could add this with a subquery
                    },
                    score=1.0 if q.lower() in full_name.lower() else 0.7
                ))
                categories["clients"] += 1
        
        # Search Services (if user has permission)
        if (not category or category == "services") and \
           permission_checker.has_permission(Permission.VIEW_SERVICES):
            
            service_query = db.query(Service).filter(
                or_(
                    func.lower(Service.name).like(search_query),
                    func.lower(Service.description).like(search_query),
                    func.lower(Service.category).like(search_query)
                )
            ).limit(limit // 3)
            
            for service in service_query.all():
                results.append(SearchResult(
                    id=service.id,
                    type="service",
                    title=service.name,
                    subtitle=f"${service.price} - {service.duration} min",
                    url=f"/services/{service.id}",
                    metadata={
                        "price": float(service.price),
                        "duration": service.duration,
                        "category": service.category,
                        "description": service.description
                    },
                    score=1.0 if q.lower() in service.name.lower() else 0.6
                ))
                categories["services"] += 1
        
        # Sort results by score (highest first)
        results.sort(key=lambda x: x.score, reverse=True)
        
        # Limit total results
        results = results[:limit]
        total = len(results)
        
        # Calculate search time
        end_time = datetime.now()
        took_ms = int((end_time - start_time).total_seconds() * 1000)
        
        return SearchResponse(
            query=q,
            results=results,
            total=total,
            categories=categories,
            took_ms=took_ms
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Search failed: {str(e)}"
        )

@router.get("/semantic", response_model=SearchResponse)
async def semantic_search_endpoint(
    q: str = Query(..., min_length=1, max_length=100, description="Search query"),
    type: str = Query("all", description="Search type: all, barbers, services"),
    limit: int = Query(10, ge=1, le=50, description="Maximum number of results"),
    min_similarity: float = Query(0.5, ge=0.0, le=1.0, description="Minimum similarity threshold"),
    current_user: User = Depends(get_current_user),
    permission_checker: PermissionChecker = Depends(get_permission_checker),
    db: Session = Depends(get_db)
):
    """
    Semantic search using Voyage.ai embeddings.
    
    Provides intelligent matching for:
    - Barbers based on skills and descriptions
    - Services based on natural language queries
    - Smart recommendations based on context
    """
    start_time = datetime.now()
    
    results = []
    categories = {
        "barbers": 0,
        "services": 0
    }
    
    try:
        # Check if semantic search is available
        if not semantic_search.is_available():
            raise HTTPException(
                status_code=503,
                detail="Semantic search is temporarily unavailable. Please try keyword search."
            )
        
        # Search barbers
        if type in ["all", "barbers"] and \
           permission_checker.has_permission(Permission.VIEW_ALL_CLIENTS):
            
            barber_matches = await semantic_search.find_similar_barbers(
                query=q,
                db=db,
                limit=limit // 2 if type == "all" else limit,
                min_similarity=min_similarity
            )
            
            for match in barber_matches:
                results.append(SearchResult(
                    id=match.entity_id,
                    type="barber",
                    title=match.title,
                    subtitle=f"Similarity: {match.similarity_score:.0%}",
                    url=f"/barbers/{match.entity_id}",
                    metadata={
                        **match.metadata,
                        "similarity_score": match.similarity_score,
                        "search_type": "semantic"
                    },
                    score=match.similarity_score
                ))
                categories["barbers"] += 1
        
        # Search services
        if type in ["all", "services"] and \
           permission_checker.has_permission(Permission.VIEW_SERVICES):
            
            service_matches = await semantic_search.find_similar_services(
                query=q,
                db=db,
                limit=limit // 2 if type == "all" else limit,
                min_similarity=min_similarity
            )
            
            for match in service_matches:
                results.append(SearchResult(
                    id=match.entity_id,
                    type="service",
                    title=match.title,
                    subtitle=f"${match.metadata.get('price', 0)} - {match.metadata.get('duration', 0)} min (Similarity: {match.similarity_score:.0%})",
                    url=f"/services/{match.entity_id}",
                    metadata={
                        **match.metadata,
                        "similarity_score": match.similarity_score,
                        "search_type": "semantic"
                    },
                    score=match.similarity_score
                ))
                categories["services"] += 1
        
        # Sort by similarity score (highest first)
        results.sort(key=lambda x: x.score, reverse=True)
        
        # Limit total results
        results = results[:limit]
        total = len(results)
        
        # Calculate search time
        end_time = datetime.now()
        took_ms = int((end_time - start_time).total_seconds() * 1000)
        
        return SearchResponse(
            query=q,
            results=results,
            total=total,
            categories=categories,
            took_ms=took_ms
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Semantic search failed: {str(e)}"
        )

@router.get("/recommendations", response_model=SearchResponse)
async def get_recommendations(
    limit: int = Query(5, ge=1, le=20, description="Maximum number of recommendations"),
    current_user: User = Depends(get_current_user),
    permission_checker: PermissionChecker = Depends(get_permission_checker),
    db: Session = Depends(get_db)
):
    """
    Get personalized recommendations for the current user.
    
    For clients: Recommended barbers based on appointment history
    For barbers: Popular services and client preferences
    """
    start_time = datetime.now()
    
    results = []
    categories = {"recommendations": 0}
    
    try:
        if current_user.unified_role == "CLIENT":
            # Recommend barbers for client
            if permission_checker.has_permission(Permission.VIEW_ALL_CLIENTS):
                barber_recommendations = await semantic_search.recommend_barber_for_client(
                    client_id=current_user.id,
                    db=db,
                    limit=limit
                )
                
                for match in barber_recommendations:
                    results.append(SearchResult(
                        id=match.entity_id,
                        type="barber",
                        title=match.title,
                        subtitle=f"Recommended for you (Match: {match.similarity_score:.0%})",
                        url=f"/book?barber={match.entity_id}",
                        metadata={
                            **match.metadata,
                            "recommendation_score": match.similarity_score,
                            "recommendation_type": "barber_for_client"
                        },
                        score=match.similarity_score
                    ))
                    categories["recommendations"] += 1
        
        else:
            # For barbers/owners - could add service recommendations or client insights
            # For now, return popular services
            popular_services = db.query(Service).filter(
                Service.is_active == True
            ).limit(limit).all()
            
            for service in popular_services:
                results.append(SearchResult(
                    id=service.id,
                    type="service",
                    title=service.name,
                    subtitle=f"Popular service - ${service.price}",
                    url=f"/services/{service.id}",
                    metadata={
                        "price": float(service.price),
                        "duration": service.duration,
                        "recommendation_type": "popular_service"
                    },
                    score=0.7
                ))
                categories["recommendations"] += 1
        
        # Sort by score
        results.sort(key=lambda x: x.score, reverse=True)
        total = len(results)
        
        # Calculate search time
        end_time = datetime.now()
        took_ms = int((end_time - start_time).total_seconds() * 1000)
        
        return SearchResponse(
            query="recommendations",
            results=results,
            total=total,
            categories=categories,
            took_ms=took_ms
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get recommendations: {str(e)}"
        )

@router.get("/suggestions", response_model=List[str])
async def search_suggestions(
    q: str = Query(..., min_length=1, max_length=50, description="Partial search query"),
    limit: int = Query(5, ge=1, le=10, description="Maximum number of suggestions"),
    current_user: User = Depends(get_current_user),
    permission_checker: PermissionChecker = Depends(get_permission_checker),
    db: Session = Depends(get_db)
):
    """
    Get search suggestions/autocomplete for the given query.
    
    Returns common search terms that start with the query.
    """
    suggestions = []
    search_query = f"{q.lower()}%"
    
    try:
        # Service name suggestions
        if permission_checker.has_permission(Permission.VIEW_SERVICES):
            service_names = db.query(Service.name).filter(
                func.lower(Service.name).like(search_query)
            ).distinct().limit(limit).all()
            
            suggestions.extend([name[0] for name in service_names])
        
        # Client name suggestions  
        if permission_checker.has_permission(Permission.VIEW_ALL_CLIENTS):
            client_names = db.query(
                func.concat(User.first_name, ' ', User.last_name).label('full_name')
            ).filter(
                User.unified_role == "CLIENT"
            ).filter(
                func.lower(func.concat(User.first_name, ' ', User.last_name)).like(search_query)
            ).distinct().limit(limit).all()
            
            suggestions.extend([name[0] for name in client_names if name[0]])
        
        # Remove duplicates and limit
        suggestions = list(set(suggestions))[:limit]
        
        return suggestions
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get suggestions: {str(e)}"
        )

@router.get("/recent", response_model=List[SearchResult])
async def recent_searches(
    limit: int = Query(10, ge=1, le=20, description="Maximum number of recent items"),
    current_user: User = Depends(get_current_user),
    permission_checker: PermissionChecker = Depends(get_permission_checker),
    db: Session = Depends(get_db)
):
    """
    Get recently accessed items for quick search suggestions.
    
    Returns recent appointments, clients, etc. based on user activity.
    """
    results = []
    
    try:
        # Recent appointments
        if permission_checker.has_permission(Permission.VIEW_OWN_APPOINTMENTS):
            recent_appointments = db.query(Appointment).filter(
                Appointment.client_id == current_user.id if current_user.unified_role == "CLIENT"
                else Appointment.barber_id == current_user.id if current_user.unified_role == "BARBER"
                else True
            ).order_by(Appointment.created_at.desc()).limit(limit // 2).all()
            
            for appointment in recent_appointments:
                results.append(SearchResult(
                    id=appointment.id,
                    type="appointment",
                    title=f"{appointment.service_name}",
                    subtitle=f"{appointment.start_time.strftime('%B %d, %Y at %I:%M %p')}",
                    url=f"/calendar?appointment={appointment.id}",
                    metadata={"recent": True},
                    score=0.9
                ))
        
        # Recent clients (for barbers/owners)
        if permission_checker.has_permission(Permission.VIEW_ALL_CLIENTS):
            # Get clients with recent appointments
            recent_clients = db.query(User).join(
                Appointment, User.id == Appointment.client_id
            ).filter(
                User.unified_role == "CLIENT"
            ).order_by(Appointment.created_at.desc()).distinct().limit(limit // 2).all()
            
            for client in recent_clients:
                full_name = f"{client.first_name} {client.last_name}".strip()
                results.append(SearchResult(
                    id=client.id,
                    type="client",
                    title=full_name or client.email,
                    subtitle="Recent client",
                    url=f"/clients/{client.id}",
                    metadata={"recent": True},
                    score=0.8
                ))
        
        # Sort by score and limit
        results.sort(key=lambda x: x.score, reverse=True)
        return results[:limit]
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get recent items: {str(e)}"
        )

# ================================================================================
# ENHANCED SEMANTIC SEARCH ENDPOINTS
# ================================================================================

class EnhancedSearchResult(BaseModel):
    """Enhanced search result with additional metadata"""
    id: int
    type: str
    title: str
    subtitle: Optional[str] = None
    url: str
    similarity_score: float
    chunk_scores: List[float]
    search_type: str  # "semantic", "keyword", "hybrid"
    rank: int
    metadata: Dict[str, Any] = {}

class EnhancedSearchResponse(BaseModel):
    """Enhanced search response with analytics"""
    query: str
    results: List[EnhancedSearchResult]
    total: int
    search_type: str
    took_ms: int
    analytics: Dict[str, Any] = {}

@router.get("/enhanced/barbers", response_model=EnhancedSearchResponse)
async def enhanced_barber_search(
    q: str = Query(..., min_length=1, max_length=100, description="Search query"),
    limit: int = Query(10, ge=1, le=50, description="Maximum number of results"),
    min_similarity: float = Query(0.6, ge=0.0, le=1.0, description="Minimum similarity threshold"),
    search_type: str = Query("hybrid", description="Search type: semantic, keyword, hybrid"),
    session_id: Optional[str] = Query(None, description="Session ID for analytics"),
    current_user: User = Depends(get_current_user),
    permission_checker: PermissionChecker = Depends(get_permission_checker),
    db: Session = Depends(get_db)
):
    """
    Enhanced semantic search for barbers with caching and analytics.
    
    Provides intelligent matching using:
    - Multiple content chunks for better accuracy
    - Vector caching for performance
    - Hybrid semantic + keyword search
    - Search analytics and learning
    """
    start_time = datetime.now()
    
    # Check permissions
    if not permission_checker.has_permission(Permission.VIEW_ALL_CLIENTS):
        raise HTTPException(
            status_code=403,
            detail="Insufficient permissions to search barbers"
        )
    
    try:
        # Create search context
        context = SearchContext(
            user_id=current_user.id,
            user_role=current_user.unified_role,
            session_id=session_id,
            filters={
                "location_id": getattr(current_user, 'location_id', None)
            }
        )
        
        # Perform enhanced search
        matches = await enhanced_semantic_search.search_barbers(
            query=q,
            db=db,
            limit=limit,
            min_similarity=min_similarity,
            search_type=search_type,
            context=context
        )
        
        # Convert to API response format
        results = []
        for match in matches:
            results.append(EnhancedSearchResult(
                id=match.entity_id,
                type="barber",
                title=match.title,
                subtitle=f"Similarity: {match.similarity_score:.0%} ({match.search_type})",
                url=f"/barbers/{match.entity_id}",
                similarity_score=match.similarity_score,
                chunk_scores=match.chunk_scores,
                search_type=match.search_type,
                rank=match.rank,
                metadata=match.metadata
            ))
        
        # Calculate response time
        took_ms = int((datetime.now() - start_time).total_seconds() * 1000)
        
        # Analytics summary
        analytics = {
            "cache_hits": sum(1 for r in results if r.metadata.get("cached", False)),
            "semantic_results": sum(1 for r in results if r.search_type in ["semantic", "hybrid"]),
            "keyword_results": sum(1 for r in results if r.search_type in ["keyword", "hybrid"]),
            "avg_similarity": sum(r.similarity_score for r in results) / len(results) if results else 0,
            "chunk_stats": {
                "avg_chunks": sum(len(r.chunk_scores) for r in results) / len(results) if results else 0,
                "max_chunks": max(len(r.chunk_scores) for r in results) if results else 0
            }
        }
        
        return EnhancedSearchResponse(
            query=q,
            results=results,
            total=len(results),
            search_type=search_type,
            took_ms=took_ms,
            analytics=analytics
        )
        
    except Exception as e:
        logger.error(f"Enhanced barber search failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Enhanced search failed: {str(e)}"
        )

@router.get("/analytics/query-performance")
async def get_search_analytics(
    limit: int = Query(100, ge=1, le=1000, description="Number of recent queries to analyze"),
    search_type: Optional[str] = Query(None, description="Filter by search type"),
    min_results: Optional[int] = Query(None, description="Minimum number of results"),
    current_user: User = Depends(get_current_user),
    permission_checker: PermissionChecker = Depends(get_permission_checker),
    db: Session = Depends(get_db)
):
    """
    Get search analytics for performance optimization.
    
    Provides insights into:
    - Query performance metrics
    - Popular search terms
    - Search success rates
    - Cache hit ratios
    """
    # Check admin permissions
    if current_user.unified_role not in ["SUPER_ADMIN", "PLATFORM_ADMIN", "SHOP_OWNER"]:
        raise HTTPException(
            status_code=403,
            detail="Insufficient permissions to view analytics"
        )
    
    try:
        from models import SearchAnalytics, SearchQuerySuggestions
        
        # Get recent search analytics
        analytics_query = db.query(SearchAnalytics).order_by(
            SearchAnalytics.created_at.desc()
        )
        
        if search_type:
            analytics_query = analytics_query.filter(
                SearchAnalytics.search_type == search_type
            )
        
        if min_results:
            analytics_query = analytics_query.filter(
                SearchAnalytics.results_count >= min_results
            )
        
        recent_searches = analytics_query.limit(limit).all()
        
        # Calculate performance metrics
        if recent_searches:
            avg_response_time = sum(s.search_time_ms for s in recent_searches) / len(recent_searches)
            avg_results = sum(s.results_count for s in recent_searches) / len(recent_searches)
            success_rate = sum(1 for s in recent_searches if s.results_count > 0) / len(recent_searches)
            
            # Get popular queries
            popular_queries = db.query(SearchQuerySuggestions).order_by(
                SearchQuerySuggestions.search_count.desc()
            ).limit(10).all()
            
            # Performance distribution
            response_times = [s.search_time_ms for s in recent_searches]
            performance_distribution = {
                "fast": sum(1 for t in response_times if t < 100),
                "medium": sum(1 for t in response_times if 100 <= t < 500),
                "slow": sum(1 for t in response_times if t >= 500)
            }
            
            return {
                "summary": {
                    "total_searches": len(recent_searches),
                    "avg_response_time_ms": round(avg_response_time, 2),
                    "avg_results_count": round(avg_results, 2),
                    "success_rate": round(success_rate * 100, 2),
                    "semantic_searches": sum(1 for s in recent_searches if s.search_type == "semantic"),
                    "keyword_searches": sum(1 for s in recent_searches if s.search_type == "keyword"),
                    "hybrid_searches": sum(1 for s in recent_searches if s.search_type == "hybrid")
                },
                "performance_distribution": performance_distribution,
                "popular_queries": [
                    {
                        "query": q.query,
                        "search_count": q.search_count,
                        "success_rate": round(q.success_rate * 100, 2),
                        "click_through_rate": round(q.click_through_rate * 100, 2)
                    }
                    for q in popular_queries
                ],
                "recent_searches": [
                    {
                        "query": s.query,
                        "search_type": s.search_type,
                        "results_count": s.results_count,
                        "response_time_ms": s.search_time_ms,
                        "similarity_score": s.top_similarity_score,
                        "created_at": s.created_at.isoformat()
                    }
                    for s in recent_searches[:20]  # Show last 20
                ]
            }
        else:
            return {
                "summary": {
                    "total_searches": 0,
                    "message": "No search data available"
                }
            }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get analytics: {str(e)}"
        )

@router.post("/analytics/click-tracking")
async def track_search_click(
    data: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Track search result clicks for analytics and learning.
    
    Expected data:
    {
        "query": "search query",
        "result_id": 123,
        "result_type": "barber",
        "position": 1,
        "similarity_score": 0.85,
        "time_to_click_ms": 1500,
        "session_id": "session123"
    }
    """
    try:
        from models import SearchAnalytics
        
        # Find the corresponding search analytics record
        query_hash = enhanced_semantic_search._create_content_hash(data.get("query", ""))
        
        # Update the most recent search record with click data
        recent_search = db.query(SearchAnalytics).filter(
            and_(
                SearchAnalytics.query_hash == query_hash,
                SearchAnalytics.user_id == current_user.id,
                SearchAnalytics.session_id == data.get("session_id")
            )
        ).order_by(SearchAnalytics.created_at.desc()).first()
        
        if recent_search:
            recent_search.clicked_result_id = data.get("result_id")
            recent_search.clicked_result_type = data.get("result_type")
            recent_search.clicked_result_position = data.get("position")
            recent_search.clicked_result_score = data.get("similarity_score")
            recent_search.time_to_click_ms = data.get("time_to_click_ms")
            
            db.commit()
            
            return {"status": "success", "message": "Click tracked"}
        else:
            return {"status": "warning", "message": "No matching search found"}
        
    except Exception as e:
        logger.error(f"Failed to track click: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to track click: {str(e)}"
        )

# ================================================================================
# ADVANCED SEARCH ENDPOINTS (BM25 + RERANKING)
# ================================================================================

class AdvancedSearchResult(BaseModel):
    """Advanced search result with reranking"""
    id: int
    type: str
    title: str
    subtitle: Optional[str] = None
    url: str
    original_score: float
    rerank_score: float
    final_score: float
    search_type: str
    score_breakdown: Dict[str, Any]
    contextual_boost: Optional[float] = None
    metadata: Dict[str, Any] = {}

class AdvancedSearchResponse(BaseModel):
    """Advanced search response with detailed analytics"""
    query: str
    results: List[AdvancedSearchResult]
    total: int
    took_ms: int
    search_methods: List[str]
    reranking_used: bool
    analytics: Dict[str, Any] = {}

@router.get("/advanced/barbers", response_model=AdvancedSearchResponse)
async def advanced_barber_search(
    q: str = Query(..., min_length=1, max_length=100, description="Search query"),
    limit: int = Query(10, ge=1, le=20, description="Maximum number of results"),
    enable_reranking: bool = Query(True, description="Enable cross-encoder reranking"),
    enable_contextual: bool = Query(True, description="Enable contextual boosting"),
    session_id: Optional[str] = Query(None, description="Session ID for analytics"),
    current_user: User = Depends(get_current_user),
    permission_checker: PermissionChecker = Depends(get_permission_checker),
    db: Session = Depends(get_db)
):
    """
    State-of-the-art search combining:
    - Semantic search (Voyage AI embeddings)
    - BM25 lexical search (precise keyword matching)
    - Cross-encoder reranking (ultimate precision)
    - Contextual retrieval (user preferences)
    - Query expansion (barbershop terminology)
    """
    start_time = datetime.now()
    
    # Check permissions
    if not permission_checker.has_permission(Permission.VIEW_ALL_CLIENTS):
        raise HTTPException(
            status_code=403,
            detail="Insufficient permissions to search barbers"
        )
    
    try:
        # Create search context
        context = SearchContext(
            user_id=current_user.id,
            user_role=current_user.unified_role,
            session_id=session_id,
            filters={
                "location_id": getattr(current_user, 'location_id', None)
            }
        )
        
        # Configure advanced search
        from services.advanced_search_service import AdvancedSearchConfig
        config = AdvancedSearchConfig(
            enable_reranking=enable_reranking,
            enable_contextual=enable_contextual
        )
        advanced_search.config = config
        
        # Perform advanced search
        reranking_results = await advanced_search.advanced_search_barbers(
            query=q,
            db=db,
            limit=limit,
            context=context
        )
        
        # Convert to API response format
        results = []
        for result in reranking_results:
            original_match = result.original_match
            
            results.append(AdvancedSearchResult(
                id=original_match.entity_id,
                type="barber",
                title=original_match.title,
                subtitle=f"Relevance: {result.final_score:.0%} ({original_match.search_type})",
                url=f"/barbers/{original_match.entity_id}",
                original_score=original_match.similarity_score,
                rerank_score=result.rerank_score,
                final_score=result.final_score,
                search_type=original_match.search_type,
                score_breakdown=result.score_breakdown,
                contextual_boost=original_match.metadata.get('contextual_boost'),
                metadata=original_match.metadata
            ))
        
        # Calculate response time
        took_ms = int((datetime.now() - start_time).total_seconds() * 1000)
        
        # Analytics
        search_methods = []
        if any(r.search_type in ["semantic", "hybrid"] for r in reranking_results):
            search_methods.append("semantic")
        if any(r.search_type in ["bm25", "hybrid"] for r in reranking_results):
            search_methods.append("bm25")
        if enable_reranking:
            search_methods.append("reranking")
        if enable_contextual:
            search_methods.append("contextual")
        
        analytics = {
            "avg_final_score": sum(r.final_score for r in reranking_results) / len(reranking_results) if reranking_results else 0,
            "score_distribution": {
                "semantic": sum(1 for r in reranking_results if r.original_match.search_type in ["semantic", "hybrid"]),
                "bm25": sum(1 for r in reranking_results if r.original_match.search_type in ["bm25", "hybrid"]),
                "hybrid": sum(1 for r in reranking_results if r.original_match.search_type == "hybrid")
            },
            "reranking_impact": {
                "score_changes": [
                    {
                        "entity_id": r.original_match.entity_id,
                        "original": r.original_match.similarity_score,
                        "reranked": r.final_score,
                        "improvement": r.final_score - r.original_match.similarity_score
                    }
                    for r in reranking_results[:5]  # Top 5 only
                ]
            } if enable_reranking else {},
            "contextual_boosts": [
                {
                    "entity_id": r.original_match.entity_id,
                    "boost": r.original_match.metadata.get('contextual_boost', 1.0)
                }
                for r in reranking_results if r.original_match.metadata.get('contextual_boost', 1.0) != 1.0
            ]
        }
        
        return AdvancedSearchResponse(
            query=q,
            results=results,
            total=len(results),
            took_ms=took_ms,
            search_methods=search_methods,
            reranking_used=enable_reranking and advanced_search.reranker and advanced_search.reranker.is_available(),
            analytics=analytics
        )
        
    except Exception as e:
        logger.error(f"Advanced search failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Advanced search failed: {str(e)}"
        )

@router.get("/enhanced/services", response_model=EnhancedSearchResponse)
async def enhanced_service_search(
    q: str = Query(..., min_length=1, max_length=100, description="Search query"),
    limit: int = Query(10, ge=1, le=50, description="Maximum number of results"),
    min_similarity: float = Query(0.6, ge=0.0, le=1.0, description="Minimum similarity threshold"),
    search_type: str = Query("hybrid", description="Search type: semantic, keyword, hybrid"),
    category: Optional[str] = Query(None, description="Filter by service category"),
    session_id: Optional[str] = Query(None, description="Session ID for analytics"),
    current_user: User = Depends(get_current_user),
    permission_checker: PermissionChecker = Depends(get_permission_checker),
    db: Session = Depends(get_db)
):
    """
    Enhanced semantic search for services with caching and analytics.
    
    Provides intelligent matching for:
    - Services based on natural language queries
    - Category-based filtering
    - Price and duration preferences
    """
    start_time = datetime.now()
    
    # Check permissions
    if not permission_checker.has_permission(Permission.VIEW_SERVICES):
        raise HTTPException(
            status_code=403,
            detail="Insufficient permissions to search services"
        )
    
    try:
        # Create search context
        context = SearchContext(
            user_id=current_user.id,
            user_role=current_user.unified_role,
            session_id=session_id,
            filters={
                "location_id": getattr(current_user, 'location_id', None),
                "category": category
            }
        )
        
        # Perform enhanced search
        matches = await enhanced_semantic_search.search_services(
            query=q,
            db=db,
            limit=limit,
            min_similarity=min_similarity,
            search_type=search_type,
            context=context
        )
        
        # Convert to API response format
        results = []
        for match in matches:
            results.append(EnhancedSearchResult(
                id=match.entity_id,
                type="service",
                title=match.title,
                subtitle=f"${match.metadata.get('price', 0)} - {match.metadata.get('duration', 0)} min (Similarity: {match.similarity_score:.0%})",
                url=f"/services/{match.entity_id}",
                similarity_score=match.similarity_score,
                chunk_scores=match.chunk_scores,
                search_type=match.search_type,
                rank=match.rank,
                metadata=match.metadata
            ))
        
        # Calculate response time
        took_ms = int((datetime.now() - start_time).total_seconds() * 1000)
        
        # Analytics summary
        analytics = {
            "cache_hits": sum(1 for r in results if r.metadata.get("cached", False)),
            "semantic_results": sum(1 for r in results if r.search_type in ["semantic", "hybrid"]),
            "keyword_results": sum(1 for r in results if r.search_type in ["keyword", "hybrid"]),
            "avg_similarity": sum(r.similarity_score for r in results) / len(results) if results else 0,
            "chunk_stats": {
                "avg_chunks": sum(len(r.chunk_scores) for r in results) / len(results) if results else 0,
                "max_chunks": max(len(r.chunk_scores) for r in results) if results else 0
            }
        }
        
        return EnhancedSearchResponse(
            query=q,
            results=results,
            total=len(results),
            search_type=search_type,
            took_ms=took_ms,
            analytics=analytics
        )
        
    except Exception as e:
        logger.error(f"Enhanced service search failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Enhanced service search failed: {str(e)}"
        )

@router.get("/advanced/services", response_model=AdvancedSearchResponse)
async def advanced_service_search(
    q: str = Query(..., min_length=1, max_length=100, description="Search query"),
    limit: int = Query(10, ge=1, le=20, description="Maximum number of results"),
    enable_reranking: bool = Query(True, description="Enable cross-encoder reranking"),
    enable_contextual: bool = Query(True, description="Enable contextual boosting"),
    category: Optional[str] = Query(None, description="Filter by service category"),
    price_min: Optional[float] = Query(None, description="Minimum price filter"),
    price_max: Optional[float] = Query(None, description="Maximum price filter"),
    session_id: Optional[str] = Query(None, description="Session ID for analytics"),
    current_user: User = Depends(get_current_user),
    permission_checker: PermissionChecker = Depends(get_permission_checker),
    db: Session = Depends(get_db)
):
    """
    State-of-the-art service search combining:
    - Semantic search (Voyage AI embeddings)
    - BM25 lexical search (precise keyword matching)
    - Cross-encoder reranking (ultimate precision)
    - Contextual retrieval (user preferences)
    - Category and price filtering
    """
    start_time = datetime.now()
    
    # Check permissions
    if not permission_checker.has_permission(Permission.VIEW_SERVICES):
        raise HTTPException(
            status_code=403,
            detail="Insufficient permissions to search services"
        )
    
    try:
        # Create search context with price preferences
        context = SearchContext(
            user_id=current_user.id,
            user_role=current_user.unified_role,
            session_id=session_id,
            filters={
                "location_id": getattr(current_user, 'location_id', None),
                "category": category
            }
        )
        
        # Add price range to context if provided
        if price_min is not None or price_max is not None:
            context.price_range = {
                "min": price_min or 0,
                "max": price_max or float('inf')
            }
        
        # Configure advanced search for services
        from services.advanced_search_service import AdvancedSearchConfig
        config = AdvancedSearchConfig(
            enable_reranking=enable_reranking,
            enable_contextual=enable_contextual
        )
        
        # Use enhanced semantic search as base for services
        # (Advanced search service focuses on barbers)
        enhanced_results = await enhanced_semantic_search.search_services(
            query=q,
            db=db,
            limit=limit,
            search_type="hybrid",
            context=context
        )
        
        # Convert to advanced search response format
        results = []
        for result in enhanced_results:
            results.append(AdvancedSearchResult(
                id=result.entity_id,
                type="service",
                title=result.title,
                subtitle=f"${result.metadata.get('price', 0)} - Category: {result.metadata.get('category', 'N/A')} (Relevance: {result.similarity_score:.0%})",
                url=f"/services/{result.entity_id}",
                original_score=result.metadata.get('original_similarity', result.similarity_score),
                rerank_score=result.similarity_score,  # Enhanced search includes contextual scoring
                final_score=result.similarity_score,
                search_type=result.search_type,
                score_breakdown={
                    "semantic": result.metadata.get('original_similarity', result.similarity_score),
                    "contextual": result.metadata.get('contextual_boost', 1.0),
                    "final": result.similarity_score
                },
                contextual_boost=result.metadata.get('contextual_boost'),
                metadata=result.metadata
            ))
        
        # Calculate response time
        took_ms = int((datetime.now() - start_time).total_seconds() * 1000)
        
        # Analytics
        search_methods = ["semantic", "bm25", "hybrid"]
        if enable_contextual:
            search_methods.append("contextual")
        
        analytics = {
            "avg_final_score": sum(r.final_score for r in results) / len(results) if results else 0,
            "score_distribution": {
                "semantic": sum(1 for r in results if r.search_type in ["semantic", "hybrid"]),
                "keyword": sum(1 for r in results if r.search_type in ["keyword", "hybrid"]),
                "hybrid": sum(1 for r in results if r.search_type == "hybrid")
            },
            "contextual_boosts": [
                {
                    "entity_id": r.id,
                    "boost": r.contextual_boost or 1.0
                }
                for r in results if (r.contextual_boost or 1.0) != 1.0
            ],
            "category_distribution": {},
            "price_range_analysis": {
                "min_price": min((r.metadata.get('price', 0) for r in results), default=0),
                "max_price": max((r.metadata.get('price', 0) for r in results), default=0),
                "avg_price": sum(r.metadata.get('price', 0) for r in results) / len(results) if results else 0
            }
        }
        
        # Calculate category distribution
        for result in results:
            category = result.metadata.get('category', 'Unknown')
            analytics["category_distribution"][category] = analytics["category_distribution"].get(category, 0) + 1
        
        return AdvancedSearchResponse(
            query=q,
            results=results,
            total=len(results),
            took_ms=took_ms,
            search_methods=search_methods,
            reranking_used=False,  # Using enhanced search instead of advanced reranking
            analytics=analytics
        )
        
    except Exception as e:
        logger.error(f"Advanced service search failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Advanced service search failed: {str(e)}"
        )

@router.get("/suggestions/intelligent")
async def intelligent_search_suggestions(
    q: str = Query(..., min_length=1, max_length=50, description="Partial search query"),
    limit: int = Query(5, ge=1, le=10, description="Maximum number of suggestions"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get intelligent search suggestions with:
    - Barbershop terminology expansion
    - Popular query analysis
    - Contextual recommendations
    """
    try:
        # Get suggestions from advanced search service
        suggestions = await advanced_search.get_search_suggestions(q, limit)
        
        # Add popular queries from analytics
        from models import SearchQuerySuggestions
        popular_queries = db.query(SearchQuerySuggestions).filter(
            SearchQuerySuggestions.normalized_query.ilike(f"%{q.lower()}%")
        ).order_by(SearchQuerySuggestions.search_count.desc()).limit(3).all()
        
        for query_suggestion in popular_queries:
            if query_suggestion.query not in suggestions:
                suggestions.append(query_suggestion.query)
        
        return {
            "query": q,
            "suggestions": suggestions[:limit],
            "total": len(suggestions[:limit])
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get suggestions: {str(e)}"
        )

@router.get("/capabilities")
async def get_search_capabilities():
    """
    Get current search system capabilities and status
    """
    try:
        # Check service availability
        capabilities = {
            "semantic_search": {
                "available": enhanced_semantic_search.is_available(),
                "model": "voyage-3-large",
                "features": ["embeddings", "similarity_matching", "caching"]
            },
            "bm25_search": {
                "available": True,
                "algorithm": "BM25Okapi", 
                "features": ["keyword_matching", "term_frequency", "query_expansion"]
            },
            "reranking": {
                "available": advanced_search.reranker and advanced_search.reranker.is_available(),
                "model": advanced_search.reranker.model_name if advanced_search.reranker else None,
                "features": ["cross_encoder", "final_ranking"]
            },
            "contextual_retrieval": {
                "available": True,
                "features": ["location_boost", "preference_matching", "temporal_context"]
            },
            "query_expansion": {
                "available": True,
                "features": ["barbershop_synonyms", "term_variants", "skill_matching"]
            },
            "analytics": {
                "available": True,
                "features": ["performance_tracking", "user_behavior", "click_analytics"]
            }
        }
        
        # System performance info
        performance = {
            "barber_index_updated": advanced_search.barber_index_updated.isoformat() if advanced_search.barber_index_updated else None,
            "service_index_updated": advanced_search.service_index_updated.isoformat() if advanced_search.service_index_updated else None,
            "cache_enabled": True,
            "search_methods": ["semantic", "bm25", "hybrid", "reranked"]
        }
        
        return {
            "capabilities": capabilities,
            "performance": performance,
            "version": "2.0.0-advanced",
            "last_updated": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get capabilities: {str(e)}"
        )
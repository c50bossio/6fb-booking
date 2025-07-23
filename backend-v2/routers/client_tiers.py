"""
Client Tiers API Router for Six Figure Barber Methodology

Provides endpoints for client tier analysis, classification, and analytics
based on the Six Figure Barber business methodology.
"""

from typing import Dict, List, Optional, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from database import get_db
from dependencies import get_current_user
from models import User, Client
from services.client_tier_service import ClientTierService
# from schemas import ClientTierResponse, ClientTierAnalytics  # TODO: Add these schemas later
# from utils.error_handling import handle_service_error  # Not used currently
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/client-tiers", tags=["Client Tiers"])

@router.get("/")
async def get_client_tiers_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get overview of client tiers for the current user's business
    
    Returns:
    - Tier distribution statistics
    - Revenue by tier analytics
    - Six Figure Barber methodology metrics
    """
    try:
        tier_service = ClientTierService(db)
        
        # Get all clients for this user/organization
        query = db.query(Client)
        
        # Filter by user's organization or barber relationship
        if current_user.role == 'barber':
            query = query.filter(Client.barber_id == current_user.id)
        elif current_user.organization_id:
            query = query.filter(Client.organization_id == current_user.organization_id)
        else:
            # Individual barber shop owner
            query = query.filter(Client.barber_id == current_user.id)
        
        clients = query.all()
        
        if not clients:
            return {
                "total_clients": 0,
                "tier_distribution": {},
                "revenue_by_tier": {},
                "six_fb_metrics": {
                    "average_client_value": 0,
                    "tier_progression_rate": 0,
                    "revenue_optimization_score": 0
                },
                "top_clients": [],
                "growth_opportunities": []
            }
        
        # Calculate tiers for all clients
        tier_results = tier_service.bulk_calculate_tiers([client.id for client in clients])
        
        # Aggregate statistics
        tier_counts = {'platinum': 0, 'gold': 0, 'silver': 0, 'bronze': 0, 'new': 0}
        tier_revenue = {'platinum': 0, 'gold': 0, 'silver': 0, 'bronze': 0, 'new': 0}
        total_revenue = 0
        total_optimization_score = 0
        valid_results = []
        
        for result in tier_results:
            if 'error' not in result:
                tier = result['primary_tier']
                tier_counts[tier] += 1
                
                # Calculate tier revenue
                current_value = result['revenue_potential']['current_annual_value']
                tier_revenue[tier] += current_value
                total_revenue += current_value
                total_optimization_score += result['revenue_potential']['revenue_optimization_score']
                valid_results.append(result)
        
        # Calculate Six Figure Barber metrics
        average_client_value = total_revenue / len(valid_results) if valid_results else 0
        average_optimization_score = total_optimization_score / len(valid_results) if valid_results else 0
        
        # Calculate tier progression opportunities
        growth_opportunities = []
        for result in valid_results:
            if result['revenue_potential']['growth_opportunity'] > 100:  # $100+ growth potential
                growth_opportunities.append({
                    'client_id': result['client_id'],
                    'current_tier': result['primary_tier'],
                    'growth_potential': result['revenue_potential']['growth_opportunity'],
                    'next_tier_requirements': result['revenue_potential']['next_tier_requirement']
                })
        
        # Sort by growth potential
        growth_opportunities.sort(key=lambda x: x['growth_potential'], reverse=True)
        
        # Get top clients (platinum and gold tiers)
        top_clients = []
        for result in valid_results:
            if result['primary_tier'] in ['platinum', 'gold']:
                top_clients.append({
                    'client_id': result['client_id'],
                    'tier': result['primary_tier'],
                    'annual_value': result['revenue_potential']['current_annual_value'],
                    'confidence_score': result['confidence_score']
                })
        
        top_clients.sort(key=lambda x: x['annual_value'], reverse=True)
        
        return {
            "total_clients": len(clients),
            "tier_distribution": tier_counts,
            "revenue_by_tier": tier_revenue,
            "total_revenue": total_revenue,
            "six_fb_metrics": {
                "average_client_value": round(average_client_value, 2),
                "revenue_optimization_score": round(average_optimization_score, 2),
                "platinum_gold_percentage": round((tier_counts['platinum'] + tier_counts['gold']) / len(clients) * 100, 1) if clients else 0
            },
            "top_clients": top_clients[:10],  # Top 10
            "growth_opportunities": growth_opportunities[:20]  # Top 20 opportunities
        }
        
    except Exception as e:
        logger.error(f"Error getting client tiers overview: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve client tiers data")

@router.get("/client/{client_id}")
async def get_client_tier_analysis(
    client_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get detailed tier analysis for a specific client
    
    Returns comprehensive Six Figure Barber methodology analysis including:
    - Tier classification and scores
    - Revenue potential and growth opportunities  
    - Personalization recommendations
    - Service optimization suggestions
    """
    try:
        # Verify client access
        client = db.query(Client).filter(Client.id == client_id).first()
        if not client:
            raise HTTPException(status_code=404, detail="Client not found")
        
        # Check permissions
        has_access = False
        if current_user.role == 'barber' and client.barber_id == current_user.id:
            has_access = True
        elif current_user.organization_id and client.organization_id == current_user.organization_id:
            has_access = True
        elif client.barber_id == current_user.id:  # Individual shop owner
            has_access = True
        
        if not has_access:
            raise HTTPException(status_code=403, detail="Access denied to this client")
        
        # Calculate tier analysis
        tier_service = ClientTierService(db)
        tier_analysis = tier_service.calculate_client_tier(client)
        
        # Add client basic info
        tier_analysis['client_info'] = {
            'id': client.id,
            'name': f"{client.first_name} {client.last_name}",
            'email': client.email,
            'phone': client.phone,
            'total_visits': client.total_visits,
            'total_spent': float(client.total_spent) if client.total_spent else 0,
            'last_visit_date': client.last_visit_date.isoformat() if client.last_visit_date else None,
            'created_at': client.created_at.isoformat() if client.created_at else None
        }
        
        return tier_analysis
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting client tier analysis for client {client_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve client tier analysis")

@router.post("/calculate-bulk")
async def calculate_bulk_tiers(
    client_ids: Optional[List[int]] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Calculate tiers for multiple clients (admin/batch operation)
    
    Useful for:
    - Initial tier calculation setup
    - Periodic tier recalculation
    - Data analysis and reporting
    """
    try:
        tier_service = ClientTierService(db)
        
        # If no specific client IDs provided, get all accessible clients
        if not client_ids:
            query = db.query(Client)
            if current_user.role == 'barber':
                query = query.filter(Client.barber_id == current_user.id)
            elif current_user.organization_id:
                query = query.filter(Client.organization_id == current_user.organization_id)
            
            clients = query.all()
            client_ids = [client.id for client in clients]
        
        # Calculate tiers
        results = tier_service.bulk_calculate_tiers(client_ids)
        
        # Update database records with tier information
        updated_count = 0
        for result in results:
            if 'error' not in result:
                if tier_service.update_client_tier_in_db(result['client_id'], result):
                    updated_count += 1
        
        return {
            "total_processed": len(results),
            "successfully_updated": updated_count,
            "results": results
        }
        
    except Exception as e:
        logger.error(f"Error in bulk tier calculation: {e}")
        raise HTTPException(status_code=500, detail="Failed to calculate bulk client tiers")

@router.get("/analytics/revenue-optimization")
async def get_revenue_optimization_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get Six Figure Barber revenue optimization analytics
    
    Returns insights for reaching six-figure income goals:
    - Client tier upgrade opportunities
    - Revenue gap analysis
    - Service mix optimization recommendations
    - Pricing strategy insights
    """
    try:
        tier_service = ClientTierService(db)
        
        # Get all clients
        query = db.query(Client)
        if current_user.role == 'barber':
            query = query.filter(Client.barber_id == current_user.id)
        elif current_user.organization_id:
            query = query.filter(Client.organization_id == current_user.organization_id)
        
        clients = query.all()
        
        if not clients:
            return {
                "current_annual_revenue": 0,
                "six_figure_gap": 100000,
                "optimization_recommendations": [],
                "tier_upgrade_opportunities": [],
                "service_mix_analysis": {}
            }
        
        # Calculate comprehensive analytics
        tier_results = tier_service.bulk_calculate_tiers([client.id for client in clients])
        
        current_annual_revenue = 0
        tier_upgrade_opportunities = []
        total_potential_revenue = 0
        
        for result in tier_results:
            if 'error' not in result:
                current_annual_revenue += result['revenue_potential']['current_annual_value']
                total_potential_revenue += result['revenue_potential']['potential_annual_value']
                
                # Identify upgrade opportunities
                if result['revenue_potential']['growth_opportunity'] > 200:  # $200+ potential
                    tier_upgrade_opportunities.append({
                        'client_id': result['client_id'],
                        'current_tier': result['primary_tier'],
                        'growth_opportunity': result['revenue_potential']['growth_opportunity'],
                        'optimization_score': result['revenue_potential']['revenue_optimization_score'],
                        'recommended_actions': result['personalization']['upselling_approach']
                    })
        
        # Sort opportunities by potential
        tier_upgrade_opportunities.sort(key=lambda x: x['growth_opportunity'], reverse=True)
        
        # Calculate six-figure gap
        six_figure_gap = max(0, 100000 - current_annual_revenue)
        
        # Generate optimization recommendations
        recommendations = []
        if six_figure_gap > 0:
            # Focus on highest-value opportunities
            high_value_opportunities = [opp for opp in tier_upgrade_opportunities if opp['growth_opportunity'] > 500]
            
            if high_value_opportunities:
                recommendations.append({
                    "category": "High-Value Client Development",
                    "description": f"Focus on {len(high_value_opportunities)} high-potential clients",
                    "potential_impact": sum(opp['growth_opportunity'] for opp in high_value_opportunities[:5]),
                    "action_items": [
                        "Implement personalized service packages",
                        "Increase visit frequency through loyalty programs",
                        "Upsell premium services during appointments"
                    ]
                })
            
            if current_annual_revenue < 50000:
                recommendations.append({
                    "category": "Client Base Expansion", 
                    "description": "Focus on acquiring new platinum/gold tier clients",
                    "potential_impact": 25000,
                    "action_items": [
                        "Implement referral programs for existing top clients",
                        "Market premium services to attract higher-tier clients",
                        "Optimize pricing strategy for value-based positioning"
                    ]
                })
        
        return {
            "current_annual_revenue": round(current_annual_revenue, 2),
            "potential_annual_revenue": round(total_potential_revenue, 2),
            "six_figure_gap": round(six_figure_gap, 2),
            "gap_percentage": round((six_figure_gap / 100000) * 100, 1),
            "optimization_recommendations": recommendations,
            "tier_upgrade_opportunities": tier_upgrade_opportunities[:10],  # Top 10
            "total_clients": len(clients),
            "revenue_per_client": round(current_annual_revenue / len(clients), 2) if clients else 0
        }
        
    except Exception as e:
        logger.error(f"Error getting revenue optimization analytics: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve revenue optimization analytics")
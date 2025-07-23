"""
Platform Collections API
Handles commission and booth rent collection for decentralized barbers
"""

import logging
from typing import Dict, List, Optional, Any
from decimal import Decimal
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field, validator

from database import get_db
from dependencies import get_current_user
from models import User
from models.hybrid_payment import (
    PlatformCollection, CollectionType, CollectionStatus,
    PaymentMode, ExternalPaymentProcessor
)
from services.platform_collection_service import PlatformCollectionService, CollectionError

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/platform-collections", tags=["Platform Collections"])


# Pydantic Models for API

class CommissionCalculationRequest(BaseModel):
    """Request model for commission calculation"""
    barber_id: Optional[int] = Field(None, description="Barber ID (admin only)")
    start_date: Optional[datetime] = Field(None, description="Start date for calculation")
    end_date: Optional[datetime] = Field(None, description="End date for calculation")


class BoothRentCalculationRequest(BaseModel):
    """Request model for booth rent calculation"""
    barber_id: Optional[int] = Field(None, description="Barber ID (admin only)")
    rent_period_start: datetime = Field(description="Start of rent period")
    rent_period_end: datetime = Field(description="End of rent period")


class CreateCollectionRequest(BaseModel):
    """Request model for creating a collection"""
    collection_type: CollectionType = Field(description="Type of collection")
    amount: Decimal = Field(gt=0, description="Amount to collect")
    description: str = Field(max_length=500, description="Collection description")
    period_start: Optional[datetime] = Field(None, description="Collection period start")
    period_end: Optional[datetime] = Field(None, description="Collection period end")
    auto_collect: bool = Field(True, description="Attempt automatic collection")
    
    @validator('amount')
    def validate_amount(cls, v):
        if v <= 0:
            raise ValueError('Amount must be greater than 0')
        return v


class UpdateCollectionRequest(BaseModel):
    """Request model for updating a collection"""
    scheduled_date: Optional[datetime] = Field(None, description="New scheduled date")
    description: Optional[str] = Field(None, max_length=500, description="Updated description")


class CollectionResponse(BaseModel):
    """Response model for collection data"""
    id: int
    barber_id: int
    collection_type: str
    amount: float
    currency: str
    description: str
    status: str
    collection_method: str
    scheduled_date: Optional[datetime]
    attempted_at: Optional[datetime]
    collected_at: Optional[datetime]
    period_start: Optional[datetime]
    period_end: Optional[datetime]
    platform_transaction_id: Optional[str]
    processing_fee: Optional[float]
    net_amount: Optional[float]
    failure_reason: Optional[str]
    related_external_transaction_ids: List[int]
    created_at: datetime
    
    @validator('amount', 'processing_fee', 'net_amount', pre=True)
    def convert_decimal_to_float(cls, v):
        if v is None:
            return None
        return float(v) if isinstance(v, Decimal) else v

    class Config:
        from_attributes = True


# API Endpoints

@router.post("/commission/calculate", response_model=Dict[str, Any])
async def calculate_commission(
    request: CommissionCalculationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Calculate outstanding commission for a barber.
    
    Barbers can only calculate their own commission.
    Admins can calculate for any barber.
    """
    
    try:
        collection_service = PlatformCollectionService(db)
        
        # Determine target barber
        target_barber_id = request.barber_id
        if not target_barber_id:
            target_barber_id = current_user.id
        
        # Authorization check
        if target_barber_id != current_user.id and current_user.role not in ['admin', 'shop_owner']:
            raise HTTPException(
                status_code=403,
                detail="You can only calculate commission for your own account"
            )
        
        # Validate barber exists and has decentralized payment mode
        target_barber = db.query(User).filter(User.id == target_barber_id).first()
        if not target_barber:
            raise HTTPException(status_code=404, detail="Barber not found")
        
        if target_barber.payment_mode != PaymentMode.DECENTRALIZED.value:
            raise HTTPException(
                status_code=400,
                detail="Commission calculation only available for barbers with decentralized payment mode"
            )
        
        # Calculate commission
        commission_data = collection_service.calculate_outstanding_commission(
            barber_id=target_barber_id,
            start_date=request.start_date,
            end_date=request.end_date
        )
        
        return commission_data
        
    except CollectionError as e:
        logger.error(f"Commission calculation failed: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error in commission calculation: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/booth-rent/calculate", response_model=Dict[str, Any])
async def calculate_booth_rent(
    request: BoothRentCalculationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Calculate booth rent for a specific period.
    
    Barbers can only calculate their own rent.
    Admins can calculate for any barber.
    """
    
    try:
        collection_service = PlatformCollectionService(db)
        
        # Determine target barber
        target_barber_id = request.barber_id
        if not target_barber_id:
            target_barber_id = current_user.id
        
        # Authorization check
        if target_barber_id != current_user.id and current_user.role not in ['admin', 'shop_owner']:
            raise HTTPException(
                status_code=403,
                detail="You can only calculate booth rent for your own account"
            )
        
        # Validate barber exists
        target_barber = db.query(User).filter(User.id == target_barber_id).first()
        if not target_barber:
            raise HTTPException(status_code=404, detail="Barber not found")
        
        # Calculate booth rent
        rent_data = collection_service.calculate_booth_rent(
            barber_id=target_barber_id,
            rent_period_start=request.rent_period_start,
            rent_period_end=request.rent_period_end
        )
        
        return rent_data
        
    except CollectionError as e:
        logger.error(f"Booth rent calculation failed: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error in booth rent calculation: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/create", response_model=CollectionResponse)
async def create_collection(
    request: CreateCollectionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new platform collection.
    
    Only shop owners and admins can create collections for others.
    Barbers can create collections for themselves.
    """
    
    try:
        collection_service = PlatformCollectionService(db)
        
        # Only allow barbers to create their own collections
        target_barber_id = current_user.id
        if current_user.role in ['admin', 'shop_owner']:
            # Admins can specify barber_id in the description or other metadata
            # For now, they create for themselves unless specified otherwise
            pass
        
        # Create collection
        collection = collection_service.create_collection(
            barber_id=target_barber_id,
            collection_type=request.collection_type,
            amount=request.amount,
            description=request.description,
            period_start=request.period_start,
            period_end=request.period_end,
            auto_collect=request.auto_collect
        )
        
        return CollectionResponse.from_orm(collection)
        
    except CollectionError as e:
        logger.error(f"Collection creation failed: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error in collection creation: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/", response_model=List[CollectionResponse])
async def get_collections(
    barber_id: Optional[int] = Query(None, description="Filter by barber ID (admin only)"),
    collection_type: Optional[CollectionType] = Query(None, description="Filter by collection type"),
    status: Optional[CollectionStatus] = Query(None, description="Filter by status"),
    limit: int = Query(50, ge=1, le=100, description="Maximum number of results"),
    offset: int = Query(0, ge=0, description="Number of results to skip"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get platform collections with optional filtering.
    
    Barbers can only see their own collections.
    Admins can see all collections.
    """
    
    try:
        # Determine query filters
        target_barber_id = barber_id
        if current_user.role not in ['admin', 'shop_owner']:
            # Non-admin users can only see their own collections
            target_barber_id = current_user.id
        elif not target_barber_id:
            # Admin without specific barber filter sees their own by default
            target_barber_id = current_user.id
        
        # Build query
        query = db.query(PlatformCollection)
        
        if target_barber_id:
            query = query.filter(PlatformCollection.barber_id == target_barber_id)
        
        if collection_type:
            query = query.filter(PlatformCollection.collection_type == collection_type)
        
        if status:
            query = query.filter(PlatformCollection.status == status)
        
        # Order by created date descending
        query = query.order_by(PlatformCollection.created_at.desc())
        
        # Apply pagination
        collections = query.offset(offset).limit(limit).all()
        
        return [CollectionResponse.from_orm(collection) for collection in collections]
        
    except Exception as e:
        logger.error(f"Error fetching collections: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/{collection_id}", response_model=CollectionResponse)
async def get_collection(
    collection_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get a specific collection by ID.
    
    Barbers can only view their own collections.
    Admins can view any collection.
    """
    
    try:
        collection = db.query(PlatformCollection).filter(
            PlatformCollection.id == collection_id
        ).first()
        
        if not collection:
            raise HTTPException(status_code=404, detail="Collection not found")
        
        # Authorization check
        if (collection.barber_id != current_user.id and 
            current_user.role not in ['admin', 'shop_owner']):
            raise HTTPException(
                status_code=403,
                detail="You can only view your own collections"
            )
        
        return CollectionResponse.from_orm(collection)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching collection {collection_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.put("/{collection_id}", response_model=CollectionResponse)
async def update_collection(
    collection_id: int,
    request: UpdateCollectionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update a collection (limited fields).
    
    Only the collection owner or admins can update collections.
    Only certain fields can be updated (scheduled_date, description).
    """
    
    try:
        collection = db.query(PlatformCollection).filter(
            PlatformCollection.id == collection_id
        ).first()
        
        if not collection:
            raise HTTPException(status_code=404, detail="Collection not found")
        
        # Authorization check
        if (collection.barber_id != current_user.id and 
            current_user.role not in ['admin', 'shop_owner']):
            raise HTTPException(
                status_code=403,
                detail="You can only update your own collections"
            )
        
        # Only allow updates to certain fields and only in certain states
        if collection.status not in [CollectionStatus.PENDING, CollectionStatus.FAILED]:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot update collection in {collection.status.value} status"
            )
        
        # Update allowed fields
        if request.scheduled_date is not None:
            collection.scheduled_date = request.scheduled_date
        
        if request.description is not None:
            collection.description = request.description
        
        collection.updated_at = datetime.now(timezone.utc)
        
        db.commit()
        db.refresh(collection)
        
        return CollectionResponse.from_orm(collection)
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating collection {collection_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/{collection_id}/retry", response_model=Dict[str, Any])
async def retry_collection(
    collection_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retry a failed collection.
    
    Only the collection owner or admins can retry collections.
    """
    
    try:
        collection_service = PlatformCollectionService(db)
        
        # Get collection and verify ownership
        collection = db.query(PlatformCollection).filter(
            PlatformCollection.id == collection_id
        ).first()
        
        if not collection:
            raise HTTPException(status_code=404, detail="Collection not found")
        
        # Authorization check
        if (collection.barber_id != current_user.id and 
            current_user.role not in ['admin', 'shop_owner']):
            raise HTTPException(
                status_code=403,
                detail="You can only retry your own collections"
            )
        
        # Retry collection
        result = collection_service.retry_failed_collection(collection_id)
        
        return result
        
    except CollectionError as e:
        logger.error(f"Collection retry failed: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in collection retry: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/process-scheduled", response_model=List[Dict[str, Any]])
async def process_scheduled_collections(
    limit: int = Query(50, ge=1, le=100, description="Maximum collections to process"),
    background_tasks: BackgroundTasks = BackgroundTasks(),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Process collections scheduled for today.
    
    Only admins can trigger scheduled collection processing.
    This endpoint processes collections in the background.
    """
    
    try:
        # Only allow admins to process scheduled collections
        if current_user.role not in ['admin', 'shop_owner']:
            raise HTTPException(
                status_code=403,
                detail="Only administrators can process scheduled collections"
            )
        
        collection_service = PlatformCollectionService(db)
        
        # Process scheduled collections
        results = collection_service.process_scheduled_collections(limit=limit)
        
        return results
        
    except CollectionError as e:
        logger.error(f"Scheduled collection processing failed: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error in scheduled collection processing: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/generate-commission-collections", response_model=List[CollectionResponse])
async def generate_commission_collections(
    barber_id: Optional[int] = Query(None, description="Generate for specific barber (admin only)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Generate commission collections for barbers with outstanding commissions.
    
    Barbers can generate their own commission collections.
    Admins can generate for any barber or all barbers.
    """
    
    try:
        collection_service = PlatformCollectionService(db)
        
        # Determine target barber
        target_barber_id = barber_id
        if current_user.role not in ['admin', 'shop_owner']:
            # Non-admin users can only generate for themselves
            target_barber_id = current_user.id
        
        # Generate commission collections
        collections = collection_service.generate_commission_collections(barber_id=target_barber_id)
        
        return [CollectionResponse.from_orm(collection) for collection in collections]
        
    except CollectionError as e:
        logger.error(f"Commission collection generation failed: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error in commission collection generation: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/stats/summary", response_model=Dict[str, Any])
async def get_collection_stats(
    barber_id: Optional[int] = Query(None, description="Get stats for specific barber (admin only)"),
    days: int = Query(30, ge=1, le=365, description="Number of days to include in stats"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get collection statistics summary.
    
    Barbers can only see their own stats.
    Admins can see stats for any barber.
    """
    
    try:
        # Determine target barber
        target_barber_id = barber_id
        if current_user.role not in ['admin', 'shop_owner']:
            target_barber_id = current_user.id
        elif not target_barber_id:
            target_barber_id = current_user.id
        
        # Calculate date range
        end_date = datetime.now(timezone.utc)
        start_date = end_date - timedelta(days=days)
        
        # Get collections in date range
        collections = db.query(PlatformCollection).filter(
            PlatformCollection.barber_id == target_barber_id,
            PlatformCollection.created_at >= start_date
        ).all()
        
        # Calculate statistics
        total_collections = len(collections)
        total_amount = sum((collection.amount or 0) for collection in collections)
        total_collected = sum(
            (collection.net_amount or collection.amount or 0) 
            for collection in collections 
            if collection.status == CollectionStatus.COLLECTED
        )
        successful_collections = len([
            c for c in collections 
            if c.status == CollectionStatus.COLLECTED
        ])
        pending_collections = len([
            c for c in collections 
            if c.status == CollectionStatus.PENDING
        ])
        failed_collections = len([
            c for c in collections 
            if c.status == CollectionStatus.FAILED
        ])
        
        # Collection by type
        commission_collections = [c for c in collections if c.collection_type == CollectionType.COMMISSION]
        booth_rent_collections = [c for c in collections if c.collection_type == CollectionType.BOOTH_RENT]
        
        stats = {
            'period': {
                'start_date': start_date.isoformat(),
                'end_date': end_date.isoformat(),
                'days': days
            },
            'overview': {
                'total_collections': total_collections,
                'total_amount': float(total_amount),
                'total_collected': float(total_collected),
                'success_rate': (successful_collections / total_collections * 100) if total_collections > 0 else 0
            },
            'by_status': {
                'successful': successful_collections,
                'pending': pending_collections,
                'failed': failed_collections
            },
            'by_type': {
                'commission': {
                    'count': len(commission_collections),
                    'total_amount': float(sum((c.amount or 0) for c in commission_collections))
                },
                'booth_rent': {
                    'count': len(booth_rent_collections),
                    'total_amount': float(sum((c.amount or 0) for c in booth_rent_collections))
                }
            }
        }
        
        return stats
        
    except Exception as e:
        logger.error(f"Error calculating collection stats: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")
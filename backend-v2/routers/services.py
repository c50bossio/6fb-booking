from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import datetime, date, time
import enum

from database import get_db
from models import Service, ServiceCategoryEnum, ServicePricingRule, ServiceBookingRule, barber_services
from schemas import ServiceCreate, ServiceUpdate, ServiceResponse, ServicePricingRuleCreate, ServiceBookingRuleCreate
from utils.auth import get_current_user, verify_admin_or_barber
from dependencies import get_current_active_user

router = APIRouter(
    prefix="/services",
    tags=["services"],
    dependencies=[Depends(get_current_active_user)]
)


@router.get("/categories", response_model=List[dict])
async def get_service_categories():
    """Get all available service categories"""
    return [
        {"value": category.value, "name": category.name, "label": category.value.replace("_", " ").title()}
        for category in ServiceCategoryEnum
    ]


@router.get("/", response_model=List[ServiceResponse])
async def get_services(
    category: Optional[ServiceCategoryEnum] = Query(None),
    barber_id: Optional[int] = Query(None),
    is_active: Optional[bool] = Query(True),
    is_bookable_online: Optional[bool] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """Get all services with optional filtering"""
    query = db.query(Service)
    
    if category:
        query = query.filter(Service.category == category)
    
    if is_active is not None:
        query = query.filter(Service.is_active == is_active)
    
    if is_bookable_online is not None:
        query = query.filter(Service.is_bookable_online == is_bookable_online)
    
    if barber_id:
        # Filter services offered by specific barber
        query = query.join(barber_services).filter(
            barber_services.c.barber_id == barber_id,
            barber_services.c.is_available == True
        )
    
    # Order by category and display order
    query = query.order_by(Service.category, Service.display_order, Service.name)
    
    services = query.offset(skip).limit(limit).all()
    
    # If barber_id is provided, fetch custom pricing/duration
    if barber_id:
        for service in services:
            # Get barber-specific pricing and duration
            barber_service = db.execute(
                barber_services.select().where(
                    (barber_services.c.barber_id == barber_id) &
                    (barber_services.c.service_id == service.id)
                )
            ).first()
            
            if barber_service and barber_service.custom_price:
                service.base_price = barber_service.custom_price
            if barber_service and barber_service.custom_duration:
                service.duration_minutes = barber_service.custom_duration
    
    return services


@router.get("/{service_id}", response_model=ServiceResponse)
async def get_service(
    service_id: int,
    barber_id: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    """Get a specific service by ID"""
    service = db.query(Service).options(
        joinedload(Service.pricing_rules),
        joinedload(Service.booking_rules)
    ).filter(Service.id == service_id).first()
    
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    # If barber_id is provided, get custom pricing/duration
    if barber_id:
        service.base_price = service.get_price_for_barber(barber_id, db)
        service.duration_minutes = service.get_duration_for_barber(barber_id, db)
    
    return service


@router.post("/", response_model=ServiceResponse)
async def create_service(
    service: ServiceCreate,
    current_user = Depends(verify_admin_or_barber),
    db: Session = Depends(get_db)
):
    """Create a new service (admin or barber only)"""
    # Check if service with same name already exists
    existing = db.query(Service).filter(Service.name == service.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Service with this name already exists")
    
    db_service = Service(
        **service.dict(exclude={"package_item_ids"}),
        created_by_id=current_user.id
    )
    
    # If this is a package, add package items
    if service.is_package and service.package_item_ids:
        package_items = db.query(Service).filter(
            Service.id.in_(service.package_item_ids),
            Service.is_package == False  # Can't have packages within packages
        ).all()
        
        if len(package_items) != len(service.package_item_ids):
            raise HTTPException(status_code=400, detail="Some package items not found or invalid")
        
        db_service.package_items = package_items
    
    db.add(db_service)
    db.commit()
    db.refresh(db_service)
    
    return db_service


@router.put("/{service_id}", response_model=ServiceResponse)
async def update_service(
    service_id: int,
    service: ServiceUpdate,
    current_user = Depends(verify_admin_or_barber),
    db: Session = Depends(get_db)
):
    """Update a service (admin or barber only)"""
    db_service = db.query(Service).filter(Service.id == service_id).first()
    if not db_service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    # Check if name is being changed and if it conflicts
    if service.name and service.name != db_service.name:
        existing = db.query(Service).filter(
            Service.name == service.name,
            Service.id != service_id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Service with this name already exists")
    
    # Update fields
    update_data = service.dict(exclude_unset=True, exclude={"package_item_ids"})
    for field, value in update_data.items():
        setattr(db_service, field, value)
    
    # Update package items if provided and this is a package
    if db_service.is_package and "package_item_ids" in service.dict(exclude_unset=True):
        if service.package_item_ids:
            package_items = db.query(Service).filter(
                Service.id.in_(service.package_item_ids),
                Service.is_package == False
            ).all()
            
            if len(package_items) != len(service.package_item_ids):
                raise HTTPException(status_code=400, detail="Some package items not found or invalid")
            
            db_service.package_items = package_items
        else:
            db_service.package_items = []
    
    db_service.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(db_service)
    
    return db_service


@router.delete("/{service_id}")
async def delete_service(
    service_id: int,
    current_user = Depends(verify_admin_or_barber),
    db: Session = Depends(get_db)
):
    """Delete a service (admin only)"""
    if current_user.role != "admin" and current_user.role != "super_admin":
        raise HTTPException(status_code=403, detail="Only admins can delete services")
    
    db_service = db.query(Service).filter(Service.id == service_id).first()
    if not db_service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    # Check if service is used in any appointments
    from models import Appointment
    appointment_count = db.query(Appointment).filter(
        Appointment.service_id == service_id
    ).count()
    
    if appointment_count > 0:
        # Soft delete instead of hard delete
        db_service.is_active = False
        db.commit()
        return {"message": f"Service deactivated (used in {appointment_count} appointments)"}
    
    db.delete(db_service)
    db.commit()
    
    return {"message": "Service deleted successfully"}


# Pricing Rules endpoints

@router.post("/{service_id}/pricing-rules", response_model=dict)
async def create_pricing_rule(
    service_id: int,
    rule: ServicePricingRuleCreate,
    current_user = Depends(verify_admin_or_barber),
    db: Session = Depends(get_db)
):
    """Create a pricing rule for a service"""
    # Verify service exists
    service = db.query(Service).filter(Service.id == service_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    db_rule = ServicePricingRule(
        service_id=service_id,
        **rule.dict()
    )
    
    db.add(db_rule)
    db.commit()
    db.refresh(db_rule)
    
    return {"id": db_rule.id, "message": "Pricing rule created successfully"}


@router.get("/{service_id}/pricing-rules")
async def get_pricing_rules(
    service_id: int,
    db: Session = Depends(get_db)
):
    """Get all pricing rules for a service"""
    service = db.query(Service).filter(Service.id == service_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    rules = db.query(ServicePricingRule).filter(
        ServicePricingRule.service_id == service_id,
        ServicePricingRule.is_active == True
    ).order_by(ServicePricingRule.priority.desc()).all()
    
    return rules


@router.delete("/{service_id}/pricing-rules/{rule_id}")
async def delete_pricing_rule(
    service_id: int,
    rule_id: int,
    current_user = Depends(verify_admin_or_barber),
    db: Session = Depends(get_db)
):
    """Delete a pricing rule"""
    rule = db.query(ServicePricingRule).filter(
        ServicePricingRule.id == rule_id,
        ServicePricingRule.service_id == service_id
    ).first()
    
    if not rule:
        raise HTTPException(status_code=404, detail="Pricing rule not found")
    
    db.delete(rule)
    db.commit()
    
    return {"message": "Pricing rule deleted successfully"}


# Booking Rules endpoints

@router.post("/{service_id}/booking-rules", response_model=dict)
async def create_booking_rule(
    service_id: int,
    rule: ServiceBookingRuleCreate,
    current_user = Depends(verify_admin_or_barber),
    db: Session = Depends(get_db)
):
    """Create a booking rule for a service"""
    # Verify service exists
    service = db.query(Service).filter(Service.id == service_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    db_rule = ServiceBookingRule(
        service_id=service_id,
        **rule.dict()
    )
    
    db.add(db_rule)
    db.commit()
    db.refresh(db_rule)
    
    return {"id": db_rule.id, "message": "Booking rule created successfully"}


@router.get("/{service_id}/booking-rules")
async def get_booking_rules(
    service_id: int,
    db: Session = Depends(get_db)
):
    """Get all booking rules for a service"""
    service = db.query(Service).filter(Service.id == service_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    rules = db.query(ServiceBookingRule).filter(
        ServiceBookingRule.service_id == service_id,
        ServiceBookingRule.is_active == True
    ).all()
    
    return rules


@router.delete("/{service_id}/booking-rules/{rule_id}")
async def delete_booking_rule(
    service_id: int,
    rule_id: int,
    current_user = Depends(verify_admin_or_barber),
    db: Session = Depends(get_db)
):
    """Delete a booking rule"""
    rule = db.query(ServiceBookingRule).filter(
        ServiceBookingRule.id == rule_id,
        ServiceBookingRule.service_id == service_id
    ).first()
    
    if not rule:
        raise HTTPException(status_code=404, detail="Booking rule not found")
    
    db.delete(rule)
    db.commit()
    
    return {"message": "Booking rule deleted successfully"}


# Barber-specific service management

@router.post("/{service_id}/barbers/{barber_id}")
async def assign_service_to_barber(
    service_id: int,
    barber_id: int,
    custom_price: Optional[float] = None,
    custom_duration: Optional[int] = None,
    current_user = Depends(verify_admin_or_barber),
    db: Session = Depends(get_db)
):
    """Assign a service to a barber with optional custom pricing/duration"""
    # Only admin or the barber themselves can assign services
    if current_user.role not in ["admin", "super_admin"] and current_user.id != barber_id:
        raise HTTPException(status_code=403, detail="Not authorized to manage this barber's services")
    
    # Verify service exists
    service = db.query(Service).filter(Service.id == service_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    # Verify barber exists and is a barber
    from models import User
    barber = db.query(User).filter(
        User.id == barber_id,
        User.role.in_(["barber", "admin", "super_admin"])
    ).first()
    if not barber:
        raise HTTPException(status_code=404, detail="Barber not found")
    
    # Check if assignment already exists
    existing = db.execute(
        barber_services.select().where(
            (barber_services.c.barber_id == barber_id) &
            (barber_services.c.service_id == service_id)
        )
    ).first()
    
    if existing:
        # Update existing assignment
        db.execute(
            barber_services.update().where(
                (barber_services.c.barber_id == barber_id) &
                (barber_services.c.service_id == service_id)
            ).values(
                custom_price=custom_price,
                custom_duration=custom_duration,
                is_available=True
            )
        )
    else:
        # Create new assignment
        db.execute(
            barber_services.insert().values(
                barber_id=barber_id,
                service_id=service_id,
                custom_price=custom_price,
                custom_duration=custom_duration,
                is_available=True
            )
        )
    
    db.commit()
    
    return {"message": "Service assigned to barber successfully"}


@router.delete("/{service_id}/barbers/{barber_id}")
async def remove_service_from_barber(
    service_id: int,
    barber_id: int,
    current_user = Depends(verify_admin_or_barber),
    db: Session = Depends(get_db)
):
    """Remove a service from a barber"""
    # Only admin or the barber themselves can remove services
    if current_user.role not in ["admin", "super_admin"] and current_user.id != barber_id:
        raise HTTPException(status_code=403, detail="Not authorized to manage this barber's services")
    
    result = db.execute(
        barber_services.update().where(
            (barber_services.c.barber_id == barber_id) &
            (barber_services.c.service_id == service_id)
        ).values(is_available=False)
    )
    
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Service assignment not found")
    
    db.commit()
    
    return {"message": "Service removed from barber successfully"}


@router.get("/barbers/{barber_id}")
async def get_barber_services(
    barber_id: int,
    is_available: Optional[bool] = Query(True),
    db: Session = Depends(get_db)
):
    """Get all services offered by a specific barber"""
    from models import User
    
    # Verify barber exists
    barber = db.query(User).filter(
        User.id == barber_id,
        User.role.in_(["barber", "admin", "super_admin"])
    ).first()
    if not barber:
        raise HTTPException(status_code=404, detail="Barber not found")
    
    # Get services with custom pricing/duration
    query = db.query(Service).join(barber_services).filter(
        barber_services.c.barber_id == barber_id
    )
    
    if is_available is not None:
        query = query.filter(barber_services.c.is_available == is_available)
    
    services = query.all()
    
    # Add custom pricing/duration to response
    result = []
    for service in services:
        barber_service = db.execute(
            barber_services.select().where(
                (barber_services.c.barber_id == barber_id) &
                (barber_services.c.service_id == service.id)
            )
        ).first()
        
        service_dict = {
            "id": service.id,
            "name": service.name,
            "description": service.description,
            "category": service.category,
            "base_price": service.base_price,
            "duration_minutes": service.duration_minutes,
            "custom_price": barber_service.custom_price if barber_service else None,
            "custom_duration": barber_service.custom_duration if barber_service else None,
            "effective_price": barber_service.custom_price if barber_service and barber_service.custom_price else service.base_price,
            "effective_duration": barber_service.custom_duration if barber_service and barber_service.custom_duration else service.duration_minutes,
            "is_available": barber_service.is_available if barber_service else True
        }
        result.append(service_dict)
    
    return result


# Calculate dynamic pricing

@router.get("/{service_id}/calculate-price")
async def calculate_service_price(
    service_id: int,
    barber_id: Optional[int] = Query(None),
    booking_date: Optional[date] = Query(None),
    booking_time: Optional[time] = Query(None),
    db: Session = Depends(get_db)
):
    """Calculate the dynamic price for a service based on various factors"""
    service = db.query(Service).filter(Service.id == service_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    # Start with base price or barber-specific price
    if barber_id:
        price = service.get_price_for_barber(barber_id, db)
    else:
        price = service.base_price
    
    # Apply pricing rules if date/time provided
    if booking_date or booking_time:
        rules = db.query(ServicePricingRule).filter(
            ServicePricingRule.service_id == service_id,
            ServicePricingRule.is_active == True
        ).order_by(ServicePricingRule.priority.desc()).all()
        
        for rule in rules:
            # Check if rule applies
            applies = False
            
            if rule.rule_type == "day_of_week" and booking_date:
                if rule.day_of_week == booking_date.weekday():
                    applies = True
            
            elif rule.rule_type == "time_of_day" and booking_time:
                if rule.start_time <= booking_time <= rule.end_time:
                    applies = True
            
            elif rule.rule_type == "date_range" and booking_date:
                if rule.start_date <= booking_date <= rule.end_date:
                    applies = True
            
            if applies:
                price = rule.apply_to_price(price)
                break  # Apply only the highest priority rule
    
    return {
        "service_id": service_id,
        "base_price": service.base_price,
        "calculated_price": round(price, 2),
        "barber_id": barber_id,
        "booking_date": booking_date,
        "booking_time": booking_time
    }
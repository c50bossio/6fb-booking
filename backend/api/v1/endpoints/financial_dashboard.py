"""
Financial Dashboard API endpoints
Provides comprehensive financial metrics and analytics for shop owners
"""

from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_, case, extract
from datetime import datetime, date, timedelta
from typing import Optional, List, Dict, Any
from decimal import Decimal
import logging

from config.database import get_db
from utils.auth_decorators import get_current_user
from models.user import User
from models.appointment import Appointment
from models.payment import Payment, PaymentStatus
from models.barber_payment import (
    BarberPaymentModel,
    CommissionPayment,
    BoothRentPayment,
    PaymentStatus as BarberPaymentStatus,
    PaymentModelType
)
from models.barber import Barber
from models.location import Location

logger = logging.getLogger(__name__)

router = APIRouter()


def calculate_processing_fees(amount: float) -> float:
    """Calculate standard Stripe processing fees (2.9% + $0.30)"""
    return (amount * 0.029) + 0.30


def get_date_range(period: str, custom_start: Optional[date] = None, custom_end: Optional[date] = None):
    """Get start and end dates based on period selection"""
    if period == "custom" and custom_start and custom_end:
        return custom_start, custom_end
    
    today = date.today()
    
    if period == "week":
        start_date = today - timedelta(days=today.weekday())  # Monday
        end_date = start_date + timedelta(days=6)  # Sunday
    elif period == "month":
        start_date = today.replace(day=1)
        next_month = today.replace(day=28) + timedelta(days=4)
        end_date = next_month - timedelta(days=next_month.day)
    elif period == "quarter":
        quarter = (today.month - 1) // 3
        start_date = date(today.year, quarter * 3 + 1, 1)
        if quarter < 3:
            end_date = date(today.year, (quarter + 1) * 3 + 1, 1) - timedelta(days=1)
        else:
            end_date = date(today.year + 1, 1, 1) - timedelta(days=1)
    elif period == "year":
        start_date = date(today.year, 1, 1)
        end_date = date(today.year, 12, 31)
    else:  # Default to month
        start_date = today.replace(day=1)
        next_month = today.replace(day=28) + timedelta(days=4)
        end_date = next_month - timedelta(days=next_month.day)
    
    return start_date, end_date


def get_previous_period_dates(start_date: date, end_date: date):
    """Get the previous period's start and end dates for comparison"""
    period_days = (end_date - start_date).days + 1
    prev_end = start_date - timedelta(days=1)
    prev_start = prev_end - timedelta(days=period_days - 1)
    return prev_start, prev_end


def check_demo_mode(current_user: User) -> bool:
    """Check if user is in demo mode"""
    return current_user.email.endswith("@demo.com") or current_user.email == "demo@6fb.com"


def generate_demo_shop_metrics(start_date: date, end_date: date) -> Dict[str, Any]:
    """Generate realistic demo data for shop metrics"""
    days_in_period = (end_date - start_date).days + 1
    
    # Base metrics scaled by period
    base_daily_revenue = 1250.0
    base_daily_appointments = 12
    base_daily_product_sales = 150.0
    
    total_revenue = base_daily_revenue * days_in_period
    total_appointments = base_daily_appointments * days_in_period
    total_product_revenue = base_daily_product_sales * days_in_period
    total_service_revenue = total_revenue - total_product_revenue
    
    # Calculate fees and net
    total_fees = calculate_processing_fees(total_revenue)
    
    # Previous period (simulate 15% growth)
    prev_revenue = total_revenue * 0.87
    
    return {
        "period": {
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "days": days_in_period
        },
        "revenue": {
            "total_revenue": round(total_revenue, 2),
            "service_revenue": round(total_service_revenue, 2),
            "product_revenue": round(total_product_revenue, 2),
            "tip_revenue": round(total_revenue * 0.15, 2),
            "processing_fees": round(total_fees, 2),
            "net_revenue": round(total_revenue - total_fees, 2)
        },
        "trends": {
            "revenue_change": 15.0,
            "revenue_change_amount": round(total_revenue - prev_revenue, 2),
            "appointment_change": 12.5,
            "average_ticket_change": 8.3
        },
        "metrics": {
            "total_appointments": total_appointments,
            "average_ticket": round(total_revenue / total_appointments, 2),
            "services_per_day": round(total_appointments / days_in_period, 1),
            "revenue_per_day": round(total_revenue / days_in_period, 2)
        },
        "barber_metrics": {
            "active_barbers": 4,
            "average_utilization": 75.5,
            "top_performer_revenue": round(total_revenue * 0.35, 2)
        }
    }


def generate_demo_barber_revenue(start_date: date, end_date: date) -> List[Dict[str, Any]]:
    """Generate realistic demo data for barber revenue"""
    barbers = [
        {"id": 1, "name": "Marcus Johnson", "role": "Master Barber", "payment_type": "commission", "rate": 0.60},
        {"id": 2, "name": "DeAndre Williams", "role": "Senior Barber", "payment_type": "booth_rent", "rent": 250},
        {"id": 3, "name": "Carlos Rodriguez", "role": "Barber", "payment_type": "commission", "rate": 0.50},
        {"id": 4, "name": "Jamal Thompson", "role": "Junior Barber", "payment_type": "hybrid", "rate": 0.40, "rent": 150}
    ]
    
    days_in_period = (end_date - start_date).days + 1
    weeks_in_period = days_in_period / 7
    
    barber_data = []
    
    for barber in barbers:
        # Generate revenue based on barber level
        if barber["role"] == "Master Barber":
            daily_revenue = 450
        elif barber["role"] == "Senior Barber":
            daily_revenue = 350
        elif barber["role"] == "Barber":
            daily_revenue = 300
        else:
            daily_revenue = 250
        
        total_revenue = daily_revenue * days_in_period
        service_revenue = total_revenue * 0.85
        product_revenue = total_revenue * 0.05
        tip_revenue = total_revenue * 0.10
        
        # Calculate earnings based on payment type
        if barber["payment_type"] == "commission":
            barber_earnings = total_revenue * barber["rate"]
            shop_earnings = total_revenue * (1 - barber["rate"])
            rent_owed = 0
        elif barber["payment_type"] == "booth_rent":
            rent_owed = barber["rent"] * weeks_in_period
            barber_earnings = total_revenue - rent_owed
            shop_earnings = rent_owed
        else:  # hybrid
            commission_earnings = total_revenue * barber["rate"]
            rent_owed = barber["rent"] * weeks_in_period
            barber_earnings = commission_earnings
            shop_earnings = (total_revenue * (1 - barber["rate"])) + rent_owed
        
        barber_data.append({
            "barber": {
                "id": barber["id"],
                "name": barber["name"],
                "role": barber["role"],
                "payment_model": barber["payment_type"]
            },
            "revenue": {
                "total_revenue": round(total_revenue, 2),
                "service_revenue": round(service_revenue, 2),
                "product_revenue": round(product_revenue, 2),
                "tip_revenue": round(tip_revenue, 2)
            },
            "earnings": {
                "barber_earnings": round(barber_earnings, 2),
                "shop_earnings": round(shop_earnings, 2),
                "commission_rate": barber.get("rate", 0) * 100,
                "booth_rent": round(rent_owed, 2) if rent_owed > 0 else None
            },
            "metrics": {
                "appointments": int(days_in_period * 3.5),
                "average_ticket": round(total_revenue / (days_in_period * 3.5), 2),
                "utilization_rate": round(75 + (ord(barber["name"][0]) % 20), 1)
            }
        })
    
    return barber_data


def generate_demo_payout_summary(start_date: date, end_date: date) -> Dict[str, Any]:
    """Generate realistic demo data for payout summary"""
    total_revenue = 35000.0
    processing_fees = calculate_processing_fees(total_revenue)
    
    # Barber payouts
    commission_payouts = total_revenue * 0.55
    booth_rent_collected = 3200.0
    
    return {
        "period": {
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat()
        },
        "revenue_summary": {
            "gross_revenue": round(total_revenue, 2),
            "processing_fees": round(processing_fees, 2),
            "net_revenue": round(total_revenue - processing_fees, 2)
        },
        "payouts": {
            "pending": {
                "count": 3,
                "amount": round(commission_payouts * 0.25, 2),
                "barbers": ["Marcus Johnson", "Carlos Rodriguez", "Jamal Thompson"]
            },
            "completed": {
                "count": 12,
                "amount": round(commission_payouts * 0.75, 2),
                "last_payout_date": (date.today() - timedelta(days=2)).isoformat()
            },
            "failed": {
                "count": 0,
                "amount": 0.0
            }
        },
        "booth_rent": {
            "total_due": round(booth_rent_collected, 2),
            "collected": round(booth_rent_collected * 0.875, 2),
            "pending": round(booth_rent_collected * 0.125, 2),
            "overdue": 0.0
        },
        "shop_net": {
            "gross_shop_revenue": round(total_revenue - commission_payouts + booth_rent_collected, 2),
            "after_fees": round(total_revenue - commission_payouts + booth_rent_collected - processing_fees, 2),
            "profit_margin": 42.5
        }
    }


@router.get("/shop-metrics")
async def get_shop_metrics(
    period: str = Query("month", description="Time period: week, month, quarter, year, custom"),
    start_date: Optional[date] = Query(None, description="Start date for custom period"),
    end_date: Optional[date] = Query(None, description="End date for custom period"),
    location_id: Optional[int] = Query(None, description="Filter by location"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get comprehensive shop financial metrics
    Access: shop_owner, admin, super_admin
    """
    # Check authorization
    if current_user.role not in ["shop_owner", "admin", "super_admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to access financial data"
        )
    
    # Check demo mode
    if check_demo_mode(current_user):
        start, end = get_date_range(period, start_date, end_date)
        return generate_demo_shop_metrics(start, end)
    
    try:
        # Get date range
        start, end = get_date_range(period, start_date, end_date)
        prev_start, prev_end = get_previous_period_dates(start, end)
        
        # Build base query for current period
        current_query = db.query(
            func.count(Appointment.id).label("total_appointments"),
            func.sum(Appointment.service_revenue).label("service_revenue"),
            func.sum(Appointment.product_revenue).label("product_revenue"),
            func.sum(Appointment.tip_amount).label("tip_revenue"),
            func.sum(
                Appointment.service_revenue + 
                Appointment.product_revenue + 
                Appointment.tip_amount
            ).label("total_revenue")
        ).filter(
            Appointment.appointment_date.between(start, end),
            Appointment.status == "completed"
        )
        
        # Build query for previous period
        prev_query = db.query(
            func.count(Appointment.id).label("total_appointments"),
            func.sum(
                Appointment.service_revenue + 
                Appointment.product_revenue + 
                Appointment.tip_amount
            ).label("total_revenue")
        ).filter(
            Appointment.appointment_date.between(prev_start, prev_end),
            Appointment.status == "completed"
        )
        
        # Add location filter if specified
        if location_id:
            current_query = current_query.join(Barber).filter(Barber.location_id == location_id)
            prev_query = prev_query.join(Barber).filter(Barber.location_id == location_id)
        
        # Execute queries
        current_metrics = current_query.first()
        prev_metrics = prev_query.first()
        
        # Get barber metrics
        barber_query = db.query(
            func.count(func.distinct(Appointment.barber_id)).label("active_barbers"),
            func.avg(
                case(
                    (Appointment.status == "completed", 1),
                    else_=0
                )
            ).label("avg_utilization")
        ).filter(
            Appointment.appointment_date.between(start, end)
        )
        
        if location_id:
            barber_query = barber_query.join(Barber).filter(Barber.location_id == location_id)
        
        barber_metrics = barber_query.first()
        
        # Calculate metrics
        total_revenue = float(current_metrics.total_revenue or 0)
        service_revenue = float(current_metrics.service_revenue or 0)
        product_revenue = float(current_metrics.product_revenue or 0)
        tip_revenue = float(current_metrics.tip_revenue or 0)
        total_appointments = current_metrics.total_appointments or 0
        
        # Calculate processing fees
        processing_fees = calculate_processing_fees(total_revenue)
        net_revenue = total_revenue - processing_fees
        
        # Calculate trends
        prev_revenue = float(prev_metrics.total_revenue or 0) if prev_metrics else 0
        prev_appointments = prev_metrics.total_appointments or 0 if prev_metrics else 0
        
        revenue_change = ((total_revenue - prev_revenue) / prev_revenue * 100) if prev_revenue > 0 else 0
        appointment_change = ((total_appointments - prev_appointments) / prev_appointments * 100) if prev_appointments > 0 else 0
        
        avg_ticket = total_revenue / total_appointments if total_appointments > 0 else 0
        prev_avg_ticket = prev_revenue / prev_appointments if prev_appointments > 0 else 0
        avg_ticket_change = ((avg_ticket - prev_avg_ticket) / prev_avg_ticket * 100) if prev_avg_ticket > 0 else 0
        
        days_in_period = (end - start).days + 1
        
        return {
            "period": {
                "start_date": start.isoformat(),
                "end_date": end.isoformat(),
                "days": days_in_period
            },
            "revenue": {
                "total_revenue": round(total_revenue, 2),
                "service_revenue": round(service_revenue, 2),
                "product_revenue": round(product_revenue, 2),
                "tip_revenue": round(tip_revenue, 2),
                "processing_fees": round(processing_fees, 2),
                "net_revenue": round(net_revenue, 2)
            },
            "trends": {
                "revenue_change": round(revenue_change, 1),
                "revenue_change_amount": round(total_revenue - prev_revenue, 2),
                "appointment_change": round(appointment_change, 1),
                "average_ticket_change": round(avg_ticket_change, 1)
            },
            "metrics": {
                "total_appointments": total_appointments,
                "average_ticket": round(avg_ticket, 2),
                "services_per_day": round(total_appointments / days_in_period, 1),
                "revenue_per_day": round(total_revenue / days_in_period, 2)
            },
            "barber_metrics": {
                "active_barbers": barber_metrics.active_barbers or 0,
                "average_utilization": round(float(barber_metrics.avg_utilization or 0) * 100, 1)
            }
        }
        
    except Exception as e:
        logger.error(f"Error fetching shop metrics: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch shop metrics"
        )


@router.get("/barber-revenue")
async def get_barber_revenue(
    period: str = Query("month", description="Time period: week, month, quarter, year, custom"),
    start_date: Optional[date] = Query(None, description="Start date for custom period"),
    end_date: Optional[date] = Query(None, description="End date for custom period"),
    location_id: Optional[int] = Query(None, description="Filter by location"),
    barber_id: Optional[int] = Query(None, description="Filter by specific barber"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get revenue breakdown by barber with payment model details
    Access: shop_owner, admin, super_admin
    """
    # Check authorization
    if current_user.role not in ["shop_owner", "admin", "super_admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to access financial data"
        )
    
    # Check demo mode
    if check_demo_mode(current_user):
        start, end = get_date_range(period, start_date, end_date)
        return generate_demo_barber_revenue(start, end)
    
    try:
        # Get date range
        start, end = get_date_range(period, start_date, end_date)
        
        # Base query for barber revenue
        query = db.query(
            Barber.id,
            Barber.first_name,
            Barber.last_name,
            Barber.email,
            func.count(Appointment.id).label("total_appointments"),
            func.sum(Appointment.service_revenue).label("service_revenue"),
            func.sum(Appointment.product_revenue).label("product_revenue"),
            func.sum(Appointment.tip_amount).label("tip_revenue"),
            func.sum(
                Appointment.service_revenue + 
                Appointment.product_revenue + 
                Appointment.tip_amount
            ).label("total_revenue")
        ).join(
            Appointment, Appointment.barber_id == Barber.id
        ).filter(
            Appointment.appointment_date.between(start, end),
            Appointment.status == "completed"
        )
        
        # Add filters
        if location_id:
            query = query.filter(Barber.location_id == location_id)
        
        if barber_id:
            query = query.filter(Barber.id == barber_id)
        
        # Group by barber
        query = query.group_by(Barber.id)
        
        barbers = query.all()
        
        # Build response data
        barber_data = []
        
        for barber in barbers:
            # Get payment model for this barber
            payment_model = db.query(BarberPaymentModel).filter(
                BarberPaymentModel.barber_id == barber.id,
                BarberPaymentModel.active == True
            ).first()
            
            total_revenue = float(barber.total_revenue or 0)
            
            # Calculate earnings based on payment model
            if payment_model:
                if payment_model.payment_type == PaymentModelType.COMMISSION:
                    barber_earnings = total_revenue * payment_model.service_commission_rate
                    shop_earnings = total_revenue * (1 - payment_model.service_commission_rate)
                    booth_rent = None
                elif payment_model.payment_type == PaymentModelType.BOOTH_RENT:
                    weeks_in_period = (end - start).days / 7
                    booth_rent = float(payment_model.booth_rent_amount) * weeks_in_period
                    barber_earnings = total_revenue - booth_rent
                    shop_earnings = booth_rent
                else:  # HYBRID
                    commission_earnings = total_revenue * payment_model.service_commission_rate
                    weeks_in_period = (end - start).days / 7
                    booth_rent = float(payment_model.booth_rent_amount) * weeks_in_period
                    barber_earnings = commission_earnings
                    shop_earnings = (total_revenue * (1 - payment_model.service_commission_rate)) + booth_rent
            else:
                # Default to 50/50 split if no payment model
                barber_earnings = total_revenue * 0.5
                shop_earnings = total_revenue * 0.5
                booth_rent = None
            
            # Calculate utilization (simplified - appointments per day)
            days_in_period = (end - start).days + 1
            daily_appointments = barber.total_appointments / days_in_period
            utilization_rate = min(daily_appointments / 8 * 100, 100)  # Assume 8 appointments is 100%
            
            barber_data.append({
                "barber": {
                    "id": barber.id,
                    "name": f"{barber.first_name} {barber.last_name}",
                    "email": barber.email,
                    "payment_model": payment_model.payment_type.value if payment_model else "commission"
                },
                "revenue": {
                    "total_revenue": round(total_revenue, 2),
                    "service_revenue": round(float(barber.service_revenue or 0), 2),
                    "product_revenue": round(float(barber.product_revenue or 0), 2),
                    "tip_revenue": round(float(barber.tip_revenue or 0), 2)
                },
                "earnings": {
                    "barber_earnings": round(barber_earnings, 2),
                    "shop_earnings": round(shop_earnings, 2),
                    "commission_rate": (payment_model.service_commission_rate * 100) if payment_model and payment_model.payment_type != PaymentModelType.BOOTH_RENT else None,
                    "booth_rent": round(booth_rent, 2) if booth_rent else None
                },
                "metrics": {
                    "appointments": barber.total_appointments,
                    "average_ticket": round(total_revenue / barber.total_appointments, 2) if barber.total_appointments > 0 else 0,
                    "utilization_rate": round(utilization_rate, 1)
                }
            })
        
        # Sort by total revenue descending
        barber_data.sort(key=lambda x: x["revenue"]["total_revenue"], reverse=True)
        
        return barber_data
        
    except Exception as e:
        logger.error(f"Error fetching barber revenue: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch barber revenue data"
        )


@router.get("/payout-summary")
async def get_payout_summary(
    period: str = Query("month", description="Time period: week, month, quarter, year, custom"),
    start_date: Optional[date] = Query(None, description="Start date for custom period"),
    end_date: Optional[date] = Query(None, description="End date for custom period"),
    location_id: Optional[int] = Query(None, description="Filter by location"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get payout summary including pending payouts, completed transfers, and booth rent status
    Access: shop_owner, admin, super_admin
    """
    # Check authorization
    if current_user.role not in ["shop_owner", "admin", "super_admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to access payout data"
        )
    
    # Check demo mode
    if check_demo_mode(current_user):
        start, end = get_date_range(period, start_date, end_date)
        return generate_demo_payout_summary(start, end)
    
    try:
        # Get date range
        start, end = get_date_range(period, start_date, end_date)
        
        # Get total revenue for the period
        revenue_query = db.query(
            func.sum(
                Appointment.service_revenue + 
                Appointment.product_revenue + 
                Appointment.tip_amount
            ).label("total_revenue")
        ).filter(
            Appointment.appointment_date.between(start, end),
            Appointment.status == "completed"
        )
        
        if location_id:
            revenue_query = revenue_query.join(Barber).filter(Barber.location_id == location_id)
        
        total_revenue = float(revenue_query.scalar() or 0)
        processing_fees = calculate_processing_fees(total_revenue)
        
        # Get commission payment summary
        commission_query = db.query(
            CommissionPayment.status,
            func.count(CommissionPayment.id).label("count"),
            func.sum(CommissionPayment.total_commission).label("amount")
        ).filter(
            CommissionPayment.period_start >= start,
            CommissionPayment.period_end <= end
        )
        
        if location_id:
            commission_query = commission_query.join(
                BarberPaymentModel
            ).join(
                Barber
            ).filter(Barber.location_id == location_id)
        
        commission_summary = commission_query.group_by(CommissionPayment.status).all()
        
        # Get booth rent summary
        rent_query = db.query(
            BoothRentPayment.status,
            func.count(BoothRentPayment.id).label("count"),
            func.sum(BoothRentPayment.amount_due).label("amount_due"),
            func.sum(BoothRentPayment.amount_paid).label("amount_paid")
        ).filter(
            BoothRentPayment.period_start >= start,
            BoothRentPayment.period_end <= end
        )
        
        if location_id:
            rent_query = rent_query.join(
                Barber
            ).filter(Barber.location_id == location_id)
        
        rent_summary = rent_query.group_by(BoothRentPayment.status).all()
        
        # Process commission payments
        payouts = {
            "pending": {"count": 0, "amount": 0.0, "barbers": []},
            "completed": {"count": 0, "amount": 0.0, "last_payout_date": None},
            "failed": {"count": 0, "amount": 0.0}
        }
        
        for payment in commission_summary:
            if payment.status == BarberPaymentStatus.PENDING:
                payouts["pending"]["count"] = payment.count
                payouts["pending"]["amount"] = float(payment.amount or 0)
                
                # Get barber names for pending payouts
                pending_barbers = db.query(
                    Barber.first_name,
                    Barber.last_name
                ).join(
                    CommissionPayment
                ).filter(
                    CommissionPayment.status == BarberPaymentStatus.PENDING,
                    CommissionPayment.period_start >= start,
                    CommissionPayment.period_end <= end
                ).limit(5).all()
                
                payouts["pending"]["barbers"] = [
                    f"{b.first_name} {b.last_name}" for b in pending_barbers
                ]
                
            elif payment.status == BarberPaymentStatus.PAID:
                payouts["completed"]["count"] = payment.count
                payouts["completed"]["amount"] = float(payment.amount or 0)
                
                # Get last payout date
                last_payout = db.query(
                    CommissionPayment.paid_date
                ).filter(
                    CommissionPayment.status == BarberPaymentStatus.PAID,
                    CommissionPayment.paid_date.isnot(None)
                ).order_by(CommissionPayment.paid_date.desc()).first()
                
                if last_payout and last_payout.paid_date:
                    payouts["completed"]["last_payout_date"] = last_payout.paid_date.date().isoformat()
        
        # Process booth rent
        booth_rent = {
            "total_due": 0.0,
            "collected": 0.0,
            "pending": 0.0,
            "overdue": 0.0
        }
        
        for rent in rent_summary:
            booth_rent["total_due"] += float(rent.amount_due or 0)
            if rent.status == BarberPaymentStatus.PAID:
                booth_rent["collected"] += float(rent.amount_paid or 0)
            elif rent.status == BarberPaymentStatus.PENDING:
                booth_rent["pending"] += float(rent.amount_due or 0) - float(rent.amount_paid or 0)
            elif rent.status == BarberPaymentStatus.OVERDUE:
                booth_rent["overdue"] += float(rent.amount_due or 0) - float(rent.amount_paid or 0)
        
        # Calculate shop net
        total_barber_payments = payouts["completed"]["amount"] + payouts["pending"]["amount"]
        gross_shop_revenue = total_revenue - total_barber_payments + booth_rent["collected"]
        net_shop_revenue = gross_shop_revenue - processing_fees
        profit_margin = (net_shop_revenue / total_revenue * 100) if total_revenue > 0 else 0
        
        return {
            "period": {
                "start_date": start.isoformat(),
                "end_date": end.isoformat()
            },
            "revenue_summary": {
                "gross_revenue": round(total_revenue, 2),
                "processing_fees": round(processing_fees, 2),
                "net_revenue": round(total_revenue - processing_fees, 2)
            },
            "payouts": {
                "pending": {
                    "count": payouts["pending"]["count"],
                    "amount": round(payouts["pending"]["amount"], 2),
                    "barbers": payouts["pending"]["barbers"]
                },
                "completed": {
                    "count": payouts["completed"]["count"],
                    "amount": round(payouts["completed"]["amount"], 2),
                    "last_payout_date": payouts["completed"]["last_payout_date"]
                },
                "failed": {
                    "count": payouts["failed"]["count"],
                    "amount": round(payouts["failed"]["amount"], 2)
                }
            },
            "booth_rent": {
                "total_due": round(booth_rent["total_due"], 2),
                "collected": round(booth_rent["collected"], 2),
                "pending": round(booth_rent["pending"], 2),
                "overdue": round(booth_rent["overdue"], 2)
            },
            "shop_net": {
                "gross_shop_revenue": round(gross_shop_revenue, 2),
                "after_fees": round(net_shop_revenue, 2),
                "profit_margin": round(profit_margin, 1)
            }
        }
        
    except Exception as e:
        logger.error(f"Error fetching payout summary: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch payout summary"
        )
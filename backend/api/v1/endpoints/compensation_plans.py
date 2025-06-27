"""
Compensation Plans API endpoints
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_
from datetime import datetime

from config.database import get_db
from models.compensation_plan import (
    CompensationPlan,
    CompensationType,
    PaymentFrequency,
)
from models.barber import Barber
from api.v1.auth import get_current_user
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/")
@router.get("")  # Handle requests without trailing slash
async def list_compensation_plans(
    skip: int = 0,
    limit: int = 100,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get list of all compensation plans"""
    try:
        plans = (
            db.query(CompensationPlan)
            .offset(skip)
            .limit(limit)
            .all()
        )
        
        result = []
        for plan in plans:
            result.append({
                "id": plan.id,
                "barber_id": plan.barber_id,
                "plan_name": plan.plan_name,
                "compensation_type": plan.compensation_type.value if plan.compensation_type else None,
                "is_active": plan.is_active,
                "effective_date": plan.effective_date.isoformat() if plan.effective_date else None,
                "end_date": plan.end_date.isoformat() if plan.end_date else None,
            })
        
        return result
        
    except Exception as e:
        logger.error(f"Error fetching compensation plans: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/")
async def create_compensation_plan(
    plan_data: dict,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new compensation plan for a barber"""
    try:
        # Verify the barber exists
        barber = db.query(Barber).filter(Barber.id == plan_data["barber_id"]).first()
        if not barber:
            raise HTTPException(status_code=404, detail="Barber not found")

        # Check if barber already has an active plan
        existing_plan = (
            db.query(CompensationPlan)
            .filter(
                and_(
                    CompensationPlan.barber_id == plan_data["barber_id"],
                    CompensationPlan.is_active == True,
                )
            )
            .first()
        )

        if existing_plan:
            # Deactivate the existing plan
            existing_plan.is_active = False
            existing_plan.end_date = datetime.utcnow()

        # Create new compensation plan
        new_plan = CompensationPlan(
            barber_id=plan_data["barber_id"],
            plan_name=plan_data.get(
                "plan_name",
                f"Compensation Plan - {barber.first_name} {barber.last_name}",
            ),
            compensation_type=plan_data["compensation_type"],
            base_salary=plan_data.get("base_salary"),
            salary_frequency=plan_data.get("salary_frequency"),
            booth_rent_amount=plan_data.get("booth_rent_amount"),
            booth_rent_frequency=plan_data.get("booth_rent_frequency"),
            booth_rent_due_day=plan_data.get("booth_rent_due_day"),
            includes_utilities=plan_data.get("includes_utilities", True),
            includes_products=plan_data.get("includes_products", False),
            includes_marketing=plan_data.get("includes_marketing", True),
            commission_structure=plan_data.get("commission_structure"),
            performance_bonuses=plan_data.get("performance_bonuses"),
            deductions=plan_data.get("deductions"),
            special_conditions=plan_data.get("special_conditions"),
            time_based_rates=plan_data.get("time_based_rates"),
            client_type_rates=plan_data.get("client_type_rates"),
            escalation_rules=plan_data.get("escalation_rules"),
            payout_settings=plan_data.get("payout_settings"),
            created_by=current_user.id,
            is_active=True,
            effective_date=datetime.utcnow(),
        )

        db.add(new_plan)
        db.commit()
        db.refresh(new_plan)

        logger.info(f"Created compensation plan {new_plan.id} for barber {barber.id}")

        return {
            "id": new_plan.id,
            "barber_id": new_plan.barber_id,
            "plan_name": new_plan.plan_name,
            "compensation_type": new_plan.compensation_type.value,
            "is_active": new_plan.is_active,
            "message": "Compensation plan created successfully",
        }

    except Exception as e:
        logger.error(f"Error creating compensation plan: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{barber_id}")
async def get_barber_compensation_plan(
    barber_id: int,
    include_history: bool = Query(False, description="Include historical plans"),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get compensation plan(s) for a barber"""
    try:
        # Verify the barber exists
        barber = db.query(Barber).filter(Barber.id == barber_id).first()
        if not barber:
            raise HTTPException(status_code=404, detail="Barber not found")

        if include_history:
            # Get all plans for the barber
            plans = (
                db.query(CompensationPlan)
                .filter(CompensationPlan.barber_id == barber_id)
                .order_by(CompensationPlan.created_at.desc())
                .all()
            )
        else:
            # Get only active plan
            plans = (
                db.query(CompensationPlan)
                .filter(
                    and_(
                        CompensationPlan.barber_id == barber_id,
                        CompensationPlan.is_active == True,
                    )
                )
                .first()
            )

            if not plans:
                return {"message": "No active compensation plan found for this barber"}

            plans = [plans]  # Make it a list for consistent response

        result = []
        for plan in plans:
            result.append(
                {
                    "id": plan.id,
                    "barber_id": plan.barber_id,
                    "plan_name": plan.plan_name,
                    "compensation_type": plan.compensation_type.value,
                    "is_active": plan.is_active,
                    "effective_date": plan.effective_date.isoformat(),
                    "end_date": plan.end_date.isoformat() if plan.end_date else None,
                    "base_salary": plan.base_salary,
                    "salary_frequency": (
                        plan.salary_frequency.value if plan.salary_frequency else None
                    ),
                    "booth_rent_amount": plan.booth_rent_amount,
                    "booth_rent_frequency": (
                        plan.booth_rent_frequency.value
                        if plan.booth_rent_frequency
                        else None
                    ),
                    "includes_utilities": plan.includes_utilities,
                    "includes_products": plan.includes_products,
                    "includes_marketing": plan.includes_marketing,
                    "commission_structure": plan.commission_structure,
                    "performance_bonuses": plan.performance_bonuses,
                    "deductions": plan.deductions,
                    "special_conditions": plan.special_conditions,
                    "time_based_rates": plan.time_based_rates,
                    "client_type_rates": plan.client_type_rates,
                    "escalation_rules": plan.escalation_rules,
                    "payout_settings": plan.payout_settings,
                }
            )

        return result[0] if not include_history and result else result

    except Exception as e:
        logger.error(f"Error fetching compensation plan: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{plan_id}")
async def update_compensation_plan(
    plan_id: int,
    plan_data: dict,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update an existing compensation plan"""
    try:
        # Get the plan
        plan = db.query(CompensationPlan).filter(CompensationPlan.id == plan_id).first()
        if not plan:
            raise HTTPException(status_code=404, detail="Compensation plan not found")

        # Update fields
        for key, value in plan_data.items():
            if hasattr(plan, key) and key not in [
                "id",
                "barber_id",
                "created_at",
                "created_by",
            ]:
                setattr(plan, key, value)

        plan.updated_at = datetime.utcnow()

        db.commit()
        db.refresh(plan)

        logger.info(f"Updated compensation plan {plan_id}")

        return {"id": plan.id, "message": "Compensation plan updated successfully"}

    except Exception as e:
        logger.error(f"Error updating compensation plan: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{plan_id}/calculate-commission")
async def calculate_commission(
    plan_id: int,
    service_data: dict,  # {service_type, service_amount, is_new_client, etc.}
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Calculate commission based on the compensation plan"""
    try:
        # Get the plan
        plan = db.query(CompensationPlan).filter(CompensationPlan.id == plan_id).first()
        if not plan:
            raise HTTPException(status_code=404, detail="Compensation plan not found")

        if plan.compensation_type == CompensationType.BOOTH_RENT_ONLY:
            return {
                "commission_amount": 0,
                "message": "This is a booth rent only plan - no commission on services",
            }

        service_type = service_data.get("service_type", "default")
        service_amount = service_data.get("service_amount", 0)
        is_new_client = service_data.get("is_new_client", False)

        # Get commission rate
        commission_rate = 0
        bonus_amount = 0

        if plan.commission_structure:
            # Check for sliding scale
            if (
                plan.compensation_type == CompensationType.SLIDING_SCALE
                and "tiers" in plan.commission_structure
            ):
                # Get barber's current month revenue to determine tier
                # This would need to be implemented based on actual revenue data
                current_revenue = service_data.get("current_month_revenue", 0)

                for tier in plan.commission_structure["tiers"]:
                    if current_revenue >= tier["min"] and (
                        tier["max"] is None or current_revenue <= tier["max"]
                    ):
                        commission_rate = tier["rate"]
                        break
            else:
                # Regular commission structure
                services = plan.commission_structure.get("services", {})
                if service_type in services:
                    commission_rate = services[service_type].get("rate", 0)
                    if is_new_client:
                        bonus_amount += services[service_type].get(
                            "new_client_bonus", 0
                        )
                elif "default" in services:
                    commission_rate = services["default"].get("rate", 0)

        # Calculate base commission
        commission_amount = service_amount * commission_rate / 100

        # Add new client bonus from performance bonuses
        if is_new_client and plan.performance_bonuses:
            new_client_bonus = plan.performance_bonuses.get("new_clients", {}).get(
                "per_client", 0
            )
            bonus_amount += new_client_bonus

        # Apply deductions
        deduction_amount = 0
        if plan.deductions:
            # Processing fee
            if "processing_fees" in plan.deductions:
                fee = plan.deductions["processing_fees"]
                if fee["type"] == "percentage":
                    deduction_amount += commission_amount * fee["value"] / 100

        net_commission = commission_amount + bonus_amount - deduction_amount

        return {
            "service_amount": service_amount,
            "commission_rate": commission_rate,
            "gross_commission": commission_amount,
            "bonuses": bonus_amount,
            "deductions": deduction_amount,
            "net_commission": net_commission,
        }

    except Exception as e:
        logger.error(f"Error calculating commission: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

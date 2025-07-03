"""
Enterprise Analytics Service for 6FB Booking Platform

This service provides enterprise-level analytics functionality for multi-location barbershops including:
- Aggregated revenue and performance metrics across all locations
- Location-by-location comparative analytics
- Chair utilization and occupancy rates
- Compensation model analytics and comparisons
- Enterprise-level KPIs matching Excel spreadsheet metrics
"""

from datetime import datetime, timedelta, date
from typing import Dict, List, Optional, Tuple, Any
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_, case, extract, distinct
from sqlalchemy.sql import text
import calendar
from decimal import Decimal

from models import User, Appointment, Payment, Client, Service, BarberAvailability
from location_models import BarbershopLocation, BarberLocation, CompensationModel, CompensationPlan, ChairInventory, ChairStatus
from schemas import DateRange
from services.analytics_service import AnalyticsService


class EnterpriseAnalyticsService:
    def __init__(self, db: Session):
        self.db = db
        self.analytics_service = AnalyticsService(db)
    
    def get_enterprise_dashboard(
        self,
        date_range: Optional[DateRange] = None,
        owner_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Get comprehensive enterprise-level dashboard with aggregated metrics
        
        Args:
            date_range: Optional date range to filter by
            owner_id: Optional owner ID to filter locations by
            
        Returns:
            Dictionary containing enterprise-wide analytics
        """
        # Get all locations
        locations_query = self.db.query(BarbershopLocation).filter(
            BarbershopLocation.status == 'active'
        )
        
        if owner_id:
            locations_query = locations_query.filter(BarbershopLocation.owner_id == owner_id)
        
        locations = locations_query.all()
        location_ids = [loc.id for loc in locations]
        
        # Aggregate revenue across all locations
        total_revenue = self._get_aggregated_revenue(location_ids, date_range)
        
        # Get appointment metrics
        appointment_metrics = self._get_aggregated_appointments(location_ids, date_range)
        
        # Chair utilization
        chair_metrics = self._get_chair_utilization_metrics(location_ids, date_range)
        
        # Active clients across enterprise
        client_metrics = self._get_enterprise_client_metrics(location_ids, date_range)
        
        # Compensation analytics
        compensation_metrics = self._get_compensation_analytics(location_ids, date_range)
        
        # Period comparisons
        comparative_metrics = self._get_enterprise_comparative_metrics(location_ids, date_range)
        
        # Top performing metrics
        top_performers = self._get_top_performers(location_ids, date_range)
        
        # Calculate key financial ratios
        financial_ratios = self._calculate_financial_ratios(
            total_revenue, 
            chair_metrics, 
            appointment_metrics,
            len(locations)
        )
        
        return {
            "summary": {
                "total_locations": len(locations),
                "active_locations": len([l for l in locations if l.status == 'active']),
                "total_revenue": total_revenue["total"],
                "revenue_by_period": total_revenue["by_period"],
                "average_revenue_per_location": total_revenue["total"] / len(locations) if locations else 0,
                "total_appointments": appointment_metrics["total"],
                "completion_rate": appointment_metrics["completion_rate"],
                "total_chairs": chair_metrics["total_chairs"],
                "occupied_chairs": chair_metrics["occupied_chairs"],
                "overall_occupancy_rate": chair_metrics["occupancy_rate"],
                "total_active_clients": client_metrics["total_active"],
                "new_clients": client_metrics["new_clients"],
                "retention_rate": client_metrics["retention_rate"]
            },
            "financial_metrics": {
                "revenue": total_revenue,
                "ratios": financial_ratios,
                "compensation": compensation_metrics
            },
            "operational_metrics": {
                "appointments": appointment_metrics,
                "chair_utilization": chair_metrics,
                "clients": client_metrics
            },
            "comparative_analysis": comparative_metrics,
            "top_performers": top_performers,
            "locations": [self._get_location_summary(loc, date_range) for loc in locations]
        }
    
    def get_location_performance_matrix(
        self,
        date_range: Optional[DateRange] = None,
        owner_id: Optional[int] = None,
        comparison_metric: str = "revenue"  # revenue, appointments, occupancy, retention
    ) -> Dict[str, Any]:
        """
        Get a performance comparison matrix for all locations
        
        Args:
            date_range: Optional date range to filter by
            owner_id: Optional owner ID to filter locations by
            comparison_metric: Metric to use for comparison
            
        Returns:
            Dictionary containing location performance comparison
        """
        # Get all locations
        locations_query = self.db.query(BarbershopLocation)
        
        if owner_id:
            locations_query = locations_query.filter(BarbershopLocation.owner_id == owner_id)
        
        locations = locations_query.all()
        
        # Build performance matrix
        performance_data = []
        
        for location in locations:
            # Get location-specific metrics
            location_metrics = self._get_location_metrics(location.id, date_range)
            
            # Calculate performance score based on comparison metric
            if comparison_metric == "revenue":
                score = location_metrics["revenue"]["total"]
                trend = location_metrics["revenue"]["trend"]
            elif comparison_metric == "appointments":
                score = location_metrics["appointments"]["total"]
                trend = location_metrics["appointments"]["completion_rate"]
            elif comparison_metric == "occupancy":
                score = location_metrics["chair_utilization"]["occupancy_rate"]
                trend = location_metrics["chair_utilization"]["trend"]
            elif comparison_metric == "retention":
                score = location_metrics["clients"]["retention_rate"]
                trend = location_metrics["clients"]["new_vs_returning_ratio"]
            else:
                score = 0
                trend = 0
            
            performance_data.append({
                "location_id": location.id,
                "location_name": location.name,
                "location_code": location.code,
                "status": location.status,
                "compensation_model": location.compensation_model.value,
                "score": score,
                "trend": trend,
                "metrics": location_metrics,
                "rank": 0  # Will be calculated after sorting
            })
        
        # Sort by score and assign ranks
        performance_data.sort(key=lambda x: x["score"], reverse=True)
        for idx, item in enumerate(performance_data):
            item["rank"] = idx + 1
        
        # Calculate percentiles and categories
        if performance_data:
            scores = [item["score"] for item in performance_data]
            p25 = self._percentile(scores, 25)
            p50 = self._percentile(scores, 50)
            p75 = self._percentile(scores, 75)
            
            for item in performance_data:
                if item["score"] >= p75:
                    item["category"] = "top_performer"
                elif item["score"] >= p50:
                    item["category"] = "above_average"
                elif item["score"] >= p25:
                    item["category"] = "below_average"
                else:
                    item["category"] = "needs_attention"
        
        # Group by compensation model
        by_compensation_model = {}
        for item in performance_data:
            model = item["compensation_model"]
            if model not in by_compensation_model:
                by_compensation_model[model] = []
            by_compensation_model[model].append(item)
        
        return {
            "comparison_metric": comparison_metric,
            "date_range": {
                "start": date_range.start_date.isoformat() if date_range else None,
                "end": date_range.end_date.isoformat() if date_range else None
            },
            "total_locations": len(locations),
            "performance_matrix": performance_data,
            "by_compensation_model": by_compensation_model,
            "statistics": {
                "average_score": sum(scores) / len(scores) if performance_data else 0,
                "median_score": p50 if performance_data else 0,
                "top_performer_threshold": p75 if performance_data else 0,
                "bottom_performer_threshold": p25 if performance_data else 0
            }
        }
    
    def get_aggregated_revenue(
        self,
        location_ids: Optional[List[int]] = None,
        date_range: Optional[DateRange] = None,
        group_by: str = "location"  # location, week, month, year, compensation_model
    ) -> Dict[str, Any]:
        """
        Get aggregated revenue across locations with various grouping options
        
        Args:
            location_ids: Optional list of location IDs to filter by
            date_range: Optional date range to filter by
            group_by: Grouping option for revenue aggregation
            
        Returns:
            Dictionary containing aggregated revenue data
        """
        # Build base query
        query = self.db.query(
            Payment.created_at,
            Payment.amount,
            Payment.barber_amount,
            Payment.platform_fee,
            Appointment.barber_id,
            User.location_id
        ).join(
            Appointment, Payment.appointment_id == Appointment.id
        ).join(
            User, Appointment.barber_id == User.id
        ).filter(
            Payment.status == 'completed'
        )
        
        # Apply filters
        if location_ids:
            query = query.filter(User.location_id.in_(location_ids))
        
        if date_range:
            query = query.filter(
                and_(
                    Payment.created_at >= date_range.start_date,
                    Payment.created_at <= date_range.end_date
                )
            )
        
        # Execute query
        results = query.all()
        
        # Process results based on grouping
        revenue_data = {}
        
        if group_by == "location":
            # Group by location
            for row in results:
                location_id = row.location_id or "unassigned"
                if location_id not in revenue_data:
                    revenue_data[location_id] = {
                        "total_revenue": 0,
                        "barber_earnings": 0,
                        "platform_fees": 0,
                        "transaction_count": 0
                    }
                
                revenue_data[location_id]["total_revenue"] += float(row.amount)
                revenue_data[location_id]["barber_earnings"] += float(row.barber_amount or 0)
                revenue_data[location_id]["platform_fees"] += float(row.platform_fee or 0)
                revenue_data[location_id]["transaction_count"] += 1
        
        elif group_by in ["week", "month", "year"]:
            # Group by time period
            for row in results:
                if group_by == "week":
                    period = row.created_at.strftime('%Y-W%U')
                elif group_by == "month":
                    period = row.created_at.strftime('%Y-%m')
                else:  # year
                    period = row.created_at.strftime('%Y')
                
                if period not in revenue_data:
                    revenue_data[period] = {
                        "total_revenue": 0,
                        "barber_earnings": 0,
                        "platform_fees": 0,
                        "transaction_count": 0
                    }
                
                revenue_data[period]["total_revenue"] += float(row.amount)
                revenue_data[period]["barber_earnings"] += float(row.barber_amount or 0)
                revenue_data[period]["platform_fees"] += float(row.platform_fee or 0)
                revenue_data[period]["transaction_count"] += 1
        
        elif group_by == "compensation_model":
            # Need to join with location to get compensation model
            location_map = {}
            if location_ids:
                locations = self.db.query(BarbershopLocation).filter(
                    BarbershopLocation.id.in_(location_ids)
                ).all()
                location_map = {loc.id: loc.compensation_model.value for loc in locations}
            
            for row in results:
                model = location_map.get(row.location_id, "unknown")
                if model not in revenue_data:
                    revenue_data[model] = {
                        "total_revenue": 0,
                        "barber_earnings": 0,
                        "platform_fees": 0,
                        "transaction_count": 0
                    }
                
                revenue_data[model]["total_revenue"] += float(row.amount)
                revenue_data[model]["barber_earnings"] += float(row.barber_amount or 0)
                revenue_data[model]["platform_fees"] += float(row.platform_fee or 0)
                revenue_data[model]["transaction_count"] += 1
        
        # Calculate totals
        total_revenue = sum(data["total_revenue"] for data in revenue_data.values())
        total_barber_earnings = sum(data["barber_earnings"] for data in revenue_data.values())
        total_platform_fees = sum(data["platform_fees"] for data in revenue_data.values())
        total_transactions = sum(data["transaction_count"] for data in revenue_data.values())
        
        return {
            "group_by": group_by,
            "summary": {
                "total_revenue": total_revenue,
                "total_barber_earnings": total_barber_earnings,
                "total_platform_fees": total_platform_fees,
                "total_transactions": total_transactions,
                "average_transaction_value": total_revenue / total_transactions if total_transactions > 0 else 0
            },
            "data": revenue_data,
            "period": {
                "start": date_range.start_date.isoformat() if date_range else None,
                "end": date_range.end_date.isoformat() if date_range else None
            }
        }
    
    def get_chair_utilization(
        self,
        location_ids: Optional[List[int]] = None,
        date_range: Optional[DateRange] = None
    ) -> Dict[str, Any]:
        """
        Get chair utilization and occupancy rates by location
        
        Args:
            location_ids: Optional list of location IDs to filter by
            date_range: Optional date range to filter by
            
        Returns:
            Dictionary containing chair utilization metrics
        """
        # Get locations with chair inventory
        locations_query = self.db.query(BarbershopLocation)
        
        if location_ids:
            locations_query = locations_query.filter(BarbershopLocation.id.in_(location_ids))
        
        locations = locations_query.all()
        
        utilization_data = []
        total_chairs = 0
        total_occupied = 0
        total_revenue_per_chair = []
        
        for location in locations:
            # Get chair inventory for location
            chairs = self.db.query(ChairInventory).filter(
                ChairInventory.location_id == location.id
            ).all()
            
            location_total_chairs = len(chairs)
            occupied_chairs = len([c for c in chairs if c.status == ChairStatus.OCCUPIED])
            vacant_chairs = len([c for c in chairs if c.status == ChairStatus.VACANT])
            
            # Calculate revenue per chair for the period
            revenue_data = self._get_location_revenue(location.id, date_range)
            revenue_per_chair = revenue_data["total"] / location_total_chairs if location_total_chairs > 0 else 0
            
            # Get booking data for utilization calculation
            if date_range and occupied_chairs > 0:
                # Calculate actual utilization based on appointments
                utilization_rate = self._calculate_chair_utilization_rate(
                    location.id, 
                    occupied_chairs,
                    date_range
                )
            else:
                utilization_rate = (occupied_chairs / location_total_chairs * 100) if location_total_chairs > 0 else 0
            
            location_data = {
                "location_id": location.id,
                "location_name": location.name,
                "location_code": location.code,
                "total_chairs": location_total_chairs,
                "occupied_chairs": occupied_chairs,
                "vacant_chairs": vacant_chairs,
                "occupancy_rate": (occupied_chairs / location_total_chairs * 100) if location_total_chairs > 0 else 0,
                "utilization_rate": utilization_rate,
                "revenue_per_chair": revenue_per_chair,
                "chair_details": []
            }
            
            # Add individual chair details
            for chair in chairs:
                barber = None
                if chair.assigned_barber_id:
                    barber = self.db.query(User).filter(User.id == chair.assigned_barber_id).first()
                
                chair_revenue = 0
                if barber and date_range:
                    # Get revenue for this specific barber/chair
                    chair_revenue = self._get_barber_revenue(barber.id, date_range)
                
                location_data["chair_details"].append({
                    "chair_number": chair.chair_number,
                    "status": chair.status.value,
                    "barber_name": barber.name if barber else None,
                    "barber_id": barber.id if barber else None,
                    "revenue": chair_revenue
                })
            
            utilization_data.append(location_data)
            total_chairs += location_total_chairs
            total_occupied += occupied_chairs
            if revenue_per_chair > 0:
                total_revenue_per_chair.append(revenue_per_chair)
        
        # Calculate enterprise-wide metrics
        overall_occupancy_rate = (total_occupied / total_chairs * 100) if total_chairs > 0 else 0
        avg_revenue_per_chair = sum(total_revenue_per_chair) / len(total_revenue_per_chair) if total_revenue_per_chair else 0
        
        return {
            "summary": {
                "total_chairs": total_chairs,
                "occupied_chairs": total_occupied,
                "vacant_chairs": total_chairs - total_occupied,
                "overall_occupancy_rate": overall_occupancy_rate,
                "average_revenue_per_chair": avg_revenue_per_chair,
                "locations_analyzed": len(locations)
            },
            "by_location": utilization_data,
            "insights": self._generate_chair_utilization_insights(
                utilization_data,
                overall_occupancy_rate,
                avg_revenue_per_chair
            )
        }
    
    def get_compensation_analytics(
        self,
        location_ids: Optional[List[int]] = None,
        date_range: Optional[DateRange] = None
    ) -> Dict[str, Any]:
        """
        Get analytics grouped by compensation model type
        
        Args:
            location_ids: Optional list of location IDs to filter by
            date_range: Optional date range to filter by
            
        Returns:
            Dictionary containing compensation model analytics
        """
        # Get all compensation plans
        plans_query = self.db.query(CompensationPlan).filter(
            CompensationPlan.is_active == True
        )
        
        if location_ids:
            plans_query = plans_query.filter(
                CompensationPlan.location_id.in_(location_ids)
            )
        
        plans = plans_query.all()
        
        # Group analytics by compensation model
        model_analytics = {
            CompensationModel.BOOTH_RENTAL.value: {
                "locations": [],
                "total_revenue": 0,
                "total_barbers": 0,
                "avg_revenue_per_barber": 0,
                "total_rental_income": 0
            },
            CompensationModel.COMMISSION.value: {
                "locations": [],
                "total_revenue": 0,
                "total_barbers": 0,
                "avg_revenue_per_barber": 0,
                "total_commission_income": 0
            },
            CompensationModel.HYBRID.value: {
                "locations": [],
                "total_revenue": 0,
                "total_barbers": 0,
                "avg_revenue_per_barber": 0,
                "total_hybrid_income": 0
            }
        }
        
        # Process each location
        for plan in plans:
            location = plan.location
            model_type = plan.model_type.value
            
            # Get barbers at this location
            barbers_query = self.db.query(User).join(
                BarberLocation, User.id == BarberLocation.barber_id
            ).filter(
                BarberLocation.location_id == location.id,
                BarberLocation.is_active == True,
                User.role.in_(['barber', 'admin'])
            )
            
            barbers = barbers_query.all()
            barber_count = len(barbers)
            
            # Get revenue data for location
            location_revenue = self._get_location_revenue(location.id, date_range)
            
            # Calculate model-specific income
            model_income = 0
            if model_type == CompensationModel.BOOTH_RENTAL.value:
                # Calculate rental income
                config = plan.configuration
                rental_amount = config.get("rental_amount", 0)
                rental_period = config.get("rental_period", "weekly")
                
                # Adjust for date range
                if date_range:
                    days = (date_range.end_date - date_range.start_date).days
                    if rental_period == "weekly":
                        periods = days / 7
                    else:  # monthly
                        periods = days / 30
                    model_income = rental_amount * periods * barber_count
                else:
                    model_income = rental_amount * barber_count
            
            elif model_type == CompensationModel.COMMISSION.value:
                # Commission income is in the platform_fees
                model_income = location_revenue.get("platform_fees", 0)
            
            elif model_type == CompensationModel.HYBRID.value:
                # Hybrid combines rental and commission
                config = plan.configuration
                base_rental = config.get("base_rental", 0)
                rental_period = config.get("rental_period", "weekly")
                
                if date_range:
                    days = (date_range.end_date - date_range.start_date).days
                    if rental_period == "weekly":
                        periods = days / 7
                    else:  # monthly
                        periods = days / 30
                    rental_income = base_rental * periods * barber_count
                else:
                    rental_income = base_rental * barber_count
                
                commission_income = location_revenue.get("platform_fees", 0) - rental_income
                model_income = rental_income + max(0, commission_income)
            
            # Update model analytics
            if model_type in model_analytics:
                analytics = model_analytics[model_type]
                analytics["locations"].append({
                    "location_id": location.id,
                    "location_name": location.name,
                    "barber_count": barber_count,
                    "revenue": location_revenue["total"],
                    "model_income": model_income
                })
                analytics["total_revenue"] += location_revenue["total"]
                analytics["total_barbers"] += barber_count
                
                if model_type == CompensationModel.BOOTH_RENTAL.value:
                    analytics["total_rental_income"] += model_income
                elif model_type == CompensationModel.COMMISSION.value:
                    analytics["total_commission_income"] += model_income
                else:
                    analytics["total_hybrid_income"] += model_income
        
        # Calculate averages
        for model_type, analytics in model_analytics.items():
            if analytics["total_barbers"] > 0:
                analytics["avg_revenue_per_barber"] = analytics["total_revenue"] / analytics["total_barbers"]
        
        # Calculate best performing model
        model_performance = []
        for model_type, analytics in model_analytics.items():
            if analytics["total_barbers"] > 0:
                model_performance.append({
                    "model": model_type,
                    "avg_revenue_per_barber": analytics["avg_revenue_per_barber"],
                    "total_locations": len(analytics["locations"])
                })
        
        model_performance.sort(key=lambda x: x["avg_revenue_per_barber"], reverse=True)
        
        return {
            "by_model": model_analytics,
            "model_comparison": model_performance,
            "insights": self._generate_compensation_insights(model_analytics),
            "period": {
                "start": date_range.start_date.isoformat() if date_range else None,
                "end": date_range.end_date.isoformat() if date_range else None
            }
        }
    
    # Private helper methods
    
    def _get_aggregated_revenue(
        self,
        location_ids: List[int],
        date_range: Optional[DateRange]
    ) -> Dict[str, Any]:
        """Get aggregated revenue data across locations"""
        query = self.db.query(
            func.sum(Payment.amount).label('total_revenue'),
            func.sum(Payment.barber_amount).label('total_barber_earnings'),
            func.sum(Payment.platform_fee).label('total_platform_fees'),
            func.count(Payment.id).label('transaction_count')
        ).join(
            Appointment, Payment.appointment_id == Appointment.id
        ).join(
            User, Appointment.barber_id == User.id
        ).filter(
            Payment.status == 'completed'
        )
        
        if location_ids:
            query = query.filter(User.location_id.in_(location_ids))
        
        if date_range:
            query = query.filter(
                and_(
                    Payment.created_at >= date_range.start_date,
                    Payment.created_at <= date_range.end_date
                )
            )
        
        result = query.first()
        
        # Get revenue by period (weekly/monthly)
        by_period = {}
        if date_range:
            # Weekly breakdown
            weekly_query = self.db.query(
                func.strftime('%Y-W%W', Payment.created_at).label('week'),
                func.sum(Payment.amount).label('revenue')
            ).join(
                Appointment, Payment.appointment_id == Appointment.id
            ).join(
                User, Appointment.barber_id == User.id
            ).filter(
                Payment.status == 'completed',
                Payment.created_at >= date_range.start_date,
                Payment.created_at <= date_range.end_date
            )
            
            if location_ids:
                weekly_query = weekly_query.filter(User.location_id.in_(location_ids))
            
            weekly_results = weekly_query.group_by('week').all()
            
            by_period["weekly"] = [
                {"week": r.week, "revenue": float(r.revenue or 0)}
                for r in weekly_results
            ]
            
            # Monthly breakdown
            monthly_query = self.db.query(
                func.strftime('%Y-%m', Payment.created_at).label('month'),
                func.sum(Payment.amount).label('revenue')
            ).join(
                Appointment, Payment.appointment_id == Appointment.id
            ).join(
                User, Appointment.barber_id == User.id
            ).filter(
                Payment.status == 'completed',
                Payment.created_at >= date_range.start_date,
                Payment.created_at <= date_range.end_date
            )
            
            if location_ids:
                monthly_query = monthly_query.filter(User.location_id.in_(location_ids))
            
            monthly_results = monthly_query.group_by('month').all()
            
            by_period["monthly"] = [
                {"month": r.month, "revenue": float(r.revenue or 0)}
                for r in monthly_results
            ]
        
        return {
            "total": float(result.total_revenue or 0),
            "barber_earnings": float(result.total_barber_earnings or 0),
            "platform_fees": float(result.total_platform_fees or 0),
            "transaction_count": int(result.transaction_count or 0),
            "average_transaction": float(result.total_revenue or 0) / int(result.transaction_count or 1),
            "by_period": by_period
        }
    
    def _get_aggregated_appointments(
        self,
        location_ids: List[int],
        date_range: Optional[DateRange]
    ) -> Dict[str, Any]:
        """Get aggregated appointment metrics across locations"""
        query = self.db.query(Appointment).join(
            User, Appointment.barber_id == User.id
        )
        
        if location_ids:
            query = query.filter(User.location_id.in_(location_ids))
        
        if date_range:
            query = query.filter(
                and_(
                    Appointment.start_time >= date_range.start_date,
                    Appointment.start_time <= date_range.end_date
                )
            )
        
        appointments = query.all()
        
        total = len(appointments)
        completed = sum(1 for a in appointments if a.status == 'completed')
        cancelled = sum(1 for a in appointments if a.status == 'cancelled')
        no_shows = sum(1 for a in appointments if a.status == 'no_show')
        
        return {
            "total": total,
            "completed": completed,
            "cancelled": cancelled,
            "no_shows": no_shows,
            "completion_rate": (completed / total * 100) if total > 0 else 0,
            "cancellation_rate": (cancelled / total * 100) if total > 0 else 0,
            "no_show_rate": (no_shows / total * 100) if total > 0 else 0
        }
    
    def _get_chair_utilization_metrics(
        self,
        location_ids: List[int],
        date_range: Optional[DateRange]
    ) -> Dict[str, Any]:
        """Get chair utilization metrics across locations"""
        total_chairs = 0
        occupied_chairs = 0
        utilization_rates = []
        
        for location_id in location_ids:
            # Get chair inventory
            chairs = self.db.query(ChairInventory).filter(
                ChairInventory.location_id == location_id
            ).all()
            
            location_total = len(chairs)
            location_occupied = len([c for c in chairs if c.status == ChairStatus.OCCUPIED])
            
            total_chairs += location_total
            occupied_chairs += location_occupied
            
            if location_total > 0:
                utilization_rates.append(location_occupied / location_total * 100)
        
        return {
            "total_chairs": total_chairs,
            "occupied_chairs": occupied_chairs,
            "vacant_chairs": total_chairs - occupied_chairs,
            "occupancy_rate": (occupied_chairs / total_chairs * 100) if total_chairs > 0 else 0,
            "average_utilization": sum(utilization_rates) / len(utilization_rates) if utilization_rates else 0
        }
    
    def _get_enterprise_client_metrics(
        self,
        location_ids: List[int],
        date_range: Optional[DateRange]
    ) -> Dict[str, Any]:
        """Get client metrics across the enterprise"""
        # Get all clients who had appointments at these locations
        clients_query = self.db.query(Client).join(
            Appointment, Client.id == Appointment.client_id
        ).join(
            User, Appointment.barber_id == User.id
        ).filter(
            User.location_id.in_(location_ids) if location_ids else True
        )
        
        if date_range:
            clients_query = clients_query.filter(
                and_(
                    Appointment.start_time >= date_range.start_date,
                    Appointment.start_time <= date_range.end_date
                )
            )
        
        clients = clients_query.distinct().all()
        
        total_clients = len(clients)
        new_clients = sum(1 for c in clients if c.customer_type == 'new')
        returning_clients = sum(1 for c in clients if c.customer_type in ['returning', 'vip'])
        vip_clients = sum(1 for c in clients if c.customer_type == 'vip')
        
        # Calculate active clients (visited in last 30 days)
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        active_clients = sum(1 for c in clients if c.last_visit_date and c.last_visit_date >= thirty_days_ago)
        
        retention_rate = (returning_clients / total_clients * 100) if total_clients > 0 else 0
        
        return {
            "total_clients": total_clients,
            "new_clients": new_clients,
            "returning_clients": returning_clients,
            "vip_clients": vip_clients,
            "total_active": active_clients,
            "retention_rate": retention_rate,
            "new_client_percentage": (new_clients / total_clients * 100) if total_clients > 0 else 0
        }
    
    def _get_compensation_analytics(
        self,
        location_ids: List[int],
        date_range: Optional[DateRange]
    ) -> Dict[str, Any]:
        """Get compensation analytics by model type"""
        # This is a simplified version - the full method is implemented above
        revenue_by_model = self.get_aggregated_revenue(
            location_ids, 
            date_range, 
            group_by="compensation_model"
        )
        
        return revenue_by_model["data"]
    
    def _get_enterprise_comparative_metrics(
        self,
        location_ids: List[int],
        date_range: Optional[DateRange]
    ) -> Dict[str, Any]:
        """Get comparative metrics for previous period"""
        if not date_range:
            # Default to current month vs previous month
            now = datetime.utcnow()
            current_start = now.replace(day=1, hour=0, minute=0, second=0)
            current_end = now
            
            if current_start.month == 1:
                prev_start = current_start.replace(year=current_start.year - 1, month=12)
            else:
                prev_start = current_start.replace(month=current_start.month - 1)
            
            prev_end = current_start - timedelta(days=1)
            
            current_range = DateRange(start_date=current_start, end_date=current_end)
            previous_range = DateRange(start_date=prev_start, end_date=prev_end)
        else:
            # Use provided range and calculate previous period
            period_length = (date_range.end_date - date_range.start_date).days
            previous_start = date_range.start_date - timedelta(days=period_length)
            previous_end = date_range.start_date - timedelta(days=1)
            
            current_range = date_range
            previous_range = DateRange(start_date=previous_start, end_date=previous_end)
        
        # Get metrics for both periods
        current_revenue = self._get_aggregated_revenue(location_ids, current_range)
        previous_revenue = self._get_aggregated_revenue(location_ids, previous_range)
        
        current_appointments = self._get_aggregated_appointments(location_ids, current_range)
        previous_appointments = self._get_aggregated_appointments(location_ids, previous_range)
        
        # Calculate percentage changes
        revenue_change = self._calculate_percentage_change(
            current_revenue["total"],
            previous_revenue["total"]
        )
        
        appointment_change = self._calculate_percentage_change(
            current_appointments["total"],
            previous_appointments["total"]
        )
        
        return {
            "current_period": {
                "start": current_range.start_date.isoformat(),
                "end": current_range.end_date.isoformat(),
                "revenue": current_revenue["total"],
                "appointments": current_appointments["total"]
            },
            "previous_period": {
                "start": previous_range.start_date.isoformat(),
                "end": previous_range.end_date.isoformat(),
                "revenue": previous_revenue["total"],
                "appointments": previous_appointments["total"]
            },
            "changes": {
                "revenue_change_percent": revenue_change,
                "revenue_change_amount": current_revenue["total"] - previous_revenue["total"],
                "appointment_change_percent": appointment_change,
                "appointment_change_count": current_appointments["total"] - previous_appointments["total"]
            }
        }
    
    def _get_top_performers(
        self,
        location_ids: List[int],
        date_range: Optional[DateRange],
        limit: int = 5
    ) -> Dict[str, Any]:
        """Get top performing locations, barbers, and services"""
        # Top locations by revenue
        location_revenue = []
        for location_id in location_ids:
            location = self.db.query(BarbershopLocation).filter(
                BarbershopLocation.id == location_id
            ).first()
            
            if location:
                revenue = self._get_location_revenue(location_id, date_range)
                location_revenue.append({
                    "location_id": location_id,
                    "location_name": location.name,
                    "revenue": revenue["total"]
                })
        
        location_revenue.sort(key=lambda x: x["revenue"], reverse=True)
        
        # Top barbers by revenue
        barber_query = self.db.query(
            User.id,
            User.name,
            func.sum(Payment.barber_amount).label('total_earnings')
        ).join(
            Appointment, User.id == Appointment.barber_id
        ).join(
            Payment, Appointment.id == Payment.appointment_id
        ).filter(
            Payment.status == 'completed',
            User.role.in_(['barber', 'admin'])
        )
        
        if location_ids:
            barber_query = barber_query.filter(User.location_id.in_(location_ids))
        
        if date_range:
            barber_query = barber_query.filter(
                and_(
                    Payment.created_at >= date_range.start_date,
                    Payment.created_at <= date_range.end_date
                )
            )
        
        top_barbers = barber_query.group_by(User.id).order_by(
            func.sum(Payment.barber_amount).desc()
        ).limit(limit).all()
        
        # Top services by revenue
        service_query = self.db.query(
            Service.id,
            Service.name,
            func.sum(Payment.amount).label('total_revenue'),
            func.count(Appointment.id).label('booking_count')
        ).join(
            Appointment, Service.id == Appointment.service_id
        ).join(
            Payment, Appointment.id == Payment.appointment_id
        ).join(
            User, Appointment.barber_id == User.id
        ).filter(
            Payment.status == 'completed'
        )
        
        if location_ids:
            service_query = service_query.filter(User.location_id.in_(location_ids))
        
        if date_range:
            service_query = service_query.filter(
                and_(
                    Payment.created_at >= date_range.start_date,
                    Payment.created_at <= date_range.end_date
                )
            )
        
        top_services = service_query.group_by(Service.id).order_by(
            func.sum(Payment.amount).desc()
        ).limit(limit).all()
        
        return {
            "top_locations": location_revenue[:limit],
            "top_barbers": [
                {
                    "barber_id": b.id,
                    "barber_name": b.name,
                    "total_earnings": float(b.total_earnings or 0)
                }
                for b in top_barbers
            ],
            "top_services": [
                {
                    "service_id": s.id,
                    "service_name": s.name,
                    "total_revenue": float(s.total_revenue or 0),
                    "booking_count": int(s.booking_count or 0)
                }
                for s in top_services
            ]
        }
    
    def _calculate_financial_ratios(
        self,
        revenue_data: Dict,
        chair_metrics: Dict,
        appointment_metrics: Dict,
        location_count: int
    ) -> Dict[str, float]:
        """Calculate key financial ratios"""
        ratios = {}
        
        # Revenue per chair
        if chair_metrics["occupied_chairs"] > 0:
            ratios["revenue_per_occupied_chair"] = revenue_data["total"] / chair_metrics["occupied_chairs"]
        else:
            ratios["revenue_per_occupied_chair"] = 0
        
        if chair_metrics["total_chairs"] > 0:
            ratios["revenue_per_total_chair"] = revenue_data["total"] / chair_metrics["total_chairs"]
        else:
            ratios["revenue_per_total_chair"] = 0
        
        # Revenue per appointment
        if appointment_metrics["completed"] > 0:
            ratios["revenue_per_completed_appointment"] = revenue_data["total"] / appointment_metrics["completed"]
        else:
            ratios["revenue_per_completed_appointment"] = 0
        
        # Revenue per location
        if location_count > 0:
            ratios["revenue_per_location"] = revenue_data["total"] / location_count
        else:
            ratios["revenue_per_location"] = 0
        
        # Efficiency ratio (completed appointments / total chairs)
        if chair_metrics["total_chairs"] > 0:
            ratios["chair_efficiency_ratio"] = appointment_metrics["completed"] / chair_metrics["total_chairs"]
        else:
            ratios["chair_efficiency_ratio"] = 0
        
        # Platform fee percentage
        if revenue_data["total"] > 0:
            ratios["platform_fee_percentage"] = (revenue_data["platform_fees"] / revenue_data["total"]) * 100
        else:
            ratios["platform_fee_percentage"] = 0
        
        return ratios
    
    def _get_location_summary(
        self,
        location: BarbershopLocation,
        date_range: Optional[DateRange]
    ) -> Dict[str, Any]:
        """Get summary metrics for a single location"""
        # Get location revenue
        revenue = self._get_location_revenue(location.id, date_range)
        
        # Get appointment metrics
        appointments = self._get_location_appointments(location.id, date_range)
        
        # Get chair metrics
        chairs = self.db.query(ChairInventory).filter(
            ChairInventory.location_id == location.id
        ).all()
        
        occupied_chairs = len([c for c in chairs if c.status == ChairStatus.OCCUPIED])
        
        # Get barber count
        barber_count = self.db.query(func.count(BarberLocation.barber_id)).filter(
            BarberLocation.location_id == location.id,
            BarberLocation.is_active == True
        ).scalar() or 0
        
        return {
            "location_id": location.id,
            "location_name": location.name,
            "location_code": location.code,
            "status": location.status.value,
            "compensation_model": location.compensation_model.value,
            "metrics": {
                "revenue": revenue["total"],
                "appointments": appointments["total"],
                "completion_rate": appointments["completion_rate"],
                "total_chairs": len(chairs),
                "occupied_chairs": occupied_chairs,
                "occupancy_rate": (occupied_chairs / len(chairs) * 100) if chairs else 0,
                "barber_count": barber_count,
                "revenue_per_barber": revenue["total"] / barber_count if barber_count > 0 else 0
            }
        }
    
    def _get_location_metrics(
        self,
        location_id: int,
        date_range: Optional[DateRange]
    ) -> Dict[str, Any]:
        """Get comprehensive metrics for a single location"""
        revenue = self._get_location_revenue(location_id, date_range)
        appointments = self._get_location_appointments(location_id, date_range)
        chair_utilization = self._get_location_chair_utilization(location_id, date_range)
        clients = self._get_location_client_metrics(location_id, date_range)
        
        return {
            "revenue": revenue,
            "appointments": appointments,
            "chair_utilization": chair_utilization,
            "clients": clients
        }
    
    def _get_location_revenue(
        self,
        location_id: int,
        date_range: Optional[DateRange]
    ) -> Dict[str, Any]:
        """Get revenue data for a specific location"""
        query = self.db.query(
            func.sum(Payment.amount).label('total'),
            func.sum(Payment.barber_amount).label('barber_earnings'),
            func.sum(Payment.platform_fee).label('platform_fees')
        ).join(
            Appointment, Payment.appointment_id == Appointment.id
        ).join(
            User, Appointment.barber_id == User.id
        ).filter(
            Payment.status == 'completed',
            User.location_id == location_id
        )
        
        if date_range:
            query = query.filter(
                and_(
                    Payment.created_at >= date_range.start_date,
                    Payment.created_at <= date_range.end_date
                )
            )
        
        result = query.first()
        
        # Calculate trend (simplified - compare to previous period)
        trend = 0
        if date_range:
            period_length = (date_range.end_date - date_range.start_date).days
            prev_start = date_range.start_date - timedelta(days=period_length)
            prev_end = date_range.start_date - timedelta(days=1)
            
            prev_query = query.filter(
                and_(
                    Payment.created_at >= prev_start,
                    Payment.created_at <= prev_end
                )
            )
            prev_result = prev_query.first()
            
            if prev_result and prev_result.total:
                trend = self._calculate_percentage_change(
                    float(result.total or 0),
                    float(prev_result.total)
                )
        
        return {
            "total": float(result.total or 0),
            "barber_earnings": float(result.barber_earnings or 0),
            "platform_fees": float(result.platform_fees or 0),
            "trend": trend
        }
    
    def _get_location_appointments(
        self,
        location_id: int,
        date_range: Optional[DateRange]
    ) -> Dict[str, Any]:
        """Get appointment metrics for a specific location"""
        query = self.db.query(Appointment).join(
            User, Appointment.barber_id == User.id
        ).filter(
            User.location_id == location_id
        )
        
        if date_range:
            query = query.filter(
                and_(
                    Appointment.start_time >= date_range.start_date,
                    Appointment.start_time <= date_range.end_date
                )
            )
        
        appointments = query.all()
        
        total = len(appointments)
        completed = sum(1 for a in appointments if a.status == 'completed')
        
        return {
            "total": total,
            "completed": completed,
            "completion_rate": (completed / total * 100) if total > 0 else 0
        }
    
    def _get_location_chair_utilization(
        self,
        location_id: int,
        date_range: Optional[DateRange]
    ) -> Dict[str, Any]:
        """Get chair utilization for a specific location"""
        chairs = self.db.query(ChairInventory).filter(
            ChairInventory.location_id == location_id
        ).all()
        
        total_chairs = len(chairs)
        occupied_chairs = len([c for c in chairs if c.status == ChairStatus.OCCUPIED])
        
        # Calculate trend (simplified)
        trend = 0  # Would need historical data to calculate actual trend
        
        return {
            "total_chairs": total_chairs,
            "occupied_chairs": occupied_chairs,
            "occupancy_rate": (occupied_chairs / total_chairs * 100) if total_chairs > 0 else 0,
            "trend": trend
        }
    
    def _get_location_client_metrics(
        self,
        location_id: int,
        date_range: Optional[DateRange]
    ) -> Dict[str, Any]:
        """Get client metrics for a specific location"""
        clients_query = self.db.query(Client).join(
            Appointment, Client.id == Appointment.client_id
        ).join(
            User, Appointment.barber_id == User.id
        ).filter(
            User.location_id == location_id
        )
        
        if date_range:
            clients_query = clients_query.filter(
                and_(
                    Appointment.start_time >= date_range.start_date,
                    Appointment.start_time <= date_range.end_date
                )
            )
        
        clients = clients_query.distinct().all()
        
        total = len(clients)
        returning = sum(1 for c in clients if c.customer_type in ['returning', 'vip'])
        new = sum(1 for c in clients if c.customer_type == 'new')
        
        return {
            "total_clients": total,
            "retention_rate": (returning / total * 100) if total > 0 else 0,
            "new_vs_returning_ratio": (new / returning) if returning > 0 else 0
        }
    
    def _get_barber_revenue(
        self,
        barber_id: int,
        date_range: DateRange
    ) -> float:
        """Get revenue for a specific barber"""
        query = self.db.query(
            func.sum(Payment.amount).label('total')
        ).join(
            Appointment, Payment.appointment_id == Appointment.id
        ).filter(
            Payment.status == 'completed',
            Appointment.barber_id == barber_id,
            Payment.created_at >= date_range.start_date,
            Payment.created_at <= date_range.end_date
        )
        
        result = query.scalar()
        return float(result or 0)
    
    def _calculate_chair_utilization_rate(
        self,
        location_id: int,
        occupied_chairs: int,
        date_range: DateRange
    ) -> float:
        """Calculate actual utilization rate based on appointments"""
        # Get total available hours
        days = (date_range.end_date - date_range.start_date).days
        hours_per_day = 10  # Assuming 10-hour workday
        total_available_hours = occupied_chairs * days * hours_per_day
        
        # Get actual booked hours
        booked_hours_query = self.db.query(
            func.sum(Appointment.duration_minutes).label('total_minutes')
        ).join(
            User, Appointment.barber_id == User.id
        ).filter(
            User.location_id == location_id,
            Appointment.status == 'completed',
            Appointment.start_time >= date_range.start_date,
            Appointment.start_time <= date_range.end_date
        )
        
        result = booked_hours_query.scalar()
        booked_hours = (result or 0) / 60
        
        return (booked_hours / total_available_hours * 100) if total_available_hours > 0 else 0
    
    def _percentile(self, data: List[float], percentile: float) -> float:
        """Calculate percentile value from a list of numbers"""
        if not data:
            return 0
        
        sorted_data = sorted(data)
        index = (percentile / 100) * (len(sorted_data) - 1)
        
        if index.is_integer():
            return sorted_data[int(index)]
        else:
            lower = sorted_data[int(index)]
            upper = sorted_data[int(index) + 1]
            return lower + (upper - lower) * (index - int(index))
    
    def _calculate_percentage_change(self, current: float, previous: float) -> float:
        """Calculate percentage change between two values"""
        if previous == 0:
            return 100 if current > 0 else 0
        return ((current - previous) / previous) * 100
    
    def _generate_chair_utilization_insights(
        self,
        utilization_data: List[Dict],
        overall_occupancy_rate: float,
        avg_revenue_per_chair: float
    ) -> List[Dict[str, str]]:
        """Generate insights based on chair utilization data"""
        insights = []
        
        # Overall occupancy insight
        if overall_occupancy_rate < 70:
            insights.append({
                "type": "opportunity",
                "priority": "high",
                "title": "Low Chair Occupancy",
                "description": f"Overall chair occupancy is {overall_occupancy_rate:.1f}%. Consider marketing campaigns to attract more barbers.",
                "action": "Launch barber recruitment campaign"
            })
        elif overall_occupancy_rate > 95:
            insights.append({
                "type": "growth",
                "priority": "medium",
                "title": "Near Full Capacity",
                "description": f"Chair occupancy is {overall_occupancy_rate:.1f}%. Consider expanding to new locations.",
                "action": "Evaluate expansion opportunities"
            })
        
        # Revenue per chair insight
        if avg_revenue_per_chair < 1000:  # Assuming monthly
            insights.append({
                "type": "revenue",
                "priority": "high",
                "title": "Low Revenue per Chair",
                "description": f"Average revenue per chair is ${avg_revenue_per_chair:.2f}. Focus on increasing service prices or appointment volume.",
                "action": "Review pricing and marketing strategies"
            })
        
        # Location-specific insights
        for location in utilization_data:
            if location["occupancy_rate"] < 50:
                insights.append({
                    "type": "location",
                    "priority": "high",
                    "title": f"Low Occupancy at {location['location_name']}",
                    "description": f"Only {location['occupancy_rate']:.1f}% chair occupancy. This location needs immediate attention.",
                    "action": f"Develop action plan for {location['location_name']}"
                })
        
        return insights
    
    def _generate_compensation_insights(
        self,
        model_analytics: Dict[str, Dict]
    ) -> List[Dict[str, str]]:
        """Generate insights based on compensation model analytics"""
        insights = []
        
        # Find best performing model
        best_model = None
        best_avg_revenue = 0
        
        for model_type, analytics in model_analytics.items():
            if analytics["avg_revenue_per_barber"] > best_avg_revenue:
                best_model = model_type
                best_avg_revenue = analytics["avg_revenue_per_barber"]
        
        if best_model:
            insights.append({
                "type": "compensation",
                "priority": "medium",
                "title": "Best Performing Compensation Model",
                "description": f"{best_model} generates ${best_avg_revenue:.2f} average revenue per barber.",
                "action": f"Consider transitioning more locations to {best_model} model"
            })
        
        # Model-specific insights
        for model_type, analytics in model_analytics.items():
            if analytics["total_barbers"] > 0:
                if model_type == CompensationModel.BOOTH_RENTAL.value:
                    if analytics["avg_revenue_per_barber"] < 3000:  # Monthly threshold
                        insights.append({
                            "type": "warning",
                            "priority": "high",
                            "title": "Low Booth Rental Performance",
                            "description": "Booth rental locations are underperforming. Barbers may need support to increase bookings.",
                            "action": "Implement marketing support for booth rental barbers"
                        })
                
                elif model_type == CompensationModel.COMMISSION.value:
                    commission_percentage = (analytics["total_commission_income"] / analytics["total_revenue"] * 100) if analytics["total_revenue"] > 0 else 0
                    if commission_percentage < 15:
                        insights.append({
                            "type": "revenue",
                            "priority": "medium",
                            "title": "Low Commission Revenue",
                            "description": f"Commission model is only generating {commission_percentage:.1f}% platform revenue.",
                            "action": "Review commission rates and tier structures"
                        })
        
        return insights
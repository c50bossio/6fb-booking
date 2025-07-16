"""
Enterprise Analytics Service
Provides advanced analytics capabilities for enterprise customers
"""

from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
import logging

from models import User, Appointment, Payment, Client, Service
from schemas import DateRange

logger = logging.getLogger(__name__)


class EnterpriseAnalyticsService:
    """
    Advanced analytics service for enterprise-level insights
    """
    
    def __init__(self, db: Session):
        self.db = db
        self.analytics_cache = {}
    
    def get_revenue_insights(self, location_ids: List[int], date_range: Optional[DateRange] = None) -> Dict[str, Any]:
        """Get comprehensive revenue analytics for multiple locations"""
        try:
            # Base query for payments
            query = self.db.query(
                Payment.amount,
                Payment.created_at,
                Appointment.service_name,
                func.extract('hour', Appointment.start_time).label('hour')
            ).join(
                Appointment, Payment.appointment_id == Appointment.id
            ).filter(
                Payment.status == 'completed',
                Appointment.user_id.in_(location_ids)
            )
            
            if date_range:
                query = query.filter(
                    and_(
                        Payment.created_at >= date_range.start_date,
                        Payment.created_at <= date_range.end_date
                    )
                )
            
            payments = query.all()
            
            # Calculate total revenue
            total_revenue = sum(p.amount for p in payments)
            
            # Calculate average ticket
            average_ticket = total_revenue / len(payments) if payments else 0
            
            # Calculate revenue growth (compare with previous period)
            if date_range:
                period_length = (date_range.end_date - date_range.start_date).days
                previous_start = date_range.start_date - timedelta(days=period_length)
                previous_end = date_range.start_date - timedelta(days=1)
                
                previous_query = self.db.query(func.sum(Payment.amount)).join(
                    Appointment, Payment.appointment_id == Appointment.id
                ).filter(
                    Payment.status == 'completed',
                    Appointment.user_id.in_(location_ids),
                    and_(
                        Payment.created_at >= previous_start,
                        Payment.created_at <= previous_end
                    )
                )
                
                previous_revenue = previous_query.scalar() or 0
                revenue_growth = ((total_revenue - previous_revenue) / previous_revenue * 100) if previous_revenue > 0 else 0
            else:
                revenue_growth = 0
            
            # Top services by revenue
            service_revenue = {}
            for payment in payments:
                service = payment.service_name or "Unknown Service"
                service_revenue[service] = service_revenue.get(service, 0) + payment.amount
            
            top_services = sorted(service_revenue.items(), key=lambda x: x[1], reverse=True)[:5]
            
            # Peak hours analysis
            hour_revenue = {}
            for payment in payments:
                hour = payment.hour or 0
                hour_revenue[hour] = hour_revenue.get(hour, 0) + payment.amount
            
            peak_hours = sorted(hour_revenue.items(), key=lambda x: x[1], reverse=True)[:3]
            
            # Revenue trends (daily breakdown)
            revenue_trends = []
            if date_range:
                current_date = date_range.start_date.date()
                end_date = date_range.end_date.date()
                
                while current_date <= end_date:
                    day_revenue = sum(
                        p.amount for p in payments 
                        if p.created_at.date() == current_date
                    )
                    revenue_trends.append({
                        "date": current_date.isoformat(),
                        "revenue": float(day_revenue)
                    })
                    current_date += timedelta(days=1)
            
            return {
                "total_revenue": float(total_revenue),
                "revenue_growth": float(revenue_growth),
                "average_ticket": float(average_ticket),
                "top_services": [
                    {"name": service[0], "revenue": float(service[1])}
                    for service in top_services
                ],
                "peak_hours": [
                    {"hour": f"{int(hour[0])}:00", "revenue": float(hour[1])}
                    for hour in peak_hours
                ],
                "revenue_trends": revenue_trends
            }
        except Exception as e:
            logger.error(f"Error getting revenue insights: {e}")
            return {
                "total_revenue": 0,
                "revenue_growth": 0,
                "average_ticket": 0,
                "top_services": [],
                "peak_hours": [],
                "revenue_trends": []
            }
    
    def get_customer_analytics(self, location_ids: List[int], date_range: Optional[DateRange] = None) -> Dict[str, Any]:
        """Get customer behavior analytics across multiple locations"""
        try:
            # Base query for appointments
            query = self.db.query(Appointment).filter(
                Appointment.user_id.in_(location_ids)
            )
            
            if date_range:
                query = query.filter(
                    and_(
                        Appointment.start_time >= date_range.start_date,
                        Appointment.start_time <= date_range.end_date
                    )
                )
            
            appointments = query.all()
            
            # Get unique clients
            client_ids = set(a.client_id for a in appointments if a.client_id)
            
            # Calculate new vs returning customers
            if date_range:
                # Check for clients' first appointments before this period
                new_customers = 0
                returning_customers = 0
                
                for client_id in client_ids:
                    first_appointment = self.db.query(Appointment).filter(
                        Appointment.client_id == client_id,
                        Appointment.user_id.in_(location_ids)
                    ).order_by(Appointment.start_time).first()
                    
                    if first_appointment and first_appointment.start_time >= date_range.start_date:
                        new_customers += 1
                    else:
                        returning_customers += 1
            else:
                new_customers = len(client_ids)
                returning_customers = 0
            
            # Customer retention rate
            total_clients = len(client_ids)
            if total_clients > 0:
                # Calculate clients with multiple visits
                client_visit_counts = {}
                for appointment in appointments:
                    if appointment.client_id:
                        client_visit_counts[appointment.client_id] = client_visit_counts.get(appointment.client_id, 0) + 1
                
                repeat_clients = sum(1 for count in client_visit_counts.values() if count > 1)
                customer_retention = (repeat_clients / total_clients * 100) if total_clients > 0 else 0
            else:
                customer_retention = 0
            
            # Calculate lifetime value
            if client_ids:
                client_payments = self.db.query(Payment).join(
                    Appointment, Payment.appointment_id == Appointment.id
                ).filter(
                    Payment.status == 'completed',
                    Appointment.client_id.in_(client_ids),
                    Appointment.user_id.in_(location_ids)
                ).all()
                
                total_client_revenue = sum(p.amount for p in client_payments)
                lifetime_value = total_client_revenue / len(client_ids) if client_ids else 0
            else:
                lifetime_value = 0
            
            # Satisfaction score (placeholder - would need review/rating data)
            satisfaction_score = 4.2  # Mock satisfaction score
            
            return {
                "new_customers": new_customers,
                "returning_customers": returning_customers,
                "customer_retention": float(customer_retention),
                "lifetime_value": float(lifetime_value),
                "satisfaction_score": float(satisfaction_score),
                "total_unique_customers": total_clients
            }
        except Exception as e:
            logger.error(f"Error getting customer analytics: {e}")
            return {
                "new_customers": 0,
                "returning_customers": 0,
                "customer_retention": 0,
                "lifetime_value": 0,
                "satisfaction_score": 0,
                "total_unique_customers": 0
            }
    
    def get_performance_metrics(self, location_ids: List[int], date_range: Optional[DateRange] = None) -> Dict[str, Any]:
        """Get operational performance metrics across multiple locations"""
        try:
            # Base query for appointments
            query = self.db.query(Appointment).filter(
                Appointment.user_id.in_(location_ids)
            )
            
            if date_range:
                query = query.filter(
                    and_(
                        Appointment.start_time >= date_range.start_date,
                        Appointment.start_time <= date_range.end_date
                    )
                )
            
            appointments = query.all()
            total_appointments = len(appointments)
            
            if total_appointments == 0:
                return {
                    "utilization_rate": 0,
                    "no_show_rate": 0,
                    "cancellation_rate": 0,
                    "average_service_time": 0,
                    "staff_efficiency": 0,
                    "completion_rate": 0
                }
            
            # Calculate rates
            completed = sum(1 for a in appointments if a.status == 'completed')
            no_shows = sum(1 for a in appointments if a.status == 'no_show')
            cancelled = sum(1 for a in appointments if a.status == 'cancelled')
            
            completion_rate = (completed / total_appointments * 100) if total_appointments > 0 else 0
            no_show_rate = (no_shows / total_appointments * 100) if total_appointments > 0 else 0
            cancellation_rate = (cancelled / total_appointments * 100) if total_appointments > 0 else 0
            
            # Average service time
            service_times = [a.duration_minutes for a in appointments if a.duration_minutes]
            average_service_time = sum(service_times) / len(service_times) if service_times else 30
            
            # Calculate utilization rate
            total_scheduled_minutes = sum(a.duration_minutes or 30 for a in appointments)
            
            # Estimate available hours (8 hours/day * number of locations * days in period)
            if date_range:
                days_in_period = (date_range.end_date - date_range.start_date).days + 1
            else:
                days_in_period = 30  # Default to 30 days
            
            available_hours = len(location_ids) * 8 * days_in_period  # 8 hours per day per location
            available_minutes = available_hours * 60
            
            utilization_rate = (total_scheduled_minutes / available_minutes * 100) if available_minutes > 0 else 0
            
            # Staff efficiency (appointments per hour)
            staff_efficiency = (total_appointments / available_hours) if available_hours > 0 else 0
            
            return {
                "utilization_rate": float(min(utilization_rate, 100)),  # Cap at 100%
                "no_show_rate": float(no_show_rate),
                "cancellation_rate": float(cancellation_rate),
                "average_service_time": float(average_service_time),
                "staff_efficiency": float(staff_efficiency),
                "completion_rate": float(completion_rate),
                "total_appointments": total_appointments
            }
        except Exception as e:
            logger.error(f"Error getting performance metrics: {e}")
            return {
                "utilization_rate": 0,
                "no_show_rate": 0,
                "cancellation_rate": 0,
                "average_service_time": 0,
                "staff_efficiency": 0,
                "completion_rate": 0
            }
    
    def generate_custom_report(self, location_ids: List[int], report_config: Dict[str, Any]) -> Dict[str, Any]:
        """Generate custom analytics report for multiple locations"""
        try:
            report_type = report_config.get('type', 'comprehensive')
            date_range = report_config.get('date_range')
            
            # Convert date_range if provided
            parsed_date_range = None
            if date_range:
                parsed_date_range = DateRange(
                    start_date=datetime.fromisoformat(date_range['start_date']),
                    end_date=datetime.fromisoformat(date_range['end_date'])
                )
            
            # Gather data based on report type
            report_data = {}
            
            if report_type in ['comprehensive', 'revenue']:
                report_data['revenue_insights'] = self.get_revenue_insights(location_ids, parsed_date_range)
            
            if report_type in ['comprehensive', 'customers']:
                report_data['customer_analytics'] = self.get_customer_analytics(location_ids, parsed_date_range)
            
            if report_type in ['comprehensive', 'performance']:
                report_data['performance_metrics'] = self.get_performance_metrics(location_ids, parsed_date_range)
            
            # Generate insights based on data
            insights = self._generate_insights(report_data)
            
            return {
                "report_id": f"enterprise_report_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}",
                "generated_at": datetime.utcnow().isoformat(),
                "report_type": report_type,
                "location_count": len(location_ids),
                "date_range": {
                    "start": date_range['start_date'] if date_range else None,
                    "end": date_range['end_date'] if date_range else None
                },
                "data": report_data,
                "insights": insights,
                "summary": self._generate_summary(report_data)
            }
        except Exception as e:
            logger.error(f"Error generating custom report: {e}")
            return {
                "report_id": "error_report",
                "generated_at": datetime.utcnow().isoformat(),
                "error": str(e),
                "data": {},
                "insights": []
            }
    
    def _generate_insights(self, report_data: Dict[str, Any]) -> List[Dict[str, str]]:
        """Generate business insights from report data"""
        insights = []
        
        # Revenue insights
        if 'revenue_insights' in report_data:
            revenue = report_data['revenue_insights']
            if revenue['revenue_growth'] < 0:
                insights.append({
                    'type': 'warning',
                    'title': 'Revenue Decline',
                    'description': f"Revenue has decreased by {abs(revenue['revenue_growth']):.1f}% compared to the previous period.",
                    'recommendation': 'Review pricing strategy and focus on customer retention.'
                })
            elif revenue['revenue_growth'] > 10:
                insights.append({
                    'type': 'success',
                    'title': 'Strong Revenue Growth',
                    'description': f"Revenue has increased by {revenue['revenue_growth']:.1f}% - excellent performance!",
                    'recommendation': 'Continue current strategies and consider expansion opportunities.'
                })
        
        # Performance insights
        if 'performance_metrics' in report_data:
            performance = report_data['performance_metrics']
            if performance['no_show_rate'] > 15:
                insights.append({
                    'type': 'action',
                    'title': 'High No-Show Rate',
                    'description': f"No-show rate of {performance['no_show_rate']:.1f}% is above recommended threshold.",
                    'recommendation': 'Implement confirmation systems and require deposits for appointments.'
                })
            
            if performance['utilization_rate'] < 60:
                insights.append({
                    'type': 'opportunity',
                    'title': 'Low Utilization Rate',
                    'description': f"Staff utilization at {performance['utilization_rate']:.1f}% indicates capacity for more bookings.",
                    'recommendation': 'Focus on marketing and customer acquisition to fill available slots.'
                })
        
        # Customer insights
        if 'customer_analytics' in report_data:
            customers = report_data['customer_analytics']
            if customers['customer_retention'] < 60:
                insights.append({
                    'type': 'critical',
                    'title': 'Low Customer Retention',
                    'description': f"Retention rate of {customers['customer_retention']:.1f}% needs improvement.",
                    'recommendation': 'Implement loyalty programs and improve follow-up communication.'
                })
        
        return insights
    
    def _generate_summary(self, report_data: Dict[str, Any]) -> Dict[str, Any]:
        """Generate executive summary from report data"""
        summary = {}
        
        if 'revenue_insights' in report_data:
            revenue = report_data['revenue_insights']
            summary['total_revenue'] = revenue['total_revenue']
            summary['revenue_growth'] = revenue['revenue_growth']
            summary['average_ticket'] = revenue['average_ticket']
        
        if 'customer_analytics' in report_data:
            customers = report_data['customer_analytics']
            summary['total_customers'] = customers['total_unique_customers']
            summary['customer_retention'] = customers['customer_retention']
            summary['customer_lifetime_value'] = customers['lifetime_value']
        
        if 'performance_metrics' in report_data:
            performance = report_data['performance_metrics']
            summary['utilization_rate'] = performance['utilization_rate']
            summary['completion_rate'] = performance['completion_rate']
            summary['no_show_rate'] = performance['no_show_rate']
        
        return summary
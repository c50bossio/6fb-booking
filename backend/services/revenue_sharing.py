"""
Revenue Sharing and Commission Management Service
Manages commission calculations, payouts, and revenue sharing for 6FB network
"""
import asyncio
import logging
from datetime import datetime, timedelta, date
from typing import Dict, List, Any, Optional, Tuple
from decimal import Decimal, ROUND_HALF_UP
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, desc
from dataclasses import dataclass

from models.appointment import Appointment
from models.barber import Barber
from models.location import Location
from models.user import User
from models.training import UserCertification
from config.database import get_db

logger = logging.getLogger(__name__)

@dataclass
class CommissionStructure:
    """Commission structure for different roles and levels"""
    base_percentage: float
    certification_bonus: float
    performance_bonus: float
    mentor_override: float
    franchise_fee: float

@dataclass
class PayoutCalculation:
    """Payout calculation result"""
    barber_id: int
    period_start: date
    period_end: date
    gross_revenue: Decimal
    base_commission: Decimal
    certification_bonus: Decimal
    performance_bonus: Decimal
    total_commission: Decimal
    franchise_fee: Decimal
    mentor_override: Decimal
    net_payout: Decimal
    tax_withholding: Decimal
    final_payout: Decimal

class RevenueManagementService:
    """Service for managing revenue sharing and commissions"""
    
    def __init__(self, db: Session):
        self.db = db
        self.commission_structures = self._load_commission_structures()
    
    def _load_commission_structures(self) -> Dict[str, CommissionStructure]:
        """Load commission structures for different certification levels"""
        return {
            'no_certification': CommissionStructure(
                base_percentage=45.0,
                certification_bonus=0.0,
                performance_bonus=0.0,
                mentor_override=5.0,
                franchise_fee=8.0
            ),
            'bronze': CommissionStructure(
                base_percentage=50.0,
                certification_bonus=2.0,
                performance_bonus=0.0,
                mentor_override=4.0,
                franchise_fee=7.0
            ),
            'silver': CommissionStructure(
                base_percentage=55.0,
                certification_bonus=3.0,
                performance_bonus=2.0,
                mentor_override=3.0,
                franchise_fee=6.0
            ),
            'gold': CommissionStructure(
                base_percentage=60.0,
                certification_bonus=5.0,
                performance_bonus=3.0,
                mentor_override=2.0,
                franchise_fee=5.0
            ),
            'platinum': CommissionStructure(
                base_percentage=65.0,
                certification_bonus=7.0,
                performance_bonus=5.0,
                mentor_override=1.0,
                franchise_fee=4.0
            )
        }
    
    # Commission Calculations
    async def calculate_barber_commission(self, barber_id: int, start_date: date, end_date: date) -> PayoutCalculation:
        """Calculate commission for barber for given period"""
        try:
            barber = self.db.query(Barber).filter(Barber.id == barber_id).first()
            if not barber:
                raise ValueError(f"Barber {barber_id} not found")
            
            # Get appointments for period
            appointments = self.db.query(Appointment).filter(
                and_(
                    Appointment.barber_id == barber_id,
                    Appointment.appointment_date >= start_date,
                    Appointment.appointment_date <= end_date,
                    Appointment.status == 'completed'
                )
            ).all()
            
            # Calculate gross revenue
            gross_revenue = Decimal('0.00')
            for appointment in appointments:
                revenue = Decimal(str(appointment.service_revenue or 0))
                # Note: Tips typically go 100% to barber, products may have different split
                gross_revenue += revenue
            
            # Get barber's certification level
            cert_level = self._get_barber_certification_level(barber_id)
            commission_structure = self.commission_structures.get(cert_level, self.commission_structures['no_certification'])
            
            # Calculate base commission
            base_percentage = Decimal(str(commission_structure.base_percentage)) / Decimal('100')
            base_commission = gross_revenue * base_percentage
            
            # Calculate certification bonus
            cert_bonus_percentage = Decimal(str(commission_structure.certification_bonus)) / Decimal('100')
            certification_bonus = gross_revenue * cert_bonus_percentage
            
            # Calculate performance bonus
            performance_bonus = await self._calculate_performance_bonus(
                barber_id, gross_revenue, commission_structure, start_date, end_date
            )
            
            # Calculate total commission
            total_commission = base_commission + certification_bonus + performance_bonus
            
            # Calculate franchise fee
            franchise_fee_percentage = Decimal(str(commission_structure.franchise_fee)) / Decimal('100')
            franchise_fee = gross_revenue * franchise_fee_percentage
            
            # Calculate mentor override
            mentor_override = await self._calculate_mentor_override(
                barber_id, gross_revenue, commission_structure
            )
            
            # Calculate net payout (before taxes)
            net_payout = total_commission - franchise_fee
            
            # Calculate tax withholding (simplified - in reality, would depend on tax status)
            tax_withholding = self._calculate_tax_withholding(net_payout)
            
            # Final payout
            final_payout = net_payout - tax_withholding
            
            return PayoutCalculation(
                barber_id=barber_id,
                period_start=start_date,
                period_end=end_date,
                gross_revenue=gross_revenue,
                base_commission=base_commission,
                certification_bonus=certification_bonus,
                performance_bonus=performance_bonus,
                total_commission=total_commission,
                franchise_fee=franchise_fee,
                mentor_override=mentor_override,
                net_payout=net_payout,
                tax_withholding=tax_withholding,
                final_payout=final_payout
            )
            
        except Exception as e:
            logger.error(f"Error calculating commission for barber {barber_id}: {e}")
            raise
    
    def _get_barber_certification_level(self, barber_id: int) -> str:
        """Get barber's current certification level"""
        try:
            # Get barber's user account
            barber = self.db.query(Barber).filter(Barber.id == barber_id).first()
            if not barber or not barber.user_id:
                return 'no_certification'
            
            # Get highest active certification
            user_cert = self.db.query(UserCertification).filter(
                and_(
                    UserCertification.user_id == barber.user_id,
                    UserCertification.status == 'active'
                )
            ).order_by(desc(UserCertification.earned_date)).first()
            
            if user_cert:
                return user_cert.certification.level
            
            return 'no_certification'
            
        except Exception as e:
            logger.error(f"Error getting certification level for barber {barber_id}: {e}")
            return 'no_certification'
    
    async def _calculate_performance_bonus(self, barber_id: int, gross_revenue: Decimal, 
                                         commission_structure: CommissionStructure,
                                         start_date: date, end_date: date) -> Decimal:
        """Calculate performance-based bonus"""
        try:
            # Get 6FB score for the period
            from .sixfb_calculator import SixFBCalculator
            calculator = SixFBCalculator(self.db)
            
            score_data = calculator.calculate_sixfb_score(barber_id, "monthly", start_date, end_date)
            sixfb_score = score_data.get('overall_score', 0)
            
            # Performance bonus tiers
            if sixfb_score >= 95:
                bonus_multiplier = Decimal('1.5')  # 150% of base performance bonus
            elif sixfb_score >= 90:
                bonus_multiplier = Decimal('1.25')  # 125%
            elif sixfb_score >= 85:
                bonus_multiplier = Decimal('1.0')   # 100%
            elif sixfb_score >= 80:
                bonus_multiplier = Decimal('0.75')  # 75%
            else:
                bonus_multiplier = Decimal('0.0')   # No bonus
            
            base_performance_percentage = Decimal(str(commission_structure.performance_bonus)) / Decimal('100')
            performance_bonus = gross_revenue * base_performance_percentage * bonus_multiplier
            
            return performance_bonus
            
        except Exception as e:
            logger.error(f"Error calculating performance bonus: {e}")
            return Decimal('0.00')
    
    async def _calculate_mentor_override(self, barber_id: int, gross_revenue: Decimal,
                                       commission_structure: CommissionStructure) -> Decimal:
        """Calculate mentor override commission"""
        try:
            # Get barber's location and mentor
            barber = self.db.query(Barber).filter(Barber.id == barber_id).first()
            if not barber or not barber.location_id:
                return Decimal('0.00')
            
            location = self.db.query(Location).filter(Location.id == barber.location_id).first()
            if not location or not location.mentor_id:
                return Decimal('0.00')
            
            override_percentage = Decimal(str(commission_structure.mentor_override)) / Decimal('100')
            mentor_override = gross_revenue * override_percentage
            
            return mentor_override
            
        except Exception as e:
            logger.error(f"Error calculating mentor override: {e}")
            return Decimal('0.00')
    
    def _calculate_tax_withholding(self, net_payout: Decimal) -> Decimal:
        """Calculate tax withholding (simplified)"""
        # Simplified tax calculation - in reality, would depend on many factors
        # This assumes independent contractor status with basic withholding
        
        if net_payout <= Decimal('1000'):
            tax_rate = Decimal('0.15')  # 15%
        elif net_payout <= Decimal('3000'):
            tax_rate = Decimal('0.20')  # 20%
        else:
            tax_rate = Decimal('0.25')  # 25%
        
        withholding = net_payout * tax_rate
        return withholding.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
    
    # Location Revenue Analysis
    async def calculate_location_revenue_breakdown(self, location_id: int, start_date: date, end_date: date) -> Dict[str, Any]:
        """Calculate comprehensive revenue breakdown for location"""
        try:
            location = self.db.query(Location).filter(Location.id == location_id).first()
            if not location:
                raise ValueError(f"Location {location_id} not found")
            
            # Get location barbers
            barbers = self.db.query(Barber).filter(Barber.location_id == location_id).all()
            
            breakdown = {
                'location_info': {
                    'id': location.id,
                    'name': location.name,
                    'franchise_type': location.franchise_type
                },
                'period': {
                    'start': start_date.isoformat(),
                    'end': end_date.isoformat()
                },
                'totals': {
                    'gross_revenue': Decimal('0.00'),
                    'barber_commissions': Decimal('0.00'),
                    'franchise_fees': Decimal('0.00'),
                    'mentor_overrides': Decimal('0.00'),
                    'location_profit': Decimal('0.00')
                },
                'barber_breakdowns': [],
                'revenue_streams': {
                    'service_revenue': Decimal('0.00'),
                    'product_revenue': Decimal('0.00'),
                    'tip_revenue': Decimal('0.00')
                }
            }
            
            total_gross = Decimal('0.00')
            total_commissions = Decimal('0.00')
            total_franchise_fees = Decimal('0.00')
            total_mentor_overrides = Decimal('0.00')
            
            for barber in barbers:
                # Calculate barber's commission
                payout = await self.calculate_barber_commission(barber.id, start_date, end_date)
                
                barber_breakdown = {
                    'barber_id': barber.id,
                    'name': f"{barber.first_name} {barber.last_name}",
                    'certification_level': self._get_barber_certification_level(barber.id),
                    'gross_revenue': float(payout.gross_revenue),
                    'total_commission': float(payout.total_commission),
                    'franchise_fee': float(payout.franchise_fee),
                    'final_payout': float(payout.final_payout)
                }
                
                breakdown['barber_breakdowns'].append(barber_breakdown)
                
                # Aggregate totals
                total_gross += payout.gross_revenue
                total_commissions += payout.total_commission
                total_franchise_fees += payout.franchise_fee
                total_mentor_overrides += payout.mentor_override
                
                # Get revenue streams for this barber
                appointments = self.db.query(Appointment).filter(
                    and_(
                        Appointment.barber_id == barber.id,
                        Appointment.appointment_date >= start_date,
                        Appointment.appointment_date <= end_date,
                        Appointment.status == 'completed'
                    )
                ).all()
                
                for appointment in appointments:
                    breakdown['revenue_streams']['service_revenue'] += Decimal(str(appointment.service_revenue or 0))
                    breakdown['revenue_streams']['product_revenue'] += Decimal(str(appointment.product_revenue or 0))
                    breakdown['revenue_streams']['tip_revenue'] += Decimal(str(appointment.tip_amount or 0))
            
            # Calculate location profit
            location_profit = total_gross - total_commissions
            
            # Update totals
            breakdown['totals']['gross_revenue'] = float(total_gross)
            breakdown['totals']['barber_commissions'] = float(total_commissions)
            breakdown['totals']['franchise_fees'] = float(total_franchise_fees)
            breakdown['totals']['mentor_overrides'] = float(total_mentor_overrides)
            breakdown['totals']['location_profit'] = float(location_profit)
            
            # Convert revenue streams to float
            for key in breakdown['revenue_streams']:
                breakdown['revenue_streams'][key] = float(breakdown['revenue_streams'][key])
            
            return breakdown
            
        except Exception as e:
            logger.error(f"Error calculating location revenue breakdown: {e}")
            raise
    
    # Network Revenue Analytics
    async def get_network_revenue_analytics(self, start_date: date, end_date: date) -> Dict[str, Any]:
        """Get network-wide revenue analytics"""
        try:
            locations = self.db.query(Location).filter(Location.is_active == True).all()
            
            network_analytics = {
                'period': {
                    'start': start_date.isoformat(),
                    'end': end_date.isoformat()
                },
                'network_totals': {
                    'total_gross_revenue': 0.0,
                    'total_commissions_paid': 0.0,
                    'total_franchise_fees': 0.0,
                    'total_mentor_overrides': 0.0,
                    'network_profit': 0.0
                },
                'location_performance': [],
                'commission_distribution': {
                    'no_certification': {'count': 0, 'total_commission': 0.0},
                    'bronze': {'count': 0, 'total_commission': 0.0},
                    'silver': {'count': 0, 'total_commission': 0.0},
                    'gold': {'count': 0, 'total_commission': 0.0},
                    'platinum': {'count': 0, 'total_commission': 0.0}
                },
                'top_earners': [],
                'revenue_trends': {}
            }
            
            all_barber_payouts = []
            
            for location in locations:
                location_breakdown = await self.calculate_location_revenue_breakdown(
                    location.id, start_date, end_date
                )
                
                # Add to network totals
                network_analytics['network_totals']['total_gross_revenue'] += location_breakdown['totals']['gross_revenue']
                network_analytics['network_totals']['total_commissions_paid'] += location_breakdown['totals']['barber_commissions']
                network_analytics['network_totals']['total_franchise_fees'] += location_breakdown['totals']['franchise_fees']
                network_analytics['network_totals']['total_mentor_overrides'] += location_breakdown['totals']['mentor_overrides']
                network_analytics['network_totals']['network_profit'] += location_breakdown['totals']['location_profit']
                
                # Location performance
                location_perf = {
                    'location_id': location.id,
                    'name': location.name,
                    'gross_revenue': location_breakdown['totals']['gross_revenue'],
                    'profit': location_breakdown['totals']['location_profit'],
                    'barber_count': len(location_breakdown['barber_breakdowns']),
                    'profit_margin': (location_breakdown['totals']['location_profit'] / location_breakdown['totals']['gross_revenue'] * 100) if location_breakdown['totals']['gross_revenue'] > 0 else 0
                }
                network_analytics['location_performance'].append(location_perf)
                
                # Commission distribution by certification
                for barber_data in location_breakdown['barber_breakdowns']:
                    cert_level = barber_data['certification_level']
                    if cert_level in network_analytics['commission_distribution']:
                        network_analytics['commission_distribution'][cert_level]['count'] += 1
                        network_analytics['commission_distribution'][cert_level]['total_commission'] += barber_data['total_commission']
                    
                    # Collect for top earners
                    all_barber_payouts.append({
                        'barber_id': barber_data['barber_id'],
                        'name': barber_data['name'],
                        'location': location.name,
                        'final_payout': barber_data['final_payout'],
                        'certification_level': cert_level
                    })
            
            # Sort and get top earners
            all_barber_payouts.sort(key=lambda x: x['final_payout'], reverse=True)
            network_analytics['top_earners'] = all_barber_payouts[:10]
            
            # Sort location performance
            network_analytics['location_performance'].sort(key=lambda x: x['gross_revenue'], reverse=True)
            
            return network_analytics
            
        except Exception as e:
            logger.error(f"Error getting network revenue analytics: {e}")
            raise
    
    # Payout Management
    async def generate_payout_report(self, barber_id: int, start_date: date, end_date: date) -> Dict[str, Any]:
        """Generate detailed payout report for barber"""
        try:
            payout = await self.calculate_barber_commission(barber_id, start_date, end_date)
            barber = self.db.query(Barber).filter(Barber.id == barber_id).first()
            
            # Get detailed appointment breakdown
            appointments = self.db.query(Appointment).filter(
                and_(
                    Appointment.barber_id == barber_id,
                    Appointment.appointment_date >= start_date,
                    Appointment.appointment_date <= end_date,
                    Appointment.status == 'completed'
                )
            ).all()
            
            appointment_details = []
            for appointment in appointments:
                appointment_details.append({
                    'date': appointment.appointment_date.isoformat(),
                    'client_name': appointment.client_name,
                    'service': appointment.service_name,
                    'service_revenue': float(appointment.service_revenue or 0),
                    'tip_amount': float(appointment.tip_amount or 0),
                    'product_revenue': float(appointment.product_revenue or 0)
                })
            
            report = {
                'barber_info': {
                    'id': barber.id,
                    'name': f"{barber.first_name} {barber.last_name}",
                    'email': barber.email,
                    'certification_level': self._get_barber_certification_level(barber_id),
                    'location': barber.location.name if barber.location else 'No Location'
                },
                'period': {
                    'start': start_date.isoformat(),
                    'end': end_date.isoformat()
                },
                'summary': {
                    'gross_revenue': float(payout.gross_revenue),
                    'base_commission': float(payout.base_commission),
                    'certification_bonus': float(payout.certification_bonus),
                    'performance_bonus': float(payout.performance_bonus),
                    'total_commission': float(payout.total_commission),
                    'franchise_fee': float(payout.franchise_fee),
                    'tax_withholding': float(payout.tax_withholding),
                    'final_payout': float(payout.final_payout)
                },
                'commission_structure': {
                    'certification_level': self._get_barber_certification_level(barber_id),
                    'base_percentage': self.commission_structures[self._get_barber_certification_level(barber_id)].base_percentage,
                    'certification_bonus_percentage': self.commission_structures[self._get_barber_certification_level(barber_id)].certification_bonus,
                    'franchise_fee_percentage': self.commission_structures[self._get_barber_certification_level(barber_id)].franchise_fee
                },
                'appointment_details': appointment_details,
                'statistics': {
                    'total_appointments': len(appointments),
                    'average_ticket': float(payout.gross_revenue / len(appointments)) if appointments else 0,
                    'days_worked': len(set(a.appointment_date for a in appointments))
                }
            }
            
            return report
            
        except Exception as e:
            logger.error(f"Error generating payout report for barber {barber_id}: {e}")
            raise
    
    async def process_bulk_payouts(self, location_id: Optional[int] = None, 
                                 start_date: Optional[date] = None, 
                                 end_date: Optional[date] = None) -> Dict[str, Any]:
        """Process bulk payouts for location or entire network"""
        try:
            # Set default dates (previous month)
            if not end_date:
                end_date = date.today().replace(day=1) - timedelta(days=1)  # Last day of previous month
            if not start_date:
                start_date = end_date.replace(day=1)  # First day of previous month
            
            # Get barbers to process
            if location_id:
                barbers = self.db.query(Barber).filter(Barber.location_id == location_id).all()
            else:
                barbers = self.db.query(Barber).all()
            
            payout_results = {
                'period': {
                    'start': start_date.isoformat(),
                    'end': end_date.isoformat()
                },
                'processed_count': 0,
                'total_amount': 0.0,
                'barber_payouts': [],
                'errors': []
            }
            
            for barber in barbers:
                try:
                    payout = await self.calculate_barber_commission(barber.id, start_date, end_date)
                    
                    if payout.final_payout > Decimal('0.00'):
                        payout_data = {
                            'barber_id': barber.id,
                            'name': f"{barber.first_name} {barber.last_name}",
                            'email': barber.email,
                            'amount': float(payout.final_payout),
                            'status': 'calculated'  # In real system, would process payment
                        }
                        
                        payout_results['barber_payouts'].append(payout_data)
                        payout_results['processed_count'] += 1
                        payout_results['total_amount'] += float(payout.final_payout)
                
                except Exception as e:
                    payout_results['errors'].append({
                        'barber_id': barber.id,
                        'name': f"{barber.first_name} {barber.last_name}",
                        'error': str(e)
                    })
            
            return payout_results
            
        except Exception as e:
            logger.error(f"Error processing bulk payouts: {e}")
            raise

# Convenience function for API endpoints
async def get_revenue_management_service() -> RevenueManagementService:
    """Get revenue management service instance"""
    db = next(get_db())
    return RevenueManagementService(db)
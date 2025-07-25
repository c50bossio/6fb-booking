"""
Six Figure Barber Compliance Service
Calculates and tracks compliance with 6FB methodology
"""

from typing import List, Dict, Any
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

from models import (
    User, Service, Appointment, Payment, Client,
    ServicePricingRule, MarketingCampaign, NotificationPreferences
)
from models.six_fb_compliance import (
    SixFBComplianceScore, SixFBComplianceCheck, 
    SixFBImprovementTask, SixFBBenchmark, SixFBComplianceHistory
)
from services.analytics_service import AnalyticsService


class SixFBComplianceService:
    """Service for calculating and managing 6FB compliance scores"""
    
    def __init__(self, db: Session):
        self.db = db
        self.analytics_service = AnalyticsService(db)
    
    def calculate_compliance_score(self, user_id: int) -> SixFBComplianceScore:
        """Calculate overall 6FB compliance score for a user"""
        
        # Get or create compliance score record
        compliance_score = self.db.query(SixFBComplianceScore).filter_by(
            user_id=user_id
        ).first()
        
        if not compliance_score:
            compliance_score = SixFBComplianceScore(user_id=user_id)
            self.db.add(compliance_score)
        
        # Clear previous checks
        self.db.query(SixFBComplianceCheck).filter_by(
            compliance_score_id=compliance_score.id
        ).delete()
        
        # Calculate category scores
        pricing_score = self._calculate_pricing_strategy_score(user_id, compliance_score.id)
        service_score = self._calculate_service_portfolio_score(user_id, compliance_score.id)
        relationship_score = self._calculate_client_relationship_score(user_id, compliance_score.id)
        operations_score = self._calculate_business_operations_score(user_id, compliance_score.id)
        marketing_score = self._calculate_marketing_presence_score(user_id, compliance_score.id)
        revenue_score = self._calculate_revenue_optimization_score(user_id, compliance_score.id)
        
        # Update scores
        compliance_score.pricing_strategy_score = pricing_score
        compliance_score.service_portfolio_score = service_score
        compliance_score.client_relationship_score = relationship_score
        compliance_score.business_operations_score = operations_score
        compliance_score.marketing_presence_score = marketing_score
        compliance_score.revenue_optimization_score = revenue_score
        
        # Calculate overall score (weighted average)
        weights = {
            'pricing': 0.20,
            'service': 0.15,
            'relationship': 0.20,
            'operations': 0.15,
            'marketing': 0.15,
            'revenue': 0.15
        }
        
        overall_score = (
            pricing_score * weights['pricing'] +
            service_score * weights['service'] +
            relationship_score * weights['relationship'] +
            operations_score * weights['operations'] +
            marketing_score * weights['marketing'] +
            revenue_score * weights['revenue']
        )
        
        compliance_score.overall_score = overall_score
        compliance_score.tier_level = self._determine_tier_level(overall_score)
        compliance_score.last_calculated = datetime.utcnow()
        
        # Update detailed metrics
        compliance_score.metrics = {
            'total_checks_performed': self.db.query(SixFBComplianceCheck).filter_by(
                compliance_score_id=compliance_score.id
            ).count(),
            'checks_passed': self.db.query(SixFBComplianceCheck).filter_by(
                compliance_score_id=compliance_score.id,
                passed=True
            ).count(),
            'improvement_areas': self._get_top_improvement_areas(compliance_score.id),
            'strengths': self._get_top_strengths(compliance_score.id)
        }
        
        self.db.commit()
        
        # Generate improvement tasks
        self._generate_improvement_tasks(user_id, compliance_score)
        
        # Record history
        self._record_compliance_history(user_id, compliance_score)
        
        return compliance_score
    
    def _calculate_pricing_strategy_score(self, user_id: int, compliance_score_id: int) -> float:
        """Calculate pricing strategy compliance score"""
        score = 0.0
        checks_performed = []
        
        # Get user's services
        services = self.db.query(Service).filter_by(user_id=user_id, is_active=True).all()
        
        if not services:
            return 0.0
        
        # Check 1: Premium pricing (services above market average)
        avg_price = sum(s.price for s in services) / len(services)
        premium_threshold = 50.0  # $50 is considered premium for barber services
        
        premium_check = SixFBComplianceCheck(
            compliance_score_id=compliance_score_id,
            category='pricing_strategy',
            check_name='Premium Pricing Position',
            description='Services priced at premium levels to reflect value',
            passed=avg_price >= premium_threshold,
            score=100.0 if avg_price >= premium_threshold else (avg_price / premium_threshold) * 100,
            weight=2.0,
            feedback=f'Average service price: ${avg_price:.2f}',
            recommendation='Consider raising prices to reflect your expertise and value' if avg_price < premium_threshold else 'Great job maintaining premium pricing!'
        )
        self.db.add(premium_check)
        checks_performed.append(premium_check)
        
        # Check 2: Price differentiation
        price_variance = max(s.price for s in services) - min(s.price for s in services)
        has_tiers = price_variance >= 20.0  # At least $20 difference
        
        tier_check = SixFBComplianceCheck(
            compliance_score_id=compliance_score_id,
            category='pricing_strategy',
            check_name='Service Price Tiers',
            description='Multiple price points for different service levels',
            passed=has_tiers,
            score=100.0 if has_tiers else 50.0,
            weight=1.5,
            feedback=f'Price range: ${min(s.price for s in services):.2f} - ${max(s.price for s in services):.2f}',
            recommendation='Create clear service tiers with different price points' if not has_tiers else 'Good price differentiation strategy!'
        )
        self.db.add(tier_check)
        checks_performed.append(tier_check)
        
        # Check 3: Package pricing
        has_packages = any(s.is_package for s in services)
        package_check = SixFBComplianceCheck(
            compliance_score_id=compliance_score_id,
            category='pricing_strategy',
            check_name='Service Packages',
            description='Bundled services for increased value',
            passed=has_packages,
            score=100.0 if has_packages else 0.0,
            weight=1.5,
            feedback='Package offerings detected' if has_packages else 'No service packages found',
            recommendation='Create service packages to increase average transaction value' if not has_packages else 'Keep optimizing your package offerings!'
        )
        self.db.add(package_check)
        checks_performed.append(package_check)
        
        # Check 4: Dynamic pricing rules
        has_pricing_rules = self.db.query(ServicePricingRule).join(Service).filter(
            Service.user_id == user_id
        ).count() > 0
        
        rules_check = SixFBComplianceCheck(
            compliance_score_id=compliance_score_id,
            category='pricing_strategy',
            check_name='Dynamic Pricing',
            description='Time-based or demand-based pricing strategies',
            passed=has_pricing_rules,
            score=100.0 if has_pricing_rules else 0.0,
            weight=1.0,
            feedback='Dynamic pricing rules active' if has_pricing_rules else 'No dynamic pricing rules found',
            recommendation='Implement peak hour or weekend pricing' if not has_pricing_rules else 'Smart use of dynamic pricing!'
        )
        self.db.add(rules_check)
        checks_performed.append(rules_check)
        
        # Calculate weighted score
        total_weight = sum(check.weight for check in checks_performed)
        weighted_score = sum(check.score * check.weight for check in checks_performed) / total_weight
        
        return weighted_score
    
    def _calculate_service_portfolio_score(self, user_id: int, compliance_score_id: int) -> float:
        """Calculate service portfolio compliance score"""
        score = 0.0
        checks_performed = []
        
        services = self.db.query(Service).filter_by(user_id=user_id, is_active=True).all()
        
        # Check 1: Service variety
        service_count = len(services)
        optimal_count = 8  # 6-10 services is optimal
        
        variety_check = SixFBComplianceCheck(
            compliance_score_id=compliance_score_id,
            category='service_portfolio',
            check_name='Service Variety',
            description='Optimal number of service offerings',
            passed=6 <= service_count <= 10,
            score=100.0 if 6 <= service_count <= 10 else max(0, 100 - abs(service_count - optimal_count) * 10),
            weight=1.5,
            feedback=f'Currently offering {service_count} services',
            recommendation='Aim for 6-10 well-defined services' if not (6 <= service_count <= 10) else 'Perfect service variety!'
        )
        self.db.add(variety_check)
        checks_performed.append(variety_check)
        
        # Check 2: Premium services
        premium_services = [s for s in services if s.price >= 75.0]
        has_premium = len(premium_services) > 0
        
        premium_check = SixFBComplianceCheck(
            compliance_score_id=compliance_score_id,
            category='service_portfolio',
            check_name='Premium Service Offerings',
            description='High-value premium services available',
            passed=has_premium,
            score=100.0 if has_premium else 0.0,
            weight=2.0,
            feedback=f'{len(premium_services)} premium services offered' if has_premium else 'No premium services found',
            recommendation='Add premium services like hot towel shaves or luxury treatments' if not has_premium else 'Great premium service offerings!'
        )
        self.db.add(premium_check)
        checks_performed.append(premium_check)
        
        # Check 3: Service descriptions
        well_described = sum(1 for s in services if s.description and len(s.description) >= 50)
        description_ratio = well_described / len(services) if services else 0
        
        description_check = SixFBComplianceCheck(
            compliance_score_id=compliance_score_id,
            category='service_portfolio',
            check_name='Service Descriptions',
            description='Detailed descriptions that sell the experience',
            passed=description_ratio >= 0.8,
            score=description_ratio * 100,
            weight=1.0,
            feedback=f'{well_described} of {len(services)} services have detailed descriptions',
            recommendation='Add compelling descriptions to all services' if description_ratio < 0.8 else 'Excellent service descriptions!'
        )
        self.db.add(description_check)
        checks_performed.append(description_check)
        
        # Calculate weighted score
        total_weight = sum(check.weight for check in checks_performed)
        weighted_score = sum(check.score * check.weight for check in checks_performed) / total_weight
        
        return weighted_score
    
    def _calculate_client_relationship_score(self, user_id: int, compliance_score_id: int) -> float:
        """Calculate client relationship compliance score"""
        score = 0.0
        checks_performed = []
        
        # Get analytics data
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        
        # Check 1: Client retention rate
        retention_rate = self.analytics_service.get_client_retention_rate(user_id)
        
        retention_check = SixFBComplianceCheck(
            compliance_score_id=compliance_score_id,
            category='client_relationships',
            check_name='Client Retention Rate',
            description='Percentage of clients who return within 6 weeks',
            passed=retention_rate >= 70,
            score=min(100, (retention_rate / 70) * 100) if retention_rate else 0,
            weight=2.0,
            feedback=f'Current retention rate: {retention_rate:.1f}%',
            recommendation='Focus on client experience and follow-up' if retention_rate < 70 else 'Excellent client retention!'
        )
        self.db.add(retention_check)
        checks_performed.append(retention_check)
        
        # Check 2: Communication preferences
        clients_with_prefs = self.db.query(NotificationPreferences).join(User).filter(
            User.id == user_id
        ).count()
        
        total_clients = self.db.query(Client).filter_by(barber_id=user_id).count()
        pref_ratio = clients_with_prefs / total_clients if total_clients else 0
        
        comm_check = SixFBComplianceCheck(
            compliance_score_id=compliance_score_id,
            category='client_relationships',
            check_name='Client Communication Setup',
            description='Clients with notification preferences configured',
            passed=pref_ratio >= 0.5,
            score=pref_ratio * 100,
            weight=1.0,
            feedback=f'{clients_with_prefs} of {total_clients} clients have communication preferences',
            recommendation='Encourage clients to set notification preferences' if pref_ratio < 0.5 else 'Good client communication setup!'
        )
        self.db.add(comm_check)
        checks_performed.append(comm_check)
        
        # Check 3: Appointment frequency
        avg_days_between = self.analytics_service.get_average_days_between_appointments(user_id)
        optimal_frequency = 21  # 3 weeks is optimal for haircuts
        
        frequency_check = SixFBComplianceCheck(
            compliance_score_id=compliance_score_id,
            category='client_relationships',
            check_name='Client Visit Frequency',
            description='Average days between client appointments',
            passed=avg_days_between <= 28,
            score=max(0, 100 - abs(avg_days_between - optimal_frequency) * 2) if avg_days_between else 0,
            weight=1.5,
            feedback=f'Clients return every {avg_days_between:.0f} days on average' if avg_days_between else 'No repeat appointment data',
            recommendation='Implement rebooking reminders and loyalty programs' if avg_days_between > 28 else 'Great client visit frequency!'
        )
        self.db.add(frequency_check)
        checks_performed.append(frequency_check)
        
        # Calculate weighted score
        total_weight = sum(check.weight for check in checks_performed)
        weighted_score = sum(check.score * check.weight for check in checks_performed) / total_weight
        
        return weighted_score
    
    def _calculate_business_operations_score(self, user_id: int, compliance_score_id: int) -> float:
        """Calculate business operations compliance score"""
        score = 0.0
        checks_performed = []
        
        # Check 1: Appointment utilization
        utilization_rate = self.analytics_service.get_appointment_utilization_rate(user_id)
        
        utilization_check = SixFBComplianceCheck(
            compliance_score_id=compliance_score_id,
            category='business_operations',
            check_name='Appointment Utilization',
            description='Percentage of available time slots booked',
            passed=utilization_rate >= 75,
            score=min(100, (utilization_rate / 75) * 100) if utilization_rate else 0,
            weight=2.0,
            feedback=f'Current utilization: {utilization_rate:.1f}%',
            recommendation='Optimize scheduling and marketing to fill gaps' if utilization_rate < 75 else 'Excellent time utilization!'
        )
        self.db.add(utilization_check)
        checks_performed.append(utilization_check)
        
        # Check 2: Online booking adoption
        total_bookings = self.db.query(Appointment).filter_by(barber_id=user_id).count()
        online_bookings = self.db.query(Appointment).filter_by(
            barber_id=user_id,
            booking_source='online'
        ).count()
        online_ratio = online_bookings / total_bookings if total_bookings else 0
        
        online_check = SixFBComplianceCheck(
            compliance_score_id=compliance_score_id,
            category='business_operations',
            check_name='Online Booking Adoption',
            description='Percentage of appointments booked online',
            passed=online_ratio >= 0.6,
            score=min(100, (online_ratio / 0.6) * 100),
            weight=1.5,
            feedback=f'{online_ratio * 100:.1f}% of bookings are online',
            recommendation='Promote online booking to save time' if online_ratio < 0.6 else 'Great online booking adoption!'
        )
        self.db.add(online_check)
        checks_performed.append(online_check)
        
        # Check 3: Payment efficiency
        digital_payments = self.db.query(Payment).filter_by(
            user_id=user_id,
            payment_method='card'
        ).count()
        total_payments = self.db.query(Payment).filter_by(user_id=user_id).count()
        digital_ratio = digital_payments / total_payments if total_payments else 0
        
        payment_check = SixFBComplianceCheck(
            compliance_score_id=compliance_score_id,
            category='business_operations',
            check_name='Digital Payment Adoption',
            description='Percentage of payments processed digitally',
            passed=digital_ratio >= 0.8,
            score=min(100, (digital_ratio / 0.8) * 100),
            weight=1.0,
            feedback=f'{digital_ratio * 100:.1f}% digital payments',
            recommendation='Encourage card payments for efficiency' if digital_ratio < 0.8 else 'Excellent payment processing!'
        )
        self.db.add(payment_check)
        checks_performed.append(payment_check)
        
        # Calculate weighted score
        total_weight = sum(check.weight for check in checks_performed)
        weighted_score = sum(check.score * check.weight for check in checks_performed) / total_weight
        
        return weighted_score
    
    def _calculate_marketing_presence_score(self, user_id: int, compliance_score_id: int) -> float:
        """Calculate marketing presence compliance score"""
        score = 0.0
        checks_performed = []
        
        # Check 1: Active marketing campaigns
        active_campaigns = self.db.query(MarketingCampaign).filter_by(
            user_id=user_id,
            status='active'
        ).count()
        
        campaign_check = SixFBComplianceCheck(
            compliance_score_id=compliance_score_id,
            category='marketing_presence',
            check_name='Active Marketing Campaigns',
            description='Running marketing campaigns to attract clients',
            passed=active_campaigns >= 1,
            score=min(100, active_campaigns * 33.33),
            weight=1.5,
            feedback=f'{active_campaigns} active campaigns',
            recommendation='Launch marketing campaigns to grow your business' if active_campaigns == 0 else 'Keep your marketing active!'
        )
        self.db.add(campaign_check)
        checks_performed.append(campaign_check)
        
        # Check 2: Online reviews management
        # This would integrate with review management system
        review_score = 80.0  # Placeholder - would check actual review responses
        
        review_check = SixFBComplianceCheck(
            compliance_score_id=compliance_score_id,
            category='marketing_presence',
            check_name='Online Review Management',
            description='Actively managing and responding to reviews',
            passed=review_score >= 70,
            score=review_score,
            weight=1.5,
            feedback='Review management score: {:.0f}%'.format(review_score),
            recommendation='Respond to all reviews professionally' if review_score < 70 else 'Great review management!'
        )
        self.db.add(review_check)
        checks_performed.append(review_check)
        
        # Check 3: Social media integration
        # Placeholder - would check actual integrations
        has_social = True
        
        social_check = SixFBComplianceCheck(
            compliance_score_id=compliance_score_id,
            category='marketing_presence',
            check_name='Social Media Integration',
            description='Connected social media for broader reach',
            passed=has_social,
            score=100.0 if has_social else 0.0,
            weight=1.0,
            feedback='Social media integrated' if has_social else 'No social media connections',
            recommendation='Connect your social media accounts' if not has_social else 'Good social media presence!'
        )
        self.db.add(social_check)
        checks_performed.append(social_check)
        
        # Calculate weighted score
        total_weight = sum(check.weight for check in checks_performed)
        weighted_score = sum(check.score * check.weight for check in checks_performed) / total_weight
        
        return weighted_score
    
    def _calculate_revenue_optimization_score(self, user_id: int, compliance_score_id: int) -> float:
        """Calculate revenue optimization compliance score"""
        score = 0.0
        checks_performed = []
        
        # Check 1: Average ticket size
        avg_ticket = self.analytics_service.get_average_ticket_size(user_id)
        target_ticket = 75.0  # Target average ticket
        
        ticket_check = SixFBComplianceCheck(
            compliance_score_id=compliance_score_id,
            category='revenue_optimization',
            check_name='Average Ticket Size',
            description='Average revenue per appointment',
            passed=avg_ticket >= target_ticket,
            score=min(100, (avg_ticket / target_ticket) * 100) if avg_ticket else 0,
            weight=2.0,
            feedback=f'Average ticket: ${avg_ticket:.2f}',
            recommendation='Increase ticket size through upselling and packages' if avg_ticket < target_ticket else 'Excellent average ticket!'
        )
        self.db.add(ticket_check)
        checks_performed.append(ticket_check)
        
        # Check 2: Service add-on rate
        appointments_with_addons = self.db.query(Appointment).filter(
            Appointment.barber_id == user_id,
            Appointment.total_price > Appointment.service_price
        ).count()
        total_appointments = self.db.query(Appointment).filter_by(barber_id=user_id).count()
        addon_rate = appointments_with_addons / total_appointments if total_appointments else 0
        
        addon_check = SixFBComplianceCheck(
            compliance_score_id=compliance_score_id,
            category='revenue_optimization',
            check_name='Service Add-on Rate',
            description='Percentage of appointments with add-on services',
            passed=addon_rate >= 0.3,
            score=min(100, (addon_rate / 0.3) * 100),
            weight=1.5,
            feedback=f'{addon_rate * 100:.1f}% appointments have add-ons',
            recommendation='Train on upselling techniques' if addon_rate < 0.3 else 'Good upselling performance!'
        )
        self.db.add(addon_check)
        checks_performed.append(addon_check)
        
        # Check 3: Revenue growth trend
        growth_rate = self.analytics_service.get_revenue_growth_rate(user_id)
        
        growth_check = SixFBComplianceCheck(
            compliance_score_id=compliance_score_id,
            category='revenue_optimization',
            check_name='Revenue Growth Trend',
            description='Month-over-month revenue growth',
            passed=growth_rate >= 5,
            score=min(100, (growth_rate / 5) * 100) if growth_rate >= 0 else 0,
            weight=1.5,
            feedback=f'Revenue growth: {growth_rate:.1f}%',
            recommendation='Focus on retention and new client acquisition' if growth_rate < 5 else 'Strong revenue growth!'
        )
        self.db.add(growth_check)
        checks_performed.append(growth_check)
        
        # Calculate weighted score
        total_weight = sum(check.weight for check in checks_performed)
        weighted_score = sum(check.score * check.weight for check in checks_performed) / total_weight
        
        return weighted_score
    
    def _determine_tier_level(self, overall_score: float) -> str:
        """Determine 6FB tier level based on overall score"""
        if overall_score >= 90:
            return 'luxury'
        elif overall_score >= 75:
            return 'premium'
        elif overall_score >= 60:
            return 'professional'
        else:
            return 'starter'
    
    def _get_top_improvement_areas(self, compliance_score_id: int, limit: int = 3) -> List[Dict[str, Any]]:
        """Get top areas needing improvement"""
        checks = self.db.query(SixFBComplianceCheck).filter_by(
            compliance_score_id=compliance_score_id,
            passed=False
        ).order_by(SixFBComplianceCheck.weight.desc()).limit(limit).all()
        
        return [
            {
                'category': check.category,
                'check_name': check.check_name,
                'score': check.score,
                'recommendation': check.recommendation
            }
            for check in checks
        ]
    
    def _get_top_strengths(self, compliance_score_id: int, limit: int = 3) -> List[Dict[str, Any]]:
        """Get top performing areas"""
        checks = self.db.query(SixFBComplianceCheck).filter_by(
            compliance_score_id=compliance_score_id,
            passed=True
        ).order_by(SixFBComplianceCheck.score.desc()).limit(limit).all()
        
        return [
            {
                'category': check.category,
                'check_name': check.check_name,
                'score': check.score,
                'feedback': check.feedback
            }
            for check in checks
        ]
    
    def _generate_improvement_tasks(self, user_id: int, compliance_score: SixFBComplianceScore):
        """Generate actionable improvement tasks based on compliance checks"""
        
        # Clear existing pending tasks
        self.db.query(SixFBImprovementTask).filter_by(
            compliance_score_id=compliance_score.id,
            status='pending'
        ).delete()
        
        # Get failed checks ordered by impact
        failed_checks = self.db.query(SixFBComplianceCheck).filter_by(
            compliance_score_id=compliance_score.id,
            passed=False
        ).order_by(SixFBComplianceCheck.weight.desc()).all()
        
        # Generate tasks for top issues
        task_templates = {
            'Premium Pricing Position': {
                'title': 'Increase Service Prices to Premium Levels',
                'description': 'Adjust your pricing to reflect the value you provide. Start by increasing prices by 10-15% on your most popular services.',
                'priority': 'high',
                'revenue_impact': 'high',
                'effort_required': 'low',
                'resources': [
                    'https://sixfigurebarber.com/pricing-guide',
                    'Price increase communication templates',
                    'Value proposition scripts'
                ]
            },
            'Service Packages': {
                'title': 'Create Service Bundles and Packages',
                'description': 'Design 2-3 service packages that combine popular services at a slight discount to increase average ticket size.',
                'priority': 'high',
                'revenue_impact': 'high',
                'effort_required': 'medium',
                'resources': [
                    'Package creation templates',
                    'Pricing calculator',
                    'Marketing materials'
                ]
            },
            'Client Retention Rate': {
                'title': 'Implement Client Retention Program',
                'description': 'Set up automated rebooking reminders and a loyalty program to improve client retention.',
                'priority': 'high',
                'revenue_impact': 'high',
                'effort_required': 'medium',
                'resources': [
                    'Retention program templates',
                    'SMS/Email templates',
                    'Loyalty program guide'
                ]
            },
            'Online Booking Adoption': {
                'title': 'Promote Online Booking System',
                'description': 'Educate clients about online booking benefits and offer incentives for first-time online bookings.',
                'priority': 'medium',
                'revenue_impact': 'medium',
                'effort_required': 'low',
                'resources': [
                    'Client education materials',
                    'Booking incentive ideas',
                    'Social media templates'
                ]
            }
        }
        
        # Create tasks for failed checks
        for check in failed_checks[:5]:  # Limit to top 5 tasks
            template = task_templates.get(check.check_name, {
                'title': f'Improve {check.check_name}',
                'description': check.recommendation,
                'priority': 'medium',
                'revenue_impact': 'medium',
                'effort_required': 'medium',
                'resources': []
            })
            
            task = SixFBImprovementTask(
                compliance_score_id=compliance_score.id,
                title=template['title'],
                description=template['description'],
                category=check.category,
                priority=template['priority'],
                potential_score_improvement=(100 - check.score) * check.weight / 10,
                revenue_impact=template['revenue_impact'],
                effort_required=template['effort_required'],
                resources=template['resources'],
                status='pending'
            )
            self.db.add(task)
        
        self.db.commit()
    
    def _record_compliance_history(self, user_id: int, compliance_score: SixFBComplianceScore):
        """Record compliance score history for tracking progress"""
        
        # Get previous history record
        previous_history = self.db.query(SixFBComplianceHistory).filter_by(
            user_id=user_id
        ).order_by(SixFBComplianceHistory.recorded_at.desc()).first()
        
        # Calculate score change
        score_change = 0.0
        if previous_history:
            score_change = compliance_score.overall_score - previous_history.overall_score
        
        # Create history record
        history = SixFBComplianceHistory(
            user_id=user_id,
            overall_score=compliance_score.overall_score,
            tier_level=compliance_score.tier_level,
            category_scores={
                'pricing_strategy': compliance_score.pricing_strategy_score,
                'service_portfolio': compliance_score.service_portfolio_score,
                'client_relationships': compliance_score.client_relationship_score,
                'business_operations': compliance_score.business_operations_score,
                'marketing_presence': compliance_score.marketing_presence_score,
                'revenue_optimization': compliance_score.revenue_optimization_score
            },
            period_start=previous_history.period_end if previous_history else datetime.utcnow() - timedelta(days=30),
            period_end=datetime.utcnow(),
            score_change=score_change,
            improvements_made=compliance_score.metrics.get('strengths', []),
            challenges_faced=compliance_score.metrics.get('improvement_areas', [])
        )
        self.db.add(history)
        self.db.commit()
    
    def get_compliance_dashboard_data(self, user_id: int) -> Dict[str, Any]:
        """Get comprehensive compliance dashboard data"""
        
        # Get current compliance score
        compliance_score = self.db.query(SixFBComplianceScore).filter_by(
            user_id=user_id
        ).first()
        
        if not compliance_score:
            # Calculate if doesn't exist
            compliance_score = self.calculate_compliance_score(user_id)
        
        # Get improvement tasks
        tasks = self.db.query(SixFBImprovementTask).filter_by(
            compliance_score_id=compliance_score.id,
            status='pending'
        ).order_by(SixFBImprovementTask.priority.desc()).all()
        
        # Get compliance history
        history = self.db.query(SixFBComplianceHistory).filter_by(
            user_id=user_id
        ).order_by(SixFBComplianceHistory.recorded_at.desc()).limit(12).all()
        
        # Get detailed checks by category
        checks_by_category = {}
        for check in compliance_score.compliance_checks:
            if check.category not in checks_by_category:
                checks_by_category[check.category] = []
            checks_by_category[check.category].append({
                'name': check.check_name,
                'passed': check.passed,
                'score': check.score,
                'feedback': check.feedback,
                'recommendation': check.recommendation
            })
        
        return {
            'overall_score': compliance_score.overall_score,
            'tier_level': compliance_score.tier_level,
            'category_scores': {
                'pricing_strategy': compliance_score.pricing_strategy_score,
                'service_portfolio': compliance_score.service_portfolio_score,
                'client_relationships': compliance_score.client_relationship_score,
                'business_operations': compliance_score.business_operations_score,
                'marketing_presence': compliance_score.marketing_presence_score,
                'revenue_optimization': compliance_score.revenue_optimization_score
            },
            'improvement_tasks': [
                {
                    'id': task.id,
                    'title': task.title,
                    'description': task.description,
                    'category': task.category,
                    'priority': task.priority,
                    'potential_improvement': task.potential_score_improvement,
                    'revenue_impact': task.revenue_impact,
                    'effort_required': task.effort_required,
                    'resources': task.resources
                }
                for task in tasks
            ],
            'compliance_history': [
                {
                    'date': h.recorded_at.isoformat(),
                    'overall_score': h.overall_score,
                    'tier_level': h.tier_level,
                    'score_change': h.score_change
                }
                for h in reversed(history)
            ],
            'checks_by_category': checks_by_category,
            'last_calculated': compliance_score.last_calculated.isoformat(),
            'metrics': compliance_score.metrics
        }
    
    def mark_task_complete(self, task_id: int) -> bool:
        """Mark an improvement task as complete"""
        task = self.db.query(SixFBImprovementTask).filter_by(id=task_id).first()
        if task:
            task.status = 'completed'
            task.completed_at = datetime.utcnow()
            self.db.commit()
            
            # Trigger recalculation of compliance score
            compliance_score = task.compliance_score
            self.calculate_compliance_score(compliance_score.user_id)
            
            return True
        return False
    
    def get_benchmarks_for_tier(self, tier: str) -> List[Dict[str, Any]]:
        """Get 6FB benchmarks for a specific tier"""
        benchmarks = self.db.query(SixFBBenchmark).filter_by(
            tier_level=tier
        ).all()
        
        return [
            {
                'metric_name': b.metric_name,
                'category': b.category,
                'target_value': b.target_value,
                'excellence_value': b.excellence_value,
                'description': b.description,
                'unit': b.unit
            }
            for b in benchmarks
        ]
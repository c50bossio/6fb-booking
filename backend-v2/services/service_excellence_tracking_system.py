"""
Service Delivery Excellence Tracking System for Six Figure Barber Methodology

This service implements comprehensive service delivery excellence tracking including:
- Real-time service quality monitoring
- Client satisfaction prediction and intervention
- Service time optimization for efficiency  
- Quality improvement recommendations
- Performance benchmarking and standards compliance

All features are designed to support the Six Figure Barber methodology's focus on
service delivery excellence and premium client experience.
"""

from datetime import datetime, date, timedelta, timezone
from typing import Dict, List, Optional, Any, Tuple
from decimal import Decimal
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_, desc, asc, text
import logging
from dataclasses import dataclass
import json
from enum import Enum
import statistics

from models import User, Appointment, Payment, Client, Service
from models.six_figure_barber_core import (
    SixFBServiceExcellenceMetrics, SixFBServiceStandards, SixFBClientValueProfile,
    ServiceExcellenceArea, SixFBPrinciple
)

logger = logging.getLogger(__name__)


def utcnow():
    """Helper function for UTC datetime"""
    return datetime.now(timezone.utc).replace(tzinfo=None)


class QualityScore(Enum):
    """Quality score ranges"""
    POOR = "poor"  # 0-59
    FAIR = "fair"  # 60-74
    GOOD = "good"  # 75-84
    EXCELLENT = "excellent"  # 85-94
    EXCEPTIONAL = "exceptional"  # 95-100


class InterventionLevel(Enum):
    """Intervention urgency levels"""
    NONE = "none"
    MONITORING = "monitoring"
    ATTENTION_NEEDED = "attention_needed"
    IMMEDIATE_ACTION = "immediate_action"
    CRITICAL = "critical"


class PerformanceTrend(Enum):
    """Performance trend directions"""
    DECLINING = "declining"
    STABLE = "stable"
    IMPROVING = "improving"
    FLUCTUATING = "fluctuating"


@dataclass
class ServiceQualityAlert:
    """Service quality alert"""
    alert_id: str
    appointment_id: int
    client_id: int
    service_date: date
    excellence_area: ServiceExcellenceArea
    current_score: float
    target_score: float
    variance: float
    severity: InterventionLevel
    description: str
    recommended_actions: List[str]
    estimated_impact: str
    timeline_for_action: str


@dataclass
class ClientSatisfactionPrediction:
    """Client satisfaction prediction"""
    client_id: int
    appointment_id: int
    predicted_satisfaction: float  # 0-100
    confidence_level: float  # 0-100
    risk_factors: List[str]
    protective_factors: List[str]
    intervention_recommendations: List[str]
    monitoring_priorities: List[str]


@dataclass
class ServiceOptimizationRecommendation:
    """Service optimization recommendation"""
    recommendation_id: str
    service_type: str
    optimization_area: str
    current_performance: float
    target_performance: float
    improvement_potential: float
    implementation_difficulty: str
    expected_timeline_weeks: int
    estimated_roi: Decimal
    success_probability: float


class ServiceExcellenceTrackingSystem:
    """
    Comprehensive service excellence tracking system implementing real-time
    monitoring, predictive analytics, and continuous improvement for the
    Six Figure Barber methodology.
    """

    def __init__(self, db: Session):
        self.db = db

    # ============================================================================
    # REAL-TIME SERVICE QUALITY MONITORING
    # ============================================================================

    def monitor_real_time_service_quality(self, user_id: int, appointment_id: int,
                                         quality_assessments: Dict[ServiceExcellenceArea, float]) -> Dict[str, Any]:
        """
        Real-time monitoring of service quality during appointments with
        immediate feedback and intervention triggers.
        """
        logger.info(f"Monitoring real-time service quality for appointment {appointment_id}")

        appointment = self.db.query(Appointment).filter(Appointment.id == appointment_id).first()
        if not appointment:
            raise ValueError(f"Appointment {appointment_id} not found")

        # Store quality assessments
        quality_metrics = []
        alerts_generated = []
        
        for area, score in quality_assessments.items():
            # Create quality metric record
            metric = SixFBServiceExcellenceMetrics(
                user_id=user_id,
                appointment_id=appointment_id,
                client_id=appointment.client_id,
                service_date=appointment.datetime.date(),
                excellence_area=area,
                score=score,
                target_score=85,  # Six Figure Barber standard
                variance=score - 85
            )
            
            # Add real-time assessment details
            metric.assessment_method = "real_time_monitoring"
            metric.premium_positioning_score = self._calculate_real_time_premium_score(appointment, score)
            metric.brand_consistency_score = self._calculate_brand_consistency_score(appointment, score)
            metric.value_demonstration_score = self._calculate_value_demonstration_score(appointment, score)
            
            self.db.add(metric)
            quality_metrics.append(metric)
            
            # Check for quality alerts
            alert = self._check_quality_alert_triggers(appointment, area, score)
            if alert:
                alerts_generated.append(alert)

        # Calculate overall service quality score
        overall_score = sum(quality_assessments.values()) / len(quality_assessments)
        
        # Generate real-time insights
        real_time_insights = self._generate_real_time_insights(
            appointment, quality_assessments, overall_score
        )
        
        # Trigger interventions if needed
        interventions_triggered = self._trigger_real_time_interventions(
            user_id, appointment, alerts_generated, overall_score
        )

        self.db.commit()

        return {
            'appointment_id': appointment_id,
            'overall_quality_score': overall_score,
            'area_scores': {area.value: score for area, score in quality_assessments.items()},
            'quality_level': self._determine_quality_level(overall_score).value,
            'alerts_generated': [alert.__dict__ for alert in alerts_generated],
            'real_time_insights': real_time_insights,
            'interventions_triggered': interventions_triggered,
            'meets_sfb_standards': overall_score >= 85,
            'improvement_recommendations': self._generate_immediate_improvements(quality_assessments),
            'client_experience_impact': self._assess_client_experience_impact(overall_score, alerts_generated)
        }

    def track_service_consistency(self, user_id: int, time_period_days: int = 30) -> Dict[str, Any]:
        """
        Track service consistency across time periods to identify patterns
        and ensure reliable quality delivery.
        """
        logger.info(f"Tracking service consistency for user {user_id} over {time_period_days} days")

        end_date = date.today()
        start_date = end_date - timedelta(days=time_period_days)

        # Get service excellence metrics for period
        metrics = self.db.query(SixFBServiceExcellenceMetrics).filter(
            and_(
                SixFBServiceExcellenceMetrics.user_id == user_id,
                SixFBServiceExcellenceMetrics.service_date >= start_date,
                SixFBServiceExcellenceMetrics.service_date <= end_date
            )
        ).all()

        if not metrics:
            return {'message': 'No service quality data found for the specified period'}

        # Analyze consistency by excellence area
        consistency_analysis = {}
        for area in ServiceExcellenceArea:
            area_metrics = [m for m in metrics if m.excellence_area == area]
            if area_metrics:
                scores = [m.score for m in area_metrics]
                consistency_analysis[area.value] = {
                    'average_score': statistics.mean(scores),
                    'score_variance': statistics.variance(scores) if len(scores) > 1 else 0,
                    'consistency_rating': self._calculate_consistency_rating(scores),
                    'trend': self._calculate_score_trend(area_metrics),
                    'total_assessments': len(scores),
                    'meets_standard_rate': len([s for s in scores if s >= 85]) / len(scores) * 100
                }

        # Calculate overall consistency score
        overall_consistency = self._calculate_overall_consistency(consistency_analysis)
        
        # Identify consistency issues
        consistency_issues = self._identify_consistency_issues(consistency_analysis)
        
        # Generate improvement recommendations
        consistency_improvements = self._generate_consistency_improvements(
            consistency_analysis, consistency_issues
        )

        # Calculate performance trends
        performance_trends = self._analyze_performance_trends(metrics, time_period_days)

        return {
            'user_id': user_id,
            'analysis_period_days': time_period_days,
            'total_assessments': len(metrics),
            'overall_consistency_score': overall_consistency,
            'consistency_analysis': consistency_analysis,
            'consistency_issues': consistency_issues,
            'performance_trends': performance_trends,
            'improvement_recommendations': consistency_improvements,
            'quality_benchmark_comparison': self._compare_to_quality_benchmarks(consistency_analysis),
            'action_priorities': self._prioritize_consistency_actions(consistency_issues)
        }

    # ============================================================================
    # CLIENT SATISFACTION PREDICTION AND INTERVENTION
    # ============================================================================

    def predict_client_satisfaction(self, user_id: int, appointment_id: int) -> Dict[str, Any]:
        """
        Use AI/ML to predict client satisfaction and trigger proactive interventions
        before service completion to ensure optimal client experience.
        """
        logger.info(f"Predicting client satisfaction for appointment {appointment_id}")

        appointment = self.db.query(Appointment).filter(Appointment.id == appointment_id).first()
        if not appointment:
            raise ValueError(f"Appointment {appointment_id} not found")

        # Get client profile and history
        client_profile = self.db.query(SixFBClientValueProfile).filter(
            and_(
                SixFBClientValueProfile.user_id == user_id,
                SixFBClientValueProfile.client_id == appointment.client_id
            )
        ).first()

        # Get historical service quality data
        historical_metrics = self.db.query(SixFBServiceExcellenceMetrics).filter(
            and_(
                SixFBServiceExcellenceMetrics.user_id == user_id,
                SixFBServiceExcellenceMetrics.client_id == appointment.client_id
            )
        ).order_by(desc(SixFBServiceExcellenceMetrics.service_date)).limit(10).all()

        # Run satisfaction prediction model
        prediction_model_input = self._prepare_satisfaction_prediction_input(
            appointment, client_profile, historical_metrics
        )
        
        satisfaction_prediction = self._run_satisfaction_prediction_model(prediction_model_input)
        
        # Identify risk and protective factors
        risk_analysis = self._analyze_satisfaction_risk_factors(
            satisfaction_prediction, appointment, client_profile
        )
        
        # Generate intervention recommendations
        intervention_recommendations = self._generate_satisfaction_interventions(
            satisfaction_prediction, risk_analysis
        )
        
        # Create monitoring plan
        monitoring_plan = self._create_satisfaction_monitoring_plan(
            appointment, satisfaction_prediction, risk_analysis
        )

        # Store prediction for tracking accuracy
        prediction_record = self._store_satisfaction_prediction(
            user_id, appointment_id, satisfaction_prediction
        )

        return {
            'appointment_id': appointment_id,
            'client_id': appointment.client_id,
            'predicted_satisfaction': satisfaction_prediction.predicted_satisfaction,
            'confidence_level': satisfaction_prediction.confidence_level,
            'satisfaction_category': self._categorize_satisfaction_level(satisfaction_prediction.predicted_satisfaction),
            'risk_factors': satisfaction_prediction.risk_factors,
            'protective_factors': satisfaction_prediction.protective_factors,
            'intervention_recommendations': intervention_recommendations,
            'monitoring_plan': monitoring_plan,
            'requires_immediate_attention': satisfaction_prediction.predicted_satisfaction < 70,
            'model_accuracy_metrics': self._get_prediction_model_accuracy(user_id)
        }

    def implement_proactive_interventions(self, user_id: int, appointment_id: int,
                                        intervention_type: str) -> Dict[str, Any]:
        """
        Implement proactive interventions based on satisfaction predictions
        to prevent negative experiences and enhance client satisfaction.
        """
        logger.info(f"Implementing proactive intervention for appointment {appointment_id}")

        appointment = self.db.query(Appointment).filter(Appointment.id == appointment_id).first()
        if not appointment:
            raise ValueError(f"Appointment {appointment_id} not found")

        # Get current satisfaction prediction
        prediction_data = self._get_current_satisfaction_prediction(appointment_id)
        
        # Execute intervention based on type
        intervention_results = self._execute_satisfaction_intervention(
            user_id, appointment, intervention_type, prediction_data
        )
        
        # Monitor intervention effectiveness
        effectiveness_tracking = self._setup_intervention_tracking(
            appointment_id, intervention_type, intervention_results
        )
        
        # Update satisfaction prediction post-intervention
        updated_prediction = self._update_satisfaction_prediction_post_intervention(
            appointment_id, intervention_results
        )

        # Log intervention for learning
        intervention_log = self._log_intervention_for_ml_learning(
            user_id, appointment_id, intervention_type, intervention_results
        )

        return {
            'appointment_id': appointment_id,
            'intervention_type': intervention_type,
            'intervention_executed': True,
            'intervention_results': intervention_results,
            'effectiveness_tracking': effectiveness_tracking,
            'updated_satisfaction_prediction': updated_prediction,
            'estimated_satisfaction_improvement': updated_prediction - prediction_data.get('predicted_satisfaction', 0),
            'success_probability': intervention_results.get('success_probability', 0),
            'next_monitoring_checkpoint': self._schedule_next_monitoring_checkpoint(appointment_id)
        }

    # ============================================================================
    # SERVICE TIME OPTIMIZATION
    # ============================================================================

    def optimize_service_time_efficiency(self, user_id: int, service_type: str = None) -> Dict[str, Any]:
        """
        Optimize service time efficiency while maintaining quality standards
        using data analysis and Six Figure Barber methodology principles.
        """
        logger.info(f"Optimizing service time efficiency for user {user_id}")

        # Get appointment data for analysis
        query = self.db.query(Appointment).filter(
            and_(
                Appointment.barber_id == user_id,
                Appointment.status == "completed",
                Appointment.datetime >= datetime.now() - timedelta(days=90)
            )
        )
        
        if service_type:
            query = query.filter(Appointment.service_type == service_type)
        
        appointments = query.all()

        if not appointments:
            return {'message': 'No completed appointments found for analysis'}

        # Analyze current time efficiency
        time_analysis = self._analyze_service_time_patterns(appointments)
        
        # Identify efficiency opportunities
        efficiency_opportunities = self._identify_time_efficiency_opportunities(
            appointments, time_analysis
        )
        
        # Generate optimization recommendations
        optimization_recommendations = self._generate_time_optimization_recommendations(
            time_analysis, efficiency_opportunities
        )
        
        # Calculate potential impact
        impact_analysis = self._calculate_time_optimization_impact(
            appointments, optimization_recommendations
        )
        
        # Create implementation plan
        implementation_plan = self._create_time_optimization_implementation_plan(
            optimization_recommendations, impact_analysis
        )

        # Benchmark against industry standards
        benchmark_comparison = self._compare_time_efficiency_to_benchmarks(
            time_analysis, service_type
        )

        return {
            'user_id': user_id,
            'service_type': service_type or 'all_services',
            'appointments_analyzed': len(appointments),
            'current_time_analysis': time_analysis,
            'efficiency_opportunities': efficiency_opportunities,
            'optimization_recommendations': optimization_recommendations,
            'impact_analysis': impact_analysis,
            'implementation_plan': implementation_plan,
            'benchmark_comparison': benchmark_comparison,
            'projected_time_savings_per_day': impact_analysis.get('daily_time_savings', 0),
            'projected_revenue_increase': impact_analysis.get('revenue_increase', 0)
        }

    def track_service_time_vs_quality_correlation(self, user_id: int) -> Dict[str, Any]:
        """
        Analyze correlation between service time and quality to find optimal
        time allocation for maximum client satisfaction and efficiency.
        """
        logger.info(f"Tracking service time vs quality correlation for user {user_id}")

        # Get appointments with both time and quality data
        appointments_with_metrics = self.db.query(Appointment, SixFBServiceExcellenceMetrics).join(
            SixFBServiceExcellenceMetrics,
            and_(
                Appointment.id == SixFBServiceExcellenceMetrics.appointment_id,
                SixFBServiceExcellenceMetrics.user_id == user_id
            )
        ).filter(
            and_(
                Appointment.barber_id == user_id,
                Appointment.status == "completed",
                Appointment.datetime >= datetime.now() - timedelta(days=60)
            )
        ).all()

        if not appointments_with_metrics:
            return {'message': 'Insufficient data for time vs quality analysis'}

        # Perform correlation analysis
        correlation_analysis = self._analyze_time_quality_correlation(appointments_with_metrics)
        
        # Identify optimal time ranges
        optimal_time_ranges = self._identify_optimal_time_ranges(
            appointments_with_metrics, correlation_analysis
        )
        
        # Generate efficiency insights
        efficiency_insights = self._generate_time_efficiency_insights(
            correlation_analysis, optimal_time_ranges
        )
        
        # Create quality-time optimization strategy
        optimization_strategy = self._create_quality_time_optimization_strategy(
            optimal_time_ranges, efficiency_insights
        )

        return {
            'user_id': user_id,
            'data_points_analyzed': len(appointments_with_metrics),
            'correlation_analysis': correlation_analysis,
            'optimal_time_ranges': optimal_time_ranges,
            'efficiency_insights': efficiency_insights,
            'optimization_strategy': optimization_strategy,
            'recommended_adjustments': optimization_strategy.get('time_adjustments', []),
            'expected_quality_improvement': optimization_strategy.get('quality_improvement', 0),
            'expected_efficiency_gain': optimization_strategy.get('efficiency_gain', 0)
        }

    # ============================================================================
    # QUALITY IMPROVEMENT RECOMMENDATIONS
    # ============================================================================

    def generate_quality_improvement_recommendations(self, user_id: int) -> Dict[str, Any]:
        """
        Generate comprehensive quality improvement recommendations based on
        performance analysis and Six Figure Barber standards.
        """
        logger.info(f"Generating quality improvement recommendations for user {user_id}")

        # Get recent service excellence data
        recent_metrics = self.db.query(SixFBServiceExcellenceMetrics).filter(
            and_(
                SixFBServiceExcellenceMetrics.user_id == user_id,
                SixFBServiceExcellenceMetrics.service_date >= date.today() - timedelta(days=45)
            )
        ).all()

        if not recent_metrics:
            return {'message': 'No recent service quality data available'}

        # Analyze performance gaps
        performance_gaps = self._analyze_performance_gaps(recent_metrics)
        
        # Identify improvement priorities
        improvement_priorities = self._identify_improvement_priorities(
            performance_gaps, recent_metrics
        )
        
        # Generate specific recommendations
        recommendations = []
        
        for area, priority_data in improvement_priorities.items():
            area_recommendations = self._generate_area_specific_recommendations(
                area, priority_data, recent_metrics
            )
            recommendations.extend(area_recommendations)
        
        # Rank recommendations by impact and feasibility
        ranked_recommendations = self._rank_recommendations_by_impact(recommendations)
        
        # Create implementation roadmap
        implementation_roadmap = self._create_improvement_implementation_roadmap(
            ranked_recommendations
        )
        
        # Calculate expected outcomes
        expected_outcomes = self._calculate_improvement_expected_outcomes(
            ranked_recommendations, recent_metrics
        )

        return {
            'user_id': user_id,
            'analysis_period_days': 45,
            'performance_gaps': performance_gaps,
            'improvement_priorities': improvement_priorities,
            'top_recommendations': [rec.__dict__ for rec in ranked_recommendations[:10]],
            'implementation_roadmap': implementation_roadmap,
            'expected_outcomes': expected_outcomes,
            'quick_wins': [rec for rec in ranked_recommendations if rec.implementation_difficulty == 'easy'][:3],
            'high_impact_initiatives': [rec for rec in ranked_recommendations if rec.improvement_potential >= 15][:5]
        }

    def create_personalized_improvement_plan(self, user_id: int, focus_areas: List[str] = None) -> Dict[str, Any]:
        """
        Create personalized improvement plan based on individual performance
        patterns and Six Figure Barber methodology goals.
        """
        logger.info(f"Creating personalized improvement plan for user {user_id}")

        # Get comprehensive performance data
        performance_data = self._get_comprehensive_performance_data(user_id)
        
        # Analyze individual strengths and weaknesses
        strengths_weaknesses = self._analyze_individual_strengths_weaknesses(
            performance_data, focus_areas
        )
        
        # Create personalized goals
        personalized_goals = self._create_personalized_improvement_goals(
            user_id, strengths_weaknesses, focus_areas
        )
        
        # Develop training and development plan
        training_plan = self._develop_personalized_training_plan(
            strengths_weaknesses, personalized_goals
        )
        
        # Create monitoring and measurement framework
        monitoring_framework = self._create_improvement_monitoring_framework(
            personalized_goals, training_plan
        )
        
        # Generate milestone schedule
        milestone_schedule = self._create_improvement_milestone_schedule(
            personalized_goals, training_plan
        )

        return {
            'user_id': user_id,
            'focus_areas': focus_areas or ['all_areas'],
            'strengths_weaknesses_analysis': strengths_weaknesses,
            'personalized_goals': personalized_goals,
            'training_plan': training_plan,
            'monitoring_framework': monitoring_framework,
            'milestone_schedule': milestone_schedule,
            'estimated_improvement_timeline_weeks': training_plan.get('total_duration_weeks', 12),
            'success_probability': training_plan.get('success_probability', 85)
        }

    # ============================================================================
    # PRIVATE HELPER METHODS
    # ============================================================================

    def _check_quality_alert_triggers(self, appointment: Appointment, area: ServiceExcellenceArea,
                                    score: float) -> Optional[ServiceQualityAlert]:
        """Check if quality score triggers an alert"""
        
        target_score = 85  # Six Figure Barber standard
        variance = score - target_score
        
        if variance < -20:  # Score more than 20 points below target
            severity = InterventionLevel.CRITICAL
        elif variance < -10:  # Score 10-20 points below target
            severity = InterventionLevel.IMMEDIATE_ACTION
        elif variance < -5:  # Score 5-10 points below target
            severity = InterventionLevel.ATTENTION_NEEDED
        else:
            return None
        
        return ServiceQualityAlert(
            alert_id=f"alert_{appointment.id}_{area.value}_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            appointment_id=appointment.id,
            client_id=appointment.client_id,
            service_date=appointment.datetime.date(),
            excellence_area=area,
            current_score=score,
            target_score=target_score,
            variance=variance,
            severity=severity,
            description=f"Quality score for {area.value} is {abs(variance):.1f} points below target",
            recommended_actions=self._get_alert_recommended_actions(area, severity),
            estimated_impact="high" if severity in [InterventionLevel.CRITICAL, InterventionLevel.IMMEDIATE_ACTION] else "medium",
            timeline_for_action="immediate" if severity == InterventionLevel.CRITICAL else "within_24_hours"
        )

    def _determine_quality_level(self, score: float) -> QualityScore:
        """Determine quality level from score"""
        if score >= 95:
            return QualityScore.EXCEPTIONAL
        elif score >= 85:
            return QualityScore.EXCELLENT
        elif score >= 75:
            return QualityScore.GOOD
        elif score >= 60:
            return QualityScore.FAIR
        else:
            return QualityScore.POOR

    def _calculate_consistency_rating(self, scores: List[float]) -> str:
        """Calculate consistency rating from score variance"""
        if len(scores) < 2:
            return "insufficient_data"
        
        variance = statistics.variance(scores)
        
        if variance <= 25:  # Low variance
            return "highly_consistent"
        elif variance <= 50:
            return "moderately_consistent"
        elif variance <= 100:
            return "somewhat_inconsistent"
        else:
            return "highly_inconsistent"

    def _run_satisfaction_prediction_model(self, model_input: Dict[str, Any]) -> ClientSatisfactionPrediction:
        """Run ML model to predict client satisfaction"""
        
        # Simplified prediction logic - in production would use actual ML model
        base_satisfaction = 80.0
        
        # Adjust based on historical performance
        if model_input.get('historical_avg_score', 85) >= 90:
            base_satisfaction += 10
        elif model_input.get('historical_avg_score', 85) < 75:
            base_satisfaction -= 15
            
        # Adjust based on client tier
        if model_input.get('client_tier') == 'premium_vip':
            base_satisfaction -= 5  # Higher expectations
        elif model_input.get('client_tier') == 'developing':
            base_satisfaction += 5  # Lower expectations
            
        # Add some randomness for demo
        predicted_satisfaction = max(0, min(100, base_satisfaction + random.uniform(-10, 10)))
        
        return ClientSatisfactionPrediction(
            client_id=model_input.get('client_id'),
            appointment_id=model_input.get('appointment_id'),
            predicted_satisfaction=predicted_satisfaction,
            confidence_level=85.0,
            risk_factors=self._identify_satisfaction_risk_factors(model_input),
            protective_factors=self._identify_satisfaction_protective_factors(model_input),
            intervention_recommendations=self._generate_prediction_based_interventions(predicted_satisfaction),
            monitoring_priorities=self._determine_monitoring_priorities(predicted_satisfaction)
        )

    def _analyze_service_time_patterns(self, appointments: List[Appointment]) -> Dict[str, Any]:
        """Analyze service time patterns from appointment data"""
        
        service_times = []
        for appointment in appointments:
            if appointment.duration_minutes:
                service_times.append(appointment.duration_minutes)
        
        if not service_times:
            return {'error': 'No duration data available'}
        
        return {
            'average_service_time': statistics.mean(service_times),
            'median_service_time': statistics.median(service_times),
            'min_service_time': min(service_times),
            'max_service_time': max(service_times),
            'time_variance': statistics.variance(service_times) if len(service_times) > 1 else 0,
            'total_appointments': len(appointments),
            'efficiency_score': self._calculate_efficiency_score(service_times)
        }

    def _generate_area_specific_recommendations(self, area: str, priority_data: Dict[str, Any],
                                              recent_metrics: List[SixFBServiceExcellenceMetrics]) -> List[ServiceOptimizationRecommendation]:
        """Generate specific recommendations for each excellence area"""
        
        recommendations = []
        
        if area == ServiceExcellenceArea.TECHNICAL_SKILL.value:
            recommendations.append(ServiceOptimizationRecommendation(
                recommendation_id=f"tech_skill_{datetime.now().strftime('%Y%m%d')}",
                service_type="all",
                optimization_area="technical_skill",
                current_performance=priority_data.get('current_score', 75),
                target_performance=85,
                improvement_potential=15,
                implementation_difficulty="medium",
                expected_timeline_weeks=8,
                estimated_roi=Decimal('500.00'),
                success_probability=80.0
            ))
        
        return recommendations

    # Additional helper methods would be implemented here...
    # For brevity, including key method signatures

    def _get_alert_recommended_actions(self, area: ServiceExcellenceArea, severity: InterventionLevel) -> List[str]:
        """Get recommended actions for quality alerts"""
        return ["Review service protocols", "Additional training", "Quality check"]

    def _identify_satisfaction_risk_factors(self, model_input: Dict[str, Any]) -> List[str]:
        """Identify risk factors for satisfaction prediction"""
        return ["Previous quality issues", "High expectations", "Time pressure"]

    def _calculate_efficiency_score(self, service_times: List[float]) -> float:
        """Calculate efficiency score from service times"""
        return 85.0  # Placeholder implementation
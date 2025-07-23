"""
Email A/B Testing Framework for BookedBarber

This service provides comprehensive A/B testing capabilities for email templates:
- A/B test creation and management
- Statistical significance calculations
- Winner determination with confidence intervals
- Performance tracking and reporting
"""

from typing import Optional, List, Dict, Any, Tuple
from datetime import datetime, timedelta
import logging
import json
import random
import math
from sqlalchemy.orm import Session
from sqlalchemy import and_, desc, func
import scipy.stats as stats
import numpy as np

from models import (
    EmailABTest, EmailAnalyticsEvent, EmailAnalyticsSummary, 
    NotificationTemplate, User, NotificationQueue
)
from db import get_db
from config import settings

logger = logging.getLogger(__name__)


class EmailABTestingService:
    """Service for managing email A/B tests and statistical analysis"""
    
    def __init__(self):
        """Initialize the A/B testing service"""
        self.logger = logger
    
    def create_ab_test(
        self,
        db: Session,
        name: str,
        description: str,
        base_template_name: str,
        test_type: str,
        variants: List[Dict[str, Any]],
        traffic_split: List[float],
        primary_metric: str,
        created_by_id: int,
        sample_size: Optional[int] = None,
        confidence_level: float = 0.95,
        minimum_effect_size: float = 0.05,
        max_duration_hours: int = 168,  # 1 week
        secondary_metrics: Optional[List[str]] = None
    ) -> EmailABTest:
        """
        Create a new A/B test
        
        Args:
            db: Database session
            name: Test name
            description: Test description
            base_template_name: Base template to test
            test_type: Type of test (subject_line, content, send_time, from_name)
            variants: List of variant configurations
            traffic_split: Percentage split for each variant (must sum to 1.0)
            primary_metric: Primary success metric
            created_by_id: User creating the test
            sample_size: Target sample size (optional)
            confidence_level: Statistical confidence level
            minimum_effect_size: Minimum detectable effect size
            max_duration_hours: Maximum test duration
            secondary_metrics: Additional metrics to track
            
        Returns:
            EmailABTest: Created test object
        """
        try:
            # Validate inputs
            if abs(sum(traffic_split) - 1.0) > 0.001:
                raise ValueError("Traffic split must sum to 1.0")
            
            if len(variants) != len(traffic_split):
                raise ValueError("Number of variants must match traffic split array")
            
            if primary_metric not in ['open_rate', 'click_rate', 'conversion_rate']:
                raise ValueError("Invalid primary metric")
            
            # Calculate sample size if not provided
            if not sample_size:
                sample_size = self._calculate_required_sample_size(
                    minimum_effect_size, confidence_level
                )
            
            # Create test
            ab_test = EmailABTest(
                name=name,
                description=description,
                base_template_name=base_template_name,
                test_type=test_type,
                variants=variants,
                traffic_split=traffic_split,
                sample_size=sample_size,
                confidence_level=confidence_level,
                minimum_effect_size=minimum_effect_size,
                max_duration_hours=max_duration_hours,
                primary_metric=primary_metric,
                secondary_metrics=secondary_metrics or [],
                created_by_id=created_by_id,
                status='draft'
            )
            
            db.add(ab_test)
            db.commit()
            db.refresh(ab_test)
            
            self.logger.info(f"Created A/B test: {name} with {len(variants)} variants")
            return ab_test
            
        except Exception as e:
            self.logger.error(f"Error creating A/B test: {str(e)}")
            db.rollback()
            raise
    
    def start_ab_test(self, db: Session, test_id: int) -> EmailABTest:
        """
        Start an A/B test
        
        Args:
            db: Database session
            test_id: Test ID to start
            
        Returns:
            EmailABTest: Updated test object
        """
        try:
            ab_test = db.query(EmailABTest).filter(EmailABTest.id == test_id).first()
            if not ab_test:
                raise ValueError(f"A/B test {test_id} not found")
            
            if ab_test.status != 'draft':
                raise ValueError(f"Cannot start test in status: {ab_test.status}")
            
            ab_test.status = 'running'
            ab_test.start_time = datetime.utcnow()
            ab_test.end_time = datetime.utcnow() + timedelta(hours=ab_test.max_duration_hours)
            
            db.commit()
            db.refresh(ab_test)
            
            self.logger.info(f"Started A/B test: {ab_test.name}")
            return ab_test
            
        except Exception as e:
            self.logger.error(f"Error starting A/B test: {str(e)}")
            db.rollback()
            raise
    
    def stop_ab_test(self, db: Session, test_id: int, reason: str = "manual_stop") -> EmailABTest:
        """
        Stop an A/B test
        
        Args:
            db: Database session
            test_id: Test ID to stop
            reason: Reason for stopping
            
        Returns:
            EmailABTest: Updated test object
        """
        try:
            ab_test = db.query(EmailABTest).filter(EmailABTest.id == test_id).first()
            if not ab_test:
                raise ValueError(f"A/B test {test_id} not found")
            
            if ab_test.status != 'running':
                raise ValueError(f"Cannot stop test in status: {ab_test.status}")
            
            # Calculate final results
            results = self.calculate_test_results(db, test_id)
            
            ab_test.status = 'stopped'
            ab_test.end_time = datetime.utcnow()
            ab_test.results = results
            
            # Determine winner if statistically significant
            if results.get('significant_winner'):
                ab_test.winner_variant = results['significant_winner']['variant']
                ab_test.winner_confidence = results['significant_winner']['confidence']
            
            db.commit()
            db.refresh(ab_test)
            
            self.logger.info(f"Stopped A/B test: {ab_test.name}, reason: {reason}")
            return ab_test
            
        except Exception as e:
            self.logger.error(f"Error stopping A/B test: {str(e)}")
            db.rollback()
            raise
    
    def assign_variant(self, db: Session, test_id: int, user_id: Optional[int] = None) -> str:
        """
        Assign a user to a test variant
        
        Args:
            db: Database session
            test_id: Test ID
            user_id: User ID (optional, for consistent assignment)
            
        Returns:
            str: Assigned variant (A, B, C, etc.)
        """
        try:
            ab_test = db.query(EmailABTest).filter(EmailABTest.id == test_id).first()
            if not ab_test:
                raise ValueError(f"A/B test {test_id} not found")
            
            if ab_test.status != 'running':
                raise ValueError(f"Test is not running: {ab_test.status}")
            
            # Use deterministic assignment if user_id provided
            if user_id:
                # Create a hash based on user_id and test_id for consistent assignment
                hash_input = f"{user_id}:{test_id}"
                hash_value = hash(hash_input) % 1000000
                random_value = hash_value / 1000000.0
            else:
                # Random assignment
                random_value = random.random()
            
            # Assign to variant based on traffic split
            cumulative_split = 0.0
            for i, split in enumerate(ab_test.traffic_split):
                cumulative_split += split
                if random_value <= cumulative_split:
                    variant = chr(ord('A') + i)  # A, B, C, etc.
                    self.logger.debug(f"Assigned variant {variant} for test {test_id}")
                    return variant
            
            # Fallback to last variant
            return chr(ord('A') + len(ab_test.traffic_split) - 1)
            
        except Exception as e:
            self.logger.error(f"Error assigning variant: {str(e)}")
            # Fallback to variant A
            return 'A'
    
    def calculate_test_results(self, db: Session, test_id: int) -> Dict[str, Any]:
        """
        Calculate statistical results for an A/B test
        
        Args:
            db: Database session
            test_id: Test ID
            
        Returns:
            Dictionary with test results and statistical analysis
        """
        try:
            ab_test = db.query(EmailABTest).filter(EmailABTest.id == test_id).first()
            if not ab_test:
                raise ValueError(f"A/B test {test_id} not found")
            
            # Get events for this test
            events = db.query(EmailAnalyticsEvent).filter(
                EmailAnalyticsEvent.ab_test_id == test_id
            ).all()
            
            if not events:
                return {'error': 'No events found for this test'}
            
            # Group events by variant
            variant_data = {}
            for event in events:
                variant = event.ab_variant
                if variant not in variant_data:
                    variant_data[variant] = {
                        'emails_sent': set(),
                        'opens': set(),
                        'clicks': set(),
                        'conversions': set()
                    }
                
                # Track unique emails for each event type
                email_key = f"{event.email_address}:{event.message_id}"
                variant_data[variant]['emails_sent'].add(email_key)
                
                if event.event_type == 'open':
                    variant_data[variant]['opens'].add(email_key)
                elif event.event_type == 'click':
                    variant_data[variant]['clicks'].add(email_key)
                    # Clicks also count as opens
                    variant_data[variant]['opens'].add(email_key)
                # Add conversion tracking logic here based on your conversion definition
            
            # Calculate metrics for each variant
            variant_results = {}
            for variant, data in variant_data.items():
                emails_sent = len(data['emails_sent'])
                unique_opens = len(data['opens'])
                unique_clicks = len(data['clicks'])
                
                variant_results[variant] = {
                    'emails_sent': emails_sent,
                    'unique_opens': unique_opens,
                    'unique_clicks': unique_clicks,
                    'open_rate': (unique_opens / emails_sent * 100) if emails_sent > 0 else 0,
                    'click_rate': (unique_clicks / emails_sent * 100) if emails_sent > 0 else 0,
                    'click_to_open_rate': (unique_clicks / unique_opens * 100) if unique_opens > 0 else 0
                }
            
            # Perform statistical analysis
            statistical_results = self._perform_statistical_analysis(
                variant_results, ab_test.primary_metric, ab_test.confidence_level
            )
            
            results = {
                'test_id': test_id,
                'test_name': ab_test.name,
                'primary_metric': ab_test.primary_metric,
                'confidence_level': ab_test.confidence_level,
                'variant_results': variant_results,
                'statistical_analysis': statistical_results,
                'significant_winner': statistical_results.get('winner'),
                'test_duration_hours': self._calculate_test_duration(ab_test),
                'sample_size_reached': sum(v['emails_sent'] for v in variant_results.values()),
                'target_sample_size': ab_test.sample_size
            }
            
            return results
            
        except Exception as e:
            self.logger.error(f"Error calculating test results: {str(e)}")
            raise
    
    def get_active_tests(self, db: Session, template_name: Optional[str] = None) -> List[EmailABTest]:
        """
        Get active A/B tests
        
        Args:
            db: Database session
            template_name: Optional template name filter
            
        Returns:
            List of active tests
        """
        try:
            query = db.query(EmailABTest).filter(EmailABTest.status == 'running')
            
            if template_name:
                query = query.filter(EmailABTest.base_template_name == template_name)
            
            return query.all()
            
        except Exception as e:
            self.logger.error(f"Error getting active tests: {str(e)}")
            raise
    
    def auto_check_tests(self, db: Session) -> Dict[str, Any]:
        """
        Automatically check running tests for completion criteria
        
        Args:
            db: Database session
            
        Returns:
            Summary of actions taken
        """
        try:
            active_tests = self.get_active_tests(db)
            actions_taken = []
            
            for test in active_tests:
                # Check if test should be stopped
                should_stop = False
                reason = None
                
                # Check duration
                if test.end_time and datetime.utcnow() >= test.end_time:
                    should_stop = True
                    reason = "max_duration_reached"
                
                # Check sample size
                results = self.calculate_test_results(db, test.id)
                if (results.get('sample_size_reached', 0) >= test.sample_size and
                    results.get('statistical_analysis', {}).get('significant_result')):
                    should_stop = True
                    reason = "statistical_significance_reached"
                
                if should_stop:
                    self.stop_ab_test(db, test.id, reason)
                    actions_taken.append({
                        'test_id': test.id,
                        'test_name': test.name,
                        'action': 'stopped',
                        'reason': reason
                    })
            
            return {
                'tests_checked': len(active_tests),
                'actions_taken': actions_taken
            }
            
        except Exception as e:
            self.logger.error(f"Error auto-checking tests: {str(e)}")
            raise
    
    def _calculate_required_sample_size(
        self, 
        effect_size: float, 
        confidence_level: float,
        power: float = 0.8
    ) -> int:
        """
        Calculate required sample size for statistical significance
        
        Args:
            effect_size: Minimum detectable effect size
            confidence_level: Statistical confidence level
            power: Statistical power (1 - β)
            
        Returns:
            Required sample size per variant
        """
        try:
            # Z-scores for confidence level and power
            z_alpha = stats.norm.ppf(1 - (1 - confidence_level) / 2)
            z_beta = stats.norm.ppf(power)
            
            # Assume baseline conversion rate of 5% for email click rates
            baseline_rate = 0.05
            
            # Calculate sample size using formula for proportions
            p1 = baseline_rate
            p2 = baseline_rate * (1 + effect_size)
            p_pooled = (p1 + p2) / 2
            
            numerator = (z_alpha + z_beta) ** 2 * 2 * p_pooled * (1 - p_pooled)
            denominator = (p2 - p1) ** 2
            
            sample_size = math.ceil(numerator / denominator)
            
            # Minimum sample size of 100 per variant
            return max(sample_size, 100)
            
        except Exception as e:
            self.logger.error(f"Error calculating sample size: {str(e)}")
            return 1000  # Default fallback
    
    def _perform_statistical_analysis(
        self, 
        variant_results: Dict[str, Dict], 
        primary_metric: str,
        confidence_level: float
    ) -> Dict[str, Any]:
        """
        Perform statistical analysis on A/B test results
        
        Args:
            variant_results: Results for each variant
            primary_metric: Primary metric to analyze
            confidence_level: Confidence level for significance testing
            
        Returns:
            Statistical analysis results
        """
        try:
            if len(variant_results) < 2:
                return {'error': 'Need at least 2 variants for analysis'}
            
            # Get variants sorted by name
            variants = sorted(variant_results.keys())
            control_variant = variants[0]  # First variant is control
            
            analysis = {
                'control_variant': control_variant,
                'test_variants': variants[1:],
                'metric': primary_metric,
                'confidence_level': confidence_level,
                'comparisons': [],
                'significant_result': False,
                'winner': None
            }
            
            # Extract data for primary metric
            control_data = variant_results[control_variant]
            
            if primary_metric == 'open_rate':
                control_conversions = control_data['unique_opens']
                control_trials = control_data['emails_sent']
            elif primary_metric == 'click_rate':
                control_conversions = control_data['unique_clicks']
                control_trials = control_data['emails_sent']
            else:
                # Default to click rate
                control_conversions = control_data['unique_clicks']
                control_trials = control_data['emails_sent']
            
            control_rate = control_conversions / control_trials if control_trials > 0 else 0
            
            best_variant = control_variant
            best_rate = control_rate
            best_confidence = 0
            
            # Compare each test variant to control
            for test_variant in variants[1:]:
                test_data = variant_results[test_variant]
                
                if primary_metric == 'open_rate':
                    test_conversions = test_data['unique_opens']
                    test_trials = test_data['emails_sent']
                elif primary_metric == 'click_rate':
                    test_conversions = test_data['unique_clicks']
                    test_trials = test_data['emails_sent']
                else:
                    test_conversions = test_data['unique_clicks']
                    test_trials = test_data['emails_sent']
                
                test_rate = test_conversions / test_trials if test_trials > 0 else 0
                
                # Perform two-proportion z-test
                if control_trials > 0 and test_trials > 0:
                    z_stat, p_value = self._two_proportion_z_test(
                        control_conversions, control_trials,
                        test_conversions, test_trials
                    )
                    
                    is_significant = p_value < (1 - confidence_level)
                    confidence = (1 - p_value) * 100
                    
                    # Calculate relative improvement
                    relative_improvement = ((test_rate - control_rate) / control_rate * 100) if control_rate > 0 else 0
                    
                    comparison = {
                        'test_variant': test_variant,
                        'control_rate': control_rate * 100,
                        'test_rate': test_rate * 100,
                        'relative_improvement': relative_improvement,
                        'absolute_improvement': (test_rate - control_rate) * 100,
                        'z_statistic': z_stat,
                        'p_value': p_value,
                        'confidence': confidence,
                        'is_significant': is_significant
                    }
                    
                    analysis['comparisons'].append(comparison)
                    
                    # Track best performer
                    if is_significant and test_rate > best_rate:
                        best_variant = test_variant
                        best_rate = test_rate
                        best_confidence = confidence
                        analysis['significant_result'] = True
            
            # Set winner if we have a significant result
            if analysis['significant_result']:
                analysis['winner'] = {
                    'variant': best_variant,
                    'rate': best_rate * 100,
                    'confidence': best_confidence
                }
            
            return analysis
            
        except Exception as e:
            self.logger.error(f"Error in statistical analysis: {str(e)}")
            return {'error': str(e)}
    
    def _two_proportion_z_test(
        self, 
        x1: int, n1: int, 
        x2: int, n2: int
    ) -> Tuple[float, float]:
        """
        Perform two-proportion z-test
        
        Args:
            x1: Successes in group 1
            n1: Trials in group 1
            x2: Successes in group 2
            n2: Trials in group 2
            
        Returns:
            Tuple of (z-statistic, p-value)
        """
        try:
            if n1 == 0 or n2 == 0:
                return 0.0, 1.0
            
            p1 = x1 / n1
            p2 = x2 / n2
            
            # Pooled proportion
            p_pool = (x1 + x2) / (n1 + n2)
            
            # Standard error
            se = math.sqrt(p_pool * (1 - p_pool) * (1/n1 + 1/n2))
            
            if se == 0:
                return 0.0, 1.0
            
            # Z-statistic
            z = (p2 - p1) / se
            
            # Two-tailed p-value
            p_value = 2 * (1 - stats.norm.cdf(abs(z)))
            
            return z, p_value
            
        except Exception as e:
            self.logger.error(f"Error in z-test: {str(e)}")
            return 0.0, 1.0
    
    def _calculate_test_duration(self, ab_test: EmailABTest) -> float:
        """Calculate test duration in hours"""
        if not ab_test.start_time:
            return 0
        
        end_time = ab_test.end_time or datetime.utcnow()
        duration = end_time - ab_test.start_time
        return duration.total_seconds() / 3600


# Singleton instance
email_ab_testing_service = EmailABTestingService()
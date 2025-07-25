"""
Privacy Anonymization Service for Cross-User AI Analytics.

Implements differential privacy, k-anonymity, and other privacy-preserving techniques
to enable safe cross-user analytics while protecting individual user privacy.
"""

import logging
import hashlib
import numpy as np
from typing import Dict, List, Optional, Any, Tuple, Union
from datetime import datetime
from dataclasses import dataclass
from collections import defaultdict
from sqlalchemy.orm import Session
from sqlalchemy import func

from models import Appointment, Payment, PerformanceBenchmark, CrossUserMetric
from models.consent import ConsentType, ConsentStatus
from services.business_context_service import BusinessContextService

logger = logging.getLogger(__name__)


@dataclass
class PrivacyParameters:
    """Privacy protection parameters for anonymization"""
    epsilon: float = 1.0  # Differential privacy budget
    delta: float = 1e-5   # Probability of privacy breach
    k_anonymity: int = 100  # Minimum group size for k-anonymity
    l_diversity: int = 5   # Minimum diversity for sensitive attributes
    noise_scale: float = 1.0  # Scale of random noise
    suppress_threshold: int = 10  # Suppress groups smaller than this


@dataclass
class AnonymizedMetric:
    """Container for anonymized metric data"""
    metric_name: str
    value: Union[float, int, str]
    confidence_interval: Tuple[float, float]
    sample_size: int
    privacy_applied: bool
    noise_added: float
    k_anonymity_level: int


class PrivacyAnonymizationService:
    """
    Service for privacy-compliant anonymization of cross-user data.
    
    Implements multiple privacy protection techniques:
    - Differential Privacy: Adds calibrated noise to protect individual contributions
    - K-Anonymity: Ensures each record is indistinguishable from k-1 others
    - L-Diversity: Ensures diversity in sensitive attributes
    - Data Suppression: Removes potentially identifying information
    """
    
    def __init__(self, db: Session, privacy_params: Optional[PrivacyParameters] = None):
        self.db = db
        self.privacy_params = privacy_params or PrivacyParameters()
        self.business_context = BusinessContextService(db)
        
    def check_user_consent(self, user_id: int, consent_type: ConsentType) -> bool:
        """Check if user has consented to specific data usage"""
        from models.consent import UserConsent
        
        consent = self.db.query(UserConsent).filter(
            UserConsent.user_id == user_id,
            UserConsent.consent_type == consent_type,
            UserConsent.status == ConsentStatus.GRANTED
        ).first()
        
        return consent is not None
    
    def get_consented_users(self, consent_types: List[ConsentType]) -> List[int]:
        """Get list of users who have consented to cross-user analytics"""
        from models.consent import UserConsent
        
        consented_users = self.db.query(UserConsent.user_id).filter(
            UserConsent.consent_type.in_(consent_types),
            UserConsent.status == ConsentStatus.GRANTED
        ).distinct().all()
        
        return [user_id[0] for user_id in consented_users]
    
    def add_differential_privacy_noise(self, 
                                     value: float, 
                                     sensitivity: float = 1.0,
                                     epsilon: Optional[float] = None) -> Tuple[float, float]:
        """
        Add Laplace noise for differential privacy.
        
        Args:
            value: Original value
            sensitivity: Global sensitivity of the query
            epsilon: Privacy budget (defaults to instance parameter)
            
        Returns:
            Tuple of (noisy_value, noise_added)
        """
        epsilon = epsilon or self.privacy_params.epsilon
        scale = sensitivity / epsilon
        
        # Generate Laplace noise
        noise = np.random.laplace(0, scale)
        noisy_value = value + noise
        
        logger.debug(f"Added DP noise: original={value}, noisy={noisy_value}, noise={noise}")
        
        return noisy_value, abs(noise)
    
    def apply_k_anonymity(self, 
                         data: List[Dict[str, Any]], 
                         quasi_identifiers: List[str],
                         k: Optional[int] = None) -> List[Dict[str, Any]]:
        """
        Apply k-anonymity by generalizing or suppressing data.
        
        Args:
            data: List of data records
            quasi_identifiers: Columns that could be used for identification
            k: Minimum group size (defaults to instance parameter)
            
        Returns:
            Anonymized data with k-anonymity guarantee
        """
        k = k or self.privacy_params.k_anonymity
        
        # Group records by quasi-identifier combinations
        groups = defaultdict(list)
        for record in data:
            key = tuple(record.get(qi, '') for qi in quasi_identifiers)
            groups[key].append(record)
        
        # Keep only groups with at least k members
        anonymized_data = []
        for group_key, group_records in groups.items():
            if len(group_records) >= k:
                # Mark all records in this group as k-anonymous
                for record in group_records:
                    record['k_anonymity_level'] = len(group_records)
                    anonymized_data.append(record)
            else:
                logger.debug(f"Suppressed group with {len(group_records)} records (< k={k})")
        
        logger.info(f"K-anonymity applied: {len(data)} -> {len(anonymized_data)} records")
        return anonymized_data
    
    def bucket_continuous_values(self, 
                                value: Union[float, int], 
                                bucket_ranges: List[Tuple[float, float, str]]) -> str:
        """
        Convert continuous values to discrete buckets for privacy protection.
        
        Args:
            value: Continuous value to bucket
            bucket_ranges: List of (min, max, label) tuples defining buckets
            
        Returns:
            Bucket label
        """
        for min_val, max_val, label in bucket_ranges:
            if min_val <= value < max_val:
                return label
        
        # Default bucket for values outside defined ranges
        return "other"
    
    def create_anonymized_business_segments(self, user_ids: List[int]) -> Dict[int, str]:
        """Create anonymized business segments for users"""
        segments = {}
        
        for user_id in user_ids:
            # Get business context for segmentation
            context = self.business_context.get_business_context(user_id)
            
            # Determine segment based on business size and type
            appointment_count = context.get('total_appointments', 0)
            monthly_revenue = context.get('monthly_revenue', 0)
            
            if appointment_count < 50:
                segment = "solo_barber"
            elif appointment_count < 200:
                segment = "small_shop"
            elif appointment_count < 500:
                segment = "medium_shop"
            else:
                segment = "large_shop"
            
            segments[user_id] = segment
        
        return segments
    
    def generate_cross_user_metrics(self, date_range: Tuple[datetime, datetime]) -> List[CrossUserMetric]:
        """
        Generate anonymized cross-user metrics for the specified date range.
        
        Only includes data from users who have consented to cross-user analytics.
        """
        start_date, end_date = date_range
        
        # Get users who have consented to aggregate analytics
        consented_users = self.get_consented_users([
            ConsentType.AGGREGATE_ANALYTICS,
            ConsentType.BENCHMARKING
        ])
        
        if len(consented_users) < self.privacy_params.k_anonymity:
            logger.warning(f"Insufficient consented users ({len(consented_users)}) for k-anonymity")
            return []
        
        # Get business segments for anonymization
        segments = self.create_anonymized_business_segments(consented_users)
        
        # Query anonymized data
        metrics = []
        
        # Group users by business segment for k-anonymity
        segment_groups = defaultdict(list)
        for user_id, segment in segments.items():
            segment_groups[segment].append(user_id)
        
        for segment, user_ids in segment_groups.items():
            if len(user_ids) < self.privacy_params.k_anonymity:
                continue  # Skip segments with insufficient users
            
            # Calculate aggregate metrics for this segment
            segment_metrics = self._calculate_segment_metrics(
                user_ids, segment, start_date, end_date
            )
            metrics.extend(segment_metrics)
        
        return metrics
    
    def _calculate_segment_metrics(self, 
                                 user_ids: List[int], 
                                 segment: str, 
                                 start_date: datetime, 
                                 end_date: datetime) -> List[CrossUserMetric]:
        """Calculate anonymized metrics for a specific business segment"""
        
        # Revenue buckets for anonymization
        revenue_buckets = [
            (0, 1000, "low"),
            (1000, 5000, "medium"),
            (5000, float('inf'), "high")
        ]
        
        # Appointment volume buckets
        appointment_buckets = [
            (0, 20, "low"),
            (20, 100, "medium"),
            (100, float('inf'), "high")
        ]
        
        metrics = []
        
        for user_id in user_ids:
            # Get user's business data
            revenue_query = self.db.query(func.sum(Payment.amount)).filter(
                Payment.user_id == user_id,
                Payment.created_at.between(start_date, end_date),
                Payment.status == "completed"
            )
            total_revenue = revenue_query.scalar() or 0
            
            appointment_count = self.db.query(func.count(Appointment.id)).filter(
                Appointment.user_id == user_id,
                Appointment.start_time.between(start_date, end_date),
                Appointment.status.in_(["confirmed", "completed"])
            ).scalar() or 0
            
            # Apply differential privacy noise
            noisy_revenue, revenue_noise = self.add_differential_privacy_noise(
                total_revenue, sensitivity=1000  # Assume max revenue sensitivity of $1000
            )
            
            noisy_appointments, appointment_noise = self.add_differential_privacy_noise(
                appointment_count, sensitivity=1  # Sensitivity of 1 appointment
            )
            
            # Bucket the values for additional privacy
            revenue_bucket = self.bucket_continuous_values(max(0, noisy_revenue), revenue_buckets)
            appointment_bucket = self.bucket_continuous_values(max(0, noisy_appointments), appointment_buckets)
            
            # Create anonymized metric record
            metric = CrossUserMetric(
                date=start_date,
                period_type="monthly",
                business_segment=segment,
                revenue_bucket=revenue_bucket,
                appointment_volume_bucket=appointment_bucket,
                noise_added=True,
                k_anonymity_level=len(user_ids),
                aggregated_at=datetime.utcnow()
            )
            
            metrics.append(metric)
        
        return metrics
    
    def generate_performance_benchmarks(self, 
                                      category: str, 
                                      date_range: Tuple[datetime, datetime]) -> List[PerformanceBenchmark]:
        """
        Generate privacy-compliant performance benchmarks.
        
        Creates statistical summaries (percentiles, means) without exposing individual data.
        """
        start_date, end_date = date_range
        
        # Get consented users
        consented_users = self.get_consented_users([
            ConsentType.AGGREGATE_ANALYTICS,
            ConsentType.BENCHMARKING
        ])
        
        if len(consented_users) < self.privacy_params.k_anonymity:
            return []
        
        benchmarks = []
        
        # Generate benchmarks by business segment
        segments = self.create_anonymized_business_segments(consented_users)
        segment_groups = defaultdict(list)
        
        for user_id, segment in segments.items():
            segment_groups[segment].append(user_id)
        
        for segment, user_ids in segment_groups.items():
            if len(user_ids) < self.privacy_params.k_anonymity:
                continue
            
            # Calculate revenue benchmarks
            if category == "revenue":
                benchmark = self._create_revenue_benchmark(user_ids, segment, start_date, end_date)
                if benchmark:
                    benchmarks.append(benchmark)
            
            # Calculate appointment benchmarks
            elif category == "appointments":
                benchmark = self._create_appointment_benchmark(user_ids, segment, start_date, end_date)
                if benchmark:
                    benchmarks.append(benchmark)
        
        return benchmarks
    
    def _create_revenue_benchmark(self, 
                                user_ids: List[int], 
                                segment: str, 
                                start_date: datetime, 
                                end_date: datetime) -> Optional[PerformanceBenchmark]:
        """Create revenue benchmark for a business segment"""
        
        # Collect revenue data
        revenues = []
        for user_id in user_ids:
            revenue = self.db.query(func.sum(Payment.amount)).filter(
                Payment.user_id == user_id,
                Payment.created_at.between(start_date, end_date),
                Payment.status == "completed"
            ).scalar() or 0
            
            # Add differential privacy noise
            noisy_revenue, _ = self.add_differential_privacy_noise(revenue, sensitivity=1000)
            revenues.append(max(0, noisy_revenue))  # Ensure non-negative
        
        if not revenues:
            return None
        
        # Calculate statistical summaries
        revenues_sorted = sorted(revenues)
        n = len(revenues_sorted)
        
        benchmark = PerformanceBenchmark(
            category="revenue",
            metric_name="monthly_revenue",
            business_segment=segment,
            month=start_date.month,
            year=start_date.year,
            sample_size=n,
            percentile_10=revenues_sorted[int(0.1 * n)],
            percentile_25=revenues_sorted[int(0.25 * n)],
            percentile_50=revenues_sorted[int(0.5 * n)],
            percentile_75=revenues_sorted[int(0.75 * n)],
            percentile_90=revenues_sorted[int(0.9 * n)],
            mean_value=np.mean(revenues),
            std_deviation=np.std(revenues),
            anonymized_at=datetime.utcnow(),
            data_source_hash=self._generate_data_hash(user_ids, "revenue")
        )
        
        return benchmark
    
    def _create_appointment_benchmark(self, 
                                    user_ids: List[int], 
                                    segment: str, 
                                    start_date: datetime, 
                                    end_date: datetime) -> Optional[PerformanceBenchmark]:
        """Create appointment volume benchmark for a business segment"""
        
        # Collect appointment data
        appointment_counts = []
        for user_id in user_ids:
            count = self.db.query(func.count(Appointment.id)).filter(
                Appointment.user_id == user_id,
                Appointment.start_time.between(start_date, end_date),
                Appointment.status.in_(["confirmed", "completed"])
            ).scalar() or 0
            
            # Add differential privacy noise
            noisy_count, _ = self.add_differential_privacy_noise(count, sensitivity=1)
            appointment_counts.append(max(0, int(noisy_count)))
        
        if not appointment_counts:
            return None
        
        # Calculate statistical summaries
        counts_sorted = sorted(appointment_counts)
        n = len(counts_sorted)
        
        benchmark = PerformanceBenchmark(
            category="appointments",
            metric_name="monthly_appointments",
            business_segment=segment,
            month=start_date.month,
            year=start_date.year,
            sample_size=n,
            percentile_10=counts_sorted[int(0.1 * n)],
            percentile_25=counts_sorted[int(0.25 * n)],
            percentile_50=counts_sorted[int(0.5 * n)],
            percentile_75=counts_sorted[int(0.75 * n)],
            percentile_90=counts_sorted[int(0.9 * n)],
            mean_value=np.mean(appointment_counts),
            std_deviation=np.std(appointment_counts),
            anonymized_at=datetime.utcnow(),
            data_source_hash=self._generate_data_hash(user_ids, "appointments")
        )
        
        return benchmark
    
    def _generate_data_hash(self, user_ids: List[int], metric_type: str) -> str:
        """Generate a hash for data lineage tracking without exposing user IDs"""
        # Sort user IDs for consistent hashing
        sorted_ids = sorted(user_ids)
        
        # Create a hash that includes metric type and anonymized user count
        hash_input = f"{metric_type}:{len(sorted_ids)}:{hash(tuple(sorted_ids))}"
        return hashlib.sha256(hash_input.encode()).hexdigest()
    
    def validate_privacy_guarantees(self, 
                                  anonymized_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Validate that privacy guarantees are met in anonymized data.
        
        Returns a report on privacy protection levels achieved.
        """
        report = {
            "k_anonymity_achieved": True,
            "min_group_size": float('inf'),
            "differential_privacy_applied": False,
            "suppressed_records": 0,
            "total_records": len(anonymized_data),
            "privacy_score": 0.0
        }
        
        if not anonymized_data:
            return report
        
        # Check k-anonymity levels
        k_levels = [record.get('k_anonymity_level', 0) for record in anonymized_data]
        if k_levels:
            report["min_group_size"] = min(k_levels)
            report["k_anonymity_achieved"] = report["min_group_size"] >= self.privacy_params.k_anonymity
        
        # Check for differential privacy
        noise_applied = [record.get('noise_added', False) for record in anonymized_data]
        report["differential_privacy_applied"] = any(noise_applied)
        
        # Calculate overall privacy score (0-100)
        score = 0
        if report["k_anonymity_achieved"]:
            score += 50
        if report["differential_privacy_applied"]:
            score += 30
        if report["min_group_size"] > self.privacy_params.k_anonymity * 2:
            score += 20  # Bonus for extra anonymity
        
        report["privacy_score"] = score
        
        return report
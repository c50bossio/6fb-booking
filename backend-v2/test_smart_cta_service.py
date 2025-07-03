"""
Comprehensive test suite for Smart Call-to-Action Generation Service.
Tests all major functionality including CTA generation, optimization, validation, and A/B testing.
"""

import pytest
import unittest
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime, timedelta
from typing import Dict, List, Any

from services.smart_cta_service import (
    SmartCTAService, CTAType, CTAPlacement, CTAPersonalization,
    CTAVariant, CTAPerformanceData, CTARecommendation, CTAContext,
    calculate_cta_roi_estimate, generate_cta_performance_report
)
from services.business_context_service import BusinessContext
from models.review import Review, ReviewSentiment
from sqlalchemy.orm import Session


class TestSmartCTAService(unittest.TestCase):
    """Test suite for SmartCTAService"""
    
    def setUp(self):
        """Set up test fixtures"""
        # Mock database session
        self.mock_db = Mock(spec=Session)
        
        # Create service instance
        self.cta_service = SmartCTAService(self.mock_db)
        
        # Mock business context
        self.mock_business_context = BusinessContext(
            business_name="Elite Barber Shop",
            location_name="Downtown Location",
            address="123 Main St, Downtown",
            city="New York",
            state="NY",
            phone="(555) 123-4567",
            email="info@elitebarbershop.com",
            specialty_services=["haircut", "beard trim", "hot shave"],
            barber_names=["Mike", "Tony", "Alex"],
            total_barbers=3
        )
        
        # Mock review data
        self.mock_positive_review = Mock(spec=Review)
        self.mock_positive_review.rating = 5
        self.mock_positive_review.sentiment = ReviewSentiment.POSITIVE
        self.mock_positive_review.review_text = "Great haircut, excellent service!"
        
        self.mock_negative_review = Mock(spec=Review)
        self.mock_negative_review.rating = 2
        self.mock_negative_review.sentiment = ReviewSentiment.NEGATIVE
        self.mock_negative_review.review_text = "Poor service, not satisfied."
        
        self.mock_neutral_review = Mock(spec=Review)
        self.mock_neutral_review.rating = 3
        self.mock_neutral_review.sentiment = ReviewSentiment.NEUTRAL
        self.mock_neutral_review.review_text = "Average experience, nothing special."
    
    def test_service_initialization(self):
        """Test service initialization"""
        # Test successful initialization
        service = SmartCTAService(self.mock_db)
        self.assertIsNotNone(service)
        self.assertEqual(service.db, self.mock_db)
        
        # Test initialization with None database
        with self.assertRaises(ValueError):
            SmartCTAService(None)
    
    def test_generate_smart_cta_positive_sentiment(self):
        """Test CTA generation for positive sentiment"""
        recommendation = self.cta_service.generate_smart_cta(
            business_context=self.mock_business_context,
            review=self.mock_positive_review,
            service_type="haircut"
        )
        
        # Verify recommendation structure
        self.assertIsInstance(recommendation, CTARecommendation)
        self.assertIsInstance(recommendation.primary_variant, CTAVariant)
        self.assertIsInstance(recommendation.alternative_variants, list)
        
        # Verify effectiveness scores
        self.assertGreaterEqual(recommendation.effectiveness_score, 0.0)
        self.assertLessEqual(recommendation.effectiveness_score, 1.0)
        
        # Verify CTA text contains business name
        self.assertIn("Elite Barber Shop", recommendation.primary_variant.text)
        
        # Verify positive sentiment handling
        self.assertIn("thank", recommendation.primary_variant.text.lower())
    
    def test_generate_smart_cta_negative_sentiment(self):
        """Test CTA generation for negative sentiment"""
        recommendation = self.cta_service.generate_smart_cta(
            business_context=self.mock_business_context,
            review=self.mock_negative_review,
            service_type="haircut"
        )
        
        # Verify recommendation structure
        self.assertIsInstance(recommendation, CTARecommendation)
        
        # Verify negative sentiment handling (should suggest contact)
        self.assertEqual(recommendation.primary_variant.type, CTAType.CONTACT)
        
        # Verify apologetic tone
        cta_text_lower = recommendation.primary_variant.text.lower()
        self.assertTrue(
            any(word in cta_text_lower for word in ["sorry", "apologize", "contact", "discuss"])
        )
    
    def test_generate_smart_cta_neutral_sentiment(self):
        """Test CTA generation for neutral sentiment"""
        recommendation = self.cta_service.generate_smart_cta(
            business_context=self.mock_business_context,
            review=self.mock_neutral_review,
            service_type="styling"
        )
        
        # Verify recommendation structure
        self.assertIsInstance(recommendation, CTARecommendation)
        
        # Verify neutral sentiment handling
        self.assertIn(recommendation.primary_variant.type, [CTAType.VISIT, CTAType.BOOK])
        
        # Verify professional tone
        self.assertIn("Elite Barber Shop", recommendation.primary_variant.text)
    
    def test_generate_smart_cta_without_review(self):
        """Test CTA generation without review data"""
        recommendation = self.cta_service.generate_smart_cta(
            business_context=self.mock_business_context,
            service_type="general"
        )
        
        # Should generate valid recommendation even without review
        self.assertIsInstance(recommendation, CTARecommendation)
        self.assertIsInstance(recommendation.primary_variant, CTAVariant)
    
    def test_optimize_cta_for_sentiment(self):
        """Test CTA optimization for specific sentiment"""
        original_cta = "Visit us again soon!"
        
        # Test positive sentiment optimization
        optimized_positive = self.cta_service.optimize_cta_for_sentiment(
            cta=original_cta,
            sentiment=ReviewSentiment.POSITIVE,
            business_context=self.mock_business_context
        )
        self.assertIsInstance(optimized_positive, str)
        self.assertIn("Elite Barber Shop", optimized_positive)
        
        # Test negative sentiment optimization
        optimized_negative = self.cta_service.optimize_cta_for_sentiment(
            cta=original_cta,
            sentiment=ReviewSentiment.NEGATIVE,
            business_context=self.mock_business_context
        )
        self.assertIsInstance(optimized_negative, str)
        # Should add apologetic language for negative sentiment
        self.assertTrue(
            any(word in optimized_negative.lower() for word in ["contact", "please"])
        )
    
    def test_track_cta_performance(self):
        """Test CTA performance tracking"""
        cta_id = "test_cta_123"
        
        # Track impression
        self.cta_service.track_cta_performance(cta_id, "impression")
        self.assertIn(cta_id, self.cta_service.performance_data)
        self.assertEqual(self.cta_service.performance_data[cta_id].impressions, 1)
        
        # Track click
        self.cta_service.track_cta_performance(cta_id, "click")
        self.assertEqual(self.cta_service.performance_data[cta_id].clicks, 1)
        
        # Track conversion
        self.cta_service.track_cta_performance(cta_id, "conversion")
        self.assertEqual(self.cta_service.performance_data[cta_id].conversions, 1)
        
        # Verify CTR calculation
        performance = self.cta_service.performance_data[cta_id]
        self.assertEqual(performance.click_through_rate, 1.0)  # 1 click / 1 impression
        self.assertEqual(performance.conversion_rate, 1.0)     # 1 conversion / 1 click
    
    def test_get_seasonal_cta_variants(self):
        """Test seasonal CTA variant generation"""
        variants = self.cta_service.get_seasonal_cta_variants(
            business_context=self.mock_business_context,
            season="spring"
        )
        
        self.assertIsInstance(variants, list)
        self.assertGreater(len(variants), 0)
        
        # Check that variants contain seasonal elements
        spring_found = False
        for variant in variants:
            if any(word in variant.lower() for word in ["spring", "fresh", "refresh"]):
                spring_found = True
                break
        self.assertTrue(spring_found)
    
    def test_get_cta_performance_analytics(self):
        """Test CTA performance analytics generation"""
        # Add some test performance data
        test_data = {
            "cta_1": CTAPerformanceData("cta_1", impressions=100, clicks=10, conversions=2),
            "cta_2": CTAPerformanceData("cta_2", impressions=200, clicks=15, conversions=3)
        }
        self.cta_service.performance_data.update(test_data)
        
        analytics = self.cta_service.get_cta_performance_analytics(30)
        
        # Verify analytics structure
        self.assertIsInstance(analytics, dict)
        self.assertIn("total_impressions", analytics)
        self.assertIn("total_clicks", analytics)
        self.assertIn("total_conversions", analytics)
        self.assertIn("average_ctr", analytics)
        self.assertIn("top_performers", analytics)
        
        # Verify calculations
        self.assertEqual(analytics["total_impressions"], 300)
        self.assertEqual(analytics["total_clicks"], 25)
        self.assertEqual(analytics["total_conversions"], 5)
    
    def test_create_ab_test(self):
        """Test A/B test creation"""
        # Create test variants
        variant_a = CTAVariant(
            id="variant_a",
            text="Visit us again soon!",
            type=CTAType.VISIT,
            placement=CTAPlacement.END,
            personalization_level=CTAPersonalization.BASIC
        )
        
        variant_b = CTAVariant(
            id="variant_b", 
            text="Book your next appointment today!",
            type=CTAType.BOOK,
            placement=CTAPlacement.END,
            personalization_level=CTAPersonalization.BASIC
        )
        
        # Create A/B test
        test_id = self.cta_service.create_ab_test(
            test_name="visit_vs_book",
            variants=[variant_a, variant_b],
            business_context=self.mock_business_context
        )
        
        # Verify test creation
        self.assertIsInstance(test_id, str)
        self.assertIn(test_id, self.cta_service.active_tests)
        self.assertEqual(len(self.cta_service.active_tests[test_id]), 2)
        
        # Verify performance tracking initialization
        self.assertIn("variant_a", self.cta_service.performance_data)
        self.assertIn("variant_b", self.cta_service.performance_data)
    
    def test_create_ab_test_insufficient_variants(self):
        """Test A/B test creation with insufficient variants"""
        variant_a = CTAVariant(
            id="variant_a",
            text="Visit us again soon!",
            type=CTAType.VISIT,
            placement=CTAPlacement.END,
            personalization_level=CTAPersonalization.BASIC
        )
        
        # Should raise error with only one variant
        with self.assertRaises(ValueError):
            self.cta_service.create_ab_test(
                test_name="insufficient_test",
                variants=[variant_a],
                business_context=self.mock_business_context
            )
    
    def test_cta_quality_validation(self):
        """Test CTA quality validation"""
        # Test valid CTA
        valid_cta = "Visit us again at Elite Barber Shop!"
        self.assertTrue(self.cta_service._validate_cta_quality(valid_cta))
        
        # Test too short CTA
        short_cta = "Hi!"
        self.assertFalse(self.cta_service._validate_cta_quality(short_cta))
        
        # Test too long CTA
        long_cta = "A" * 300  # Exceeds max length
        self.assertFalse(self.cta_service._validate_cta_quality(long_cta))
        
        # Test excessive caps
        caps_cta = "VISIT US TODAY FOR AMAZING SERVICE!!!"
        self.assertFalse(self.cta_service._validate_cta_quality(caps_cta))
        
        # Test spam keywords
        spam_cta = "FREE! URGENT! ACT NOW! LIMITED TIME OFFER!"
        self.assertFalse(self.cta_service._validate_cta_quality(spam_cta))
    
    def test_sentiment_determination(self):
        """Test sentiment determination from reviews"""
        # Test positive sentiment
        positive_sentiment = self.cta_service._determine_sentiment(self.mock_positive_review)
        self.assertEqual(positive_sentiment, "positive")
        
        # Test negative sentiment
        negative_sentiment = self.cta_service._determine_sentiment(self.mock_negative_review)
        self.assertEqual(negative_sentiment, "negative")
        
        # Test neutral sentiment
        neutral_sentiment = self.cta_service._determine_sentiment(self.mock_neutral_review)
        self.assertEqual(neutral_sentiment, "neutral")
        
        # Test no review
        no_review_sentiment = self.cta_service._determine_sentiment(None)
        self.assertEqual(no_review_sentiment, "neutral")
    
    def test_personalization_application(self):
        """Test CTA personalization"""
        template = "Visit {business_name} at {phone} in {city}!"
        
        personalized = self.cta_service._apply_personalization(
            template, self.mock_business_context
        )
        
        # Verify personalization applied
        self.assertIn("Elite Barber Shop", personalized)
        self.assertIn("(555) 123-4567", personalized)
        self.assertIn("New York", personalized)
        self.assertNotIn("{business_name}", personalized)
        self.assertNotIn("{phone}", personalized)
        self.assertNotIn("{city}", personalized)
    
    def test_seasonal_modifier_application(self):
        """Test seasonal modifier application"""
        cta = "Book your {service} appointment today!"
        
        # Test spring modifier
        spring_cta = self.cta_service._apply_seasonal_modifier(cta, "spring")
        self.assertNotIn("{service}", spring_cta)
        
        # Test with CTA that doesn't have {service} placeholder
        no_placeholder_cta = "Visit us again!"
        result = self.cta_service._apply_seasonal_modifier(no_placeholder_cta, "spring")
        self.assertEqual(result, no_placeholder_cta)  # Should remain unchanged
    
    def test_service_type_extraction(self):
        """Test service type extraction from keywords"""
        # Test haircut keywords
        haircut_keywords = ["haircut", "men's cut", "trim"]
        service_type = self.cta_service._extract_service_type(haircut_keywords)
        self.assertEqual(service_type, "haircut")
        
        # Test beard keywords
        beard_keywords = ["beard trim", "facial hair"]
        service_type = self.cta_service._extract_service_type(beard_keywords)
        self.assertEqual(service_type, "beard_trim")
        
        # Test unknown keywords
        unknown_keywords = ["random", "unknown"]
        service_type = self.cta_service._extract_service_type(unknown_keywords)
        self.assertEqual(service_type, "general")
    
    def test_error_handling(self):
        """Test error handling in CTA generation"""
        # Test with invalid business context
        recommendation = self.cta_service.generate_smart_cta(
            business_context=None,
            review=self.mock_positive_review
        )
        
        # Should return fallback recommendation
        self.assertIsInstance(recommendation, CTARecommendation)
        self.assertEqual(recommendation.primary_variant.text, "Thank you for your feedback!")
        self.assertIn("Fallback CTA generated due to error", recommendation.optimization_notes)
    
    def test_cta_effectiveness_scoring(self):
        """Test CTA effectiveness scoring"""
        # Create test variant
        variant = CTAVariant(
            id="test",
            text="Book your appointment at Elite Barber Shop!",
            type=CTAType.BOOK,
            placement=CTAPlacement.END,
            personalization_level=CTAPersonalization.ADVANCED
        )
        
        # Create test context
        context = CTAContext(
            business_context=self.mock_business_context,
            review=self.mock_positive_review,
            service_type="haircut"
        )
        
        # Calculate effectiveness score
        score = self.cta_service._calculate_effectiveness_score(variant, context)
        
        # Verify score is within valid range
        self.assertGreaterEqual(score, 0.0)
        self.assertLessEqual(score, 1.0)
        
        # Book CTAs should score higher than follow CTAs
        follow_variant = CTAVariant(
            id="test_follow",
            text="Follow us on social media!",
            type=CTAType.FOLLOW,
            placement=CTAPlacement.END,
            personalization_level=CTAPersonalization.NONE
        )
        
        follow_score = self.cta_service._calculate_effectiveness_score(follow_variant, context)
        self.assertGreater(score, follow_score)


class TestCTAUtilityFunctions(unittest.TestCase):
    """Test utility functions for CTA service"""
    
    def test_calculate_cta_roi_estimate(self):
        """Test CTA ROI calculation"""
        roi_estimate = calculate_cta_roi_estimate(
            baseline_conversion_rate=0.05,
            optimized_conversion_rate=0.08,
            monthly_impressions=1000
        )
        
        # Verify ROI structure
        self.assertIsInstance(roi_estimate, dict)
        self.assertIn("conversion_rate_improvement", roi_estimate)
        self.assertIn("additional_monthly_conversions", roi_estimate)
        self.assertIn("estimated_monthly_revenue_increase", roi_estimate)
        self.assertIn("roi_percentage", roi_estimate)
        
        # Verify calculations
        self.assertEqual(roi_estimate["conversion_rate_improvement"], 0.03)
        self.assertEqual(roi_estimate["additional_monthly_conversions"], 30.0)
        self.assertEqual(roi_estimate["estimated_monthly_revenue_increase"], 1500.0)
        self.assertEqual(roi_estimate["roi_percentage"], 60.0)
    
    def test_generate_cta_performance_report(self):
        """Test CTA performance report generation"""
        # Create mock CTA service
        mock_service = Mock(spec=SmartCTAService)
        mock_service.get_cta_performance_analytics.return_value = {
            "total_impressions": 1000,
            "total_clicks": 50,
            "total_conversions": 10,
            "average_ctr": 0.05,
            "average_conversion_rate": 0.2
        }
        
        report = generate_cta_performance_report(mock_service, 30)
        
        # Verify report structure
        self.assertIsInstance(report, dict)
        self.assertIn("insights", report)
        self.assertIn("report_type", report)
        self.assertEqual(report["report_type"], "CTA Performance Analysis")


class TestCTADataClasses(unittest.TestCase):
    """Test CTA data classes"""
    
    def test_cta_variant_creation(self):
        """Test CTAVariant creation"""
        variant = CTAVariant(
            id="test_variant",
            text="Visit us again!",
            type=CTAType.VISIT,
            placement=CTAPlacement.END,
            personalization_level=CTAPersonalization.BASIC
        )
        
        self.assertEqual(variant.id, "test_variant")
        self.assertEqual(variant.text, "Visit us again!")
        self.assertEqual(variant.type, CTAType.VISIT)
        self.assertEqual(variant.placement, CTAPlacement.END)
        self.assertEqual(variant.personalization_level, CTAPersonalization.BASIC)
        self.assertIsInstance(variant.created_at, datetime)
    
    def test_cta_performance_data_calculations(self):
        """Test CTAPerformanceData calculations"""
        performance = CTAPerformanceData(
            variant_id="test",
            impressions=100,
            clicks=10,
            conversions=2
        )
        
        # Test CTR calculation
        self.assertEqual(performance.click_through_rate, 0.1)
        
        # Test conversion rate calculation
        self.assertEqual(performance.conversion_rate, 0.2)
        
        # Test with zero values
        empty_performance = CTAPerformanceData(variant_id="empty")
        self.assertEqual(empty_performance.click_through_rate, 0.0)
        self.assertEqual(empty_performance.conversion_rate, 0.0)
    
    def test_cta_context_creation(self):
        """Test CTAContext creation"""
        business_context = BusinessContext(business_name="Test Shop")
        
        context = CTAContext(
            business_context=business_context,
            service_type="haircut",
            season="spring"
        )
        
        self.assertEqual(context.business_context, business_context)
        self.assertEqual(context.service_type, "haircut")
        self.assertEqual(context.season, "spring")
    
    def test_cta_recommendation_structure(self):
        """Test CTARecommendation structure"""
        primary_variant = CTAVariant(
            id="primary",
            text="Book now!",
            type=CTAType.BOOK,
            placement=CTAPlacement.END,
            personalization_level=CTAPersonalization.BASIC
        )
        
        recommendation = CTARecommendation(
            primary_variant=primary_variant,
            effectiveness_score=0.85,
            local_seo_value=0.7,
            a_b_test_ready=True
        )
        
        self.assertEqual(recommendation.primary_variant, primary_variant)
        self.assertEqual(recommendation.effectiveness_score, 0.85)
        self.assertEqual(recommendation.local_seo_value, 0.7)
        self.assertTrue(recommendation.a_b_test_ready)


if __name__ == "__main__":
    # Configure test logging
    import logging
    logging.basicConfig(level=logging.INFO)
    
    # Run tests
    unittest.main(verbosity=2)
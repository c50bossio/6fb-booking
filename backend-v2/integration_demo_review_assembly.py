#!/usr/bin/env python3
"""
Integration Demo: How to use Dynamic Content Assembly System in Review Response Endpoints.
Shows how to integrate the assembly system into the existing review router.
"""

import sys
import os
from datetime import datetime

# Add backend-v2 to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import Session
from db import SessionLocal
from models import User
from models.review import Review, ReviewPlatform, ReviewSentiment, ReviewResponseStatus
from services.dynamic_content_assembly import DynamicContentAssemblyService, QualityLevel


def demo_enhanced_review_response_generation():
    """
    Demo: Enhanced Review Response Generation using Dynamic Content Assembly System
    
    This shows how to integrate the assembly system into existing review endpoints.
    """
    print("🚀 Dynamic Content Assembly System - Integration Demo")
    print("=" * 80)
    
    db = SessionLocal()
    try:
        # Get or create a test user (barber)
        user = User(
            email=f"demo_{int(datetime.now().timestamp())}@barbershop.com",
            name="Demo Barber Shop",
            role="barber",
            phone="+1234567890",
            hashed_password="demo_hash",
            is_active=True
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        
        print(f"📋 Demo User: {user.name} ({user.email})")
        
        # Sample reviews to demonstrate different scenarios
        test_reviews = [
            {
                "scenario": "5-Star Positive Review",
                "data": {
                    "platform": ReviewPlatform.GOOGLE,
                    "reviewer_name": "Sarah Johnson",
                    "rating": 5.0,
                    "review_text": "Absolutely fantastic experience! John gave me the best haircut I've had in years. The atmosphere is professional yet welcoming, and the attention to detail is outstanding. Will definitely be returning!",
                    "sentiment": ReviewSentiment.POSITIVE
                }
            },
            {
                "scenario": "3-Star Neutral Review",
                "data": {
                    "platform": ReviewPlatform.YELP,
                    "reviewer_name": "Mike Chen",
                    "rating": 3.0,
                    "review_text": "Decent haircut, nothing special. Service was okay. Price was fair for what I got. Might try somewhere else next time.",
                    "sentiment": ReviewSentiment.NEUTRAL
                }
            },
            {
                "scenario": "2-Star Negative Review",
                "data": {
                    "platform": ReviewPlatform.GOOGLE,
                    "reviewer_name": "David Wilson",
                    "rating": 2.0,
                    "review_text": "Very disappointed. Had to wait 45 minutes past my appointment time. The haircut was rushed and not what I asked for. Won't be coming back.",
                    "sentiment": ReviewSentiment.NEGATIVE
                }
            }
        ]
        
        # Initialize the Dynamic Content Assembly System
        print("\n🔧 Initializing Dynamic Content Assembly System...")
        assembly_service = DynamicContentAssemblyService(db)
        print("✅ Assembly system ready")
        
        # Process each review scenario
        for i, test_case in enumerate(test_reviews, 1):
            print(f"\n{'='*60}")
            print(f"📋 Scenario {i}: {test_case['scenario']}")
            print(f"{'='*60}")
            
            # Create review
            review_data = test_case["data"]
            review = Review(
                user_id=user.id,
                platform=review_data["platform"],
                external_review_id=f"demo_{i}_{int(datetime.now().timestamp())}",
                reviewer_name=review_data["reviewer_name"],
                rating=review_data["rating"],
                review_text=review_data["review_text"],
                sentiment=review_data["sentiment"],
                review_date=datetime.now(),
                response_status=ReviewResponseStatus.PENDING,
                is_verified=True,
                is_flagged=False
            )
            db.add(review)
            db.commit()
            db.refresh(review)
            
            print(f"📝 Original Review:")
            print(f"   Platform: {review.platform.value}")
            print(f"   Reviewer: {review.reviewer_name}")
            print(f"   Rating: {review.rating}/5 ⭐")
            print(f"   Content: {review.review_text}")
            print(f"   Sentiment: {review.sentiment.value}")
            
            # Method 1: Basic Assembly (Default Quality)
            print(f"\n🤖 Method 1: Basic Assembly")
            start_time = datetime.now()
            assembled_response = assembly_service.assemble_complete_response(review, db)
            processing_time = (datetime.now() - start_time).total_seconds()
            
            print(f"   ⚡ Processing Time: {processing_time:.3f}s")
            print(f"   📊 Quality Score: {assembled_response.quality_report.overall_score:.2f} ({assembled_response.quality_report.quality_level.value})")
            print(f"   📝 Response: {assembled_response.final_response}")
            print(f"   🔧 Optimizations: {assembled_response.optimization_applied}")
            
            if assembled_response.fallbacks_used:
                print(f"   ⚠️  Fallbacks Used: {assembled_response.fallbacks_used}")
            
            # Method 2: Quality-Optimized Assembly (Target High Quality)
            print(f"\n🎯 Method 2: Quality-Optimized Assembly (Target: GOOD)")
            start_time = datetime.now()
            
            business_context = assembly_service.business_context_service.get_business_context(user.id)
            optimized_response = assembly_service.optimize_response_pipeline(
                review, 
                business_context, 
                target_quality=QualityLevel.GOOD
            )
            processing_time = (datetime.now() - start_time).total_seconds()
            
            print(f"   ⚡ Processing Time: {processing_time:.3f}s")
            print(f"   📝 Optimized Response: {optimized_response}")
            
            # Method 3: Custom Context Assembly
            print(f"\n🎨 Method 3: Custom Context Assembly")
            custom_context = {
                'business_name': 'Elite Barber Studio',
                'specialty_services': ['Premium Styling', 'Beard Artistry', 'Traditional Shaves']
            }
            priority_keywords = ['premium', 'professional', 'skilled', 'experienced']
            
            start_time = datetime.now()
            custom_assembled = assembly_service.assemble_complete_response(
                review, 
                db, 
                custom_context=custom_context,
                priority_keywords=priority_keywords
            )
            processing_time = (datetime.now() - start_time).total_seconds()
            
            print(f"   ⚡ Processing Time: {processing_time:.3f}s")
            print(f"   📝 Custom Response: {custom_assembled.final_response}")
            print(f"   🏷️  Priority Keywords Used: {priority_keywords}")
            
            # Quality Comparison
            print(f"\n📊 Quality Comparison:")
            print(f"   Basic Assembly:    {assembled_response.quality_report.overall_score:.2f} ({assembled_response.quality_report.quality_level.value})")
            print(f"   Custom Assembly:   {custom_assembled.quality_report.overall_score:.2f} ({custom_assembled.quality_report.quality_level.value})")
            
            # Show specific quality metrics
            if assembled_response.quality_report.content_issues:
                print(f"   ⚠️  Issues Found: {assembled_response.quality_report.content_issues}")
            
            if assembled_response.quality_report.recommendations:
                print(f"   💡 Recommendations: {assembled_response.quality_report.recommendations}")
        
        # System Analytics Demo
        print(f"\n{'='*80}")
        print("📈 System Analytics and Performance Metrics")
        print(f"{'='*80}")
        
        analytics = assembly_service.get_assembly_analytics()
        print(f"📊 Performance Metrics:")
        print(f"   Total Requests: {analytics.performance_metrics.total_requests}")
        print(f"   Successful Assemblies: {analytics.performance_metrics.successful_assemblies}")
        print(f"   Failed Assemblies: {analytics.performance_metrics.failed_assemblies}")
        print(f"   Average Response Time: {analytics.performance_metrics.average_response_time:.3f}s")
        print(f"   Quality Distribution: {analytics.performance_metrics.quality_distribution}")
        
        if analytics.performance_metrics.fallback_usage:
            print(f"   Fallback Usage: {analytics.performance_metrics.fallback_usage}")
        
        print(f"\n🔧 Service Health:")
        for service, health in analytics.service_health.items():
            status = "🟢 Healthy" if health > 0.8 else "🟡 Warning" if health > 0.6 else "🔴 Critical"
            print(f"   {service}: {health:.2f} {status}")
        
        print(f"\n✅ Integration Demo Completed Successfully!")
        print(f"🎯 The Dynamic Content Assembly System is ready for production integration!")
        
    except Exception as e:
        print(f"❌ Demo failed: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


def show_integration_code_example():
    """Show code example for integrating into review router"""
    print(f"\n{'='*80}")
    print("💻 Integration Code Example")
    print(f"{'='*80}")
    
    integration_code = '''
# Example: Enhanced Review Response Endpoint using Dynamic Content Assembly System

from services.dynamic_content_assembly import DynamicContentAssemblyService, QualityLevel

@router.post("/reviews/{review_id}/generate-response", response_model=ReviewResponseSchema)
async def generate_enhanced_review_response(
    review_id: int,
    quality_target: QualityLevel = QualityLevel.GOOD,
    custom_context: Optional[Dict[str, Any]] = None,
    priority_keywords: Optional[List[str]] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Generate enhanced review response using AI assembly system"""
    try:
        # Get the review
        review = db.query(Review).filter(
            Review.id == review_id,
            Review.user_id == current_user.id
        ).first()
        
        if not review:
            raise HTTPException(status_code=404, detail="Review not found")
        
        # Initialize assembly service
        assembly_service = DynamicContentAssemblyService(db)
        
        # Generate enhanced response
        assembled_response = assembly_service.assemble_complete_response(
            review=review,
            db=db,
            custom_context=custom_context,
            priority_keywords=priority_keywords
        )
        
        # Create response record
        response = ReviewResponse(
            review_id=review.id,
            response_text=assembled_response.final_response,
            auto_generated=True,
            quality_score=assembled_response.quality_report.overall_score,
            processing_time=assembled_response.processing_time,
            metadata={
                "quality_level": assembled_response.quality_report.quality_level.value,
                "optimizations_applied": assembled_response.optimization_applied,
                "fallbacks_used": assembled_response.fallbacks_used,
                "character_count": assembled_response.character_count,
                "word_count": assembled_response.word_count
            }
        )
        
        db.add(response)
        db.commit()
        db.refresh(response)
        
        return ReviewResponseSchema.from_orm(response)
        
    except Exception as e:
        logger.error(f"Enhanced response generation failed: {e}")
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to generate enhanced response: {str(e)}"
        )

# Example: Bulk Enhanced Response Generation
@router.post("/reviews/bulk/generate-enhanced", response_model=BulkResponseResponse)
async def bulk_generate_enhanced_responses(
    review_ids: List[int],
    quality_target: QualityLevel = QualityLevel.GOOD,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Generate enhanced responses for multiple reviews"""
    assembly_service = DynamicContentAssemblyService(db)
    results = []
    
    for review_id in review_ids:
        try:
            review = db.query(Review).filter(
                Review.id == review_id,
                Review.user_id == current_user.id
            ).first()
            
            if review:
                assembled_response = assembly_service.assemble_complete_response(review, db)
                
                # Save response
                response = ReviewResponse(
                    review_id=review.id,
                    response_text=assembled_response.final_response,
                    auto_generated=True,
                    quality_score=assembled_response.quality_report.overall_score
                )
                db.add(response)
                
                results.append({
                    "review_id": review_id,
                    "success": True,
                    "quality_score": assembled_response.quality_report.overall_score,
                    "processing_time": assembled_response.processing_time
                })
            else:
                results.append({
                    "review_id": review_id,
                    "success": False,
                    "error": "Review not found"
                })
                
        except Exception as e:
            results.append({
                "review_id": review_id,
                "success": False,
                "error": str(e)
            })
    
    db.commit()
    return {"results": results}
'''
    
    print(integration_code)


if __name__ == "__main__":
    demo_enhanced_review_response_generation()
    show_integration_code_example()
    
    print(f"\n{'='*80}")
    print("🎉 Dynamic Content Assembly System Integration Demo Complete!")
    print("🚀 Ready for production deployment!")
    print(f"{'='*80}")
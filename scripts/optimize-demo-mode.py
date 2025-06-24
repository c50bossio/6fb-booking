#!/usr/bin/env python3
"""
6FB Booking - Demo Mode Optimization Script
Enhances demo data for compelling sales presentations
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))

from datetime import date, timedelta, datetime
import json
import random

def generate_enhanced_demo_data():
    """Generate enhanced demo data for sales presentations"""
    
    # Enhanced barber profiles with compelling stories
    barbers = [
        {
            "id": 1,
            "name": "Marcus 'The Artist' Johnson",
            "role": "Master Barber & Shop Owner",
            "payment_type": "commission",
            "rate": 0.65,  # Higher rate for master barber
            "specialties": ["Fades", "Beard Sculpting", "Traditional Cuts"],
            "years_experience": 12,
            "monthly_target": 15000,
            "story": "Top performer who built his reputation on precision cuts"
        },
        {
            "id": 2,
            "name": "DeAndre 'Fade King' Williams",
            "role": "Senior Barber",
            "payment_type": "booth_rent",
            "rent": 320,  # Weekly rent
            "specialties": ["Modern Fades", "Designs", "Color"],
            "years_experience": 8,
            "monthly_target": 12000,
            "story": "Independent operator who prefers booth rental model"
        },
        {
            "id": 3,
            "name": "Carlos 'Precision' Rodriguez",
            "role": "Barber",
            "payment_type": "commission", 
            "rate": 0.55,
            "specialties": ["Classic Cuts", "Straight Razor", "Mustache Grooming"],
            "years_experience": 6,
            "monthly_target": 10000,
            "story": "Growing barber with consistent client base"
        },
        {
            "id": 4,
            "name": "Jamal 'The Rookie' Thompson",
            "role": "Junior Barber",
            "payment_type": "hybrid",
            "rate": 0.45,
            "rent": 180,  # Lower rent for junior
            "specialties": ["Basic Cuts", "Lineups", "Student Cuts"],
            "years_experience": 2,
            "monthly_target": 7500,
            "story": "New talent learning the trade with hybrid compensation"
        }
    ]
    
    # Generate realistic seasonal revenue trends
    def generate_seasonal_revenue():
        today = date.today()
        monthly_data = []
        
        # Base monthly revenue with seasonal variations
        base_revenue = 35000
        seasonal_multipliers = {
            1: 0.85,   # January (slow post-holiday)
            2: 0.90,   # February 
            3: 0.95,   # March
            4: 1.00,   # April
            5: 1.05,   # May (prom season)
            6: 1.10,   # June (wedding season)
            7: 1.15,   # July (summer peak)
            8: 1.10,   # August
            9: 1.05,   # September (back to school)
            10: 1.00,  # October
            11: 1.20,  # November (holiday prep)
            12: 1.25   # December (holiday peak)
        }
        
        for month_offset in range(-11, 1):  # Last 12 months
            target_date = today.replace(day=1) + timedelta(days=32 * month_offset)
            month = target_date.month
            
            # Apply seasonal multiplier with some randomness
            seasonal_revenue = base_revenue * seasonal_multipliers[month]
            actual_revenue = seasonal_revenue * random.uniform(0.92, 1.08)
            
            monthly_data.append({
                "month": target_date.strftime("%B %Y"),
                "revenue": round(actual_revenue, 2),
                "services": round(actual_revenue * 0.85, 2),
                "products": round(actual_revenue * 0.10, 2),
                "tips": round(actual_revenue * 0.05, 2),
                "appointments": int(actual_revenue / 45),  # ~$45 average ticket
                "new_clients": random.randint(15, 35),
                "retention_rate": random.uniform(0.75, 0.90)
            })
        
        return monthly_data
    
    # Generate compelling shop metrics
    def generate_shop_performance():
        return {
            "shop_name": "Elite Cuts & Grooming",
            "location": "Downtown Metro District",
            "established": "2019",
            "total_barbers": 4,
            "total_chairs": 6,
            "operating_hours": "9 AM - 8 PM (Mon-Sat), 10 AM - 6 PM (Sun)",
            "avg_ticket": 47.50,
            "monthly_revenue": 37650,
            "monthly_growth": 12.3,
            "client_retention": 87.5,
            "utilization_rate": 78.2,
            "six_fb_score": 8.4
        }
    
    # Generate payout scenarios
    def generate_payout_scenarios():
        return [
            {
                "scenario": "Weekly Commission Payout",
                "barber": "Marcus Johnson",
                "period": "Dec 16-22, 2024",
                "revenue_generated": 2850.00,
                "commission_rate": 65,
                "gross_earnings": 1852.50,
                "deductions": {
                    "processing_fees": 45.30,
                    "supplies": 25.00
                },
                "net_payout": 1782.20,
                "status": "processed",
                "payout_date": "2024-12-23"
            },
            {
                "scenario": "Monthly Booth Rent",
                "barber": "DeAndre Williams", 
                "period": "December 2024",
                "revenue_generated": 13200.00,
                "booth_rent": 1280.00,  # 4 weeks @ $320
                "net_earnings": 11920.00,
                "rent_status": "paid",
                "earnings_vs_rent_ratio": 9.3
            },
            {
                "scenario": "Hybrid Model Payout",
                "barber": "Jamal Thompson",
                "period": "Dec 16-22, 2024", 
                "revenue_generated": 1650.00,
                "commission_earned": 742.50,  # 45% of revenue
                "booth_rent_due": 180.00,  # Weekly portion
                "net_earnings": 562.50,
                "status": "pending"
            }
        ]
    
    # Generate business insights
    def generate_insights():
        return {
            "top_insights": [
                {
                    "type": "revenue_opportunity",
                    "title": "Peak Hours Optimization",
                    "description": "You're operating at 78% capacity during peak hours (6-8 PM). Adding evening appointments could increase revenue by $4,200/month.",
                    "potential_value": 4200,
                    "confidence": "High"
                },
                {
                    "type": "staff_performance", 
                    "title": "Training ROI",
                    "description": "Jamal's earnings increased 23% after advanced fade training. Similar training for all junior barbers could boost shop revenue.",
                    "potential_value": 2800,
                    "confidence": "Medium"
                },
                {
                    "type": "retention_improvement",
                    "title": "Client Retention Focus",
                    "description": "Implementing a loyalty program could improve your 87.5% retention rate to 92%, worth $3,100/month in additional revenue.",
                    "potential_value": 3100,
                    "confidence": "High"
                }
            ],
            "kpi_trends": {
                "revenue_trend": "+12.3% vs last month",
                "client_growth": "+8.7% new clients",
                "efficiency": "+5.2% appointments per hour", 
                "profitability": "+15.1% net profit margin"
            }
        }
    
    # Compile all demo data
    demo_package = {
        "generated_at": datetime.now().isoformat(),
        "version": "2.0",
        "barbers": barbers,
        "seasonal_revenue": generate_seasonal_revenue(),
        "shop_performance": generate_shop_performance(), 
        "payout_scenarios": generate_payout_scenarios(),
        "business_insights": generate_insights(),
        "demo_features": [
            "Real-time financial dashboard",
            "Automated payout calculations",
            "Performance analytics & insights",
            "Multiple compensation models",
            "Mobile-responsive design",
            "Integration-ready architecture"
        ]
    }
    
    return demo_package

def save_demo_data():
    """Save enhanced demo data to files"""
    demo_data = generate_enhanced_demo_data()
    
    # Save to backend for API responses
    backend_file = os.path.join(os.path.dirname(__file__), '..', 'backend', 'enhanced_demo_data.json')
    with open(backend_file, 'w') as f:
        json.dump(demo_data, f, indent=2)
    
    print("✅ Enhanced demo data saved to:", backend_file)
    
    # Create sales presentation data
    sales_data = {
        "executive_summary": {
            "monthly_revenue": "$37,650",
            "revenue_growth": "+12.3%",
            "profit_margin": "42.5%",
            "time_savings": "15 hours/week",
            "roi_timeline": "2-3 months"
        },
        "before_after": {
            "before": {
                "method": "Manual spreadsheets & calculations",
                "time_spent": "15+ hours/week on financial admin",
                "errors": "Frequent calculation mistakes",
                "insights": "Limited visibility into trends",
                "payout_delays": "2-3 days for manual processing"
            },
            "after": {
                "method": "Automated 6FB Financial Dashboard",
                "time_spent": "2 hours/week for review & strategy",
                "errors": "Automated calculations eliminate errors",
                "insights": "Real-time analytics & forecasting",
                "payout_processing": "Same-day automated payouts"
            }
        },
        "competitive_advantages": [
            "Built specifically for barbershops",
            "Supports all compensation models",
            "Real-time financial insights",
            "Automated payout processing",
            "Six Figure Barber methodology integration",
            "Mobile-first responsive design"
        ]
    }
    
    sales_file = os.path.join(os.path.dirname(__file__), '..', 'SALES_DEMO_DATA.json')
    with open(sales_file, 'w') as f:
        json.dump(sales_data, f, indent=2)
    
    print("✅ Sales presentation data saved to:", sales_file)
    
    return demo_data

if __name__ == "__main__":
    print("🎯 Optimizing 6FB Demo Mode for Sales Presentations...")
    print("=" * 60)
    
    demo_data = save_demo_data()
    
    print("\n📊 Demo Data Summary:")
    print(f"- {len(demo_data['barbers'])} Barber Profiles")
    print(f"- {len(demo_data['seasonal_revenue'])} Months of Revenue Data")
    print(f"- {len(demo_data['payout_scenarios'])} Payout Scenarios")
    print(f"- {len(demo_data['business_insights']['top_insights'])} Business Insights")
    
    print("\n🎉 Demo optimization complete!")
    print("Your financial dashboard now has compelling, realistic data for sales presentations.")
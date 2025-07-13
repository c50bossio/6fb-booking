"""
Agent Analytics Service - Enhanced service for calculating metrics and generating reports

This service provides comprehensive analytics functionality including:
- Real-time metrics calculation and aggregation
- Cost tracking and optimization analysis
- Performance analytics and reporting
- Usage trend analysis and forecasting
- ROI calculations and business impact metrics
"""

import asyncio
import json
import logging
from datetime import datetime, timezone, timedelta, date
from typing import Dict, List, Optional, Any, Tuple, Union
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, desc, asc, case, extract
from decimal import Decimal
from enum import Enum
import statistics

from models import (
    Agent, AgentInstance, AgentConversation, AgentMetrics, AgentSubscription,
    AgentStatus, ConversationStatus, Client, Appointment, Payment, User
)
from services.ai_providers.ai_provider_manager import AIProviderManager
from config import settings

logger = logging.getLogger(__name__)


class MetricType(Enum):
    """Types of metrics to calculate"""
    PERFORMANCE = "performance"
    COST = "cost"
    USAGE = "usage"
    BUSINESS_IMPACT = "business_impact"
    CLIENT_SATISFACTION = "client_satisfaction"


class ReportFormat(Enum):
    """Report output formats"""
    JSON = "json"
    CSV = "csv"
    PDF = "pdf"
    DASHBOARD = "dashboard"


class TimeGranularity(Enum):
    """Time granularity for metrics"""
    HOUR = "hour"
    DAY = "day"
    WEEK = "week"
    MONTH = "month"
    QUARTER = "quarter"
    YEAR = "year"


class AgentAnalyticsService:
    """Enhanced service for calculating metrics and generating reports"""
    
    def __init__(self):
        self.ai_manager = AIProviderManager()
        self.metrics_cache = {}  # Cache for expensive calculations
        self.cache_ttl = 300  # 5 minutes cache TTL
        
    async def get_real_time_metrics(
        self, 
        db: Session, 
        instance_id: Optional[int] = None,
        agent_id: Optional[int] = None,
        user_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Get real-time metrics for agents/instances
        
        Args:
            db: Database session
            instance_id: Optional specific instance
            agent_id: Optional specific agent
            user_id: Optional user filter
            
        Returns:
            Real-time metrics dashboard data
        """
        try:
            # Build base filters
            filters = []
            if user_id:
                filters.append(Agent.user_id == user_id)
            if agent_id:
                filters.append(AgentInstance.agent_id == agent_id)
            if instance_id:
                filters.append(AgentInstance.id == instance_id)
            
            # Get active instances
            instances_query = db.query(AgentInstance).join(Agent)
            if filters:
                instances_query = instances_query.filter(and_(*filters))
            
            active_instances = instances_query.filter(
                AgentInstance.status == AgentStatus.ACTIVE
            ).all()
            
            # Calculate real-time metrics
            current_time = datetime.now(timezone.utc).replace(tzinfo=None)
            hour_ago = current_time - timedelta(hours=1)
            
            metrics = {
                "overview": {
                    "active_instances": len(active_instances),
                    "total_conversations_1h": await self._count_conversations_in_period(
                        db, hour_ago, current_time, filters
                    ),
                    "successful_conversations_1h": await self._count_successful_conversations(
                        db, hour_ago, current_time, filters
                    ),
                    "avg_response_time_1h": await self._calculate_avg_response_time(
                        db, hour_ago, current_time, filters
                    ),
                    "total_cost_1h": await self._calculate_cost_in_period(
                        db, hour_ago, current_time, filters
                    ),
                    "error_rate_1h": await self._calculate_error_rate(
                        db, hour_ago, current_time, filters
                    )
                },
                "instance_details": [],
                "performance_alerts": [],
                "cost_alerts": []
            }
            
            # Get detailed metrics for each instance
            for instance in active_instances:
                instance_metrics = await self._get_instance_real_time_metrics(db, instance)
                metrics["instance_details"].append(instance_metrics)
                
                # Check for performance alerts
                alerts = await self._check_performance_alerts(instance_metrics)
                metrics["performance_alerts"].extend(alerts)
                
                # Check for cost alerts
                cost_alerts = await self._check_cost_alerts(instance_metrics)
                metrics["cost_alerts"].extend(cost_alerts)
            
            # Add trend indicators
            metrics["trends"] = await self._calculate_real_time_trends(db, filters)
            
            return {
                "timestamp": current_time.isoformat(),
                "metrics": metrics,
                "refresh_interval": 30,  # Recommended refresh interval in seconds
                "next_update": (current_time + timedelta(seconds=30)).isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error getting real-time metrics: {str(e)}")
            raise
    
    async def generate_performance_report(
        self, 
        db: Session, 
        start_date: date,
        end_date: date,
        instance_ids: Optional[List[int]] = None,
        user_id: Optional[int] = None,
        granularity: TimeGranularity = TimeGranularity.DAY,
        report_format: ReportFormat = ReportFormat.JSON
    ) -> Dict[str, Any]:
        """
        Generate comprehensive performance report
        
        Args:
            db: Database session
            start_date: Report start date
            end_date: Report end date
            instance_ids: Optional specific instances
            user_id: Optional user filter
            granularity: Time granularity for aggregation
            report_format: Output format
            
        Returns:
            Comprehensive performance report
        """
        try:
            # Validate date range
            if start_date > end_date:
                raise ValueError("Start date must be before end date")
            
            if (end_date - start_date).days > 365:
                raise ValueError("Report period cannot exceed 1 year")
            
            # Build filters
            start_datetime = datetime.combine(start_date, datetime.min.time())
            end_datetime = datetime.combine(end_date, datetime.max.time())
            
            filters = [
                AgentConversation.created_at >= start_datetime,
                AgentConversation.created_at <= end_datetime
            ]
            
            if user_id:
                filters.append(Agent.user_id == user_id)
            if instance_ids:
                filters.append(AgentInstance.id.in_(instance_ids))
            
            # Get conversations in period
            conversations = db.query(AgentConversation)\
                .join(AgentInstance)\
                .join(Agent)\
                .filter(and_(*filters))\
                .all()
            
            # Calculate performance metrics
            performance_metrics = {
                "summary": await self._calculate_summary_metrics(conversations),
                "time_series": await self._calculate_time_series_metrics(
                    conversations, granularity
                ),
                "instance_breakdown": await self._calculate_instance_breakdown(conversations),
                "channel_performance": await self._calculate_channel_performance(conversations),
                "trigger_effectiveness": await self._calculate_trigger_effectiveness(conversations),
                "client_satisfaction": await self._calculate_client_satisfaction_metrics(
                    db, conversations
                ),
                "cost_analysis": await self._calculate_cost_analysis(conversations),
                "efficiency_metrics": await self._calculate_efficiency_metrics(conversations)
            }
            
            # Generate insights and recommendations
            insights = await self._generate_performance_insights(performance_metrics)
            recommendations = await self._generate_performance_recommendations(
                performance_metrics, insights
            )
            
            # Prepare report
            report = {
                "report_info": {
                    "generated_at": datetime.now(timezone.utc).isoformat(),
                    "period": {
                        "start_date": start_date.isoformat(),
                        "end_date": end_date.isoformat(),
                        "days": (end_date - start_date).days + 1
                    },
                    "granularity": granularity.value,
                    "format": report_format.value,
                    "filters": {
                        "instance_ids": instance_ids,
                        "user_id": user_id
                    }
                },
                "metrics": performance_metrics,
                "insights": insights,
                "recommendations": recommendations,
                "appendix": {
                    "methodology": self._get_methodology_notes(),
                    "data_quality": await self._assess_data_quality(conversations),
                    "limitations": self._get_report_limitations()
                }
            }
            
            # Format output based on requested format
            if report_format == ReportFormat.CSV:
                return await self._format_as_csv(report)
            elif report_format == ReportFormat.PDF:
                return await self._format_as_pdf(report)
            elif report_format == ReportFormat.DASHBOARD:
                return await self._format_for_dashboard(report)
            else:
                return report
            
        except Exception as e:
            logger.error(f"Error generating performance report: {str(e)}")
            raise
    
    async def calculate_roi_metrics(
        self, 
        db: Session, 
        agent_id: int,
        user_id: int,
        time_period: str = "30d"
    ) -> Dict[str, Any]:
        """
        Calculate ROI and business impact metrics for an agent
        
        Args:
            db: Database session
            agent_id: Agent ID to analyze
            user_id: User ID for authorization
            time_period: Time period for analysis
            
        Returns:
            ROI analysis and business impact metrics
        """
        try:
            # Validate agent access
            agent = db.query(Agent).filter(
                and_(Agent.id == agent_id, Agent.user_id == user_id)
            ).first()
            
            if not agent:
                raise ValueError(f"Agent {agent_id} not found or access denied")
            
            # Parse time period
            start_date = self._parse_time_period(time_period)
            end_date = datetime.now(timezone.utc).replace(tzinfo=None)
            
            # Get agent instances
            instances = db.query(AgentInstance).filter(
                AgentInstance.agent_id == agent_id
            ).all()
            
            instance_ids = [i.id for i in instances]
            
            # Calculate costs
            costs = await self._calculate_detailed_costs(db, instance_ids, start_date, end_date)
            
            # Calculate revenue impact
            revenue_impact = await self._calculate_revenue_impact(
                db, agent_id, start_date, end_date
            )
            
            # Calculate operational savings
            operational_savings = await self._calculate_operational_savings(
                db, agent_id, start_date, end_date
            )
            
            # Calculate ROI
            total_investment = costs["total_cost"]
            total_benefit = revenue_impact["total_revenue"] + operational_savings["total_savings"]
            
            roi_percentage = ((total_benefit - total_investment) / total_investment * 100) if total_investment > 0 else 0
            payback_period = self._calculate_payback_period(costs, revenue_impact, operational_savings)
            
            # Additional business metrics
            business_metrics = await self._calculate_business_impact_metrics(
                db, agent_id, start_date, end_date
            )
            
            return {
                "agent_id": agent_id,
                "analysis_period": {
                    "start_date": start_date.isoformat(),
                    "end_date": end_date.isoformat(),
                    "days": (end_date - start_date).days
                },
                "roi_analysis": {
                    "total_investment": f"${total_investment:.2f}",
                    "total_benefit": f"${total_benefit:.2f}",
                    "net_benefit": f"${total_benefit - total_investment:.2f}",
                    "roi_percentage": f"{roi_percentage:.1f}%",
                    "payback_period_days": payback_period
                },
                "cost_breakdown": costs,
                "revenue_impact": revenue_impact,
                "operational_savings": operational_savings,
                "business_metrics": business_metrics,
                "projections": await self._generate_roi_projections(
                    costs, revenue_impact, operational_savings
                ),
                "benchmarks": await self._get_roi_benchmarks(agent.type),
                "recommendations": await self._generate_roi_recommendations(
                    roi_percentage, costs, revenue_impact
                )
            }
            
        except Exception as e:
            logger.error(f"Error calculating ROI metrics for agent {agent_id}: {str(e)}")
            raise
    
    async def get_cost_optimization_analysis(
        self, 
        db: Session, 
        user_id: int,
        optimization_target: float = 0.20  # Target 20% cost reduction
    ) -> Dict[str, Any]:
        """
        Analyze costs and provide optimization recommendations
        
        Args:
            db: Database session
            user_id: User ID for analysis scope
            optimization_target: Target cost reduction percentage
            
        Returns:
            Cost optimization analysis and recommendations
        """
        try:
            # Get all user's agents and instances
            agents = db.query(Agent).filter(Agent.user_id == user_id).all()
            
            if not agents:
                return {
                    "message": "No agents found for analysis",
                    "recommendations": ["Create your first AI agent to start optimizing costs"]
                }
            
            # Analyze costs for last 30 days
            end_date = datetime.now(timezone.utc).replace(tzinfo=None)
            start_date = end_date - timedelta(days=30)
            
            cost_analysis = {}
            total_current_cost = 0
            optimization_opportunities = []
            
            for agent in agents:
                instances = db.query(AgentInstance).filter(
                    AgentInstance.agent_id == agent.id
                ).all()
                
                agent_costs = await self._analyze_agent_costs(
                    db, agent, instances, start_date, end_date
                )
                
                cost_analysis[agent.id] = agent_costs
                total_current_cost += agent_costs["total_cost"]
                
                # Identify optimization opportunities for this agent
                opportunities = await self._identify_cost_optimization_opportunities(
                    agent, agent_costs
                )
                optimization_opportunities.extend(opportunities)
            
            # Rank opportunities by potential savings
            optimization_opportunities.sort(
                key=lambda x: x["potential_savings"], reverse=True
            )
            
            # Calculate potential total savings
            total_potential_savings = sum(
                op["potential_savings"] for op in optimization_opportunities
            )
            
            target_savings = total_current_cost * optimization_target
            achievable_savings = min(total_potential_savings, target_savings)
            
            # Generate implementation plan
            implementation_plan = await self._generate_cost_optimization_plan(
                optimization_opportunities, target_savings
            )
            
            return {
                "analysis_period": {
                    "start_date": start_date.isoformat(),
                    "end_date": end_date.isoformat()
                },
                "current_costs": {
                    "total_monthly_cost": f"${total_current_cost:.2f}",
                    "cost_per_agent": f"${total_current_cost / len(agents):.2f}",
                    "by_agent": {
                        str(agent_id): f"${costs['total_cost']:.2f}"
                        for agent_id, costs in cost_analysis.items()
                    }
                },
                "optimization_analysis": {
                    "target_reduction": f"{optimization_target * 100:.0f}%",
                    "target_savings": f"${target_savings:.2f}",
                    "potential_savings": f"${total_potential_savings:.2f}",
                    "achievable_savings": f"${achievable_savings:.2f}",
                    "optimization_score": (achievable_savings / target_savings * 100) if target_savings > 0 else 0
                },
                "opportunities": optimization_opportunities[:10],  # Top 10 opportunities
                "implementation_plan": implementation_plan,
                "cost_trends": await self._analyze_cost_trends(db, user_id),
                "benchmarks": await self._get_cost_benchmarks(total_current_cost, len(agents)),
                "monitoring_recommendations": await self._generate_cost_monitoring_recommendations()
            }
            
        except Exception as e:
            logger.error(f"Error getting cost optimization analysis: {str(e)}")
            raise
    
    async def generate_usage_forecast(
        self, 
        db: Session, 
        agent_id: int,
        user_id: int,
        forecast_days: int = 30
    ) -> Dict[str, Any]:
        """
        Generate usage and cost forecasts for an agent
        
        Args:
            db: Database session
            agent_id: Agent ID to forecast
            user_id: User ID for authorization
            forecast_days: Number of days to forecast
            
        Returns:
            Usage and cost forecasts with confidence intervals
        """
        try:
            # Validate agent access
            agent = db.query(Agent).filter(
                and_(Agent.id == agent_id, Agent.user_id == user_id)
            ).first()
            
            if not agent:
                raise ValueError(f"Agent {agent_id} not found or access denied")
            
            # Get historical data (last 90 days for forecasting)
            end_date = datetime.now(timezone.utc).replace(tzinfo=None)
            start_date = end_date - timedelta(days=90)
            
            instances = db.query(AgentInstance).filter(
                AgentInstance.agent_id == agent_id
            ).all()
            
            instance_ids = [i.id for i in instances]
            
            # Get historical usage data
            historical_data = await self._get_historical_usage_data(
                db, instance_ids, start_date, end_date
            )
            
            if len(historical_data) < 7:  # Need at least 7 days of data
                return {
                    "error": "Insufficient historical data for forecasting",
                    "minimum_days_needed": 7,
                    "current_days": len(historical_data)
                }
            
            # Generate forecasts
            conversation_forecast = await self._forecast_conversations(
                historical_data, forecast_days
            )
            
            cost_forecast = await self._forecast_costs(
                historical_data, conversation_forecast, forecast_days
            )
            
            usage_forecast = await self._forecast_usage_metrics(
                historical_data, forecast_days
            )
            
            # Calculate confidence intervals
            confidence_intervals = await self._calculate_forecast_confidence(
                historical_data, [conversation_forecast, cost_forecast, usage_forecast]
            )
            
            # Identify potential issues or opportunities
            alerts = await self._identify_forecast_alerts(
                conversation_forecast, cost_forecast, usage_forecast
            )
            
            # Generate recommendations based on forecast
            recommendations = await self._generate_forecast_recommendations(
                agent, conversation_forecast, cost_forecast, alerts
            )
            
            return {
                "agent_id": agent_id,
                "forecast_period": {
                    "start_date": end_date.date().isoformat(),
                    "end_date": (end_date + timedelta(days=forecast_days)).date().isoformat(),
                    "days": forecast_days
                },
                "historical_baseline": {
                    "period_days": (end_date - start_date).days,
                    "avg_daily_conversations": statistics.mean([d["conversations"] for d in historical_data[-30:]]),
                    "avg_daily_cost": statistics.mean([d["cost"] for d in historical_data[-30:]]),
                    "trend": self._calculate_trend(historical_data)
                },
                "forecasts": {
                    "conversations": conversation_forecast,
                    "costs": cost_forecast,
                    "usage_metrics": usage_forecast
                },
                "confidence_intervals": confidence_intervals,
                "alerts": alerts,
                "recommendations": recommendations,
                "model_info": {
                    "forecast_method": "time_series_analysis",
                    "data_points_used": len(historical_data),
                    "model_accuracy": await self._calculate_model_accuracy(historical_data),
                    "last_updated": datetime.now(timezone.utc).isoformat()
                }
            }
            
        except Exception as e:
            logger.error(f"Error generating usage forecast for agent {agent_id}: {str(e)}")
            raise
    
    async def get_comparative_analysis(
        self, 
        db: Session, 
        user_id: int,
        comparison_type: str = "peer_benchmark",  # peer_benchmark, time_comparison, agent_comparison
        comparison_params: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Generate comparative analysis against benchmarks or historical data
        
        Args:
            db: Database session
            user_id: User ID for analysis scope
            comparison_type: Type of comparison to perform
            comparison_params: Additional parameters for comparison
            
        Returns:
            Comparative analysis with insights and rankings
        """
        try:
            # Get user's agents for analysis
            user_agents = db.query(Agent).filter(Agent.user_id == user_id).all()
            
            if not user_agents:
                return {
                    "message": "No agents found for comparison analysis",
                    "suggestions": ["Create AI agents to enable comparative analysis"]
                }
            
            # Get current performance metrics
            end_date = datetime.now(timezone.utc).replace(tzinfo=None)
            start_date = end_date - timedelta(days=30)
            
            current_metrics = {}
            for agent in user_agents:
                metrics = await self._get_agent_performance_metrics(
                    db, agent.id, start_date, end_date
                )
                current_metrics[agent.id] = metrics
            
            comparison_results = {}
            
            if comparison_type == "peer_benchmark":
                # Compare against industry benchmarks
                benchmarks = await self._get_industry_benchmarks(user_agents)
                comparison_results = await self._compare_against_benchmarks(
                    current_metrics, benchmarks
                )
                
            elif comparison_type == "time_comparison":
                # Compare against historical performance
                comparison_period = comparison_params.get("period", "previous_month")
                historical_metrics = await self._get_historical_metrics(
                    db, user_agents, comparison_period
                )
                comparison_results = await self._compare_time_periods(
                    current_metrics, historical_metrics
                )
                
            elif comparison_type == "agent_comparison":
                # Compare agents against each other
                comparison_results = await self._compare_agents_internally(current_metrics)
            
            else:
                raise ValueError(f"Unknown comparison type: {comparison_type}")
            
            # Generate insights and recommendations
            insights = await self._generate_comparative_insights(
                comparison_results, comparison_type
            )
            
            recommendations = await self._generate_comparative_recommendations(
                comparison_results, insights
            )
            
            # Calculate improvement potential
            improvement_potential = await self._calculate_improvement_potential(
                current_metrics, comparison_results
            )
            
            return {
                "comparison_type": comparison_type,
                "analysis_period": {
                    "start_date": start_date.isoformat(),
                    "end_date": end_date.isoformat()
                },
                "agents_analyzed": len(user_agents),
                "current_performance": current_metrics,
                "comparison_results": comparison_results,
                "insights": insights,
                "recommendations": recommendations,
                "improvement_potential": improvement_potential,
                "rankings": await self._generate_performance_rankings(current_metrics),
                "next_analysis_date": (end_date + timedelta(days=7)).isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error generating comparative analysis: {str(e)}")
            raise
    
    # Helper methods for calculations and analysis
    
    async def _count_conversations_in_period(
        self, 
        db: Session, 
        start_time: datetime, 
        end_time: datetime, 
        filters: List
    ) -> int:
        """Count conversations in time period"""
        query = db.query(func.count(AgentConversation.id))\
            .join(AgentInstance)\
            .join(Agent)\
            .filter(
                and_(
                    AgentConversation.created_at >= start_time,
                    AgentConversation.created_at <= end_time,
                    *filters
                )
            )
        return query.scalar() or 0
    
    async def _calculate_avg_response_time(
        self, 
        db: Session, 
        start_time: datetime, 
        end_time: datetime, 
        filters: List
    ) -> float:
        """Calculate average response time in seconds"""
        # This would calculate based on message timestamps in production
        # For now, return a simulated value
        return 2.5  # 2.5 seconds average
    
    async def _calculate_cost_in_period(
        self, 
        db: Session, 
        start_time: datetime, 
        end_time: datetime, 
        filters: List
    ) -> float:
        """Calculate total cost in time period"""
        # In production, this would sum up AI provider costs, infrastructure costs, etc.
        conversation_count = await self._count_conversations_in_period(
            db, start_time, end_time, filters
        )
        return conversation_count * 0.02  # $0.02 per conversation estimate
    
    # Additional helper methods would continue here for:
    # - _count_successful_conversations
    # - _calculate_error_rate
    # - _get_instance_real_time_metrics
    # - _check_performance_alerts
    # - _check_cost_alerts
    # - _calculate_real_time_trends
    # - _calculate_summary_metrics
    # - _calculate_time_series_metrics
    # - _calculate_instance_breakdown
    # - _calculate_channel_performance
    # - _calculate_trigger_effectiveness
    # - _calculate_client_satisfaction_metrics
    # - _calculate_cost_analysis
    # - _calculate_efficiency_metrics
    # - _generate_performance_insights
    # - _generate_performance_recommendations
    # - _format_as_csv / _format_as_pdf / _format_for_dashboard
    # - _parse_time_period
    # - _calculate_detailed_costs
    # - _calculate_revenue_impact
    # - _calculate_operational_savings
    # - _calculate_payback_period
    # - _calculate_business_impact_metrics
    # - _generate_roi_projections
    # - _get_roi_benchmarks
    # - _generate_roi_recommendations
    # - _analyze_agent_costs
    # - _identify_cost_optimization_opportunities
    # - _generate_cost_optimization_plan
    # - _analyze_cost_trends
    # - _get_cost_benchmarks
    # - _generate_cost_monitoring_recommendations
    # - _get_historical_usage_data
    # - _forecast_conversations
    # - _forecast_costs
    # - _forecast_usage_metrics
    # - _calculate_forecast_confidence
    # - _identify_forecast_alerts
    # - _generate_forecast_recommendations
    # - _calculate_trend
    # - _calculate_model_accuracy
    # - _get_agent_performance_metrics
    # - _get_industry_benchmarks
    # - _compare_against_benchmarks
    # - _get_historical_metrics
    # - _compare_time_periods
    # - _compare_agents_internally
    # - _generate_comparative_insights
    # - _generate_comparative_recommendations
    # - _calculate_improvement_potential
    # - _generate_performance_rankings
    # - _get_methodology_notes
    # - _assess_data_quality
    # - _get_report_limitations
    
    # These would implement the specific business logic for analytics calculations
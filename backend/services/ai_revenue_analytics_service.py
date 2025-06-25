"""
AI-Powered Revenue Analytics Service
Uses machine learning to provide intelligent insights and optimization recommendations
"""

import numpy as np
import pandas as pd
from datetime import datetime, date, timedelta
from typing import Dict, List, Any, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_, text, case, extract
import json
import logging

# Machine Learning imports
from sklearn.ensemble import RandomForestRegressor, IsolationForest
from sklearn.linear_model import LinearRegression
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score
import joblib

# Time series analysis using numpy and sklearn only
from sklearn.metrics import r2_score
import warnings

warnings.filterwarnings("ignore")

# Models
from models.appointment import Appointment
from models.barber import Barber
from models.client import Client
from models.revenue_analytics import (
    RevenuePattern,
    RevenuePrediction,
    PricingOptimization,
    ClientSegment,
    RevenueInsight,
    PerformanceBenchmark,
    RevenueOptimizationGoal,
)

logger = logging.getLogger(__name__)


class AIRevenueAnalyticsService:
    """AI-powered revenue analytics and optimization service"""

    def __init__(self):
        self.scaler = StandardScaler()
        self.models = {}

    def analyze_revenue_patterns(
        self, db: Session, barber_id: int, lookback_days: int = 180
    ) -> List[Dict[str, Any]]:
        """Analyze historical data to identify revenue patterns using ML"""

        # Fetch historical appointment data
        end_date = date.today()
        start_date = end_date - timedelta(days=lookback_days)

        appointments = (
            db.query(Appointment)
            .filter(
                and_(
                    Appointment.barber_id == barber_id,
                    Appointment.appointment_date >= start_date,
                    Appointment.appointment_date <= end_date,
                    Appointment.status == "completed",
                )
            )
            .all()
        )

        if len(appointments) < 30:
            return []

        # Convert to DataFrame for analysis
        df = pd.DataFrame(
            [
                {
                    "date": a.appointment_date,
                    "revenue": a.total_revenue,
                    "service_revenue": a.service_revenue or 0,
                    "tip_amount": a.tip_amount or 0,
                    "day_of_week": a.appointment_date.weekday(),
                    "day_of_month": a.appointment_date.day,
                    "month": a.appointment_date.month,
                    "is_weekend": a.appointment_date.weekday() >= 5,
                    "client_type": a.customer_type,
                }
                for a in appointments
            ]
        )

        # Aggregate by date
        daily_revenue = (
            df.groupby("date")
            .agg(
                {
                    "revenue": "sum",
                    "service_revenue": "sum",
                    "tip_amount": "sum",
                    "day_of_week": "first",
                    "day_of_month": "first",
                    "month": "first",
                    "is_weekend": "first",
                }
            )
            .reset_index()
        )

        patterns = []

        # 1. Day of Week Patterns
        dow_pattern = self._analyze_day_of_week_pattern(daily_revenue)
        if dow_pattern:
            patterns.append(dow_pattern)

        # 2. Monthly Patterns
        monthly_pattern = self._analyze_monthly_pattern(daily_revenue)
        if monthly_pattern:
            patterns.append(monthly_pattern)

        # 3. Seasonal Patterns
        if lookback_days >= 365:
            seasonal_pattern = self._analyze_seasonal_pattern(daily_revenue)
            if seasonal_pattern:
                patterns.append(seasonal_pattern)

        # 4. Growth Trend Analysis
        trend_pattern = self._analyze_growth_trend(daily_revenue)
        if trend_pattern:
            patterns.append(trend_pattern)

        # 5. Anomaly Detection (unusual revenue days)
        anomaly_patterns = self._detect_revenue_anomalies(daily_revenue)
        patterns.extend(anomaly_patterns)

        # Save patterns to database
        for pattern in patterns:
            self._save_pattern(barber_id, pattern, start_date, end_date)

        return patterns

    def _analyze_day_of_week_pattern(
        self, df: pd.DataFrame
    ) -> Optional[Dict[str, Any]]:
        """Analyze day of week revenue patterns"""

        dow_stats = df.groupby("day_of_week")["revenue"].agg(["mean", "std", "count"])

        # Find best and worst days
        best_day = dow_stats["mean"].idxmax()
        worst_day = dow_stats["mean"].idxmin()

        # Calculate statistical significance
        if (
            dow_stats["mean"].std() / dow_stats["mean"].mean() > 0.15
        ):  # 15% variation threshold
            days = [
                "Monday",
                "Tuesday",
                "Wednesday",
                "Thursday",
                "Friday",
                "Saturday",
                "Sunday",
            ]

            pattern_data = {
                "best_day": days[best_day],
                "worst_day": days[worst_day],
                "best_day_avg": float(dow_stats.loc[best_day, "mean"]),
                "worst_day_avg": float(dow_stats.loc[worst_day, "mean"]),
                "revenue_by_day": {
                    days[i]: float(dow_stats.loc[i, "mean"])
                    for i in range(7)
                    if i in dow_stats.index
                },
            }

            return {
                "pattern_type": "weekly",
                "pattern_name": "Day of Week Revenue Pattern",
                "confidence_score": min(
                    0.95, dow_stats["count"].min() / 10
                ),  # Higher confidence with more data
                "pattern_data": pattern_data,
                "avg_revenue_impact": float(
                    dow_stats["mean"].max() - dow_stats["mean"].min()
                ),
                "frequency": "weekly",
            }

        return None

    def _analyze_monthly_pattern(self, df: pd.DataFrame) -> Optional[Dict[str, Any]]:
        """Analyze monthly revenue patterns (e.g., end of month surge)"""

        # Group by day of month
        dom_stats = df.groupby("day_of_month")["revenue"].agg(["mean", "count"])

        # Analyze beginning, middle, and end of month
        beginning = dom_stats.loc[1:10, "mean"].mean()
        middle = dom_stats.loc[11:20, "mean"].mean()
        end = dom_stats.loc[21:31, "mean"].mean()

        variations = [beginning, middle, end]
        if max(variations) / min(variations) > 1.2:  # 20% variation
            pattern_data = {
                "beginning_avg": float(beginning),
                "middle_avg": float(middle),
                "end_avg": float(end),
                "peak_period": (
                    "beginning"
                    if beginning == max(variations)
                    else "end" if end == max(variations) else "middle"
                ),
            }

            return {
                "pattern_type": "monthly",
                "pattern_name": "Monthly Revenue Cycle",
                "confidence_score": 0.8,
                "pattern_data": pattern_data,
                "avg_revenue_impact": float(max(variations) - min(variations)),
                "frequency": "monthly",
            }

        return None

    def _analyze_seasonal_pattern(self, df: pd.DataFrame) -> Optional[Dict[str, Any]]:
        """Analyze seasonal patterns using time series decomposition"""

        # Prepare time series data
        ts = df.set_index("date")["revenue"]
        ts = ts.resample("D").sum().fillna(0)  # Daily frequency

        try:
            # Perform seasonal decomposition
            decomposition = seasonal_decompose(
                ts, model="additive", period=7
            )  # Weekly seasonality

            seasonal_strength = decomposition.seasonal.std() / ts.std()

            if seasonal_strength > 0.1:  # Significant seasonality
                return {
                    "pattern_type": "seasonal",
                    "pattern_name": "Seasonal Revenue Pattern",
                    "confidence_score": min(0.9, seasonal_strength),
                    "pattern_data": {
                        "seasonal_strength": float(seasonal_strength),
                        "trend_direction": (
                            "increasing"
                            if decomposition.trend[-30:].mean()
                            > decomposition.trend[:30].mean()
                            else "decreasing"
                        ),
                    },
                    "avg_revenue_impact": float(decomposition.seasonal.std() * 2),
                    "frequency": "seasonal",
                }
        except:
            pass

        return None

    def _analyze_growth_trend(self, df: pd.DataFrame) -> Optional[Dict[str, Any]]:
        """Analyze overall growth trend using linear regression"""

        # Prepare data
        df["days_since_start"] = (df["date"] - df["date"].min()).dt.days
        X = df[["days_since_start"]]
        y = df["revenue"]

        # Fit linear regression
        model = LinearRegression()
        model.fit(X, y)

        # Calculate metrics
        daily_growth = model.coef_[0]
        r2 = model.score(X, y)

        if abs(daily_growth) > 0.5 and r2 > 0.1:  # Significant trend
            return {
                "pattern_type": "trend",
                "pattern_name": "Revenue Growth Trend",
                "confidence_score": min(0.9, r2),
                "pattern_data": {
                    "daily_growth_rate": float(daily_growth),
                    "monthly_growth_rate": float(daily_growth * 30),
                    "trend_strength": float(r2),
                    "direction": "increasing" if daily_growth > 0 else "decreasing",
                },
                "avg_revenue_impact": float(abs(daily_growth * 30)),
                "frequency": "continuous",
            }

        return None

    def _detect_revenue_anomalies(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        """Detect unusual revenue patterns using Isolation Forest"""

        # Prepare features
        features = df[["revenue", "day_of_week", "day_of_month"]].values

        # Fit anomaly detection model
        iso_forest = IsolationForest(contamination=0.1, random_state=42)
        anomalies = iso_forest.fit_predict(features)

        # Analyze anomalies
        anomaly_dates = df[anomalies == -1]["date"].tolist()
        patterns = []

        if len(anomaly_dates) > 0:
            # Group anomalies by characteristics
            high_revenue_anomalies = df[
                (anomalies == -1) & (df["revenue"] > df["revenue"].quantile(0.9))
            ]
            low_revenue_anomalies = df[
                (anomalies == -1) & (df["revenue"] < df["revenue"].quantile(0.1))
            ]

            if len(high_revenue_anomalies) > 0:
                patterns.append(
                    {
                        "pattern_type": "anomaly",
                        "pattern_name": "High Revenue Anomalies",
                        "confidence_score": 0.7,
                        "pattern_data": {
                            "dates": high_revenue_anomalies["date"].tolist(),
                            "avg_anomaly_revenue": float(
                                high_revenue_anomalies["revenue"].mean()
                            ),
                            "normal_revenue": float(df["revenue"].median()),
                        },
                        "avg_revenue_impact": float(
                            high_revenue_anomalies["revenue"].mean()
                            - df["revenue"].median()
                        ),
                        "frequency": "sporadic",
                    }
                )

        return patterns

    def predict_future_revenue(
        self, barber_id: int, days_ahead: int = 30
    ) -> List[Dict[str, Any]]:
        """Predict future revenue using linear regression with seasonal patterns"""

        # Fetch historical data
        end_date = date.today()
        start_date = end_date - timedelta(days=365)  # 1 year of data

        appointments = (
            self.db.query(
                Appointment.appointment_date,
                func.sum(
                    func.coalesce(Appointment.service_revenue, 0)
                    + func.coalesce(Appointment.tip_amount, 0)
                    + func.coalesce(Appointment.product_revenue, 0)
                ).label("revenue"),
            )
            .filter(
                and_(
                    Appointment.barber_id == barber_id,
                    Appointment.appointment_date >= start_date,
                    Appointment.appointment_date <= end_date,
                    Appointment.status == "completed",
                )
            )
            .group_by(Appointment.appointment_date)
            .all()
        )

        if len(appointments) < 30:  # Need at least 1 month of data
            return []

        # Prepare data
        df = pd.DataFrame(appointments)
        df.columns = ["date", "revenue"]
        df["date"] = pd.to_datetime(df["date"])

        # Fill missing dates with 0
        date_range = pd.date_range(
            start=df["date"].min(), end=df["date"].max(), freq="D"
        )
        df = df.set_index("date").reindex(date_range, fill_value=0).reset_index()
        df.columns = ["date", "revenue"]

        # Create features for regression
        df["day_of_week"] = df["date"].dt.dayofweek
        df["day_of_month"] = df["date"].dt.day
        df["month"] = df["date"].dt.month
        df["days_since_start"] = (df["date"] - df["date"].min()).dt.days

        # Create cyclical features for seasonality
        df["day_of_week_sin"] = np.sin(2 * np.pi * df["day_of_week"] / 7)
        df["day_of_week_cos"] = np.cos(2 * np.pi * df["day_of_week"] / 7)
        df["month_sin"] = np.sin(2 * np.pi * df["month"] / 12)
        df["month_cos"] = np.cos(2 * np.pi * df["month"] / 12)

        # Features for training
        features = [
            "days_since_start",
            "day_of_week_sin",
            "day_of_week_cos",
            "month_sin",
            "month_cos",
            "day_of_month",
        ]

        X = df[features]
        y = df["revenue"]

        # Train model
        model = RandomForestRegressor(n_estimators=100, random_state=42)
        model.fit(X, y)

        # Create future dates
        future_dates = []
        last_date = df["date"].max()
        for i in range(1, days_ahead + 1):
            future_date = last_date + timedelta(days=i)
            future_dates.append(future_date)

        # Create future data
        future_data = []
        last_days_since_start = df["days_since_start"].max()

        for i, future_date in enumerate(future_dates, 1):
            days_since_start = last_days_since_start + i
            day_of_week = future_date.weekday()
            day_of_month = future_date.day
            month = future_date.month

            future_data.append(
                {
                    "days_since_start": days_since_start,
                    "day_of_week_sin": np.sin(2 * np.pi * day_of_week / 7),
                    "day_of_week_cos": np.cos(2 * np.pi * day_of_week / 7),
                    "month_sin": np.sin(2 * np.pi * month / 12),
                    "month_cos": np.cos(2 * np.pi * month / 12),
                    "day_of_month": day_of_month,
                }
            )

        future_df = pd.DataFrame(future_data)
        predictions_values = model.predict(future_df[features])

        # Calculate confidence based on model performance
        historical_mean = df["revenue"].mean()
        confidence_score = min(0.95, max(0.4, model.score(X, y)))

        predictions = []
        for i, (future_date, predicted_revenue) in enumerate(
            zip(future_dates, predictions_values)
        ):
            # Calculate confidence interval (simple approach)
            margin = predicted_revenue * 0.2  # 20% margin

            prediction = {
                "barber_id": barber_id,
                "prediction_date": future_date.date(),
                "prediction_type": "daily",
                "predicted_revenue": max(0, float(predicted_revenue)),
                "confidence_interval_low": max(0, float(predicted_revenue - margin)),
                "confidence_interval_high": float(predicted_revenue + margin),
                "confidence_score": confidence_score,
                "predicted_appointments": self._estimate_appointments_from_revenue(
                    barber_id, predicted_revenue
                ),
                "factors_data": {
                    "day_of_week": future_date.strftime("%A"),
                    "month": future_date.strftime("%B"),
                    "seasonal_factor": 1.0
                    + np.sin(2 * np.pi * future_date.month / 12) * 0.1,
                },
                "model_version": "1.0",
            }

            # Save prediction
            self._save_prediction(prediction)
            predictions.append(prediction)

        return predictions

    def _calculate_prediction_confidence(
        self, model, historical_data: pd.DataFrame
    ) -> float:
        """Calculate confidence score based on model performance"""

        # Simple train/test split
        train_size = int(len(historical_data) * 0.8)
        train = historical_data[:train_size]
        test = historical_data[train_size:]

        if len(test) < 7:
            return 0.7  # Default confidence if not enough test data

        # Use a simple baseline approach for confidence
        mean_revenue = historical_data["revenue"].mean()
        revenue_std = historical_data["revenue"].std()

        # Calculate coefficient of variation (stability measure)
        if mean_revenue > 0:
            cv = revenue_std / mean_revenue
            # Lower CV = higher confidence
            confidence = max(0.3, min(0.95, 1.0 - cv))
        else:
            confidence = 0.5

        return confidence

    def _estimate_appointments_from_revenue(
        self, barber_id: int, predicted_revenue: float
    ) -> int:
        """Estimate number of appointments based on predicted revenue"""

        # Get average ticket for barber
        avg_ticket = (
            self.db.query(
                func.avg(
                    func.coalesce(Appointment.service_revenue, 0)
                    + func.coalesce(Appointment.tip_amount, 0)
                    + func.coalesce(Appointment.product_revenue, 0)
                )
            )
            .filter(
                and_(
                    Appointment.barber_id == barber_id,
                    Appointment.status == "completed",
                    Appointment.appointment_date >= date.today() - timedelta(days=90),
                )
            )
            .scalar()
            or 50.0
        )

        return max(1, int(predicted_revenue / avg_ticket))

    def optimize_pricing(self, barber_id: int) -> List[Dict[str, Any]]:
        """Generate AI-powered pricing optimization recommendations"""

        # Get service-level revenue data
        service_data = self._get_service_pricing_data(barber_id)

        if not service_data:
            return []

        recommendations = []

        for service_name, data in service_data.items():
            # Analyze price elasticity
            elasticity = self._calculate_price_elasticity(data)

            # Find optimal price point
            optimal_price = self._find_optimal_price(
                data["current_price"], data["demand_data"], elasticity
            )

            if (
                abs(optimal_price - data["current_price"]) / data["current_price"]
                > 0.05
            ):  # 5% threshold
                recommendation = {
                    "barber_id": barber_id,
                    "service_name": service_name,
                    "current_price": data["current_price"],
                    "recommended_price": optimal_price,
                    "price_elasticity": elasticity,
                    "expected_revenue_change": self._calculate_revenue_impact(
                        data["current_price"],
                        optimal_price,
                        elasticity,
                        data["current_demand"],
                    ),
                    "expected_demand_change": self._calculate_demand_impact(
                        data["current_price"], optimal_price, elasticity
                    ),
                    "confidence_score": data["confidence"],
                    "recommendation_reason": self._generate_pricing_reason(
                        data, optimal_price, elasticity
                    ),
                    "market_analysis": {
                        "competitor_avg": data.get(
                            "competitor_avg", data["current_price"]
                        ),
                        "market_position": data.get("market_position", "average"),
                        "demand_trend": data.get("demand_trend", "stable"),
                    },
                }

                # Save recommendation
                self._save_pricing_optimization(recommendation)
                recommendations.append(recommendation)

        return recommendations

    def _calculate_price_elasticity(self, data: Dict[str, Any]) -> float:
        """Calculate price elasticity of demand"""

        # Simplified elasticity calculation
        # In practice, this would use historical price changes and demand response

        # Factors affecting elasticity
        is_premium = (
            data["current_price"] > data.get("market_avg", data["current_price"]) * 1.2
        )
        has_high_retention = data.get("client_retention", 0.5) > 0.7
        is_unique = data.get("uniqueness_score", 0.5) > 0.7

        # Base elasticity (negative = normal goods)
        base_elasticity = -1.2

        # Adjust based on factors
        if is_premium:
            base_elasticity *= 0.7  # Less elastic for premium services
        if has_high_retention:
            base_elasticity *= 0.8  # Loyal customers less price sensitive
        if is_unique:
            base_elasticity *= 0.6  # Unique services have lower elasticity

        return base_elasticity

    def segment_clients(self, barber_id: int) -> List[Dict[str, Any]]:
        """Use ML clustering to segment clients for targeted strategies"""

        # Get client data
        client_data = self._get_client_feature_data(barber_id)

        if len(client_data) < 10:
            return []

        # Prepare features for clustering
        features = []
        client_ids = []

        for client_id, data in client_data.items():
            features.append(
                [
                    data["total_visits"],
                    data["avg_ticket"],
                    data["days_since_last_visit"],
                    data["total_revenue"],
                    data["visit_frequency"],  # visits per month
                    data["tip_percentage"],
                    data["cancellation_rate"],
                    data["preferred_day_of_week"],
                    data["preferred_time_slot"],
                ]
            )
            client_ids.append(client_id)

        # Standardize features
        X = self.scaler.fit_transform(features)

        # Determine optimal number of clusters
        n_clusters = min(5, max(2, len(client_ids) // 20))

        # Perform clustering
        kmeans = KMeans(n_clusters=n_clusters, random_state=42)
        clusters = kmeans.fit_predict(X)

        # Analyze segments
        segments = []
        for cluster_id in range(n_clusters):
            cluster_indices = [i for i, c in enumerate(clusters) if c == cluster_id]

            if not cluster_indices:
                continue

            segment = self._analyze_client_segment(
                cluster_id,
                [client_data[client_ids[i]] for i in cluster_indices],
                barber_id,
            )

            # Save segment
            self._save_client_segment(segment)
            segments.append(segment)

        return segments

    def _analyze_client_segment(
        self, cluster_id: int, segment_clients: List[Dict], barber_id: int
    ) -> Dict[str, Any]:
        """Analyze characteristics of a client segment"""

        # Calculate segment statistics
        df = pd.DataFrame(segment_clients)

        # Determine segment type based on characteristics
        avg_value = df["total_revenue"].mean()
        avg_frequency = df["visit_frequency"].mean()
        avg_recency = df["days_since_last_visit"].mean()

        # RFV segmentation
        if avg_value > df["total_revenue"].quantile(0.75):
            if avg_frequency > 2:
                segment_name = "VIP Clients"
                segment_type = "high_value"
            else:
                segment_name = "High Spenders"
                segment_type = "premium"
        elif avg_recency > 60:
            segment_name = "At Risk Clients"
            segment_type = "churn_risk"
        elif avg_frequency > 3:
            segment_name = "Loyal Regulars"
            segment_type = "loyal"
        else:
            segment_name = "Casual Clients"
            segment_type = "casual"

        # Generate strategies
        strategies = self._generate_segment_strategies(segment_type, df)

        return {
            "barber_id": barber_id,
            "segment_name": segment_name,
            "segment_type": segment_type,
            "description": f"Clients with {strategies['key_characteristic']}",
            "characteristics": {
                "avg_lifetime_value": float(avg_value),
                "avg_visits_per_month": float(avg_frequency),
                "avg_days_between_visits": float(df["days_since_last_visit"].mean()),
                "avg_ticket_size": float(df["avg_ticket"].mean()),
                "preferred_services": strategies.get("preferred_services", []),
                "behavior_patterns": strategies.get("behavior_patterns", {}),
            },
            "size": len(segment_clients),
            "avg_lifetime_value": float(avg_value),
            "avg_visit_frequency": float(avg_frequency),
            "avg_ticket_size": float(df["avg_ticket"].mean()),
            "engagement_strategy": strategies["engagement_strategy"],
            "recommended_services": strategies.get("recommended_services", []),
            "recommended_promotions": strategies.get("recommended_promotions", []),
            "revenue_contribution": float(df["total_revenue"].sum()),
            "growth_rate": strategies.get("growth_rate", 0.0),
            "churn_risk": strategies.get("churn_risk", 0.3),
        }

    def generate_insights(self, barber_id: int) -> List[Dict[str, Any]]:
        """Generate AI-powered insights and recommendations"""

        insights = []

        # 1. Revenue optimization opportunities
        revenue_insights = self._generate_revenue_insights(barber_id)
        insights.extend(revenue_insights)

        # 2. Scheduling optimization
        scheduling_insights = self._generate_scheduling_insights(barber_id)
        insights.extend(scheduling_insights)

        # 3. Client retention insights
        retention_insights = self._generate_retention_insights(barber_id)
        insights.extend(retention_insights)

        # 4. Service mix optimization
        service_insights = self._generate_service_insights(barber_id)
        insights.extend(service_insights)

        # 5. Competitive positioning
        competitive_insights = self._generate_competitive_insights(barber_id)
        insights.extend(competitive_insights)

        # Prioritize insights
        insights = self._prioritize_insights(insights)

        # Save insights
        for insight in insights[:10]:  # Top 10 insights
            self._save_insight(insight)

        return insights[:10]

    def _generate_revenue_insights(self, barber_id: int) -> List[Dict[str, Any]]:
        """Generate revenue-specific insights"""

        insights = []

        # Analyze recent revenue trends
        recent_revenue = self._get_recent_revenue_data(barber_id, days=90)

        if recent_revenue:
            # Detect declining revenue
            if recent_revenue["trend"] < -0.05:  # 5% decline
                insights.append(
                    {
                        "barber_id": barber_id,
                        "insight_type": "risk",
                        "category": "revenue",
                        "title": "Revenue Decline Detected",
                        "description": f"Your revenue has declined by {abs(recent_revenue['trend']*100):.1f}% over the past 90 days.",
                        "potential_impact": recent_revenue["monthly_revenue"] * 0.1,
                        "priority": "high",
                        "confidence_score": 0.85,
                        "recommendations": [
                            "Review and optimize your service pricing",
                            "Increase marketing efforts to attract new clients",
                            "Implement a client win-back campaign",
                            "Add high-margin services or products",
                        ],
                    }
                )

            # Identify untapped revenue potential
            if recent_revenue["capacity_utilization"] < 0.7:
                potential_revenue = recent_revenue["monthly_revenue"] * (
                    1 / recent_revenue["capacity_utilization"] - 1
                )
                insights.append(
                    {
                        "barber_id": barber_id,
                        "insight_type": "opportunity",
                        "category": "revenue",
                        "title": "Untapped Revenue Potential",
                        "description": f"You're operating at {recent_revenue['capacity_utilization']*100:.0f}% capacity. Filling empty slots could increase revenue by ${potential_revenue:.0f}/month.",
                        "potential_impact": potential_revenue,
                        "priority": "high",
                        "confidence_score": 0.9,
                        "recommendations": [
                            "Implement online booking to capture more appointments",
                            "Offer last-minute booking discounts",
                            "Extend operating hours during peak demand",
                            "Partner with local businesses for referrals",
                        ],
                    }
                )

        return insights

    def benchmark_performance(self, barber_id: int) -> Dict[str, Any]:
        """Benchmark barber performance against peers"""

        # Get barber's metrics
        barber_metrics = self._get_barber_metrics(barber_id)

        # Get peer group metrics
        peer_metrics = self._get_peer_group_metrics(barber_id)

        # Calculate percentiles
        percentiles = {
            "revenue_percentile": self._calculate_percentile(
                barber_metrics["total_revenue"], peer_metrics["revenue_distribution"]
            ),
            "efficiency_percentile": self._calculate_percentile(
                barber_metrics["revenue_per_hour"],
                peer_metrics["efficiency_distribution"],
            ),
            "growth_percentile": self._calculate_percentile(
                barber_metrics["growth_rate"], peer_metrics["growth_distribution"]
            ),
            "retention_percentile": self._calculate_percentile(
                barber_metrics["retention_rate"], peer_metrics["retention_distribution"]
            ),
        }

        # Identify improvement areas
        improvement_areas = []

        if percentiles["revenue_percentile"] < 50:
            improvement_areas.append(
                {
                    "area": "revenue",
                    "current_percentile": percentiles["revenue_percentile"],
                    "recommendations": [
                        "Focus on upselling additional services",
                        "Implement dynamic pricing strategies",
                        "Increase average ticket size",
                    ],
                }
            )

        if percentiles["efficiency_percentile"] < 50:
            improvement_areas.append(
                {
                    "area": "efficiency",
                    "current_percentile": percentiles["efficiency_percentile"],
                    "recommendations": [
                        "Optimize appointment scheduling",
                        "Reduce service time without compromising quality",
                        "Minimize gaps between appointments",
                    ],
                }
            )

        benchmark = {
            "barber_id": barber_id,
            "period_type": "monthly",
            "period_start": date.today().replace(day=1),
            "period_end": date.today(),
            "total_revenue": barber_metrics["total_revenue"],
            "total_appointments": barber_metrics["total_appointments"],
            "avg_ticket": barber_metrics["avg_ticket"],
            "client_retention_rate": barber_metrics["retention_rate"],
            "booking_utilization": barber_metrics["capacity_utilization"],
            "revenue_percentile": percentiles["revenue_percentile"],
            "efficiency_percentile": percentiles["efficiency_percentile"],
            "growth_percentile": percentiles["growth_percentile"],
            "retention_percentile": percentiles["retention_percentile"],
            "peer_group_size": peer_metrics["group_size"],
            "peer_avg_revenue": peer_metrics["avg_revenue"],
            "peer_avg_appointments": peer_metrics["avg_appointments"],
            "revenue_growth_rate": barber_metrics["growth_rate"],
            "appointment_growth_rate": barber_metrics["appointment_growth_rate"],
            "new_client_acquisition_rate": barber_metrics["new_client_rate"],
            "improvement_areas": improvement_areas[:3],  # Top 3 areas
        }

        # Save benchmark
        self._save_benchmark(benchmark)

        return benchmark

    def create_optimization_goals(self, barber_id: int) -> List[Dict[str, Any]]:
        """Create AI-recommended optimization goals"""

        # Analyze current performance
        current_metrics = self._get_barber_metrics(barber_id)

        # Get insights and patterns
        patterns = self.analyze_revenue_patterns(barber_id)
        predictions = self.predict_future_revenue(barber_id, days_ahead=90)

        goals = []

        # 1. Revenue goal
        if predictions:
            avg_predicted_revenue = np.mean(
                [p["predicted_revenue"] for p in predictions[:30]]
            )
            revenue_goal = {
                "barber_id": barber_id,
                "goal_type": "revenue",
                "goal_name": "Monthly Revenue Target",
                "description": "Achieve consistent monthly revenue growth",
                "current_value": current_metrics["total_revenue"],
                "target_value": avg_predicted_revenue * 1.1,  # 10% above prediction
                "target_date": date.today() + timedelta(days=90),
                "recommended_actions": [
                    "Implement pricing optimization recommendations",
                    "Focus on high-value client retention",
                    "Upsell premium services",
                    "Reduce no-show rates",
                ],
                "estimated_difficulty": "medium",
                "success_probability": 0.75,
                "progress_percentage": 0.0,
            }
            goals.append(revenue_goal)

        # 2. Client retention goal
        if current_metrics["retention_rate"] < 0.8:
            retention_goal = {
                "barber_id": barber_id,
                "goal_type": "retention",
                "goal_name": "Client Retention Improvement",
                "description": "Increase repeat client visits",
                "current_value": current_metrics["retention_rate"] * 100,
                "target_value": 80.0,
                "target_date": date.today() + timedelta(days=60),
                "recommended_actions": [
                    "Implement loyalty program",
                    "Send personalized follow-ups",
                    "Offer exclusive deals to regulars",
                    "Improve service consistency",
                ],
                "estimated_difficulty": "easy",
                "success_probability": 0.85,
                "progress_percentage": 0.0,
            }
            goals.append(retention_goal)

        # 3. Efficiency goal
        if current_metrics["capacity_utilization"] < 0.75:
            efficiency_goal = {
                "barber_id": barber_id,
                "goal_type": "efficiency",
                "goal_name": "Booking Utilization Target",
                "description": "Maximize appointment slot usage",
                "current_value": current_metrics["capacity_utilization"] * 100,
                "target_value": 75.0,
                "target_date": date.today() + timedelta(days=45),
                "recommended_actions": [
                    "Enable online booking",
                    "Implement smart scheduling",
                    "Reduce gaps between appointments",
                    "Offer flexible time slots",
                ],
                "estimated_difficulty": "medium",
                "success_probability": 0.8,
                "progress_percentage": 0.0,
            }
            goals.append(efficiency_goal)

        # Save goals
        for goal in goals:
            self._save_optimization_goal(goal)

        return goals

    # Helper methods for saving to database
    def _save_pattern(
        self, barber_id: int, pattern: Dict[str, Any], start_date: date, end_date: date
    ):
        """Save revenue pattern to database"""

        db_pattern = RevenuePattern(
            barber_id=barber_id,
            pattern_type=pattern["pattern_type"],
            pattern_name=pattern["pattern_name"],
            confidence_score=pattern["confidence_score"],
            pattern_data=pattern["pattern_data"],
            avg_revenue_impact=pattern["avg_revenue_impact"],
            frequency=pattern["frequency"],
            start_date=start_date,
            end_date=end_date,
            model_version="1.0",
        )

        self.db.add(db_pattern)
        self.db.commit()

    def _save_prediction(self, prediction: Dict[str, Any]):
        """Save revenue prediction to database"""

        # Check if prediction already exists
        existing = (
            self.db.query(RevenuePrediction)
            .filter(
                and_(
                    RevenuePrediction.barber_id == prediction["barber_id"],
                    RevenuePrediction.prediction_date == prediction["prediction_date"],
                    RevenuePrediction.prediction_type == prediction["prediction_type"],
                )
            )
            .first()
        )

        if existing:
            # Update existing prediction
            for key, value in prediction.items():
                if hasattr(existing, key):
                    setattr(existing, key, value)
        else:
            # Create new prediction
            db_prediction = RevenuePrediction(**prediction)
            self.db.add(db_prediction)

        self.db.commit()

    def _save_pricing_optimization(self, recommendation: Dict[str, Any]):
        """Save pricing optimization recommendation"""

        db_optimization = PricingOptimization(
            **recommendation,
            status="pending",
            expires_at=datetime.now() + timedelta(days=30),
        )

        self.db.add(db_optimization)
        self.db.commit()

    def _save_client_segment(self, segment: Dict[str, Any]):
        """Save client segment to database"""

        db_segment = ClientSegment(**segment)
        self.db.add(db_segment)
        self.db.commit()

    def _save_insight(self, insight: Dict[str, Any]):
        """Save revenue insight to database"""

        db_insight = RevenueInsight(
            **insight, status="new", valid_until=datetime.now() + timedelta(days=30)
        )

        self.db.add(db_insight)
        self.db.commit()

    def _save_benchmark(self, benchmark: Dict[str, Any]):
        """Save performance benchmark to database"""

        db_benchmark = PerformanceBenchmark(**benchmark)
        self.db.add(db_benchmark)
        self.db.commit()

    def _save_optimization_goal(self, goal: Dict[str, Any]):
        """Save optimization goal to database"""

        db_goal = RevenueOptimizationGoal(**goal, status="active")
        self.db.add(db_goal)
        self.db.commit()

    # Additional helper methods would go here...
    def _get_service_pricing_data(self, barber_id: int) -> Dict[str, Any]:
        """Get service-level pricing and demand data"""
        # Implementation would fetch and analyze service pricing data
        pass

    def _find_optimal_price(
        self, current_price: float, demand_data: Dict, elasticity: float
    ) -> float:
        """Find optimal price point using optimization algorithms"""
        # Implementation would use optimization to find best price
        pass

    def _calculate_revenue_impact(
        self,
        current_price: float,
        new_price: float,
        elasticity: float,
        current_demand: int,
    ) -> float:
        """Calculate expected revenue impact of price change"""
        # Implementation would calculate revenue impact
        pass

    def _get_client_feature_data(self, barber_id: int) -> Dict[int, Dict[str, Any]]:
        """Get client feature data for segmentation"""
        # Implementation would fetch and prepare client data
        pass

    def _generate_segment_strategies(
        self, segment_type: str, segment_df: pd.DataFrame
    ) -> Dict[str, Any]:
        """Generate engagement strategies for client segments"""
        # Implementation would create segment-specific strategies
        pass

    def _prioritize_insights(
        self, insights: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Prioritize insights based on impact and confidence"""
        # Sort by potential impact and confidence
        return sorted(
            insights,
            key=lambda x: x.get("potential_impact", 0) * x.get("confidence_score", 0.5),
            reverse=True,
        )


# Global service instance
ai_revenue_analytics_service = AIRevenueAnalyticsService()

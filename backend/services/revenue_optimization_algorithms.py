"""
Revenue Optimization Algorithms
Advanced ML algorithms for revenue optimization
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, date, timedelta
from scipy.optimize import minimize
from scipy.stats import norm
import warnings

warnings.filterwarnings("ignore")


class RevenueOptimizationAlgorithms:
    """Collection of optimization algorithms for revenue analytics"""

    @staticmethod
    def calculate_price_elasticity(price_history: List[Dict[str, float]]) -> float:
        """
        Calculate price elasticity of demand using regression analysis

        Args:
            price_history: List of dicts with 'price', 'quantity', 'date'

        Returns:
            Price elasticity coefficient
        """
        if len(price_history) < 5:
            return -1.0  # Default elasticity

        df = pd.DataFrame(price_history)

        # Log transform for elasticity calculation
        df["log_price"] = np.log(df["price"])
        df["log_quantity"] = np.log(df["quantity"] + 1)  # Add 1 to handle zeros

        # Calculate percentage changes
        df["price_pct_change"] = df["log_price"].pct_change()
        df["quantity_pct_change"] = df["log_quantity"].pct_change()

        # Remove inf and nan values
        df = df.replace([np.inf, -np.inf], np.nan).dropna()

        if len(df) < 3:
            return -1.0

        # Calculate elasticity as ratio of quantity change to price change
        elasticity = (df["quantity_pct_change"] / df["price_pct_change"]).mean()

        # Bound elasticity to reasonable range
        return max(-3.0, min(-0.1, elasticity))

    @staticmethod
    def optimize_price_revenue(
        current_price: float,
        elasticity: float,
        current_demand: int,
        cost_per_unit: float = 0,
        constraints: Optional[Dict[str, float]] = None,
    ) -> Dict[str, float]:
        """
        Find optimal price to maximize revenue using calculus-based optimization

        Args:
            current_price: Current price
            elasticity: Price elasticity of demand
            current_demand: Current demand at current price
            cost_per_unit: Variable cost per unit (for profit optimization)
            constraints: Min/max price constraints

        Returns:
            Dict with optimal_price, expected_revenue, expected_demand
        """

        # Default constraints
        if constraints is None:
            constraints = {
                "min_price": current_price * 0.5,
                "max_price": current_price * 2.0,
            }

        # Revenue function: R = P * Q, where Q = Q0 * (P/P0)^elasticity
        def revenue_function(price):
            quantity = current_demand * (price / current_price) ** elasticity
            revenue = price * quantity
            return -revenue  # Negative for minimization

        # Profit function if cost is provided
        def profit_function(price):
            quantity = current_demand * (price / current_price) ** elasticity
            profit = (price - cost_per_unit) * quantity
            return -profit  # Negative for minimization

        # Choose objective function
        objective = profit_function if cost_per_unit > 0 else revenue_function

        # Optimize
        result = minimize(
            objective,
            x0=current_price,
            bounds=[(constraints["min_price"], constraints["max_price"])],
            method="L-BFGS-B",
        )

        optimal_price = result.x[0]
        expected_demand = current_demand * (optimal_price / current_price) ** elasticity
        expected_revenue = optimal_price * expected_demand

        # Calculate percentage changes
        price_change_pct = (optimal_price - current_price) / current_price * 100
        demand_change_pct = (expected_demand - current_demand) / current_demand * 100
        revenue_change_pct = (
            (expected_revenue - (current_price * current_demand))
            / (current_price * current_demand)
            * 100
        )

        return {
            "optimal_price": round(optimal_price, 2),
            "current_price": current_price,
            "price_change_pct": round(price_change_pct, 1),
            "expected_demand": round(expected_demand, 1),
            "current_demand": current_demand,
            "demand_change_pct": round(demand_change_pct, 1),
            "expected_revenue": round(expected_revenue, 2),
            "current_revenue": round(current_price * current_demand, 2),
            "revenue_change_pct": round(revenue_change_pct, 1),
            "elasticity_used": elasticity,
        }

    @staticmethod
    def calculate_dynamic_pricing(
        base_price: float,
        demand_factors: Dict[str, float],
        capacity_utilization: float,
        time_until_slot: int,  # hours
    ) -> float:
        """
        Calculate dynamic price based on demand factors and capacity

        Args:
            base_price: Base service price
            demand_factors: Dict with factors like 'day_of_week_multiplier', 'hour_multiplier'
            capacity_utilization: Current capacity utilization (0-1)
            time_until_slot: Hours until the appointment slot

        Returns:
            Dynamically adjusted price
        """

        # Base multiplier
        multiplier = 1.0

        # Apply demand factors
        for factor, value in demand_factors.items():
            multiplier *= value

        # Capacity-based adjustment
        if capacity_utilization > 0.8:
            # High demand - increase price
            multiplier *= 1 + (capacity_utilization - 0.8) * 0.5
        elif capacity_utilization < 0.5:
            # Low demand - discount
            multiplier *= 1 - (0.5 - capacity_utilization) * 0.3

        # Last-minute pricing
        if time_until_slot < 24:
            if capacity_utilization < 0.7:
                # Last-minute discount for empty slots
                multiplier *= 0.85
            else:
                # Last-minute premium for high demand
                multiplier *= 1.1

        # Calculate final price
        dynamic_price = base_price * multiplier

        # Ensure price stays within reasonable bounds
        min_price = base_price * 0.7
        max_price = base_price * 1.5

        return round(max(min_price, min(max_price, dynamic_price)), 2)

    @staticmethod
    def segment_clients_by_value(
        client_data: List[Dict[str, Any]], n_segments: int = 4
    ) -> Dict[int, Dict[str, Any]]:
        """
        Segment clients using RFM (Recency, Frequency, Monetary) analysis

        Args:
            client_data: List of client dictionaries with transaction data
            n_segments: Number of segments to create

        Returns:
            Dict mapping client_id to segment info
        """

        if not client_data:
            return {}

        # Create DataFrame
        df = pd.DataFrame(client_data)

        # Calculate RFM metrics
        current_date = datetime.now()

        rfm_data = []
        for client_id, group in df.groupby("client_id"):
            recency = (current_date - pd.to_datetime(group["date"].max())).days
            frequency = len(group)
            monetary = group["revenue"].sum()

            rfm_data.append(
                {
                    "client_id": client_id,
                    "recency": recency,
                    "frequency": frequency,
                    "monetary": monetary,
                }
            )

        rfm_df = pd.DataFrame(rfm_data)

        # Score RFM metrics (1-5 scale)
        rfm_df["R_score"] = pd.qcut(
            rfm_df["recency"], 5, labels=[5, 4, 3, 2, 1]
        )  # Inverse for recency
        rfm_df["F_score"] = pd.qcut(
            rfm_df["frequency"].rank(method="first"), 5, labels=[1, 2, 3, 4, 5]
        )
        rfm_df["M_score"] = pd.qcut(
            rfm_df["monetary"].rank(method="first"), 5, labels=[1, 2, 3, 4, 5]
        )

        # Combine scores
        rfm_df["RFM_score"] = (
            rfm_df["R_score"].astype(str)
            + rfm_df["F_score"].astype(str)
            + rfm_df["M_score"].astype(str)
        )

        # Define segments based on RFM scores
        def segment_clients(row):
            r, f, m = int(row["R_score"]), int(row["F_score"]), int(row["M_score"])

            if r >= 4 and f >= 4 and m >= 4:
                return "Champions"
            elif r >= 3 and f >= 3 and m >= 4:
                return "Loyal Customers"
            elif r >= 3 and f <= 2 and m >= 3:
                return "Potential Loyalists"
            elif r <= 2 and f >= 3:
                return "At Risk"
            elif r <= 2 and f <= 2 and m >= 3:
                return "Cant Lose Them"
            elif r >= 4 and f <= 2:
                return "New Customers"
            else:
                return "Others"

        rfm_df["segment"] = rfm_df.apply(segment_clients, axis=1)

        # Create segment mapping
        segments = {}
        for _, row in rfm_df.iterrows():
            segments[row["client_id"]] = {
                "segment": row["segment"],
                "rfm_score": row["RFM_score"],
                "recency_days": row["recency"],
                "frequency": row["frequency"],
                "lifetime_value": row["monetary"],
                "avg_transaction": row["monetary"] / max(row["frequency"], 1),
            }

        return segments

    @staticmethod
    def predict_churn_probability(
        client_history: Dict[str, Any], avg_days_between_visits: float
    ) -> float:
        """
        Predict probability of client churn using survival analysis concepts

        Args:
            client_history: Client's transaction history
            avg_days_between_visits: Average days between visits for all clients

        Returns:
            Churn probability (0-1)
        """

        # Days since last visit
        days_since_last = client_history.get("days_since_last_visit", 0)

        # Client's historical pattern
        client_avg_days = client_history.get(
            "avg_days_between_visits", avg_days_between_visits
        )
        visit_regularity = client_history.get(
            "visit_regularity_score", 0.5
        )  # 0-1, higher is more regular

        # Calculate expected return probability using exponential decay
        # Based on the client's historical pattern
        if client_avg_days > 0:
            # Hazard rate (probability of return per day)
            hazard_rate = 1 / client_avg_days

            # Survival probability (hasn't returned yet)
            survival_prob = np.exp(-hazard_rate * days_since_last)

            # Adjust for regularity (regular clients have lower churn risk)
            survival_prob = survival_prob * (1 + visit_regularity * 0.5)

            # Churn probability is inverse of survival
            churn_prob = 1 - survival_prob

            # Additional factors
            total_visits = client_history.get("total_visits", 1)
            if total_visits > 10:
                # Loyal customers have lower churn risk
                churn_prob *= 0.7
            elif total_visits < 3:
                # New customers have higher churn risk
                churn_prob *= 1.3

            # Bound probability
            return min(0.95, max(0.05, churn_prob))

        return 0.5  # Default if no history

    @staticmethod
    def optimize_appointment_slots(
        availability: List[Dict[str, Any]],
        demand_forecast: Dict[str, float],
        constraints: Optional[Dict[str, Any]] = None,
    ) -> List[Dict[str, Any]]:
        """
        Optimize appointment slot allocation based on demand forecasts

        Args:
            availability: List of available time slots
            demand_forecast: Predicted demand for each time slot
            constraints: Business constraints (min/max appointments per day, etc.)

        Returns:
            Optimized slot allocation
        """

        if constraints is None:
            constraints = {
                "min_daily_appointments": 4,
                "max_daily_appointments": 12,
                "min_break_minutes": 15,
                "preferred_slot_duration": 60,
            }

        optimized_slots = []

        # Group slots by day
        df = pd.DataFrame(availability)

        for date_group, slots in df.groupby("date"):
            daily_slots = []

            # Sort slots by demand forecast
            slots["demand_score"] = slots["time_slot"].map(demand_forecast)
            slots = slots.sort_values("demand_score", ascending=False)

            # Allocate high-demand slots first
            allocated_minutes = 0
            max_daily_minutes = (
                constraints["max_daily_appointments"]
                * constraints["preferred_slot_duration"]
            )

            for _, slot in slots.iterrows():
                if (
                    allocated_minutes + constraints["preferred_slot_duration"]
                    <= max_daily_minutes
                ):
                    slot_dict = slot.to_dict()
                    slot_dict["recommended_duration"] = constraints[
                        "preferred_slot_duration"
                    ]
                    slot_dict["demand_level"] = (
                        "high"
                        if slot["demand_score"] > 0.7
                        else "medium" if slot["demand_score"] > 0.4 else "low"
                    )

                    daily_slots.append(slot_dict)
                    allocated_minutes += constraints["preferred_slot_duration"]

            optimized_slots.extend(daily_slots)

        return optimized_slots

    @staticmethod
    def calculate_lifetime_value(
        client_history: Dict[str, Any],
        retention_rate: float,
        discount_rate: float = 0.1,
    ) -> float:
        """
        Calculate predicted customer lifetime value (CLV)

        Args:
            client_history: Client's transaction history
            retention_rate: Probability of retention per period
            discount_rate: Discount rate for future cash flows

        Returns:
            Predicted lifetime value
        """

        # Average transaction value
        avg_transaction = client_history.get("avg_transaction_value", 50)

        # Transactions per year
        visits_per_year = client_history.get("visits_per_year", 12)

        # Calculate CLV using simplified formula
        # CLV = (Average Transaction Value × Purchase Frequency × Gross Margin) × (Retention Rate / (1 + Discount Rate - Retention Rate))

        gross_margin = 0.7  # Assume 70% margin for services

        annual_value = avg_transaction * visits_per_year * gross_margin

        # Multi-period CLV calculation
        clv = annual_value * (retention_rate / (1 + discount_rate - retention_rate))

        return round(clv, 2)

    @staticmethod
    def recommend_service_bundle(
        client_preferences: Dict[str, Any],
        service_catalog: List[Dict[str, Any]],
        target_value: float,
    ) -> List[Dict[str, Any]]:
        """
        Recommend optimal service bundles using knapsack algorithm

        Args:
            client_preferences: Client's service preferences and history
            service_catalog: Available services with prices and durations
            target_value: Target bundle value

        Returns:
            Recommended service bundles
        """

        # Filter services based on client preferences
        preferred_categories = client_preferences.get("preferred_categories", [])
        if preferred_categories:
            relevant_services = [
                s for s in service_catalog if s["category"] in preferred_categories
            ]
        else:
            relevant_services = service_catalog

        # Dynamic programming approach for bundle optimization
        n = len(relevant_services)
        dp = {}

        def find_bundles(index, current_value, current_bundle):
            if index >= n or current_value >= target_value * 1.2:  # 20% tolerance
                if target_value * 0.8 <= current_value <= target_value * 1.2:
                    return [current_bundle]
                return []

            # Try including current service
            bundles = []
            service = relevant_services[index]

            # Include service
            new_bundle = current_bundle + [service]
            new_value = current_value + service["price"]
            bundles.extend(find_bundles(index + 1, new_value, new_bundle))

            # Skip service
            bundles.extend(find_bundles(index + 1, current_value, current_bundle))

            return bundles

        # Find all valid bundles
        all_bundles = find_bundles(0, 0, [])

        # Score bundles based on client preferences
        scored_bundles = []
        for bundle in all_bundles:
            score = 0
            total_price = sum(s["price"] for s in bundle)
            total_duration = sum(s["duration"] for s in bundle)

            # Preference score
            for service in bundle:
                if service["name"] in client_preferences.get("favorite_services", []):
                    score += 2
                if service["category"] in preferred_categories:
                    score += 1

            # Value score (closer to target is better)
            value_diff = abs(total_price - target_value)
            score -= value_diff / target_value

            # Duration score (prefer reasonable duration)
            if 60 <= total_duration <= 120:
                score += 1

            scored_bundles.append(
                {
                    "services": bundle,
                    "total_price": total_price,
                    "total_duration": total_duration,
                    "score": score,
                    "savings": (
                        total_price * 0.1 if len(bundle) > 1 else 0
                    ),  # 10% bundle discount
                }
            )

        # Sort by score and return top bundles
        scored_bundles.sort(key=lambda x: x["score"], reverse=True)

        return scored_bundles[:3]  # Top 3 recommendations

    @staticmethod
    def forecast_demand(
        historical_data: pd.DataFrame,
        forecast_days: int = 30,
        include_seasonality: bool = True,
    ) -> pd.DataFrame:
        """
        Forecast demand using time series analysis

        Args:
            historical_data: DataFrame with date and demand columns
            forecast_days: Number of days to forecast
            include_seasonality: Whether to include seasonal patterns

        Returns:
            DataFrame with forecasted demand
        """

        # Ensure we have enough data
        if len(historical_data) < 30:
            # Simple moving average for limited data
            avg_demand = historical_data["demand"].mean()
            forecast_dates = pd.date_range(
                start=historical_data["date"].max() + timedelta(days=1),
                periods=forecast_days,
            )
            return pd.DataFrame(
                {
                    "date": forecast_dates,
                    "forecast": [avg_demand] * forecast_days,
                    "lower_bound": [avg_demand * 0.8] * forecast_days,
                    "upper_bound": [avg_demand * 1.2] * forecast_days,
                }
            )

        # Prepare time series
        ts = historical_data.set_index("date")["demand"]
        ts = ts.resample("D").sum()  # Daily aggregation

        # Simple moving average with trend
        window = min(7, len(ts) // 4)
        ma = ts.rolling(window=window).mean()

        # Calculate trend
        if len(ts) > 14:
            recent_avg = ts[-7:].mean()
            past_avg = ts[-14:-7].mean()
            trend = (recent_avg - past_avg) / 7  # Daily trend
        else:
            trend = 0

        # Generate forecast
        last_value = ts.iloc[-1]
        forecast_values = []

        for i in range(forecast_days):
            # Base forecast with trend
            base_forecast = last_value + trend * i

            # Add day-of-week seasonality if enabled
            if include_seasonality and len(ts) > 30:
                day_of_week = (ts.index[-1] + timedelta(days=i + 1)).weekday()
                dow_avg = ts.groupby(ts.index.weekday).mean()
                if day_of_week in dow_avg:
                    seasonality_factor = dow_avg[day_of_week] / dow_avg.mean()
                    base_forecast *= seasonality_factor

            forecast_values.append(max(0, base_forecast))

        # Create forecast DataFrame
        forecast_dates = pd.date_range(
            start=ts.index[-1] + timedelta(days=1), periods=forecast_days
        )

        forecast_df = pd.DataFrame(
            {
                "date": forecast_dates,
                "forecast": forecast_values,
                "lower_bound": [v * 0.8 for v in forecast_values],
                "upper_bound": [v * 1.2 for v in forecast_values],
            }
        )

        return forecast_df

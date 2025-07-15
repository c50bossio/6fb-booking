"""
Advanced Customer Segmentation Service with Machine Learning.
Uses behavioral data and ML algorithms to create dynamic customer segments.
"""

import logging
from typing import Dict, List, Optional, Tuple, Any
from datetime import datetime, timedelta
from dataclasses import dataclass
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_, desc
import numpy as np
import pandas as pd
from sklearn.cluster import KMeans, DBSCAN
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.decomposition import PCA
from sklearn.metrics import silhouette_score
from sklearn.ensemble import IsolationForest
import joblib
import os

from models import User, Client, MarketingCampaign, Appointment
from models.tracking import ConversionEvent
from schemas import ContactSegmentCreate

logger = logging.getLogger(__name__)

@dataclass
class CustomerSegment:
    """Dynamic customer segment with ML-based characteristics"""
    segment_id: int
    name: str
    description: str
    customer_count: int
    characteristics: Dict[str, Any]
    behavioral_patterns: List[str]
    recommended_campaigns: List[str]
    value_score: float
    churn_risk: float

@dataclass
class SegmentationInsights:
    """Insights from customer segmentation analysis"""
    total_customers: int
    segments_count: int
    silhouette_score: float
    high_value_segments: List[CustomerSegment]
    at_risk_segments: List[CustomerSegment]
    growth_opportunities: List[str]

class CustomerSegmentationService:
    """
    Advanced customer segmentation using machine learning.
    Creates dynamic segments based on behavioral patterns, value, and engagement.
    """
    
    def __init__(self):
        self.kmeans_model = None
        self.scaler = StandardScaler()
        self.pca = PCA(n_components=0.95)  # Keep 95% of variance
        self.anomaly_detector = IsolationForest(contamination=0.1, random_state=42)
        self.models_trained = False
        self.model_path = "/app/models/customer_segmentation"
        
        # Ensure model directory exists
        os.makedirs(self.model_path, exist_ok=True)
        
        # Load existing models
        self._load_models()
    
    def _load_models(self):
        """Load pre-trained segmentation models"""
        try:
            model_files = [
                'kmeans_model.joblib',
                'scaler.joblib',
                'pca.joblib',
                'anomaly_detector.joblib'
            ]
            
            if all(os.path.exists(f"{self.model_path}/{file}") for file in model_files):
                self.kmeans_model = joblib.load(f"{self.model_path}/kmeans_model.joblib")
                self.scaler = joblib.load(f"{self.model_path}/scaler.joblib")
                self.pca = joblib.load(f"{self.model_path}/pca.joblib")
                self.anomaly_detector = joblib.load(f"{self.model_path}/anomaly_detector.joblib")
                self.models_trained = True
                logger.info("Loaded pre-trained customer segmentation models")
        except Exception as e:
            logger.warning(f"Could not load pre-trained models: {e}")
            self.models_trained = False
    
    def _save_models(self):
        """Save trained models to disk"""
        try:
            joblib.dump(self.kmeans_model, f"{self.model_path}/kmeans_model.joblib")
            joblib.dump(self.scaler, f"{self.model_path}/scaler.joblib")
            joblib.dump(self.pca, f"{self.model_path}/pca.joblib")
            joblib.dump(self.anomaly_detector, f"{self.model_path}/anomaly_detector.joblib")
            logger.info("Saved customer segmentation models")
        except Exception as e:
            logger.error(f"Could not save models: {e}")
    
    def extract_customer_features(self, db: Session, user_id: int) -> pd.DataFrame:
        """Extract comprehensive customer features for segmentation"""
        # Get all clients for the user
        clients = db.query(Client).filter(Client.user_id == user_id).all()
        
        if not clients:
            return pd.DataFrame()
        
        features_data = []
        
        for client in clients:
            features = self._calculate_client_features(db, client)
            features_data.append(features)
        
        df = pd.DataFrame(features_data)
        
        # Handle missing values
        df = df.fillna(0)
        
        return df
    
    def _calculate_client_features(self, db: Session, client: Client) -> Dict[str, float]:
        """Calculate comprehensive features for a single client"""
        features = {}
        
        # Basic demographics
        features['client_id'] = client.id
        features['days_since_registration'] = (datetime.utcnow() - client.created_at).days
        features['email_provided'] = 1 if client.email else 0
        features['phone_provided'] = 1 if client.phone else 0
        
        # Appointment history features
        appointments = db.query(Appointment).filter(Appointment.client_id == client.id).all()
        
        features['total_appointments'] = len(appointments)
        features['completed_appointments'] = len([a for a in appointments if a.status == 'completed'])
        features['cancelled_appointments'] = len([a for a in appointments if a.status == 'cancelled'])
        features['no_show_appointments'] = len([a for a in appointments if a.status == 'no_show'])
        
        # Calculate appointment frequency and patterns
        if appointments:
            appointment_dates = [a.appointment_datetime for a in appointments if a.appointment_datetime]
            if len(appointment_dates) > 1:
                appointment_dates.sort()
                intervals = [(appointment_dates[i] - appointment_dates[i-1]).days 
                           for i in range(1, len(appointment_dates))]
                features['avg_appointment_interval'] = np.mean(intervals)
                features['appointment_regularity'] = 1 / (np.std(intervals) + 1)  # Higher = more regular
            else:
                features['avg_appointment_interval'] = 0
                features['appointment_regularity'] = 0
            
            # Recent activity
            recent_appointments = [a for a in appointments 
                                 if a.appointment_datetime and 
                                 a.appointment_datetime > datetime.utcnow() - timedelta(days=90)]
            features['recent_appointments_90d'] = len(recent_appointments)
            
            # Last appointment recency
            last_appointment = max(appointment_dates) if appointment_dates else None
            if last_appointment:
                features['days_since_last_appointment'] = (datetime.utcnow() - last_appointment).days
            else:
                features['days_since_last_appointment'] = 999  # High value for no appointments
        else:
            features.update({
                'avg_appointment_interval': 0,
                'appointment_regularity': 0,
                'recent_appointments_90d': 0,
                'days_since_last_appointment': 999
            })
        
        # Financial features
        total_revenue = sum(a.total_amount for a in appointments if a.total_amount)
        features['total_revenue'] = total_revenue
        features['avg_appointment_value'] = total_revenue / max(len(appointments), 1)
        
        # Service preferences
        service_types = [a.service_id for a in appointments if a.service_id]
        features['unique_services_used'] = len(set(service_types))
        features['service_loyalty'] = len(service_types) / max(len(set(service_types)), 1)  # Repeat vs variety
        
        # Engagement features
        features['completion_rate'] = features['completed_appointments'] / max(features['total_appointments'], 1)
        features['cancellation_rate'] = features['cancelled_appointments'] / max(features['total_appointments'], 1)
        features['no_show_rate'] = features['no_show_appointments'] / max(features['total_appointments'], 1)
        
        # Marketing interaction features
        conversion_events = db.query(ConversionEvent).filter(
            ConversionEvent.client_id == client.id
        ).all()
        
        features['total_conversions'] = len(conversion_events)
        features['email_conversions'] = len([e for e in conversion_events if 'email' in e.event_type.lower()])
        features['sms_conversions'] = len([e for e in conversion_events if 'sms' in e.event_type.lower()])
        
        # Lifetime value calculation
        features['customer_lifetime_value'] = self._calculate_clv(features)
        
        # Churn risk indicators
        features['churn_risk_score'] = self._calculate_churn_risk(features)
        
        # Engagement score
        features['engagement_score'] = self._calculate_engagement_score(features)
        
        return features
    
    def _calculate_clv(self, features: Dict[str, float]) -> float:
        """Calculate Customer Lifetime Value"""
        if features['total_appointments'] == 0:
            return 0
        
        # Simple CLV calculation: avg_value * frequency * retention_factor
        avg_value = features['avg_appointment_value']
        frequency = 365 / max(features['avg_appointment_interval'], 30)  # Annual frequency
        retention_factor = features['completion_rate'] * (1 - features['churn_risk_score'])
        
        return avg_value * frequency * retention_factor
    
    def _calculate_churn_risk(self, features: Dict[str, float]) -> float:
        """Calculate churn risk score (0-1, higher = more risk)"""
        risk_factors = [
            features['days_since_last_appointment'] / 365,  # Normalized recency
            features['cancellation_rate'],
            features['no_show_rate'],
            1 - features['completion_rate'],
            1 / max(features['appointment_regularity'], 0.1),  # Irregularity
        ]
        
        # Weight factors
        weights = [0.3, 0.2, 0.2, 0.2, 0.1]
        churn_risk = sum(factor * weight for factor, weight in zip(risk_factors, weights))
        
        return min(churn_risk, 1.0)  # Cap at 1.0
    
    def _calculate_engagement_score(self, features: Dict[str, float]) -> float:
        """Calculate overall engagement score (0-1, higher = more engaged)"""
        engagement_factors = [
            features['completion_rate'],
            1 - features['cancellation_rate'],
            1 - features['no_show_rate'],
            min(features['recent_appointments_90d'] / 4, 1),  # Normalized recent activity
            min(features['total_conversions'] / 10, 1),  # Normalized conversions
        ]
        
        return np.mean(engagement_factors)
    
    def perform_segmentation(self, db: Session, user_id: int, n_segments: int = None) -> SegmentationInsights:
        """Perform ML-based customer segmentation"""
        # Extract features
        df = self.extract_customer_features(db, user_id)
        
        if df.empty or len(df) < 10:
            logger.warning(f"Insufficient data for segmentation (n={len(df)})")
            return self._create_empty_insights()
        
        # Prepare features for clustering
        feature_columns = [col for col in df.columns if col != 'client_id']
        X = df[feature_columns].values
        
        # Scale features
        X_scaled = self.scaler.fit_transform(X)
        
        # Apply PCA for dimensionality reduction
        X_pca = self.pca.fit_transform(X_scaled)
        
        # Determine optimal number of clusters if not provided
        if n_segments is None:
            n_segments = self._find_optimal_clusters(X_pca)
        
        # Perform clustering
        self.kmeans_model = KMeans(n_clusters=n_segments, random_state=42, n_init=10)
        cluster_labels = self.kmeans_model.fit_predict(X_pca)
        
        # Calculate silhouette score
        silhouette_avg = silhouette_score(X_pca, cluster_labels)
        
        # Detect anomalies (VIP or outlier customers)
        self.anomaly_detector.fit(X_scaled)
        anomaly_labels = self.anomaly_detector.predict(X_scaled)
        
        # Add cluster labels to dataframe
        df['cluster'] = cluster_labels
        df['is_anomaly'] = anomaly_labels == -1
        
        # Analyze segments
        segments = self._analyze_segments(db, df, feature_columns)
        
        # Save models
        self.models_trained = True
        self._save_models()
        
        return SegmentationInsights(
            total_customers=len(df),
            segments_count=n_segments,
            silhouette_score=silhouette_avg,
            high_value_segments=[s for s in segments if s.value_score > 0.7],
            at_risk_segments=[s for s in segments if s.churn_risk > 0.6],
            growth_opportunities=self._identify_growth_opportunities(segments)
        )
    
    def _find_optimal_clusters(self, X: np.ndarray, max_clusters: int = 8) -> int:
        """Find optimal number of clusters using elbow method and silhouette score"""
        if len(X) < 6:
            return min(2, len(X))
        
        silhouette_scores = []
        inertias = []
        k_range = range(2, min(max_clusters + 1, len(X)))
        
        for k in k_range:
            kmeans = KMeans(n_clusters=k, random_state=42, n_init=10)
            cluster_labels = kmeans.fit_predict(X)
            silhouette_avg = silhouette_score(X, cluster_labels)
            silhouette_scores.append(silhouette_avg)
            inertias.append(kmeans.inertia_)
        
        # Choose k with highest silhouette score, with preference for simplicity
        best_k = k_range[np.argmax(silhouette_scores)]
        
        # If multiple k's have similar scores, choose the smaller one
        max_score = max(silhouette_scores)
        for i, score in enumerate(silhouette_scores):
            if score >= max_score * 0.95:  # Within 5% of best score
                best_k = k_range[i]
                break
        
        return best_k
    
    def _analyze_segments(self, db: Session, df: pd.DataFrame, feature_columns: List[str]) -> List[CustomerSegment]:
        """Analyze and characterize each customer segment"""
        segments = []
        
        for cluster_id in df['cluster'].unique():
            cluster_data = df[df['cluster'] == cluster_id]
            
            # Calculate segment characteristics
            characteristics = {}
            for col in feature_columns:
                characteristics[col] = {
                    'mean': float(cluster_data[col].mean()),
                    'median': float(cluster_data[col].median()),
                    'std': float(cluster_data[col].std())
                }
            
            # Determine segment name and description
            segment_name, description = self._characterize_segment(characteristics)
            
            # Calculate behavioral patterns
            patterns = self._identify_behavioral_patterns(characteristics)
            
            # Recommended campaigns
            campaigns = self._recommend_campaigns(characteristics)
            
            # Calculate value and risk scores
            value_score = np.mean([
                characteristics['customer_lifetime_value']['mean'] / 1000,  # Normalize
                characteristics['engagement_score']['mean'],
                characteristics['completion_rate']['mean']
            ])
            value_score = min(value_score, 1.0)
            
            churn_risk = characteristics['churn_risk_score']['mean']
            
            segment = CustomerSegment(
                segment_id=int(cluster_id),
                name=segment_name,
                description=description,
                customer_count=len(cluster_data),
                characteristics=characteristics,
                behavioral_patterns=patterns,
                recommended_campaigns=campaigns,
                value_score=value_score,
                churn_risk=churn_risk
            )
            
            segments.append(segment)
        
        return segments
    
    def _characterize_segment(self, characteristics: Dict[str, Dict[str, float]]) -> Tuple[str, str]:
        """Generate name and description for a segment based on characteristics"""
        clv = characteristics['customer_lifetime_value']['mean']
        engagement = characteristics['engagement_score']['mean']
        churn_risk = characteristics['churn_risk_score']['mean']
        frequency = characteristics['total_appointments']['mean']
        
        # Characterize based on key metrics
        if clv > 500 and engagement > 0.7:
            return "VIP Champions", "High-value, highly engaged customers who drive significant revenue"
        elif clv > 300 and churn_risk < 0.3:
            return "Loyal Advocates", "Consistently loyal customers with strong retention"
        elif engagement > 0.6 and frequency > 5:
            return "Regular Clients", "Frequent, engaged customers with good appointment habits"
        elif churn_risk > 0.7:
            return "At-Risk Customers", "Customers showing signs of potential churn"
        elif frequency < 2 and characteristics['days_since_registration']['mean'] < 90:
            return "New Customers", "Recently acquired customers still establishing patterns"
        elif engagement < 0.4:
            return "Dormant Customers", "Low engagement customers needing re-activation"
        elif clv < 100:
            return "Budget Conscious", "Price-sensitive customers with lower spend patterns"
        else:
            return "Developing Customers", "Customers with growth potential"
    
    def _identify_behavioral_patterns(self, characteristics: Dict[str, Dict[str, float]]) -> List[str]:
        """Identify key behavioral patterns for a segment"""
        patterns = []
        
        # Appointment patterns
        if characteristics['appointment_regularity']['mean'] > 0.7:
            patterns.append("Highly regular appointment scheduling")
        elif characteristics['appointment_regularity']['mean'] < 0.3:
            patterns.append("Irregular appointment patterns")
        
        # Completion behavior
        if characteristics['completion_rate']['mean'] > 0.9:
            patterns.append("Excellent appointment completion rate")
        elif characteristics['completion_rate']['mean'] < 0.7:
            patterns.append("Frequent cancellations or no-shows")
        
        # Service preferences
        if characteristics['service_loyalty']['mean'] > 0.8:
            patterns.append("Strong preference for specific services")
        elif characteristics['unique_services_used']['mean'] > 3:
            patterns.append("Diverse service usage")
        
        # Engagement patterns
        if characteristics['total_conversions']['mean'] > 5:
            patterns.append("High marketing engagement")
        elif characteristics['total_conversions']['mean'] < 1:
            patterns.append("Low marketing responsiveness")
        
        # Financial patterns
        if characteristics['avg_appointment_value']['mean'] > 150:
            patterns.append("Premium service preferences")
        elif characteristics['avg_appointment_value']['mean'] < 75:
            patterns.append("Budget-conscious spending")
        
        return patterns
    
    def _recommend_campaigns(self, characteristics: Dict[str, Dict[str, float]]) -> List[str]:
        """Recommend marketing campaigns for a segment"""
        campaigns = []
        
        clv = characteristics['customer_lifetime_value']['mean']
        engagement = characteristics['engagement_score']['mean']
        churn_risk = characteristics['churn_risk_score']['mean']
        
        if churn_risk > 0.6:
            campaigns.extend([
                "Win-back campaign with special offers",
                "Personalized re-engagement series",
                "Satisfaction survey and feedback request"
            ])
        
        if clv > 300:
            campaigns.extend([
                "VIP exclusive services and early access",
                "Loyalty program enrollment",
                "Premium upselling campaigns"
            ])
        
        if engagement > 0.7:
            campaigns.extend([
                "Referral program invitation",
                "User-generated content campaigns",
                "Community building initiatives"
            ])
        
        if characteristics['recent_appointments_90d']['mean'] < 1:
            campaigns.extend([
                "Appointment reminder campaigns",
                "Seasonal promotion offers",
                "Health and wellness tips"
            ])
        
        return campaigns[:3]  # Limit to top 3 recommendations
    
    def _identify_growth_opportunities(self, segments: List[CustomerSegment]) -> List[str]:
        """Identify growth opportunities across all segments"""
        opportunities = []
        
        # Analyze segment composition
        total_customers = sum(segment.customer_count for segment in segments)
        high_value_count = sum(segment.customer_count for segment in segments if segment.value_score > 0.7)
        at_risk_count = sum(segment.customer_count for segment in segments if segment.churn_risk > 0.6)
        
        if high_value_count / total_customers < 0.2:
            opportunities.append("Focus on converting regular customers to high-value segments")
        
        if at_risk_count / total_customers > 0.3:
            opportunities.append("Implement proactive churn prevention strategies")
        
        # Look for segments with specific characteristics
        for segment in segments:
            if segment.customer_count > total_customers * 0.3 and segment.value_score < 0.5:
                opportunities.append(f"Upselling opportunity in '{segment.name}' segment")
            
            if segment.churn_risk < 0.3 and segment.value_score < 0.6:
                opportunities.append(f"Growth potential in '{segment.name}' segment")
        
        return opportunities
    
    def _create_empty_insights(self) -> SegmentationInsights:
        """Create empty insights when segmentation cannot be performed"""
        return SegmentationInsights(
            total_customers=0,
            segments_count=0,
            silhouette_score=0.0,
            high_value_segments=[],
            at_risk_segments=[],
            growth_opportunities=["Acquire more customers to enable segmentation analysis"]
        )
    
    def predict_customer_segment(self, db: Session, client_id: int) -> Optional[CustomerSegment]:
        """Predict which segment a customer belongs to"""
        if not self.models_trained:
            logger.warning("Models not trained for segment prediction")
            return None
        
        client = db.query(Client).filter(Client.id == client_id).first()
        if not client:
            return None
        
        try:
            # Extract features for this client
            features = self._calculate_client_features(db, client)
            feature_columns = [key for key in features.keys() if key != 'client_id']
            X = np.array([features[col] for col in feature_columns]).reshape(1, -1)
            
            # Scale and transform
            X_scaled = self.scaler.transform(X)
            X_pca = self.pca.transform(X_scaled)
            
            # Predict cluster
            cluster_id = self.kmeans_model.predict(X_pca)[0]
            
            # Load segment information (simplified)
            return CustomerSegment(
                segment_id=int(cluster_id),
                name=f"Segment {cluster_id}",
                description="Predicted segment for this customer",
                customer_count=1,
                characteristics={},
                behavioral_patterns=[],
                recommended_campaigns=[],
                value_score=features.get('engagement_score', 0.5),
                churn_risk=features.get('churn_risk_score', 0.5)
            )
            
        except Exception as e:
            logger.error(f"Error predicting customer segment: {e}")
            return None
    
    def get_segment_recommendations(self, db: Session, user_id: int) -> Dict[str, List[str]]:
        """Get marketing recommendations for all segments"""
        if not self.models_trained:
            return {"error": "Segmentation models not trained"}
        
        insights = self.perform_segmentation(db, user_id)
        
        recommendations = {}
        for segment in insights.high_value_segments + insights.at_risk_segments:
            recommendations[segment.name] = segment.recommended_campaigns
        
        recommendations["Growth Opportunities"] = insights.growth_opportunities
        
        return recommendations
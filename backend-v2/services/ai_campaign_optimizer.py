"""
AI-Powered Campaign Optimization Service for BookedBarber V2.
Uses machine learning to optimize marketing campaign performance.
"""

import logging
from typing import Dict, List, Optional, Tuple, Any
from datetime import datetime, timedelta
from dataclasses import dataclass
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
import numpy as np
from sklearn.ensemble import RandomForestRegressor, GradientBoostingClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.metrics import mean_squared_error, accuracy_score
import joblib
import os

from models import User, Client, MarketingCampaign, CampaignAnalytics
from models.tracking import ConversionEvent, ConversionGoal
from schemas import MarketingCampaignCreate, MarketingCampaignUpdate

logger = logging.getLogger(__name__)

@dataclass
class CampaignOptimization:
    """Campaign optimization recommendations"""
    campaign_id: int
    optimization_score: float
    recommendations: List[str]
    predicted_performance: Dict[str, float]
    confidence_level: float
    optimized_parameters: Dict[str, Any]

@dataclass
class PerformanceMetrics:
    """Campaign performance metrics"""
    open_rate: float
    click_rate: float
    conversion_rate: float
    roi: float
    engagement_score: float
    unsubscribe_rate: float

class AICampaignOptimizer:
    """
    AI-powered campaign optimization using machine learning.
    Analyzes historical campaign data to provide optimization recommendations.
    """
    
    def __init__(self):
        self.performance_model = None
        self.engagement_model = None
        self.scaler = StandardScaler()
        self.label_encoder = LabelEncoder()
        self.models_trained = False
        self.model_path = "/app/models/campaign_optimizer"
        
        # Ensure model directory exists
        os.makedirs(self.model_path, exist_ok=True)
        
        # Try to load existing models
        self._load_models()
    
    def _load_models(self):
        """Load pre-trained models if they exist"""
        try:
            performance_model_path = f"{self.model_path}/performance_model.joblib"
            engagement_model_path = f"{self.model_path}/engagement_model.joblib"
            scaler_path = f"{self.model_path}/scaler.joblib"
            
            if all(os.path.exists(path) for path in [performance_model_path, engagement_model_path, scaler_path]):
                self.performance_model = joblib.load(performance_model_path)
                self.engagement_model = joblib.load(engagement_model_path)
                self.scaler = joblib.load(scaler_path)
                self.models_trained = True
                logger.info("Loaded pre-trained AI campaign optimization models")
        except Exception as e:
            logger.warning(f"Could not load pre-trained models: {e}")
            self.models_trained = False
    
    def _save_models(self):
        """Save trained models to disk"""
        try:
            joblib.dump(self.performance_model, f"{self.model_path}/performance_model.joblib")
            joblib.dump(self.engagement_model, f"{self.model_path}/engagement_model.joblib")
            joblib.dump(self.scaler, f"{self.model_path}/scaler.joblib")
            logger.info("Saved AI campaign optimization models")
        except Exception as e:
            logger.error(f"Could not save models: {e}")
    
    def extract_campaign_features(self, db: Session, campaign: MarketingCampaign, user: User) -> np.ndarray:
        """Extract features from campaign data for ML model"""
        features = []
        
        # Campaign basic features
        features.extend([
            len(campaign.subject) if campaign.subject else 0,  # Subject length
            len(campaign.content) if campaign.content else 0,  # Content length
            campaign.campaign_type == 'email',  # Is email campaign
            campaign.campaign_type == 'sms',  # Is SMS campaign
            len(campaign.tags) if campaign.tags else 0,  # Number of tags
        ])
        
        # Time-based features
        if campaign.scheduled_for:
            hour = campaign.scheduled_for.hour
            day_of_week = campaign.scheduled_for.weekday()
            features.extend([hour, day_of_week])
        else:
            features.extend([0, 0])
        
        # User/business features
        user_campaigns_count = db.query(func.count(MarketingCampaign.id)).filter(
            MarketingCampaign.created_by_id == user.id
        ).scalar()
        
        user_clients_count = db.query(func.count(Client.id)).filter(
            Client.user_id == user.id
        ).scalar()
        
        features.extend([
            user_campaigns_count,
            user_clients_count,
            len(user.email),  # Business email length as proxy for professionalism
        ])
        
        # Historical performance features
        avg_performance = self._get_user_avg_performance(db, user.id)
        features.extend([
            avg_performance.get('avg_open_rate', 0),
            avg_performance.get('avg_click_rate', 0),
            avg_performance.get('avg_conversion_rate', 0),
        ])
        
        # Content analysis features
        content_features = self._analyze_content(campaign.content or "", campaign.subject or "")
        features.extend(content_features)
        
        return np.array(features).reshape(1, -1)
    
    def _analyze_content(self, content: str, subject: str) -> List[float]:
        """Analyze content for engagement indicators"""
        content_lower = content.lower()
        subject_lower = subject.lower()
        
        # Emotional indicators
        positive_words = ['great', 'amazing', 'awesome', 'excellent', 'fantastic', 'love', 'perfect']
        urgent_words = ['limited', 'hurry', 'now', 'today', 'urgent', 'deadline', 'expires']
        call_to_action = ['book', 'schedule', 'call', 'visit', 'click', 'sign up', 'register']
        
        features = [
            sum(1 for word in positive_words if word in content_lower) / max(len(content.split()), 1),
            sum(1 for word in urgent_words if word in content_lower) / max(len(content.split()), 1),
            sum(1 for word in call_to_action if word in content_lower) / max(len(content.split()), 1),
            content.count('!') / max(len(content), 1),  # Exclamation ratio
            content.count('?') / max(len(content), 1),  # Question ratio
            len(subject.split()),  # Subject word count
            subject.count('!'),  # Subject exclamations
            1 if any(word in subject_lower for word in urgent_words) else 0,  # Urgent subject
        ]
        
        return features
    
    def _get_user_avg_performance(self, db: Session, user_id: int) -> Dict[str, float]:
        """Get user's average campaign performance"""
        # Get campaign analytics for this user
        analytics = db.query(CampaignAnalytics).join(MarketingCampaign).filter(
            MarketingCampaign.created_by_id == user_id
        ).all()
        
        if not analytics:
            return {'avg_open_rate': 0, 'avg_click_rate': 0, 'avg_conversion_rate': 0}
        
        total_sent = sum(a.total_sent for a in analytics if a.total_sent)
        total_opened = sum(a.total_opened for a in analytics if a.total_opened)
        total_clicked = sum(a.total_clicked for a in analytics if a.total_clicked)
        total_conversions = sum(a.total_conversions for a in analytics if a.total_conversions)
        
        return {
            'avg_open_rate': total_opened / max(total_sent, 1),
            'avg_click_rate': total_clicked / max(total_sent, 1),
            'avg_conversion_rate': total_conversions / max(total_sent, 1),
        }
    
    def train_models(self, db: Session, min_campaigns: int = 50) -> bool:
        """Train AI models on historical campaign data"""
        try:
            # Get all campaigns with analytics
            campaigns_data = db.query(MarketingCampaign).join(CampaignAnalytics).filter(
                MarketingCampaign.status == 'sent'
            ).all()
            
            if len(campaigns_data) < min_campaigns:
                logger.warning(f"Not enough campaigns for training ({len(campaigns_data)} < {min_campaigns})")
                return False
            
            # Extract features and targets
            X = []
            y_performance = []
            y_engagement = []
            
            for campaign in campaigns_data:
                user = db.query(User).filter(User.id == campaign.created_by_id).first()
                if not user or not campaign.analytics:
                    continue
                
                features = self.extract_campaign_features(db, campaign, user)
                X.append(features.flatten())
                
                # Performance targets (ROI, conversion rate)
                analytics = campaign.analytics[0]  # Get first analytics record
                performance_score = self._calculate_performance_score(analytics)
                engagement_score = self._calculate_engagement_score(analytics)
                
                y_performance.append(performance_score)
                y_engagement.append(1 if engagement_score > 0.5 else 0)  # Binary classification
            
            if len(X) < min_campaigns:
                logger.warning(f"Not enough valid training data ({len(X)} < {min_campaigns})")
                return False
            
            X = np.array(X)
            y_performance = np.array(y_performance)
            y_engagement = np.array(y_engagement)
            
            # Scale features
            X_scaled = self.scaler.fit_transform(X)
            
            # Split data
            X_train, X_test, y_perf_train, y_perf_test = train_test_split(
                X_scaled, y_performance, test_size=0.2, random_state=42
            )
            _, _, y_eng_train, y_eng_test = train_test_split(
                X_scaled, y_engagement, test_size=0.2, random_state=42
            )
            
            # Train performance model (regression)
            self.performance_model = RandomForestRegressor(
                n_estimators=100,
                max_depth=10,
                random_state=42
            )
            self.performance_model.fit(X_train, y_perf_train)
            
            # Train engagement model (classification)
            self.engagement_model = GradientBoostingClassifier(
                n_estimators=100,
                max_depth=6,
                random_state=42
            )
            self.engagement_model.fit(X_train, y_eng_train)
            
            # Evaluate models
            perf_score = self.performance_model.score(X_test, y_perf_test)
            eng_score = self.engagement_model.score(X_test, y_eng_test)
            
            logger.info(f"Model training completed - Performance R²: {perf_score:.3f}, Engagement Accuracy: {eng_score:.3f}")
            
            self.models_trained = True
            self._save_models()
            
            return True
            
        except Exception as e:
            logger.error(f"Error training AI models: {e}")
            return False
    
    def _calculate_performance_score(self, analytics: CampaignAnalytics) -> float:
        """Calculate overall performance score from analytics"""
        if not analytics.total_sent or analytics.total_sent == 0:
            return 0.0
        
        open_rate = analytics.total_opened / analytics.total_sent
        click_rate = analytics.total_clicked / analytics.total_sent if analytics.total_clicked else 0
        conversion_rate = analytics.total_conversions / analytics.total_sent if analytics.total_conversions else 0
        
        # Weighted performance score
        score = (open_rate * 0.3) + (click_rate * 0.4) + (conversion_rate * 0.3)
        return min(score, 1.0)  # Cap at 1.0
    
    def _calculate_engagement_score(self, analytics: CampaignAnalytics) -> float:
        """Calculate engagement score from analytics"""
        if not analytics.total_sent or analytics.total_sent == 0:
            return 0.0
        
        engagement_rate = (analytics.total_opened + analytics.total_clicked) / analytics.total_sent
        return min(engagement_rate, 1.0)
    
    def optimize_campaign(self, db: Session, campaign: MarketingCampaign, user: User) -> CampaignOptimization:
        """Generate optimization recommendations for a campaign"""
        if not self.models_trained:
            # Try to train models if we have enough data
            if not self.train_models(db):
                return self._basic_optimization(campaign)
        
        try:
            # Extract features
            features = self.extract_campaign_features(db, campaign, user)
            features_scaled = self.scaler.transform(features)
            
            # Get predictions
            predicted_performance = self.performance_model.predict(features_scaled)[0]
            predicted_engagement = self.engagement_model.predict_proba(features_scaled)[0][1]
            
            # Generate recommendations
            recommendations = self._generate_recommendations(db, campaign, user, features.flatten())
            
            # Calculate optimization score
            optimization_score = (predicted_performance + predicted_engagement) / 2
            
            # Get optimized parameters
            optimized_params = self._suggest_optimizations(campaign, features.flatten())
            
            return CampaignOptimization(
                campaign_id=campaign.id,
                optimization_score=optimization_score,
                recommendations=recommendations,
                predicted_performance={
                    'performance_score': predicted_performance,
                    'engagement_probability': predicted_engagement,
                    'estimated_open_rate': min(predicted_performance * 1.2, 1.0),
                    'estimated_click_rate': min(predicted_performance * 0.8, 1.0),
                    'estimated_conversion_rate': min(predicted_performance * 0.5, 1.0),
                },
                confidence_level=min(optimization_score, 0.95),
                optimized_parameters=optimized_params
            )
            
        except Exception as e:
            logger.error(f"Error optimizing campaign: {e}")
            return self._basic_optimization(campaign)
    
    def _basic_optimization(self, campaign: MarketingCampaign) -> CampaignOptimization:
        """Provide basic optimization when AI models aren't available"""
        recommendations = [
            "Train AI models with more campaign data for personalized recommendations",
            "Test different send times to optimize engagement",
            "A/B test subject lines for better open rates",
            "Include clear call-to-action buttons",
            "Segment your audience for targeted messaging"
        ]
        
        return CampaignOptimization(
            campaign_id=campaign.id,
            optimization_score=0.5,  # Neutral score
            recommendations=recommendations,
            predicted_performance={
                'performance_score': 0.5,
                'engagement_probability': 0.5,
                'estimated_open_rate': 0.25,
                'estimated_click_rate': 0.05,
                'estimated_conversion_rate': 0.02,
            },
            confidence_level=0.3,  # Low confidence without AI
            optimized_parameters={}
        )
    
    def _generate_recommendations(self, db: Session, campaign: MarketingCampaign, user: User, features: np.ndarray) -> List[str]:
        """Generate specific recommendations based on campaign analysis"""
        recommendations = []
        
        # Subject line analysis
        subject_length = features[0] if len(features) > 0 else 0
        if subject_length < 30:
            recommendations.append("Consider a longer, more descriptive subject line (30-50 characters optimal)")
        elif subject_length > 60:
            recommendations.append("Shorten subject line for better mobile display (under 50 characters)")
        
        # Content analysis
        content_length = features[1] if len(features) > 1 else 0
        if content_length < 100:
            recommendations.append("Add more valuable content to increase engagement")
        elif content_length > 1000:
            recommendations.append("Consider shorter, more focused content for better readability")
        
        # Timing analysis
        if len(features) > 6:
            hour = features[5]
            day_of_week = features[6]
            
            if hour < 9 or hour > 17:
                recommendations.append("Consider sending during business hours (9 AM - 5 PM) for better engagement")
            
            if day_of_week >= 5:  # Weekend
                recommendations.append("Weekday sends typically perform better for business communications")
        
        # Personalization
        user_campaigns = features[7] if len(features) > 7 else 0
        if user_campaigns < 5:
            recommendations.append("Build campaign history to improve AI optimization accuracy")
        
        # Call-to-action analysis
        if len(features) > 12:
            cta_ratio = features[12]
            if cta_ratio < 0.01:
                recommendations.append("Add clear call-to-action phrases to drive conversions")
        
        return recommendations[:5]  # Limit to top 5 recommendations
    
    def _suggest_optimizations(self, campaign: MarketingCampaign, features: np.ndarray) -> Dict[str, Any]:
        """Suggest specific parameter optimizations"""
        optimizations = {}
        
        # Optimal send time suggestions
        current_hour = features[5] if len(features) > 5 else 12
        optimal_hours = [10, 14, 16]  # Based on general email best practices
        
        if current_hour not in optimal_hours:
            optimizations['suggested_send_hour'] = min(optimal_hours, key=lambda x: abs(x - current_hour))
        
        # Subject line optimizations
        if len(features) > 0:
            subject_length = features[0]
            if subject_length != 45:  # Optimal length
                optimizations['suggested_subject_length'] = 45
        
        # Content optimizations
        if len(features) > 1:
            content_length = features[1]
            if content_length < 200 or content_length > 600:
                optimizations['suggested_content_length'] = 400
        
        return optimizations
    
    def batch_optimize_campaigns(self, db: Session, user_id: int, campaign_ids: List[int]) -> List[CampaignOptimization]:
        """Optimize multiple campaigns in batch"""
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise ValueError("User not found")
        
        optimizations = []
        for campaign_id in campaign_ids:
            campaign = db.query(MarketingCampaign).filter(
                MarketingCampaign.id == campaign_id,
                MarketingCampaign.created_by_id == user_id
            ).first()
            
            if campaign:
                optimization = self.optimize_campaign(db, campaign, user)
                optimizations.append(optimization)
        
        return optimizations
    
    def get_model_performance_metrics(self) -> Dict[str, Any]:
        """Get current model performance metrics"""
        if not self.models_trained:
            return {"status": "not_trained", "models_available": False}
        
        return {
            "status": "trained",
            "models_available": True,
            "performance_model_type": "RandomForestRegressor",
            "engagement_model_type": "GradientBoostingClassifier",
            "features_count": 18,  # Number of features used
            "training_date": datetime.now().isoformat(),
        }
#!/usr/bin/env python3
"""
Proactive Monitoring & Error Prevention System
Prevents errors and downtime before they happen
"""

import os
import asyncio
import logging
import psutil
import aiohttp
import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from enum import Enum
import numpy as np
from collections import deque
import redis
import smtplib
from email.mime.text import MIMEText

from fastapi import FastAPI, BackgroundTasks
from pydantic import BaseModel
from sqlalchemy import create_engine, Column, String, Float, Integer, DateTime, Boolean, Text, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import schedule

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Database models
Base = declarative_base()

class HealthMetric(Base):
    __tablename__ = 'health_metrics'
    
    id = Column(Integer, primary_key=True)
    metric_name = Column(String)
    value = Column(Float)
    threshold_warning = Column(Float)
    threshold_critical = Column(Float)
    timestamp = Column(DateTime, default=datetime.utcnow)

class PredictedIssue(Base):
    __tablename__ = 'predicted_issues'
    
    id = Column(Integer, primary_key=True)
    issue_type = Column(String)
    probability = Column(Float)
    impact = Column(String)  # low, medium, high, critical
    predicted_time = Column(DateTime)
    prevention_action = Column(Text)
    status = Column(String, default='pending')  # pending, prevented, occurred
    created_at = Column(DateTime, default=datetime.utcnow)

class PerformanceBaseline(Base):
    __tablename__ = 'performance_baselines'
    
    id = Column(Integer, primary_key=True)
    endpoint = Column(String, unique=True)
    avg_response_time = Column(Float)
    p95_response_time = Column(Float)
    p99_response_time = Column(Float)
    error_rate = Column(Float)
    last_updated = Column(DateTime, default=datetime.utcnow)

# Create database
engine = create_engine(os.getenv('DATABASE_URL', 'sqlite:///./proactive_monitor.db'))
Base.metadata.create_all(engine)
SessionLocal = sessionmaker(bind=engine)

class AlertSeverity(Enum):
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"
    EMERGENCY = "emergency"

@dataclass
class HealthCheck:
    name: str
    status: str  # healthy, degraded, unhealthy
    value: float
    threshold: float
    message: str
    severity: AlertSeverity

class ProactiveMonitor:
    """Main proactive monitoring system"""
    
    def __init__(self):
        self.db = SessionLocal()
        self.redis_client = None
        try:
            self.redis_client = redis.Redis(
                host=os.getenv('REDIS_HOST', 'localhost'),
                port=int(os.getenv('REDIS_PORT', 6379)),
                decode_responses=True
            )
            self.redis_client.ping()
        except:
            logger.warning("Redis not available, using in-memory storage")
        
        # Monitoring configuration
        self.config = {
            'cpu_threshold_warning': 70,
            'cpu_threshold_critical': 85,
            'memory_threshold_warning': 75,
            'memory_threshold_critical': 90,
            'disk_threshold_warning': 80,
            'disk_threshold_critical': 95,
            'response_time_threshold': 1000,  # ms
            'error_rate_threshold': 0.05,  # 5%
            'check_interval': 30  # seconds
        }
        
        # Historical data for predictions
        self.metrics_history = {
            'cpu': deque(maxlen=120),  # 1 hour of 30-sec samples
            'memory': deque(maxlen=120),
            'disk': deque(maxlen=120),
            'response_times': deque(maxlen=120),
            'error_rates': deque(maxlen=120)
        }
        
        # ML model for predictions (simple for now)
        self.prediction_window = 15  # minutes
        
        # Alert configuration
        self.alert_cooldown = {}  # Prevent alert spam
        self.notification_service = NotificationService()
        
        logger.info("Proactive Monitor initialized")
    
    async def check_system_health(self) -> List[HealthCheck]:
        """Comprehensive system health check"""
        checks = []
        
        # CPU Check
        cpu_percent = psutil.cpu_percent(interval=1)
        self.metrics_history['cpu'].append(cpu_percent)
        
        cpu_status = "healthy"
        cpu_severity = AlertSeverity.INFO
        if cpu_percent > self.config['cpu_threshold_critical']:
            cpu_status = "unhealthy"
            cpu_severity = AlertSeverity.CRITICAL
        elif cpu_percent > self.config['cpu_threshold_warning']:
            cpu_status = "degraded"
            cpu_severity = AlertSeverity.WARNING
        
        checks.append(HealthCheck(
            name="CPU Usage",
            status=cpu_status,
            value=cpu_percent,
            threshold=self.config['cpu_threshold_warning'],
            message=f"CPU at {cpu_percent}%",
            severity=cpu_severity
        ))
        
        # Memory Check
        memory = psutil.virtual_memory()
        memory_percent = memory.percent
        self.metrics_history['memory'].append(memory_percent)
        
        memory_status = "healthy"
        memory_severity = AlertSeverity.INFO
        if memory_percent > self.config['memory_threshold_critical']:
            memory_status = "unhealthy"
            memory_severity = AlertSeverity.CRITICAL
        elif memory_percent > self.config['memory_threshold_warning']:
            memory_status = "degraded"
            memory_severity = AlertSeverity.WARNING
        
        checks.append(HealthCheck(
            name="Memory Usage",
            status=memory_status,
            value=memory_percent,
            threshold=self.config['memory_threshold_warning'],
            message=f"Memory at {memory_percent}% ({memory.available / 1024 / 1024 / 1024:.1f}GB available)",
            severity=memory_severity
        ))
        
        # Disk Check
        disk = psutil.disk_usage('/')
        disk_percent = disk.percent
        self.metrics_history['disk'].append(disk_percent)
        
        disk_status = "healthy"
        disk_severity = AlertSeverity.INFO
        if disk_percent > self.config['disk_threshold_critical']:
            disk_status = "unhealthy"
            disk_severity = AlertSeverity.CRITICAL
        elif disk_percent > self.config['disk_threshold_warning']:
            disk_status = "degraded"
            disk_severity = AlertSeverity.WARNING
        
        checks.append(HealthCheck(
            name="Disk Usage",
            status=disk_status,
            value=disk_percent,
            threshold=self.config['disk_threshold_warning'],
            message=f"Disk at {disk_percent}% ({disk.free / 1024 / 1024 / 1024:.1f}GB free)",
            severity=disk_severity
        ))
        
        # Database Connection Check
        try:
            self.db.execute("SELECT 1")
            checks.append(HealthCheck(
                name="Database Connection",
                status="healthy",
                value=1,
                threshold=1,
                message="Database responsive",
                severity=AlertSeverity.INFO
            ))
        except Exception as e:
            checks.append(HealthCheck(
                name="Database Connection",
                status="unhealthy",
                value=0,
                threshold=1,
                message=f"Database error: {str(e)}",
                severity=AlertSeverity.CRITICAL
            ))
        
        # Redis Check (if available)
        if self.redis_client:
            try:
                self.redis_client.ping()
                checks.append(HealthCheck(
                    name="Redis Cache",
                    status="healthy",
                    value=1,
                    threshold=1,
                    message="Redis responsive",
                    severity=AlertSeverity.INFO
                ))
            except:
                checks.append(HealthCheck(
                    name="Redis Cache",
                    status="degraded",
                    value=0,
                    threshold=1,
                    message="Redis unavailable (using fallback)",
                    severity=AlertSeverity.WARNING
                ))
        
        # Store metrics
        for check in checks:
            metric = HealthMetric(
                metric_name=check.name,
                value=check.value,
                threshold_warning=self.config.get(f"{check.name.lower().replace(' ', '_')}_threshold_warning", check.threshold),
                threshold_critical=self.config.get(f"{check.name.lower().replace(' ', '_')}_threshold_critical", check.threshold * 1.2)
            )
            self.db.add(metric)
        
        self.db.commit()
        
        return checks
    
    async def predict_issues(self) -> List[PredictedIssue]:
        """Predict potential issues using historical data"""
        predictions = []
        
        # CPU Prediction
        if len(self.metrics_history['cpu']) > 10:
            cpu_trend = self._calculate_trend(list(self.metrics_history['cpu']))
            if cpu_trend > 0.5:  # Rising trend
                # Simple linear prediction
                current = self.metrics_history['cpu'][-1]
                predicted_value = current + (cpu_trend * self.prediction_window)
                
                if predicted_value > self.config['cpu_threshold_critical']:
                    prediction = PredictedIssue(
                        issue_type="CPU Overload",
                        probability=min(0.9, predicted_value / 100),
                        impact="critical" if predicted_value > 95 else "high",
                        predicted_time=datetime.now() + timedelta(minutes=self.prediction_window),
                        prevention_action="Scale up instances or optimize CPU-intensive operations"
                    )
                    predictions.append(prediction)
                    self.db.add(prediction)
        
        # Memory Leak Detection
        if len(self.metrics_history['memory']) > 20:
            memory_trend = self._calculate_trend(list(self.metrics_history['memory']))
            memory_variance = np.var(list(self.metrics_history['memory']))
            
            # Consistent upward trend with low variance indicates possible leak
            if memory_trend > 0.3 and memory_variance < 5:
                prediction = PredictedIssue(
                    issue_type="Potential Memory Leak",
                    probability=0.7,
                    impact="high",
                    predicted_time=datetime.now() + timedelta(minutes=30),
                    prevention_action="Review recent code changes, check for unreleased resources"
                )
                predictions.append(prediction)
                self.db.add(prediction)
        
        # Disk Space Prediction
        if len(self.metrics_history['disk']) > 10:
            disk_trend = self._calculate_trend(list(self.metrics_history['disk']))
            if disk_trend > 0:
                days_until_full = (100 - self.metrics_history['disk'][-1]) / (disk_trend * 48)  # 48 half-hour periods per day
                
                if days_until_full < 7:
                    prediction = PredictedIssue(
                        issue_type="Disk Space Exhaustion",
                        probability=0.8,
                        impact="critical",
                        predicted_time=datetime.now() + timedelta(days=days_until_full),
                        prevention_action=f"Clean up logs/temp files. Disk will be full in {days_until_full:.1f} days"
                    )
                    predictions.append(prediction)
                    self.db.add(prediction)
        
        if predictions:
            self.db.commit()
        
        return predictions
    
    def _calculate_trend(self, data: List[float]) -> float:
        """Calculate trend coefficient (positive = increasing)"""
        if len(data) < 2:
            return 0
        
        x = np.arange(len(data))
        y = np.array(data)
        
        # Simple linear regression
        coefficients = np.polyfit(x, y, 1)
        return coefficients[0]
    
    async def check_endpoint_health(self, endpoints: List[str]) -> List[Dict]:
        """Check API endpoint health and performance"""
        results = []
        
        async with aiohttp.ClientSession() as session:
            for endpoint in endpoints:
                try:
                    start_time = datetime.now()
                    async with session.get(endpoint, timeout=5) as response:
                        response_time = (datetime.now() - start_time).total_seconds() * 1000
                        
                        # Get baseline
                        baseline = self.db.query(PerformanceBaseline).filter_by(endpoint=endpoint).first()
                        
                        status = "healthy"
                        if response.status >= 500:
                            status = "unhealthy"
                        elif response.status >= 400:
                            status = "degraded"
                        elif baseline and response_time > baseline.p95_response_time * 2:
                            status = "degraded"
                        
                        result = {
                            'endpoint': endpoint,
                            'status': status,
                            'response_time': response_time,
                            'status_code': response.status,
                            'baseline_p95': baseline.p95_response_time if baseline else None
                        }
                        
                        results.append(result)
                        
                        # Update metrics history
                        if 'response_times' in self.metrics_history:
                            self.metrics_history['response_times'].append(response_time)
                        
                except asyncio.TimeoutError:
                    results.append({
                        'endpoint': endpoint,
                        'status': 'unhealthy',
                        'response_time': 5000,
                        'status_code': 0,
                        'error': 'Timeout'
                    })
                except Exception as e:
                    results.append({
                        'endpoint': endpoint,
                        'status': 'unhealthy',
                        'response_time': 0,
                        'status_code': 0,
                        'error': str(e)
                    })
        
        return results
    
    async def auto_scale_resources(self, metrics: Dict) -> Dict:
        """Automatically scale resources based on metrics"""
        actions_taken = {}
        
        # CPU-based scaling
        if metrics.get('cpu_percent', 0) > 80:
            # In a real environment, this would trigger cloud scaling
            actions_taken['cpu_scaling'] = {
                'action': 'scale_up',
                'reason': f"CPU at {metrics['cpu_percent']}%",
                'simulated': True  # In production, would call AWS/GCP APIs
            }
            
            # Immediate mitigation
            await self._optimize_cpu_usage()
        
        # Memory-based actions
        if metrics.get('memory_percent', 0) > 85:
            actions_taken['memory_optimization'] = {
                'action': 'clear_cache',
                'reason': f"Memory at {metrics['memory_percent']}%"
            }
            
            # Clear caches
            if self.redis_client:
                self.redis_client.flushdb()
        
        return actions_taken
    
    async def _optimize_cpu_usage(self):
        """Implement CPU optimization strategies"""
        # This would include:
        # - Throttling background jobs
        # - Increasing cache TTLs
        # - Deferring non-critical tasks
        logger.info("Applying CPU optimization strategies")
    
    async def run_pre_deployment_checks(self, deployment_config: Dict) -> Tuple[bool, List[str]]:
        """Run checks before deployment to prevent issues"""
        checks_passed = True
        issues = []
        
        # Check current system health
        health_checks = await self.check_system_health()
        unhealthy = [c for c in health_checks if c.status == "unhealthy"]
        
        if unhealthy:
            checks_passed = False
            issues.extend([f"{c.name}: {c.message}" for c in unhealthy])
        
        # Check for predicted issues
        predictions = await self.predict_issues()
        critical_predictions = [p for p in predictions if p.impact == "critical" and p.probability > 0.7]
        
        if critical_predictions:
            checks_passed = False
            issues.extend([f"Predicted: {p.issue_type} (probability: {p.probability:.0%})" for p in critical_predictions])
        
        # Check deployment timing
        current_hour = datetime.now().hour
        if 9 <= current_hour <= 17:  # Business hours
            # Check if it's a high-traffic time
            if await self._is_high_traffic_period():
                checks_passed = False
                issues.append("High traffic period - deployment not recommended")
        
        return checks_passed, issues
    
    async def _is_high_traffic_period(self) -> bool:
        """Check if currently in high traffic period"""
        # This would check actual traffic metrics
        # For now, simulate based on time
        current_hour = datetime.now().hour
        return 12 <= current_hour <= 14 or 18 <= current_hour <= 20
    
    async def continuous_monitoring_loop(self):
        """Main monitoring loop"""
        while True:
            try:
                # System health check
                health_checks = await self.check_system_health()
                
                # Check for critical issues
                critical = [c for c in health_checks if c.severity == AlertSeverity.CRITICAL]
                if critical:
                    await self.notification_service.send_alert(
                        "🚨 Critical System Issues Detected",
                        "\n".join([f"- {c.name}: {c.message}" for c in critical]),
                        AlertSeverity.CRITICAL
                    )
                
                # Predict issues
                predictions = await self.predict_issues()
                high_prob_predictions = [p for p in predictions if p.probability > 0.8]
                
                if high_prob_predictions:
                    await self.notification_service.send_alert(
                        "⚠️ Potential Issues Predicted",
                        "\n".join([f"- {p.issue_type}: {p.prevention_action}" for p in high_prob_predictions]),
                        AlertSeverity.WARNING
                    )
                
                # Auto-scale if needed
                current_metrics = {
                    'cpu_percent': psutil.cpu_percent(),
                    'memory_percent': psutil.virtual_memory().percent
                }
                
                scaling_actions = await self.auto_scale_resources(current_metrics)
                if scaling_actions:
                    logger.info(f"Auto-scaling actions taken: {scaling_actions}")
                
                # Sleep until next check
                await asyncio.sleep(self.config['check_interval'])
                
            except Exception as e:
                logger.error(f"Error in monitoring loop: {e}")
                await asyncio.sleep(self.config['check_interval'])

class NotificationService:
    """Handle alerts and notifications"""
    
    def __init__(self):
        self.slack_webhook = os.getenv('SLACK_WEBHOOK_URL')
        self.email_config = {
            'smtp_host': os.getenv('SMTP_HOST'),
            'smtp_port': int(os.getenv('SMTP_PORT', 587)),
            'smtp_username': os.getenv('SMTP_USERNAME'),
            'smtp_password': os.getenv('SMTP_PASSWORD'),
            'from_email': os.getenv('EMAIL_FROM_ADDRESS'),
            'alert_emails': os.getenv('ALERT_EMAILS', '').split(',')
        }
    
    async def send_alert(self, title: str, message: str, severity: AlertSeverity):
        """Send alert via configured channels"""
        # Slack notification
        if self.slack_webhook:
            color = {
                AlertSeverity.INFO: "#36a64f",
                AlertSeverity.WARNING: "#ff9900",
                AlertSeverity.CRITICAL: "#ff0000",
                AlertSeverity.EMERGENCY: "#ff0000"
            }.get(severity, "#2196F3")
            
            payload = {
                "attachments": [{
                    "color": color,
                    "title": title,
                    "text": message,
                    "footer": "Proactive Monitor",
                    "ts": int(datetime.now().timestamp())
                }]
            }
            
            try:
                async with aiohttp.ClientSession() as session:
                    await session.post(self.slack_webhook, json=payload)
            except Exception as e:
                logger.error(f"Failed to send Slack alert: {e}")
        
        # Email for critical alerts
        if severity in [AlertSeverity.CRITICAL, AlertSeverity.EMERGENCY] and self.email_config['alert_emails']:
            try:
                msg = MIMEText(f"{title}\n\n{message}")
                msg['Subject'] = f"[{severity.value.upper()}] {title}"
                msg['From'] = self.email_config['from_email']
                msg['To'] = ', '.join(self.email_config['alert_emails'])
                
                with smtplib.SMTP(self.email_config['smtp_host'], self.email_config['smtp_port']) as server:
                    server.starttls()
                    server.login(self.email_config['smtp_username'], self.email_config['smtp_password'])
                    server.send_message(msg)
            except Exception as e:
                logger.error(f"Failed to send email alert: {e}")

# FastAPI app
app = FastAPI(title="Proactive Monitor", version="1.0.0")
monitor = ProactiveMonitor()

@app.get("/health")
async def get_health():
    """Get current system health"""
    checks = await monitor.check_system_health()
    
    overall_status = "healthy"
    if any(c.status == "unhealthy" for c in checks):
        overall_status = "unhealthy"
    elif any(c.status == "degraded" for c in checks):
        overall_status = "degraded"
    
    return {
        "status": overall_status,
        "timestamp": datetime.now().isoformat(),
        "checks": [
            {
                "name": c.name,
                "status": c.status,
                "value": c.value,
                "threshold": c.threshold,
                "message": c.message,
                "severity": c.severity.value
            }
            for c in checks
        ]
    }

@app.get("/predictions")
async def get_predictions():
    """Get predicted issues"""
    predictions = await monitor.predict_issues()
    
    return {
        "predictions": [
            {
                "issue_type": p.issue_type,
                "probability": p.probability,
                "impact": p.impact,
                "predicted_time": p.predicted_time.isoformat(),
                "prevention_action": p.prevention_action,
                "status": p.status
            }
            for p in predictions
        ]
    }

@app.post("/deployment/check")
async def check_deployment(deployment_config: Dict):
    """Pre-deployment safety check"""
    can_deploy, issues = await monitor.run_pre_deployment_checks(deployment_config)
    
    return {
        "can_deploy": can_deploy,
        "issues": issues,
        "recommendation": "Safe to deploy" if can_deploy else "Deployment not recommended"
    }

@app.get("/metrics/history")
async def get_metrics_history():
    """Get historical metrics"""
    return {
        "cpu": list(monitor.metrics_history['cpu']),
        "memory": list(monitor.metrics_history['memory']),
        "disk": list(monitor.metrics_history['disk']),
        "response_times": list(monitor.metrics_history['response_times']),
        "error_rates": list(monitor.metrics_history['error_rates'])
    }

@app.on_event("startup")
async def startup_event():
    """Start monitoring on app startup"""
    asyncio.create_task(monitor.continuous_monitoring_loop())

if __name__ == "__main__":
    import uvicorn
    print("🛡️ Starting Proactive Monitor...")
    print("📊 Dashboard: http://localhost:8004/docs")
    print("🔍 Health: http://localhost:8004/health")
    print("🔮 Predictions: http://localhost:8004/predictions")
    uvicorn.run(app, host="0.0.0.0", port=8004)
"""
Automation Models
Handles workflow automation and rules
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, JSON, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from config.database import Base

class AutomationRule(Base):
    __tablename__ = "automation_rules"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Basic Information
    name = Column(String(255), nullable=False)
    description = Column(Text)
    category = Column(String(50), nullable=False)  # client_followup, performance_alert, booking_reminder
    
    # Scope
    location_id = Column(Integer, ForeignKey("locations.id"), nullable=True)
    is_global = Column(Boolean, default=False)
    
    # Trigger Configuration
    trigger_type = Column(String(50), nullable=False)  # time_based, event_based, metric_based
    trigger_config = Column(JSON, nullable=False)
    """
    Examples:
    - time_based: {"cron": "0 9 * * 1", "timezone": "America/New_York"}
    - event_based: {"event": "appointment_completed", "conditions": {"service_type": "haircut"}}
    - metric_based: {"metric": "retention_rate", "operator": "<", "threshold": 70}
    """
    
    # Action Configuration
    action_type = Column(String(50), nullable=False)  # send_sms, send_email, create_task, alert_manager
    action_config = Column(JSON, nullable=False)
    """
    Examples:
    - send_sms: {"template": "followup_message", "delay_hours": 24}
    - send_email: {"template": "performance_report", "recipients": ["manager@shop.com"]}
    - create_task: {"task_type": "client_outreach", "assignee": "barber"}
    """
    
    # Conditions
    conditions = Column(JSON, nullable=True)  # Additional conditions that must be met
    
    # Status
    is_active = Column(Boolean, default=True)
    last_triggered = Column(DateTime, nullable=True)
    trigger_count = Column(Integer, default=0)
    
    # Performance
    success_count = Column(Integer, default=0)
    failure_count = Column(Integer, default=0)
    average_execution_time = Column(Float, default=0.0)  # in seconds
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Relationships
    location = relationship("Location", foreign_keys=[location_id])
    creator = relationship("User", foreign_keys=[created_by])
    workflow_logs = relationship("WorkflowLog", back_populates="rule")
    
    def __repr__(self):
        return f"<AutomationRule(name='{self.name}', category='{self.category}')>"

class WorkflowLog(Base):
    __tablename__ = "workflow_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    rule_id = Column(Integer, ForeignKey("automation_rules.id"), nullable=False)
    
    # Execution Details
    execution_id = Column(String(100), unique=True, nullable=False)
    trigger_data = Column(JSON, nullable=True)  # Data that triggered the rule
    
    # Status
    status = Column(String(20), nullable=False)  # triggered, processing, completed, failed
    started_at = Column(DateTime(timezone=True), nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    execution_time = Column(Float, nullable=True)  # in seconds
    
    # Results
    action_results = Column(JSON, nullable=True)
    error_message = Column(Text, nullable=True)
    
    # Affected Entities
    affected_entity_type = Column(String(50), nullable=True)  # client, barber, appointment
    affected_entity_id = Column(Integer, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    rule = relationship("AutomationRule", back_populates="workflow_logs")
    
    def __repr__(self):
        return f"<WorkflowLog(rule_id={self.rule_id}, status='{self.status}')>"
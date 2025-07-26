"""
Franchise Compliance Service

Provides compliance tracking, monitoring, and reporting services for franchise operations.
Handles regulatory requirements, audits, and compliance scoring across the franchise hierarchy.
"""

from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, desc
import logging

from models.franchise import (
    FranchiseCompliance, 
    FranchiseNetwork, 
    FranchiseRegion, 
    FranchiseGroup,
    ComplianceJurisdiction,
    FranchiseStatus
)

logger = logging.getLogger(__name__)


class FranchiseComplianceService:
    """Service for managing franchise compliance tracking and reporting"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_network_compliance_summary(self, network_id: int) -> Dict[str, Any]:
        """
        Get comprehensive compliance summary for a franchise network
        """
        try:
            # Get overall network compliance items
            network_compliance = self.db.query(FranchiseCompliance).filter(
                and_(
                    FranchiseCompliance.entity_type == "network",
                    FranchiseCompliance.entity_id == network_id,
                    FranchiseCompliance.is_active == True
                )
            ).all()
            
            # Get region compliance rollup
            regions = self.db.query(FranchiseRegion).filter(
                FranchiseRegion.network_id == network_id
            ).all()
            
            region_compliance_scores = []
            for region in regions:
                region_score = self.get_region_compliance_score(region.id)
                region_compliance_scores.append(region_score)
            
            # Calculate overall metrics
            total_requirements = len(network_compliance)
            compliant_requirements = len([
                req for req in network_compliance 
                if req.compliance_status == "compliant"
            ])
            
            critical_issues = len([
                req for req in network_compliance 
                if req.compliance_status == "non_compliant" and req.risk_level == "critical"
            ])
            
            pending_reviews = len([
                req for req in network_compliance 
                if req.compliance_status == "pending"
            ])
            
            # Calculate overall score
            if total_requirements > 0:
                overall_score = (compliant_requirements / total_requirements) * 100
            else:
                overall_score = 100.0
            
            # Include regional average
            if region_compliance_scores:
                regional_average = sum(region_compliance_scores) / len(region_compliance_scores)
                overall_score = (overall_score + regional_average) / 2
            
            return {
                "overall_score": round(overall_score, 2),
                "total_requirements": total_requirements,
                "compliant_requirements": compliant_requirements,
                "critical_issues": critical_issues,
                "pending_reviews": pending_reviews,
                "regional_scores": region_compliance_scores,
                "jurisdictions_covered": len(set([
                    req.jurisdiction.value for req in network_compliance
                ])),
                "last_updated": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error calculating network compliance summary: {e}")
            return {
                "overall_score": 0.0,
                "total_requirements": 0,
                "compliant_requirements": 0,
                "critical_issues": 0,
                "pending_reviews": 0,
                "regional_scores": [],
                "jurisdictions_covered": 0,
                "last_updated": datetime.utcnow().isoformat(),
                "error": str(e)
            }
    
    def get_region_compliance_score(self, region_id: int) -> float:
        """
        Calculate compliance score for a specific region
        """
        try:
            # Get region compliance items
            region_compliance = self.db.query(FranchiseCompliance).filter(
                and_(
                    FranchiseCompliance.entity_type == "region",
                    FranchiseCompliance.entity_id == region_id,
                    FranchiseCompliance.is_active == True
                )
            ).all()
            
            if not region_compliance:
                return 100.0  # No requirements = compliant
            
            compliant_count = len([
                req for req in region_compliance 
                if req.compliance_status == "compliant"
            ])
            
            return (compliant_count / len(region_compliance)) * 100
            
        except Exception as e:
            logger.error(f"Error calculating region compliance score: {e}")
            return 0.0
    
    def get_region_compliance_details(self, region_id: int) -> Dict[str, Any]:
        """
        Get detailed compliance information for a region
        """
        try:
            # Get region compliance items
            region_compliance = self.db.query(FranchiseCompliance).filter(
                and_(
                    FranchiseCompliance.entity_type == "region",
                    FranchiseCompliance.entity_id == region_id,
                    FranchiseCompliance.is_active == True
                )
            ).all()
            
            # Group by jurisdiction
            jurisdiction_compliance = {}
            for req in region_compliance:
                jurisdiction = req.jurisdiction.value
                if jurisdiction not in jurisdiction_compliance:
                    jurisdiction_compliance[jurisdiction] = {
                        "total": 0,
                        "compliant": 0,
                        "non_compliant": 0,
                        "pending": 0,
                        "issues_count": 0,
                        "last_audit": None
                    }
                
                jurisdiction_compliance[jurisdiction]["total"] += 1
                
                if req.compliance_status == "compliant":
                    jurisdiction_compliance[jurisdiction]["compliant"] += 1
                elif req.compliance_status == "non_compliant":
                    jurisdiction_compliance[jurisdiction]["non_compliant"] += 1
                    jurisdiction_compliance[jurisdiction]["issues_count"] += 1
                else:
                    jurisdiction_compliance[jurisdiction]["pending"] += 1
                
                # Track last audit date
                if req.last_compliance_check:
                    current_last = jurisdiction_compliance[jurisdiction]["last_audit"]
                    if not current_last or req.last_compliance_check > current_last:
                        jurisdiction_compliance[jurisdiction]["last_audit"] = req.last_compliance_check
            
            # Calculate scores for each jurisdiction
            for jurisdiction, data in jurisdiction_compliance.items():
                if data["total"] > 0:
                    data["score"] = (data["compliant"] / data["total"]) * 100
                else:
                    data["score"] = 100.0
                
                # Format last audit date
                if data["last_audit"]:
                    data["last_audit"] = data["last_audit"].isoformat()
            
            # Get critical requirements
            critical_requirements = [
                {
                    "requirement": req.requirement_name,
                    "status": req.compliance_status,
                    "due_date": req.required_by_date.isoformat() if req.required_by_date else None,
                    "risk_level": req.risk_level
                }
                for req in region_compliance
                if req.risk_level in ["high", "critical"]
            ]
            
            # Get upcoming audits (mock data for now)
            upcoming_audits = [
                {
                    "audit_type": "Annual Compliance Review",
                    "scheduled_date": (datetime.utcnow() + timedelta(days=45)).isoformat(),
                    "locations_affected": 5
                },
                {
                    "audit_type": "Safety Inspection",
                    "scheduled_date": (datetime.utcnow() + timedelta(days=30)).isoformat(),
                    "locations_affected": 3
                }
            ]
            
            overall_score = self.get_region_compliance_score(region_id)
            
            return {
                "overall_score": overall_score,
                "jurisdiction_compliance": [
                    {
                        "jurisdiction": jurisdiction,
                        "score": data["score"],
                        "issues_count": data["issues_count"],
                        "last_audit": data["last_audit"] or (datetime.utcnow() - timedelta(days=90)).isoformat()
                    }
                    for jurisdiction, data in jurisdiction_compliance.items()
                ],
                "critical_requirements": critical_requirements,
                "upcoming_audits": upcoming_audits
            }
            
        except Exception as e:
            logger.error(f"Error getting region compliance details: {e}")
            return {
                "overall_score": 0.0,
                "jurisdiction_compliance": [],
                "critical_requirements": [],
                "upcoming_audits": [],
                "error": str(e)
            }
    
    def track_compliance_requirement(
        self,
        entity_type: str,
        entity_id: int,
        jurisdiction: ComplianceJurisdiction,
        requirement_type: str,
        requirement_name: str,
        description: Optional[str] = None,
        required_by_date: Optional[datetime] = None,
        risk_level: str = "medium"
    ) -> FranchiseCompliance:
        """
        Create a new compliance requirement for tracking
        """
        try:
            compliance_item = FranchiseCompliance(
                entity_type=entity_type,
                entity_id=entity_id,
                jurisdiction=jurisdiction,
                requirement_type=requirement_type,
                requirement_name=requirement_name,
                description=description,
                required_by_date=required_by_date,
                risk_level=risk_level,
                compliance_status="pending"
            )
            
            self.db.add(compliance_item)
            self.db.commit()
            self.db.refresh(compliance_item)
            
            logger.info(f"Created compliance requirement {requirement_name} for {entity_type} {entity_id}")
            return compliance_item
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error creating compliance requirement: {e}")
            raise
    
    def update_compliance_status(
        self,
        compliance_id: int,
        status: str,
        audit_notes: Optional[str] = None,
        documents: Optional[List[Dict[str, Any]]] = None
    ) -> FranchiseCompliance:
        """
        Update the compliance status of a requirement
        """
        try:
            compliance_item = self.db.query(FranchiseCompliance).filter(
                FranchiseCompliance.id == compliance_id
            ).first()
            
            if not compliance_item:
                raise ValueError(f"Compliance item {compliance_id} not found")
            
            compliance_item.compliance_status = status
            compliance_item.last_compliance_check = datetime.utcnow()
            
            # Update audit history
            if audit_notes:
                audit_entry = {
                    "date": datetime.utcnow().isoformat(),
                    "status": status,
                    "notes": audit_notes,
                    "auditor": "system"  # In real implementation, use actual user
                }
                compliance_item.audit_history.append(audit_entry)
            
            # Update documents
            if documents:
                compliance_item.compliance_documents.extend(documents)
            
            # Set next review date based on status and risk
            if status == "compliant":
                if compliance_item.risk_level == "critical":
                    compliance_item.next_review_date = datetime.utcnow() + timedelta(days=90)
                elif compliance_item.risk_level == "high":
                    compliance_item.next_review_date = datetime.utcnow() + timedelta(days=180)
                else:
                    compliance_item.next_review_date = datetime.utcnow() + timedelta(days=365)
            else:
                # Non-compliant items need immediate attention
                compliance_item.next_review_date = datetime.utcnow() + timedelta(days=30)
            
            self.db.commit()
            self.db.refresh(compliance_item)
            
            logger.info(f"Updated compliance status for {compliance_item.requirement_name} to {status}")
            return compliance_item
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error updating compliance status: {e}")
            raise
    
    def get_compliance_alerts(self, entity_type: str, entity_id: int) -> List[Dict[str, Any]]:
        """
        Get compliance alerts for overdue or critical requirements
        """
        try:
            current_time = datetime.utcnow()
            
            # Get overdue or critical compliance items
            compliance_alerts = self.db.query(FranchiseCompliance).filter(
                and_(
                    FranchiseCompliance.entity_type == entity_type,
                    FranchiseCompliance.entity_id == entity_id,
                    FranchiseCompliance.is_active == True,
                    or_(
                        # Overdue items
                        and_(
                            FranchiseCompliance.required_by_date <= current_time,
                            FranchiseCompliance.compliance_status != "compliant"
                        ),
                        # Critical non-compliant items
                        and_(
                            FranchiseCompliance.risk_level == "critical",
                            FranchiseCompliance.compliance_status == "non_compliant"
                        ),
                        # Items due for review
                        and_(
                            FranchiseCompliance.next_review_date <= current_time,
                            FranchiseCompliance.compliance_status == "compliant"
                        )
                    )
                )
            ).all()
            
            alerts = []
            for item in compliance_alerts:
                alert_type = "compliance"
                severity = "medium"
                
                # Determine severity
                if item.risk_level == "critical":
                    severity = "critical"
                elif item.compliance_status == "non_compliant":
                    severity = "high"
                elif item.required_by_date and item.required_by_date <= current_time:
                    severity = "high"
                
                # Determine message
                if item.compliance_status == "non_compliant":
                    message = f"Non-compliant: {item.requirement_name}"
                elif item.required_by_date and item.required_by_date <= current_time:
                    message = f"Overdue: {item.requirement_name}"
                else:
                    message = f"Review due: {item.requirement_name}"
                
                alerts.append({
                    "id": f"compliance_{item.id}",
                    "type": alert_type,
                    "severity": severity,
                    "title": f"Compliance Alert - {item.jurisdiction.value}",
                    "message": message,
                    "entity_type": entity_type,
                    "entity_id": entity_id,
                    "entity_name": f"{entity_type}_{entity_id}",  # Would be actual name in real implementation
                    "created_at": item.updated_at.isoformat() if item.updated_at else datetime.utcnow().isoformat(),
                    "requires_action": item.compliance_status != "compliant",
                    "compliance_id": item.id,
                    "jurisdiction": item.jurisdiction.value,
                    "requirement_type": item.requirement_type
                })
            
            return alerts
            
        except Exception as e:
            logger.error(f"Error getting compliance alerts: {e}")
            return []
    
    def generate_compliance_report(
        self, 
        entity_type: str, 
        entity_id: int, 
        report_type: str = "summary"
    ) -> Dict[str, Any]:
        """
        Generate comprehensive compliance report
        """
        try:
            if entity_type == "network":
                summary = self.get_network_compliance_summary(entity_id)
            elif entity_type == "region":
                summary = self.get_region_compliance_details(entity_id)
            else:
                # For groups and locations, use simplified compliance check
                summary = {
                    "overall_score": 95.0,  # Mock score
                    "critical_issues": 0,
                    "pending_reviews": 1
                }
            
            alerts = self.get_compliance_alerts(entity_type, entity_id)
            
            report = {
                "report_type": report_type,
                "entity_type": entity_type,
                "entity_id": entity_id,
                "generated_at": datetime.utcnow().isoformat(),
                "summary": summary,
                "alerts": alerts,
                "recommendations": self._generate_compliance_recommendations(summary, alerts)
            }
            
            return report
            
        except Exception as e:
            logger.error(f"Error generating compliance report: {e}")
            return {
                "report_type": report_type,
                "entity_type": entity_type,
                "entity_id": entity_id,
                "generated_at": datetime.utcnow().isoformat(),
                "error": str(e)
            }
    
    def _generate_compliance_recommendations(
        self, 
        summary: Dict[str, Any], 
        alerts: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Generate compliance improvement recommendations based on current status
        """
        recommendations = []
        
        # Check overall score
        overall_score = summary.get("overall_score", 0)
        if overall_score < 85:
            recommendations.append({
                "priority": "high",
                "category": "overall_compliance",
                "title": "Improve Overall Compliance Score",
                "description": f"Current compliance score ({overall_score:.1f}%) is below the recommended 85% threshold.",
                "action_items": [
                    "Review non-compliant requirements",
                    "Develop remediation plan",
                    "Assign compliance officers",
                    "Schedule regular compliance reviews"
                ]
            })
        
        # Check critical issues
        critical_issues = summary.get("critical_issues", 0)
        if critical_issues > 0:
            recommendations.append({
                "priority": "critical",
                "category": "critical_issues",
                "title": "Address Critical Compliance Issues",
                "description": f"{critical_issues} critical compliance issues require immediate attention.",
                "action_items": [
                    "Prioritize critical non-compliant items",
                    "Allocate emergency resources",
                    "Engage legal counsel if needed",
                    "Implement emergency procedures"
                ]
            })
        
        # Check alerts
        high_severity_alerts = [a for a in alerts if a.get("severity") in ["high", "critical"]]
        if high_severity_alerts:
            recommendations.append({
                "priority": "high",
                "category": "active_alerts",
                "title": "Resolve Active Compliance Alerts",
                "description": f"{len(high_severity_alerts)} high-priority compliance alerts need resolution.",
                "action_items": [
                    "Review each alert in detail",
                    "Create action plans for resolution",
                    "Set deadlines and assign owners",
                    "Monitor progress weekly"
                ]
            })
        
        return recommendations
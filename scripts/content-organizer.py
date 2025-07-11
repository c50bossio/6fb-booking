#!/usr/bin/env python3
"""
Content Organizer for Six Figure Barber Methodology Integration

This script takes parsed Notion content and organizes it for integration
into the existing Claude Code documentation framework.
"""

import json
import logging
from pathlib import Path
from dataclasses import dataclass, asdict
from typing import Dict, List, Optional, Set
from datetime import datetime

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class DocumentUpdate:
    """Represents an update to be made to a documentation file"""
    file_path: str
    section_name: str
    new_content: str
    replacement_markers: List[str]  # Markers in existing docs to replace
    priority: str
    estimated_impact: str

@dataclass
class IntegrationPlan:
    """Complete plan for integrating extracted content"""
    methodology_updates: List[DocumentUpdate]
    business_rules_updates: List[DocumentUpdate]
    feature_alignment_updates: List[DocumentUpdate]
    metrics_updates: List[DocumentUpdate]
    implementation_sequence: List[str]
    validation_checkpoints: List[str]

class ContentOrganizer:
    """Organizes extracted 6FB content for Claude Code integration"""
    
    def __init__(self, base_path: str = "/Users/bossio/6fb-booking"):
        self.base_path = Path(base_path)
        self.doc_templates = self._load_document_templates()
        
    def _load_document_templates(self) -> Dict[str, str]:
        """Load existing documentation templates and structure"""
        templates = {}
        
        doc_files = [
            'SIX_FIGURE_BARBER_METHODOLOGY.md',
            '6FB_BUSINESS_RULES.md', 
            '6FB_FEATURE_ALIGNMENT.md',
            '6FB_METRICS_FRAMEWORK.md'
        ]
        
        for doc_file in doc_files:
            file_path = self.base_path / doc_file
            if file_path.exists():
                try:
                    with open(file_path, 'r') as f:
                        templates[doc_file] = f.read()
                except Exception as e:
                    logger.warning(f"Could not load {doc_file}: {e}")
                    templates[doc_file] = ""
            else:
                templates[doc_file] = ""
        
        return templates
    
    def organize_extracted_content(self, extraction_result: Dict) -> IntegrationPlan:
        """Organize extracted content into documentation updates"""
        logger.info("Organizing extracted content for integration")
        
        # Parse extraction result
        sections = extraction_result.get('extraction_result', {}).get('sections', [])
        
        # Organize updates by document type
        methodology_updates = self._create_methodology_updates(sections)
        business_rules_updates = self._create_business_rules_updates(sections)
        feature_alignment_updates = self._create_feature_alignment_updates(sections)
        metrics_updates = self._create_metrics_updates(sections)
        
        # Create implementation sequence
        sequence = self._create_implementation_sequence(
            methodology_updates + business_rules_updates + 
            feature_alignment_updates + metrics_updates
        )
        
        # Define validation checkpoints
        checkpoints = self._create_validation_checkpoints()
        
        return IntegrationPlan(
            methodology_updates=methodology_updates,
            business_rules_updates=business_rules_updates,
            feature_alignment_updates=feature_alignment_updates,
            metrics_updates=metrics_updates,
            implementation_sequence=sequence,
            validation_checkpoints=checkpoints
        )
    
    def _create_methodology_updates(self, sections: List[Dict]) -> List[DocumentUpdate]:
        """Create updates for the main methodology document"""
        updates = []
        
        # Map section types to documentation sections
        section_mapping = {
            'philosophy': {
                'target_section': '## 📚 Core Philosophy & Principles',
                'replacement_markers': ['*[This section is ready for your input']
            },
            'business_model': {
                'target_section': '## 💼 Business Model Components', 
                'replacement_markers': ['*[Please provide the specific revenue strategies']
            },
            'implementation': {
                'target_section': '## 🛠 Technology Integration Points',
                'replacement_markers': ['*[Based on 6FB methodology, how should']
            },
            'professional_growth': {
                'target_section': '## 📋 Implementation Guidelines for Developers',
                'replacement_markers': ['*[Please provide UX guidelines based on 6FB methodology']
            }
        }
        
        for section in sections:
            methodology_type = section.get('methodology_type', 'general')
            
            if methodology_type in section_mapping:
                mapping = section_mapping[methodology_type]
                
                # Format content for markdown integration
                formatted_content = self._format_content_for_methodology(section)
                
                updates.append(DocumentUpdate(
                    file_path='SIX_FIGURE_BARBER_METHODOLOGY.md',
                    section_name=mapping['target_section'],
                    new_content=formatted_content,
                    replacement_markers=mapping['replacement_markers'],
                    priority=section.get('priority', 'medium'),
                    estimated_impact='high'
                ))
        
        return updates
    
    def _create_business_rules_updates(self, sections: List[Dict]) -> List[DocumentUpdate]:
        """Create updates for business rules document"""
        updates = []
        
        business_sections = [s for s in sections 
                           if s.get('methodology_type') in ['business_model', 'implementation']]
        
        for section in business_sections:
            # Convert extracted content to business rules format
            rules_content = self._convert_to_business_rules(section)
            
            if rules_content:
                updates.append(DocumentUpdate(
                    file_path='6FB_BUSINESS_RULES.md',
                    section_name=f"## 6FB Rule: {section.get('title', 'Untitled')}",
                    new_content=rules_content,
                    replacement_markers=['*[Please provide'],
                    priority=section.get('priority', 'medium'),
                    estimated_impact='medium'
                ))
        
        return updates
    
    def _create_feature_alignment_updates(self, sections: List[Dict]) -> List[DocumentUpdate]:
        """Create updates for feature alignment document"""
        updates = []
        
        # Look for sections that mention platform features or technology
        platform_sections = [s for s in sections 
                           if 'technology' in s.get('content', '').lower() or
                              'platform' in s.get('content', '').lower() or
                              'booking' in s.get('content', '').lower()]
        
        for section in platform_sections:
            alignment_content = self._convert_to_feature_alignment(section)
            
            if alignment_content:
                updates.append(DocumentUpdate(
                    file_path='6FB_FEATURE_ALIGNMENT.md',
                    section_name=f"### {section.get('title', 'Platform Feature')}",
                    new_content=alignment_content,
                    replacement_markers=['*[Please provide'],
                    priority=section.get('priority', 'medium'),
                    estimated_impact='high'
                ))
        
        return updates
    
    def _create_metrics_updates(self, sections: List[Dict]) -> List[DocumentUpdate]:
        """Create updates for metrics framework document"""
        updates = []
        
        # Look for sections mentioning metrics, KPIs, or measurement
        metrics_keywords = ['metric', 'kpi', 'measure', 'track', 'analytics', 'performance']
        metrics_sections = [s for s in sections 
                          if any(keyword in s.get('content', '').lower() 
                                for keyword in metrics_keywords)]
        
        for section in metrics_sections:
            metrics_content = self._convert_to_metrics_framework(section)
            
            if metrics_content:
                updates.append(DocumentUpdate(
                    file_path='6FB_METRICS_FRAMEWORK.md',
                    section_name=f"### {section.get('title', 'Metric Category')}",
                    new_content=metrics_content,
                    replacement_markers=['*[Please provide'],
                    priority=section.get('priority', 'medium'),
                    estimated_impact='medium'
                ))
        
        return updates
    
    def _format_content_for_methodology(self, section: Dict) -> str:
        """Format extracted content for methodology document integration"""
        title = section.get('title', 'Untitled Section')
        content = section.get('content', '')
        subsections = section.get('subsections', [])
        
        formatted = f"""
### **{title}**

{content}

"""
        
        # Add subsections if available
        if subsections:
            formatted += "**Key Components:**\n\n"
            for subsection in subsections:
                sub_title = subsection.get('title', '')
                sub_content = subsection.get('content', '')
                formatted += f"#### **{sub_title}**\n{sub_content}\n\n"
        
        # Add implementation guidance
        formatted += f"""
**Platform Implementation:**
- Integrate this methodology into BookedBarber platform features
- Ensure all related functionality supports these principles
- Track success metrics aligned with this approach
- Provide user experience that reinforces these concepts

**Technology Requirements:**
- Design features that enable this methodology
- Implement validation rules to ensure compliance
- Create analytics to measure methodology adherence
- Build automation to support these practices

"""
        
        return formatted
    
    def _convert_to_business_rules(self, section: Dict) -> str:
        """Convert extracted content to business rules format"""
        title = section.get('title', 'Business Rule')
        content = section.get('content', '')
        
        # Extract actionable rules from content
        rules = self._extract_actionable_rules(content)
        
        if not rules:
            return ""
        
        formatted = f"""
### **{title} Rules**
**Rule**: {rules[0] if rules else 'Derived from 6FB methodology'}
**Implementation**:
```python
def validate_{title.lower().replace(' ', '_')}(action, context):
    \"\"\"Validate action against 6FB {title} principles\"\"\"
    
    # Extract validation logic from content
    validation_criteria = [
        # Add specific criteria based on extracted content
    ]
    
    for criterion in validation_criteria:
        if not criterion.validate(action, context):
            raise BusinessRuleViolation(f"Action violates 6FB {title} principles")
    
    return ValidationResult(valid=True)
```

**Business Logic:**
{content}

**Enforcement:**
- Automated validation in relevant platform features
- User interface restrictions where applicable
- Analytics tracking for compliance measurement
- Regular audit and review processes

"""
        
        return formatted
    
    def _convert_to_feature_alignment(self, section: Dict) -> str:
        """Convert extracted content to feature alignment format"""
        title = section.get('title', 'Feature')
        content = section.get('content', '')
        
        # Determine alignment level based on content analysis
        alignment_level = self._determine_alignment_level(content)
        alignment_symbol = "🟢" if alignment_level == "high" else "🟡" if alignment_level == "medium" else "🟠"
        
        formatted = f"""
{alignment_symbol} **{alignment_level.upper()} ALIGNMENT** - {title}

**6FB Principle**: {self._extract_principle(content)}
**Platform Implementation**:
{self._extract_implementation_details(content)}

**Revenue Impact**: ⭐⭐⭐⭐⭐ (To be assessed based on implementation)
**Client Relationship**: ⭐⭐⭐⭐⭐ (To be assessed based on methodology alignment)

**Implementation Notes:**
{content}

"""
        
        return formatted
    
    def _convert_to_metrics_framework(self, section: Dict) -> str:
        """Convert extracted content to metrics framework format"""
        title = section.get('title', 'Metrics')
        content = section.get('content', '')
        
        # Extract potential metrics from content
        metrics = self._extract_potential_metrics(content)
        
        formatted = f"""
### **{title} Metrics**

**Core Metrics:**
```python
{title.upper().replace(' ', '_')}_METRICS = {{
"""
        
        for metric in metrics:
            formatted += f'    \'{metric["name"]}\': \'{metric["description"]}\',\n'
        
        formatted += f"""}}

def calculate_{title.lower().replace(' ', '_')}_metrics():
    return {{
        # Implementation based on extracted methodology
"""
        
        for metric in metrics:
            formatted += f'        \'{metric["name"]}\': {metric["calculation"]},\n'
        
        formatted += f"""    }}
```

**Methodology Context:**
{content}

**Success Benchmarks:**
- Establish baseline measurements
- Set improvement targets based on 6FB standards
- Regular progress tracking and adjustment
- Integration with overall business metrics

"""
        
        return formatted
    
    def _extract_actionable_rules(self, content: str) -> List[str]:
        """Extract actionable business rules from content"""
        rules = []
        
        # Look for imperative statements or requirements
        sentences = content.split('.')
        for sentence in sentences:
            sentence = sentence.strip()
            if any(word in sentence.lower() for word in ['must', 'should', 'require', 'need', 'ensure']):
                rules.append(sentence)
        
        return rules[:3]  # Return top 3 rules
    
    def _determine_alignment_level(self, content: str) -> str:
        """Determine feature alignment level based on content"""
        high_indicators = ['essential', 'critical', 'core', 'fundamental', 'revenue', 'client']
        medium_indicators = ['important', 'helpful', 'useful', 'support', 'enhance']
        
        content_lower = content.lower()
        
        high_score = sum(1 for indicator in high_indicators if indicator in content_lower)
        medium_score = sum(1 for indicator in medium_indicators if indicator in content_lower)
        
        if high_score >= 2:
            return 'high'
        elif medium_score >= 2 or high_score >= 1:
            return 'medium'
        else:
            return 'low'
    
    def _extract_principle(self, content: str) -> str:
        """Extract main principle from content"""
        # Find the first sentence that seems to state a principle
        sentences = content.split('.')
        for sentence in sentences:
            if len(sentence.strip()) > 20 and len(sentence.strip()) < 100:
                return sentence.strip()
        
        return "Value creation and client relationship optimization"
    
    def _extract_implementation_details(self, content: str) -> str:
        """Extract implementation details from content"""
        # Create bullet points from content
        sentences = [s.strip() for s in content.split('.') if len(s.strip()) > 10]
        details = []
        
        for sentence in sentences[:3]:  # Take first 3 relevant sentences
            details.append(f"- {sentence}")
        
        return '\n'.join(details) if details else "- Implementation details to be derived from methodology"
    
    def _extract_potential_metrics(self, content: str) -> List[Dict[str, str]]:
        """Extract potential metrics from content"""
        metrics = []
        
        # Common metric patterns
        metric_patterns = [
            'rate', 'percentage', 'ratio', 'count', 'average', 'total', 'score'
        ]
        
        words = content.lower().split()
        for i, word in enumerate(words):
            if any(pattern in word for pattern in metric_patterns):
                # Try to build a metric name from surrounding context
                context = ' '.join(words[max(0, i-2):i+3])
                metric_name = context.replace(' ', '_')[:50]
                
                metrics.append({
                    'name': metric_name,
                    'description': f'Metric derived from: {context}',
                    'calculation': 'calculate_from_6fb_methodology()'
                })
        
        # Ensure we have at least some default metrics
        if not metrics:
            metrics = [
                {
                    'name': 'methodology_adherence_score',
                    'description': 'Overall adherence to 6FB methodology',
                    'calculation': 'calculate_adherence_score()'
                }
            ]
        
        return metrics[:5]  # Return top 5 metrics
    
    def _create_implementation_sequence(self, all_updates: List[DocumentUpdate]) -> List[str]:
        """Create implementation sequence based on priority and dependencies"""
        # Sort by priority and impact
        priority_order = {'high': 3, 'medium': 2, 'low': 1}
        impact_order = {'high': 3, 'medium': 2, 'low': 1}
        
        sorted_updates = sorted(all_updates, key=lambda x: (
            priority_order.get(x.priority, 1),
            impact_order.get(x.estimated_impact, 1)
        ), reverse=True)
        
        sequence = []
        for update in sorted_updates:
            sequence.append(f"{update.file_path}: {update.section_name}")
        
        return sequence
    
    def _create_validation_checkpoints(self) -> List[str]:
        """Create validation checkpoints for integration process"""
        return [
            "Verify methodology document updates maintain structure and readability",
            "Confirm business rules are implementable in platform code",
            "Validate feature alignment maintains existing functionality", 
            "Ensure metrics framework provides actionable insights",
            "Test Claude Code understanding of updated methodology",
            "Verify integration maintains documentation consistency"
        ]
    
    def save_integration_plan(self, plan: IntegrationPlan, output_path: str) -> str:
        """Save integration plan to file"""
        output_file = Path(output_path) / f"6fb_integration_plan_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        
        with open(output_file, 'w') as f:
            json.dump(asdict(plan), f, indent=2)
        
        logger.info(f"Integration plan saved to {output_file}")
        return str(output_file)

def main():
    """Test the content organizer"""
    organizer = ContentOrganizer()
    
    # Test with sample extraction result
    sample_extraction = {
        'extraction_result': {
            'sections': [
                {
                    'title': 'Revenue Optimization',
                    'content': 'Focus on value-based pricing and premium service delivery to maximize revenue per client.',
                    'subsections': [],
                    'methodology_type': 'business_model',
                    'priority': 'high'
                },
                {
                    'title': 'Client Relationship Building', 
                    'content': 'Build lasting relationships through personalized service and consistent follow-up.',
                    'subsections': [],
                    'methodology_type': 'implementation',
                    'priority': 'high'
                }
            ]
        }
    }
    
    # Organize content
    plan = organizer.organize_extracted_content(sample_extraction)
    
    # Save plan
    output_path = organizer.save_integration_plan(plan, '/Users/bossio/6fb-booking/extracted-content')
    
    print(f"Integration plan created with {len(plan.methodology_updates)} methodology updates")
    print(f"Saved to: {output_path}")

if __name__ == "__main__":
    main()
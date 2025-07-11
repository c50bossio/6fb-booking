#!/usr/bin/env python3
"""
Notion Content Parser for Six Figure Barber Program

This script processes raw HTML/text content extracted from Notion pages
and converts it into structured methodology content for Claude Code integration.
"""

import re
import json
import logging
from pathlib import Path
from dataclasses import dataclass, asdict
from typing import Dict, List, Optional, Tuple
from bs4 import BeautifulSoup
import markdown

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class ParsedSection:
    """Represents a parsed section from Notion content"""
    title: str
    content: str
    subsections: List[Dict[str, str]]
    methodology_category: str
    implementation_priority: str
    platform_relevance: str  # How relevant to BookedBarber platform
    business_impact: str    # Revenue, efficiency, client_relationship, etc.

@dataclass
class NotionPage:
    """Represents a complete Notion page structure"""
    title: str
    sections: List[ParsedSection]
    metadata: Dict[str, str]
    extraction_quality: str  # 'high', 'medium', 'low'

class NotionContentParser:
    """Parses Notion content and structures it for 6FB methodology integration"""
    
    def __init__(self):
        self.methodology_keywords = {
            'philosophy': [
                'mindset', 'philosophy', 'principles', 'values', 'beliefs',
                'approach', 'foundation', 'core', 'essence', 'vision'
            ],
            'business_model': [
                'revenue', 'pricing', 'profit', 'income', 'earnings', 'financial',
                'business model', 'monetization', 'packages', 'services'
            ],
            'client_relationship': [
                'client', 'customer', 'relationship', 'retention', 'loyalty',
                'satisfaction', 'experience', 'communication', 'consultation'
            ],
            'service_delivery': [
                'service', 'quality', 'delivery', 'process', 'workflow',
                'appointment', 'booking', 'scheduling', 'operations'
            ],
            'professional_development': [
                'skill', 'training', 'education', 'development', 'growth',
                'certification', 'mastery', 'improvement', 'learning'
            ],
            'marketing_sales': [
                'marketing', 'sales', 'promotion', 'advertising', 'branding',
                'acquisition', 'conversion', 'lead generation', 'referral'
            ],
            'technology_tools': [
                'technology', 'software', 'tools', 'system', 'platform',
                'automation', 'efficiency', 'digital', 'online'
            ]
        }
        
        self.platform_integration_patterns = {
            'booking_system': [
                'appointment', 'booking', 'scheduling', 'calendar', 'availability',
                'time slot', 'reservation', 'confirmation'
            ],
            'payment_processing': [
                'payment', 'billing', 'transaction', 'stripe', 'checkout',
                'pricing', 'cost', 'fee', 'commission'
            ],
            'client_management': [
                'client profile', 'customer data', 'history', 'preferences',
                'contact', 'communication', 'follow-up', 'crm'
            ],
            'analytics_reporting': [
                'analytics', 'metrics', 'reporting', 'dashboard', 'kpi',
                'performance', 'tracking', 'measurement', 'data'
            ],
            'marketing_automation': [
                'email', 'sms', 'notification', 'reminder', 'campaign',
                'automation', 'workflow', 'sequence'
            ]
        }
    
    def parse_html_content(self, html_content: str) -> NotionPage:
        """Parse HTML content from Notion page"""
        soup = BeautifulSoup(html_content, 'html.parser')
        
        # Extract page title
        title = self._extract_title(soup)
        
        # Extract main content sections
        sections = self._extract_sections(soup)
        
        # Extract metadata
        metadata = self._extract_metadata(soup)
        
        # Assess extraction quality
        quality = self._assess_extraction_quality(sections)
        
        return NotionPage(
            title=title,
            sections=sections,
            metadata=metadata,
            extraction_quality=quality
        )
    
    def parse_markdown_content(self, markdown_content: str) -> NotionPage:
        """Parse markdown content"""
        # Convert markdown to HTML for consistent processing
        html_content = markdown.markdown(markdown_content)
        return self.parse_html_content(html_content)
    
    def parse_text_content(self, text_content: str) -> NotionPage:
        """Parse plain text content with structure detection"""
        # Split content into sections based on headers
        sections = []
        current_section = ""
        current_title = "Introduction"
        
        lines = text_content.split('\n')
        for line in lines:
            line = line.strip()
            if not line:
                continue
                
            # Detect headers (lines that are all caps, or start with numbers/bullets)
            if (line.isupper() and len(line) > 5) or \
               re.match(r'^\d+\.', line) or \
               re.match(r'^[#]+\s', line):
                
                # Save previous section
                if current_section:
                    sections.append(self._create_parsed_section(current_title, current_section))
                
                # Start new section
                current_title = line.replace('#', '').strip()
                current_section = ""
            else:
                current_section += line + "\n"
        
        # Save final section
        if current_section:
            sections.append(self._create_parsed_section(current_title, current_section))
        
        return NotionPage(
            title="Six Figure Barber Methodology",
            sections=sections,
            metadata={"source": "text_parsing", "sections_count": str(len(sections))},
            extraction_quality="medium"
        )
    
    def _extract_title(self, soup: BeautifulSoup) -> str:
        """Extract page title from HTML"""
        # Try various title selectors
        title_selectors = [
            'h1', 'title', '.page-title', '.notion-page-title',
            '[data-testid="page-title"]', '.title'
        ]
        
        for selector in title_selectors:
            title_elem = soup.select_one(selector)
            if title_elem:
                return title_elem.get_text().strip()
        
        return "Six Figure Barber Methodology"
    
    def _extract_sections(self, soup: BeautifulSoup) -> List[ParsedSection]:
        """Extract content sections from HTML"""
        sections = []
        
        # Find all headers and their content
        headers = soup.find_all(['h1', 'h2', 'h3', 'h4', 'h5', 'h6'])
        
        for header in headers:
            title = header.get_text().strip()
            content = self._extract_section_content(header)
            
            if content:
                sections.append(self._create_parsed_section(title, content))
        
        # If no headers found, treat entire content as one section
        if not sections:
            all_text = soup.get_text()
            if all_text.strip():
                sections.append(self._create_parsed_section(
                    "Six Figure Barber Methodology", 
                    all_text.strip()
                ))
        
        return sections
    
    def _extract_section_content(self, header) -> str:
        """Extract content following a header until next header"""
        content = []
        current = header.next_sibling
        
        while current:
            if hasattr(current, 'name') and current.name in ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']:
                break
            
            if hasattr(current, 'get_text'):
                text = current.get_text().strip()
                if text:
                    content.append(text)
            elif isinstance(current, str):
                text = current.strip()
                if text:
                    content.append(text)
            
            current = current.next_sibling
        
        return '\n'.join(content)
    
    def _create_parsed_section(self, title: str, content: str) -> ParsedSection:
        """Create a ParsedSection with analysis"""
        # Categorize by methodology type
        methodology_category = self._categorize_content(content)
        
        # Determine implementation priority
        priority = self._determine_priority(title, content)
        
        # Assess platform relevance
        relevance = self._assess_platform_relevance(content)
        
        # Identify business impact
        impact = self._identify_business_impact(content)
        
        # Extract subsections
        subsections = self._extract_subsections(content)
        
        return ParsedSection(
            title=title,
            content=content,
            subsections=subsections,
            methodology_category=methodology_category,
            implementation_priority=priority,
            platform_relevance=relevance,
            business_impact=impact
        )
    
    def _categorize_content(self, content: str) -> str:
        """Categorize content by methodology type"""
        content_lower = content.lower()
        scores = {}
        
        for category, keywords in self.methodology_keywords.items():
            score = sum(1 for keyword in keywords if keyword in content_lower)
            scores[category] = score
        
        if not scores or max(scores.values()) == 0:
            return 'general'
        
        return max(scores, key=scores.get)
    
    def _determine_priority(self, title: str, content: str) -> str:
        """Determine implementation priority"""
        high_priority_indicators = [
            'revenue', 'profit', 'client', 'booking', 'payment',
            'core', 'essential', 'fundamental', 'critical'
        ]
        
        medium_priority_indicators = [
            'optimization', 'improvement', 'enhancement', 'automation',
            'efficiency', 'marketing', 'growth'
        ]
        
        text = (title + ' ' + content).lower()
        
        high_score = sum(1 for indicator in high_priority_indicators if indicator in text)
        medium_score = sum(1 for indicator in medium_priority_indicators if indicator in text)
        
        if high_score >= 2:
            return 'high'
        elif medium_score >= 2 or high_score >= 1:
            return 'medium'
        else:
            return 'low'
    
    def _assess_platform_relevance(self, content: str) -> str:
        """Assess how relevant content is to BookedBarber platform"""
        content_lower = content.lower()
        total_score = 0
        
        for integration_type, keywords in self.platform_integration_patterns.items():
            score = sum(1 for keyword in keywords if keyword in content_lower)
            total_score += score
        
        if total_score >= 5:
            return 'high'
        elif total_score >= 2:
            return 'medium'
        else:
            return 'low'
    
    def _identify_business_impact(self, content: str) -> str:
        """Identify primary business impact area"""
        impact_keywords = {
            'revenue': ['revenue', 'income', 'profit', 'pricing', 'sales', 'earning'],
            'efficiency': ['efficiency', 'optimization', 'productivity', 'automation', 'time'],
            'client_relationship': ['client', 'customer', 'relationship', 'satisfaction', 'retention'],
            'growth': ['growth', 'scale', 'expansion', 'market', 'acquisition'],
            'quality': ['quality', 'service', 'excellence', 'standard', 'delivery']
        }
        
        content_lower = content.lower()
        scores = {}
        
        for impact, keywords in impact_keywords.items():
            score = sum(1 for keyword in keywords if keyword in content_lower)
            scores[impact] = score
        
        if not scores or max(scores.values()) == 0:
            return 'general'
        
        return max(scores, key=scores.get)
    
    def _extract_subsections(self, content: str) -> List[Dict[str, str]]:
        """Extract subsections from content"""
        subsections = []
        
        # Look for numbered lists, bullet points, or clear subdivisions
        lines = content.split('\n')
        current_subsection = ""
        current_title = ""
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            # Check if line looks like a subsection header
            if (re.match(r'^\d+\.', line) or 
                re.match(r'^[•\-\*]', line) or
                (line.endswith(':') and len(line) < 50)):
                
                # Save previous subsection
                if current_title and current_subsection:
                    subsections.append({
                        "title": current_title,
                        "content": current_subsection.strip()
                    })
                
                # Start new subsection
                current_title = re.sub(r'^[\d\.\-\*•\s]+', '', line).rstrip(':')
                current_subsection = ""
            else:
                current_subsection += line + " "
        
        # Save final subsection
        if current_title and current_subsection:
            subsections.append({
                "title": current_title,
                "content": current_subsection.strip()
            })
        
        return subsections
    
    def _extract_metadata(self, soup: BeautifulSoup) -> Dict[str, str]:
        """Extract metadata from HTML"""
        metadata = {}
        
        # Look for meta tags
        for meta in soup.find_all('meta'):
            name = meta.get('name') or meta.get('property')
            content = meta.get('content')
            if name and content:
                metadata[name] = content
        
        # Add parsing metadata
        metadata['parsed_sections'] = str(len(soup.find_all(['h1', 'h2', 'h3', 'h4', 'h5', 'h6'])))
        metadata['content_length'] = str(len(soup.get_text()))
        metadata['parsing_timestamp'] = str(Path(__file__).stat().st_mtime)
        
        return metadata
    
    def _assess_extraction_quality(self, sections: List[ParsedSection]) -> str:
        """Assess the quality of content extraction"""
        if not sections:
            return 'low'
        
        # Check for structured content
        has_structured_content = any(
            section.subsections or len(section.content) > 100
            for section in sections
        )
        
        # Check for methodology-relevant content
        has_methodology_content = any(
            section.methodology_category != 'general'
            for section in sections
        )
        
        if has_structured_content and has_methodology_content and len(sections) >= 3:
            return 'high'
        elif has_methodology_content and len(sections) >= 2:
            return 'medium'
        else:
            return 'low'

def main():
    """Test the parser with sample content"""
    parser = NotionContentParser()
    
    # Test with sample text content
    sample_content = """
# Six Figure Barber Core Philosophy

The foundation of the Six Figure Barber program is built on value creation and premium service delivery.

## Revenue Optimization Strategies

1. Value-based pricing instead of time-based pricing
2. Premium service packages and upselling
3. Client lifetime value maximization

## Client Relationship Building

Building strong relationships is essential for business growth:
- Consultation and preference tracking
- Follow-up communication systems
- Loyalty program implementation

## Technology Integration

Modern barbershops need technology to compete:
- Online booking systems
- Payment processing
- Client management software
- Analytics and reporting
"""
    
    # Parse the content
    result = parser.parse_text_content(sample_content)
    
    # Display results
    print(f"Parsed Page: {result.title}")
    print(f"Quality: {result.extraction_quality}")
    print(f"Sections: {len(result.sections)}")
    
    for section in result.sections:
        print(f"\n--- {section.title} ---")
        print(f"Category: {section.methodology_category}")
        print(f"Priority: {section.implementation_priority}")
        print(f"Platform Relevance: {section.platform_relevance}")
        print(f"Business Impact: {section.business_impact}")
        print(f"Content length: {len(section.content)} chars")
        print(f"Subsections: {len(section.subsections)}")

if __name__ == "__main__":
    main()
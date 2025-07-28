"""
PDF Report Generator for BookedBarber V2 Weekly Insights

This service generates professional, branded PDF reports for weekly insights
with comprehensive charts, visualizations, and actionable recommendations.
The reports are designed to be printable and shareable, following Six Figure
Barber methodology and professional business reporting standards.

Key Features:
- Professional PDF layout with Six Figure Barber branding
- Interactive charts and visualizations using matplotlib/plotly
- Comprehensive business metrics and trend analysis
- Actionable recommendations with implementation guidance
- Mobile-responsive design for digital viewing
- Print-optimized formatting
- Customizable templates and styling
"""

import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from pathlib import Path
import io
import base64
from dataclasses import dataclass

# PDF and visualization libraries
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, mm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, Image, Frame, KeepTogether
)
from reportlab.platypus.flowables import HRFlowable
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT, TA_JUSTIFY
from reportlab.graphics.shapes import Drawing, Rect, String
from reportlab.graphics.charts.lineplots import LinePlot
from reportlab.graphics.charts.barcharts import VerticalBarChart
from reportlab.graphics.charts.pirates import Pie
from reportlab.graphics.widgets.markers import makeMarker

import matplotlib.pyplot as plt
import matplotlib.dates as mdates
from matplotlib.backends.backend_agg import FigureCanvasAgg
import seaborn as sns
import numpy as np
import pandas as pd

from models import User
from models.weekly_insights import WeeklyInsight, WeeklyRecommendation
from services.weekly_insights_service import WeeklyInsightsService

logger = logging.getLogger(__name__)

@dataclass
class PDFReportConfig:
    """Configuration for PDF report generation"""
    include_charts: bool = True
    include_recommendations: bool = True
    include_trends: bool = True
    include_detailed_metrics: bool = True
    page_size: tuple = A4
    font_family: str = "Helvetica"
    primary_color: tuple = (30, 64, 175)  # Six Figure Barber blue
    secondary_color: tuple = (245, 158, 11)  # Accent orange
    success_color: tuple = (16, 185, 129)  # Success green
    warning_color: tuple = (245, 101, 101)  # Warning red

class PDFReportGenerator:
    """
    Professional PDF report generator for weekly insights with comprehensive
    visualizations and Six Figure Barber branding.
    """
    
    def __init__(self, config: Optional[PDFReportConfig] = None):
        self.config = config or PDFReportConfig()
        self.setup_matplotlib_style()
        
        # ReportLab styles
        self.styles = getSampleStyleSheet()
        self._setup_custom_styles()
        
        # Chart colors based on Six Figure Barber brand
        self.chart_colors = [
            '#1E40AF',  # Primary blue
            '#F59E0B',  # Accent orange
            '#10B981',  # Success green
            '#8B5CF6',  # Purple
            '#EF4444',  # Red
            '#6B7280'   # Gray
        ]
    
    def setup_matplotlib_style(self):
        """Setup matplotlib styling for consistent chart appearance"""
        plt.style.use('seaborn-v0_8')
        sns.set_palette("husl")
        
        # Configure matplotlib for high-quality PDF output
        plt.rcParams.update({
            'font.family': self.config.font_family,
            'font.size': 10,
            'axes.titlesize': 12,
            'axes.labelsize': 10,
            'xtick.labelsize': 8,
            'ytick.labelsize': 8,
            'legend.fontsize': 9,
            'figure.titlesize': 14,
            'figure.dpi': 150,
            'savefig.dpi': 300,
            'savefig.bbox': 'tight',
            'savefig.transparent': False
        })
    
    def _setup_custom_styles(self):
        """Setup custom ReportLab paragraph styles"""
        
        # Main title style
        self.styles.add(ParagraphStyle(
            name='MainTitle',
            parent=self.styles['Title'],
            fontSize=24,
            textColor=colors.Color(*[c/255 for c in self.config.primary_color]),
            spaceAfter=20,
            alignment=TA_CENTER,
            fontName='Helvetica-Bold'
        ))
        
        # Section header style
        self.styles.add(ParagraphStyle(
            name='SectionHeader',
            parent=self.styles['Heading1'],
            fontSize=16,
            textColor=colors.Color(*[c/255 for c in self.config.primary_color]),
            spaceBefore=15,
            spaceAfter=10,
            fontName='Helvetica-Bold'
        ))
        
        # Subsection header style
        self.styles.add(ParagraphStyle(
            name='SubsectionHeader',
            parent=self.styles['Heading2'],
            fontSize=14,
            textColor=colors.Color(*[c/255 for c in self.config.secondary_color]),
            spaceBefore=12,
            spaceAfter=8,
            fontName='Helvetica-Bold'
        ))
        
        # Metric value style (large numbers)
        self.styles.add(ParagraphStyle(
            name='MetricValue',
            parent=self.styles['Normal'],
            fontSize=18,
            textColor=colors.Color(*[c/255 for c in self.config.primary_color]),
            alignment=TA_CENTER,
            fontName='Helvetica-Bold'
        ))
        
        # Recommendation style
        self.styles.add(ParagraphStyle(
            name='Recommendation',
            parent=self.styles['Normal'],
            fontSize=11,
            spaceBefore=8,
            spaceAfter=8,
            leftIndent=20,
            bulletIndent=10,
            fontName='Helvetica'
        ))
        
        # Achievement style
        self.styles.add(ParagraphStyle(
            name='Achievement',
            parent=self.styles['Normal'],
            fontSize=11,
            textColor=colors.Color(*[c/255 for c in self.config.success_color]),
            spaceBefore=5,
            spaceAfter=5,
            leftIndent=15,
            fontName='Helvetica'
        ))
    
    def generate_weekly_report(self, insight: WeeklyInsight, user: User, 
                             output_path: Optional[str] = None) -> bytes:
        """
        Generate a comprehensive weekly insights PDF report
        
        Args:
            insight: WeeklyInsight object with all data
            user: User object for personalization
            output_path: Optional file path to save PDF
            
        Returns:
            PDF content as bytes
        """
        try:
            logger.info(f"Generating PDF report for insight {insight.id}, user {user.id}")
            
            # Create PDF buffer
            buffer = io.BytesIO()
            
            # Create document
            doc = SimpleDocTemplate(
                buffer,
                pagesize=self.config.page_size,
                rightMargin=72,
                leftMargin=72,
                topMargin=72,
                bottomMargin=18,
                title=f"Weekly Insights - {user.name or 'Barber'}",
                author="BookedBarber - Six Figure Barber Methodology"
            )
            
            # Build report content
            story = self._build_report_content(insight, user)
            
            # Generate PDF
            doc.build(story, onFirstPage=self._add_header_footer, onLaterPages=self._add_header_footer)
            
            # Get PDF bytes
            pdf_bytes = buffer.getvalue()
            buffer.close()
            
            # Save to file if path provided
            if output_path:
                with open(output_path, 'wb') as f:
                    f.write(pdf_bytes)
                logger.info(f"PDF report saved to {output_path}")
            
            logger.info(f"Successfully generated PDF report ({len(pdf_bytes)} bytes)")\n            return pdf_bytes\n            \n        except Exception as e:\n            logger.error(f"Error generating PDF report: {e}")\n            raise\n    \n    def _build_report_content(self, insight: WeeklyInsight, user: User) -> List:\n        """Build the complete report content structure"""\n        \n        story = []\n        \n        # Title page\n        story.extend(self._create_title_page(insight, user))\n        \n        # Executive summary\n        story.extend(self._create_executive_summary(insight))\n        \n        # Key metrics overview\n        if self.config.include_detailed_metrics:\n            story.extend(self._create_metrics_overview(insight))\n        \n        # Performance charts\n        if self.config.include_charts:\n            story.extend(self._create_performance_charts(insight, user))\n        \n        # Six Figure Barber alignment\n        story.extend(self._create_six_fb_alignment_section(insight))\n        \n        # Achievements and opportunities\n        story.extend(self._create_achievements_section(insight))\n        \n        # Recommendations\n        if self.config.include_recommendations:\n            story.extend(self._create_recommendations_section(insight))\n        \n        # Trends analysis\n        if self.config.include_trends:\n            story.extend(self._create_trends_section(insight, user))\n        \n        # Action plan\n        story.extend(self._create_action_plan_section(insight))\n        \n        return story\n    \n    def _create_title_page(self, insight: WeeklyInsight, user: User) -> List:\n        """Create the report title page"""\n        \n        elements = []\n        \n        # Main title\n        week_label = insight.week_start_date.strftime("%B %d")\n        if insight.week_end_date.month != insight.week_start_date.month:\n            week_label += insight.week_end_date.strftime(" - %B %d, %Y")\n        else:\n            week_label += insight.week_end_date.strftime(" - %d, %Y")\n        \n        elements.append(Spacer(1, 50))\n        elements.append(Paragraph("Six Figure Barber", self.styles['MainTitle']))\n        elements.append(Paragraph("Weekly Performance Report", self.styles['Title']))\n        elements.append(Spacer(1, 20))\n        \n        # User info\n        elements.append(Paragraph(f"<b>Barber:</b> {user.name or 'Professional Barber'}", self.styles['Normal']))\n        elements.append(Paragraph(f"<b>Report Period:</b> {week_label}", self.styles['Normal']))\n        elements.append(Paragraph(f"<b>Generated:</b> {datetime.now().strftime('%B %d, %Y at %I:%M %p')}", self.styles['Normal']))\n        \n        elements.append(Spacer(1, 40))\n        \n        # Overall score display\n        score_color = self._get_score_color(insight.overall_score)\n        elements.append(Paragraph("Overall Six Figure Score", self.styles['Heading2']))\n        \n        # Create score visualization\n        score_chart = self._create_score_gauge(insight.overall_score)\n        if score_chart:\n            elements.append(score_chart)\n        \n        elements.append(Spacer(1, 20))\n        elements.append(Paragraph(f"<font color='{score_color}'><b>{insight.overall_score:.1f}/100</b></font>", self.styles['MetricValue']))\n        \n        # Score change indicator\n        if insight.score_change:\n            change_text = f"{insight.score_change:+.1f} points from last week"\n            change_color = 'green' if insight.score_change > 0 else 'red' if insight.score_change < 0 else 'gray'\n            elements.append(Paragraph(f"<font color='{change_color}'>{change_text}</font>", self.styles['Normal']))\n        \n        elements.append(PageBreak())\n        \n        return elements\n    \n    def _create_executive_summary(self, insight: WeeklyInsight) -> List:\n        """Create executive summary section"""\n        \n        elements = []\n        elements.append(Paragraph("Executive Summary", self.styles['SectionHeader']))\n        \n        if insight.executive_summary:\n            elements.append(Paragraph(insight.executive_summary, self.styles['Normal']))\n        else:\n            # Generate summary from metrics\n            summary = self._generate_summary_text(insight)\n            elements.append(Paragraph(summary, self.styles['Normal']))\n        \n        elements.append(Spacer(1, 20))\n        \n        # Key highlights table\n        highlights_data = [\n            ['Metric', 'Current Week', 'Change'],\n            ['Revenue', f'${insight.revenue_current_week:,.0f}', f'{insight.revenue_growth_percent:+.1f}%'],\n            ['Appointments', f'{insight.appointments_current_week}', f'{insight.appointment_growth_percent:+.1f}%'],\n            ['New Clients', f'{insight.new_clients_count}', '-'],\n            ['Avg Ticket Size', f'${insight.average_ticket_size:.0f}', '-'],\n            ['Booking Efficiency', f'{insight.booking_efficiency_percent:.1f}%', '-']\n        ]\n        \n        highlights_table = Table(highlights_data, colWidths=[2*inch, 1.5*inch, 1*inch])\n        highlights_table.setStyle(TableStyle([\n            ('BACKGROUND', (0, 0), (-1, 0), colors.Color(*[c/255 for c in self.config.primary_color])),\n            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),\n            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),\n            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),\n            ('FONTSIZE', (0, 0), (-1, 0), 10),\n            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),\n            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),\n            ('GRID', (0, 0), (-1, -1), 1, colors.black),\n            ('FONTSIZE', (0, 1), (-1, -1), 9),\n        ]))\n        \n        elements.append(highlights_table)\n        elements.append(Spacer(1, 20))\n        \n        return elements\n    \n    def _create_metrics_overview(self, insight: WeeklyInsight) -> List:\n        """Create detailed metrics overview section"""\n        \n        elements = []\n        elements.append(Paragraph("Detailed Performance Metrics", self.styles['SectionHeader']))\n        \n        # Revenue metrics\n        elements.append(Paragraph("Revenue Performance", self.styles['SubsectionHeader']))\n        \n        revenue_data = [\n            ['Metric', 'Current Week', 'Previous Week', 'Change'],\n            ['Total Revenue', f'${insight.revenue_current_week:,.0f}', \n             f'${insight.revenue_previous_week:,.0f}', f'{insight.revenue_growth_percent:+.1f}%'],\n            ['Average Ticket Size', f'${insight.average_ticket_size:.0f}', '-', '-'],\n            ['Revenue per Appointment', \n             f'${insight.revenue_current_week/max(insight.appointments_current_week, 1):.0f}', '-', '-']\n        ]\n        \n        revenue_table = Table(revenue_data, colWidths=[2*inch, 1.2*inch, 1.2*inch, 1*inch])\n        revenue_table.setStyle(self._get_table_style())\n        elements.append(revenue_table)\n        elements.append(Spacer(1, 15))\n        \n        # Client metrics\n        elements.append(Paragraph("Client Performance", self.styles['SubsectionHeader']))\n        \n        client_data = [\n            ['Metric', 'Current Week', 'Previous Week', 'Change'],\n            ['Total Appointments', f'{insight.appointments_current_week}', \n             f'{insight.appointments_previous_week}', f'{insight.appointment_growth_percent:+.1f}%'],\n            ['New Clients', f'{insight.new_clients_count}', '-', '-'],\n            ['Returning Clients', f'{insight.returning_clients_count}', '-', '-'],\n            ['Client Retention Rate', f'{insight.client_retention_rate:.1f}%', '-', '-']\n        ]\n        \n        client_table = Table(client_data, colWidths=[2*inch, 1.2*inch, 1.2*inch, 1*inch])\n        client_table.setStyle(self._get_table_style())\n        elements.append(client_table)\n        elements.append(Spacer(1, 15))\n        \n        # Efficiency metrics\n        elements.append(Paragraph("Operational Efficiency", self.styles['SubsectionHeader']))\n        \n        efficiency_data = [\n            ['Metric', 'Current Week', 'Target', 'Status'],\n            ['Booking Efficiency', f'{insight.booking_efficiency_percent:.1f}%', '80%', \n             '✓' if insight.booking_efficiency_percent >= 80 else '⚠'],\n            ['No-Show Rate', f'{insight.no_show_rate_percent:.1f}%', '<5%', \n             '✓' if insight.no_show_rate_percent < 5 else '⚠']\n        ]\n        \n        efficiency_table = Table(efficiency_data, colWidths=[2*inch, 1.2*inch, 1*inch, 1*inch])\n        efficiency_table.setStyle(self._get_table_style())\n        elements.append(efficiency_table)\n        elements.append(Spacer(1, 20))\n        \n        return elements\n    \n    def _create_performance_charts(self, insight: WeeklyInsight, user: User) -> List:\n        """Create performance visualization charts"""\n        \n        elements = []\n        elements.append(Paragraph("Performance Visualizations", self.styles['SectionHeader']))\n        \n        # Six Figure Barber scores radar chart\n        scores_chart = self._create_six_fb_scores_chart(insight)\n        if scores_chart:\n            elements.append(Paragraph("Six Figure Barber Methodology Scores", self.styles['SubsectionHeader']))\n            elements.append(scores_chart)\n            elements.append(Spacer(1, 15))\n        \n        # Revenue trend chart (if historical data available)\n        trend_chart = self._create_revenue_trend_chart(insight, user)\n        if trend_chart:\n            elements.append(Paragraph("Revenue Trend", self.styles['SubsectionHeader']))\n            elements.append(trend_chart)\n            elements.append(Spacer(1, 15))\n        \n        # Client composition pie chart\n        client_chart = self._create_client_composition_chart(insight)\n        if client_chart:\n            elements.append(Paragraph("Client Composition", self.styles['SubsectionHeader']))\n            elements.append(client_chart)\n            elements.append(Spacer(1, 20))\n        \n        return elements\n    \n    def _create_six_fb_alignment_section(self, insight: WeeklyInsight) -> List:\n        """Create Six Figure Barber methodology alignment section"""\n        \n        elements = []\n        elements.append(Paragraph("Six Figure Barber Methodology Alignment", self.styles['SectionHeader']))\n        \n        # Create alignment table\n        alignment_data = [\n            ['Principle', 'Score', 'Level', 'Focus Area'],\n            ['Revenue Optimization', f'{insight.revenue_optimization_score:.1f}/100', \n             self._get_score_level(insight.revenue_optimization_score), 'Premium pricing and value creation'],\n            ['Client Value Management', f'{insight.client_value_score:.1f}/100', \n             self._get_score_level(insight.client_value_score), 'Retention and relationship building'],\n            ['Service Excellence', f'{insight.service_excellence_score:.1f}/100', \n             self._get_score_level(insight.service_excellence_score), 'Quality delivery and satisfaction'],\n            ['Business Efficiency', f'{insight.business_efficiency_score:.1f}/100', \n             self._get_score_level(insight.business_efficiency_score), 'Operations and productivity'],\n            ['Professional Growth', f'{insight.professional_growth_score:.1f}/100', \n             self._get_score_level(insight.professional_growth_score), 'Skill development and expansion']\n        ]\n        \n        alignment_table = Table(alignment_data, colWidths=[1.5*inch, 0.8*inch, 1*inch, 2.2*inch])\n        alignment_table.setStyle(self._get_table_style())\n        elements.append(alignment_table)\n        \n        elements.append(Spacer(1, 15))\n        \n        # Methodology explanation\n        methodology_text = \"\"\"\n        The Six Figure Barber methodology focuses on building a premium barbering business through \n        five core principles. Your scores above indicate current performance in each area, with \n        specific recommendations provided to help you advance toward six-figure annual revenue.\n        \"\"\"\n        \n        elements.append(Paragraph(methodology_text, self.styles['Normal']))\n        elements.append(Spacer(1, 20))\n        \n        return elements\n    \n    def _create_achievements_section(self, insight: WeeklyInsight) -> List:\n        """Create achievements and opportunities section"""\n        \n        elements = []\n        \n        # Achievements\n        if insight.top_achievements:\n            elements.append(Paragraph("🏆 This Week's Achievements", self.styles['SectionHeader']))\n            \n            for achievement in insight.top_achievements:\n                elements.append(Paragraph(f"• {achievement}", self.styles['Achievement']))\n            \n            elements.append(Spacer(1, 15))\n        \n        # Opportunities\n        if insight.key_opportunities:\n            elements.append(Paragraph("📈 Key Opportunities", self.styles['SectionHeader']))\n            \n            for opportunity in insight.key_opportunities:\n                elements.append(Paragraph(f"• {opportunity}", self.styles['Normal']))\n            \n            elements.append(Spacer(1, 15))\n        \n        # Risk factors\n        if insight.risk_factors:\n            elements.append(Paragraph("⚠️ Areas Requiring Attention", self.styles['SectionHeader']))\n            \n            for risk in insight.risk_factors:\n                elements.append(Paragraph(f"• {risk}", self.styles['Normal']))\n            \n            elements.append(Spacer(1, 20))\n        \n        return elements\n    \n    def _create_recommendations_section(self, insight: WeeklyInsight) -> List:\n        """Create actionable recommendations section"""\n        \n        elements = []\n        elements.append(Paragraph("Actionable Recommendations", self.styles['SectionHeader']))\n        \n        # Get recommendations from database\n        recommendations = insight.recommendations\n        \n        if not recommendations:\n            elements.append(Paragraph("No specific recommendations generated for this week.", self.styles['Normal']))\n            return elements\n        \n        # Sort by priority\n        recommendations = sorted(recommendations, key=lambda x: x.priority.value, reverse=True)\n        \n        for i, rec in enumerate(recommendations[:5], 1):  # Limit to top 5\n            elements.append(Paragraph(f"{i}. {rec.title}", self.styles['SubsectionHeader']))\n            elements.append(Paragraph(rec.description, self.styles['Normal']))\n            \n            if rec.expected_impact:\n                elements.append(Paragraph(f"<b>Expected Impact:</b> {rec.expected_impact}", self.styles['Normal']))\n            \n            if rec.action_items:\n                elements.append(Paragraph("<b>Action Steps:</b>", self.styles['Normal']))\n                for action in rec.action_items[:3]:\n                    elements.append(Paragraph(f"• {action}", self.styles['Recommendation']))\n            \n            elements.append(Spacer(1, 10))\n        \n        elements.append(Spacer(1, 20))\n        return elements\n    \n    def _create_trends_section(self, insight: WeeklyInsight, user: User) -> List:\n        """Create trends analysis section"""\n        \n        elements = []\n        elements.append(Paragraph("Performance Trends", self.styles['SectionHeader']))\n        \n        if insight.trend_analysis:\n            # Display trend data\n            trend_text = "Based on recent performance data, here are the key trends identified:\\n\\n"\n            \n            for metric, trend_value in insight.trend_analysis.items():\n                if isinstance(trend_value, (int, float)):\n                    trend_direction = "improving" if trend_value > 0 else "declining" if trend_value < 0 else "stable"\n                    trend_text += f"• {metric.replace('_', ' ').title()}: {trend_direction} ({trend_value:+.1f}%)\\n"\n            \n            elements.append(Paragraph(trend_text, self.styles['Normal']))\n        else:\n            elements.append(Paragraph("Trend analysis will be available after collecting more data over multiple weeks.", self.styles['Normal']))\n        \n        elements.append(Spacer(1, 20))\n        return elements\n    \n    def _create_action_plan_section(self, insight: WeeklyInsight) -> List:\n        """Create action plan section"""\n        \n        elements = []\n        elements.append(Paragraph("Weekly Action Plan", self.styles['SectionHeader']))\n        \n        action_plan_text = \"\"\"\n        Based on your performance analysis and Six Figure Barber methodology alignment, \n        focus on implementing the top 2-3 recommendations this week. Track your progress \n        and measure results to ensure continuous improvement toward your revenue goals.\n        \n        <b>Success Tracking:</b>\n        • Monitor daily appointment booking rates\n        • Track average ticket size improvements\n        • Measure client satisfaction and retention\n        • Document implementation of recommendations\n        \n        <b>Next Week Focus:</b>\n        Review the impact of implemented changes and adjust strategies based on results.\n        \"\"\"\n        \n        elements.append(Paragraph(action_plan_text, self.styles['Normal']))\n        elements.append(Spacer(1, 20))\n        \n        return elements\n    \n    # Helper methods for charts and visualizations\n    \n    def _create_score_gauge(self, score: float) -> Optional[Image]:\n        """Create a gauge chart for the overall score"""\n        try:\n            fig, ax = plt.subplots(figsize=(6, 3))\n            \n            # Create semicircle gauge\n            theta = np.linspace(0, np.pi, 100)\n            \n            # Background arc\n            ax.plot(np.cos(theta), np.sin(theta), 'lightgray', linewidth=20)\n            \n            # Score arc\n            score_theta = np.linspace(0, np.pi * (score / 100), int(score))\n            color = self._get_score_color_rgb(score)\n            ax.plot(np.cos(score_theta), np.sin(score_theta), color=color, linewidth=20)\n            \n            # Score text\n            ax.text(0, -0.1, f'{score:.1f}', ha='center', va='center', \n                   fontsize=24, fontweight='bold', color=color)\n            ax.text(0, -0.3, 'Overall Score', ha='center', va='center', \n                   fontsize=12, color='gray')\n            \n            ax.set_xlim(-1.2, 1.2)\n            ax.set_ylim(-0.5, 1.2)\n            ax.axis('off')\n            \n            # Save to buffer\n            buffer = io.BytesIO()\n            plt.savefig(buffer, format='png', bbox_inches='tight', dpi=150)\n            buffer.seek(0)\n            plt.close()\n            \n            return Image(buffer, width=4*inch, height=2*inch)\n            \n        except Exception as e:\n            logger.error(f"Error creating score gauge: {e}")\n            return None\n    \n    def _create_six_fb_scores_chart(self, insight: WeeklyInsight) -> Optional[Image]:\n        """Create radar chart for Six Figure Barber scores"""\n        try:\n            categories = ['Revenue\\nOptimization', 'Client\\nValue', 'Service\\nExcellence', \n                         'Business\\nEfficiency', 'Professional\\nGrowth']\n            scores = [\n                insight.revenue_optimization_score,\n                insight.client_value_score,\n                insight.service_excellence_score,\n                insight.business_efficiency_score,\n                insight.professional_growth_score\n            ]\n            \n            # Create radar chart\n            angles = np.linspace(0, 2 * np.pi, len(categories), endpoint=False).tolist()\n            scores += scores[:1]  # Complete the circle\n            angles += angles[:1]\n            \n            fig, ax = plt.subplots(figsize=(6, 6), subplot_kw=dict(projection='polar'))\n            \n            ax.plot(angles, scores, 'o-', linewidth=2, color='#1E40AF')\n            ax.fill(angles, scores, alpha=0.25, color='#1E40AF')\n            ax.set_ylim(0, 100)\n            ax.set_xticks(angles[:-1])\n            ax.set_xticklabels(categories)\n            ax.set_yticks([20, 40, 60, 80, 100])\n            ax.grid(True)\n            \n            plt.title('Six Figure Barber Methodology Scores', size=14, fontweight='bold', pad=20)\n            \n            # Save to buffer\n            buffer = io.BytesIO()\n            plt.savefig(buffer, format='png', bbox_inches='tight', dpi=150)\n            buffer.seek(0)\n            plt.close()\n            \n            return Image(buffer, width=4*inch, height=4*inch)\n            \n        except Exception as e:\n            logger.error(f"Error creating Six FB scores chart: {e}")\n            return None\n    \n    def _create_revenue_trend_chart(self, insight: WeeklyInsight, user: User) -> Optional[Image]:\n        """Create revenue trend chart"""\n        # This would require historical data from WeeklyInsightsService\n        # For now, return None and implement when historical data is available\n        return None\n    \n    def _create_client_composition_chart(self, insight: WeeklyInsight) -> Optional[Image]:\n        """Create client composition pie chart"""\n        try:\n            if insight.new_clients_count == 0 and insight.returning_clients_count == 0:\n                return None\n            \n            labels = ['New Clients', 'Returning Clients']\n            sizes = [insight.new_clients_count, insight.returning_clients_count]\n            colors = ['#F59E0B', '#1E40AF']\n            \n            fig, ax = plt.subplots(figsize=(5, 5))\n            \n            wedges, texts, autotexts = ax.pie(sizes, labels=labels, colors=colors, \n                                             autopct='%1.1f%%', startangle=90)\n            \n            # Beautify the chart\n            for autotext in autotexts:\n                autotext.set_color('white')\n                autotext.set_fontweight('bold')\n            \n            ax.set_title('Client Composition This Week', fontsize=14, fontweight='bold', pad=20)\n            \n            # Save to buffer\n            buffer = io.BytesIO()\n            plt.savefig(buffer, format='png', bbox_inches='tight', dpi=150)\n            buffer.seek(0)\n            plt.close()\n            \n            return Image(buffer, width=3*inch, height=3*inch)\n            \n        except Exception as e:\n            logger.error(f"Error creating client composition chart: {e}")\n            return None\n    \n    # Utility methods\n    \n    def _get_table_style(self) -> TableStyle:\n        """Get standard table style"""\n        return TableStyle([\n            ('BACKGROUND', (0, 0), (-1, 0), colors.Color(*[c/255 for c in self.config.primary_color])),\n            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),\n            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),\n            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),\n            ('FONTSIZE', (0, 0), (-1, 0), 10),\n            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),\n            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),\n            ('GRID', (0, 0), (-1, -1), 1, colors.black),\n            ('FONTSIZE', (0, 1), (-1, -1), 9),\n            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),\n        ])\n    \n    def _get_score_color(self, score: float) -> str:\n        """Get color for score display"""\n        if score >= 90:\n            return 'green'\n        elif score >= 75:\n            return 'blue'\n        elif score >= 60:\n            return 'orange'\n        else:\n            return 'red'\n    \n    def _get_score_color_rgb(self, score: float) -> str:\n        """Get RGB color for score display"""\n        if score >= 90:\n            return '#10B981'  # Green\n        elif score >= 75:\n            return '#1E40AF'  # Blue\n        elif score >= 60:\n            return '#F59E0B'  # Orange\n        else:\n            return '#EF4444'  # Red\n    \n    def _get_score_level(self, score: float) -> str:\n        """Get performance level for score"""\n        if score >= 90:\n            return 'Excellent'\n        elif score >= 75:\n            return 'Good'\n        elif score >= 60:\n            return 'Fair'\n        else:\n            return 'Needs Improvement'\n    \n    def _generate_summary_text(self, insight: WeeklyInsight) -> str:\n        """Generate executive summary text from metrics"""\n        \n        performance = "strong" if insight.overall_score >= 75 else "moderate" if insight.overall_score >= 60 else "challenging"\n        revenue_trend = "increased" if insight.revenue_growth_percent > 0 else "decreased"\n        \n        summary = f\"\"\"\n        This week showed {performance} performance with an overall Six Figure Barber score of \n        {insight.overall_score:.1f}/100. Revenue {revenue_trend} by {abs(insight.revenue_growth_percent):.1f}% \n        to ${insight.revenue_current_week:,.0f}, with {insight.appointments_current_week} appointments completed \n        and {insight.new_clients_count} new clients acquired.\n        \n        Your booking efficiency was {insight.booking_efficiency_percent:.1f}% with an average ticket size of \n        ${insight.average_ticket_size:.0f}. The analysis identifies specific opportunities for improvement \n        and provides actionable recommendations aligned with Six Figure Barber methodology.\n        \"\"\"\n        \n        return summary.strip()\n    \n    def _add_header_footer(self, canvas, doc):\n        """Add header and footer to each page"""\n        canvas.saveState()\n        \n        # Header\n        canvas.setFont('Helvetica-Bold', 8)\n        canvas.setFillColor(colors.Color(*[c/255 for c in self.config.primary_color]))\n        canvas.drawString(72, A4[1] - 50, "Six Figure Barber Weekly Report")\n        \n        # Footer\n        canvas.setFont('Helvetica', 8)\n        canvas.setFillColor(colors.gray)\n        canvas.drawString(72, 30, f"Generated by BookedBarber.com | {datetime.now().strftime('%B %d, %Y')}")\n        \n        # Page number\n        canvas.drawRightString(A4[0] - 72, 30, f"Page {doc.page}")\n        \n        canvas.restoreState()
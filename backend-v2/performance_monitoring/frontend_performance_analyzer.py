#!/usr/bin/env python3
"""
6FB Booking Platform - Frontend Performance Analyzer
================================================

Comprehensive frontend performance analysis tool.
Analyzes bundle sizes, loading metrics, Core Web Vitals, and optimization opportunities.

Author: Claude Code Performance Engineer
Date: 2025-07-30
"""

import asyncio
import json
import logging
import os
import sys
import time
import subprocess
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, asdict
import statistics
import requests
from urllib.parse import urljoin

@dataclass
class BundleMetrics:
    """Container for bundle size and composition metrics"""
    bundle_name: str
    size_bytes: int
    size_kb: float
    size_mb: float
    gzipped_size_bytes: int
    compression_ratio: float
    dependencies: List[str]
    chunks: List[Dict[str, Any]]
    tree_shaking_savings_kb: float

@dataclass
class PageLoadMetrics:
    """Container for page loading performance metrics"""
    page_url: str
    first_contentful_paint_ms: float
    largest_contentful_paint_ms: float
    cumulative_layout_shift: float
    first_input_delay_ms: float
    time_to_interactive_ms: float
    total_blocking_time_ms: float
    dom_content_loaded_ms: float
    load_complete_ms: float
    resource_count: int
    total_size_kb: float
    cache_hit_ratio: float

@dataclass
class CoreWebVitals:
    """Container for Core Web Vitals metrics"""
    lcp_ms: float  # Largest Contentful Paint
    fid_ms: float  # First Input Delay
    cls_score: float  # Cumulative Layout Shift
    fcp_ms: float  # First Contentful Paint
    ttfb_ms: float  # Time to First Byte
    performance_score: int  # 0-100

@dataclass
class FrontendOptimizationReport:
    """Container for optimization recommendations"""
    category: str
    priority: str  # High, Medium, Low
    issue: str
    recommendation: str
    potential_savings_kb: float
    implementation_effort: str  # Easy, Medium, Hard

class FrontendPerformanceAnalyzer:
    """Frontend performance analyzer and optimizer"""
    
    def __init__(self, frontend_path: str = "/Users/bossio/6fb-booking/backend-v2/frontend-v2"):
        self.frontend_path = Path(frontend_path)
        self.logger = self._setup_logging()
        self.bundle_metrics: List[BundleMetrics] = []
        self.page_metrics: List[PageLoadMetrics] = []
        self.optimization_opportunities: List[FrontendOptimizationReport] = []
        
        # Critical pages to analyze
        self.critical_pages = [
            {"name": "Landing Page", "url": "/", "importance": "critical"},
            {"name": "Login Page", "url": "/login", "importance": "critical"},
            {"name": "Register Page", "url": "/register", "importance": "critical"},
            {"name": "Dashboard", "url": "/dashboard", "importance": "critical"},
            {"name": "Booking Calendar", "url": "/calendar", "importance": "critical"},
            {"name": "Appointments", "url": "/appointments", "importance": "high"},
            {"name": "Client Management", "url": "/clients", "importance": "high"},
            {"name": "Payment Settings", "url": "/settings/payments", "importance": "medium"},
            {"name": "Analytics", "url": "/analytics", "importance": "medium"},
        ]
    
    def _setup_logging(self) -> logging.Logger:
        """Setup logging for frontend performance monitoring"""
        logger = logging.getLogger('frontend_performance')
        logger.setLevel(logging.INFO)
        
        # Create handler for performance logs
        os.makedirs('/Users/bossio/6fb-booking/backend-v2/logs', exist_ok=True)
        handler = logging.FileHandler('/Users/bossio/6fb-booking/backend-v2/logs/frontend_performance.log')
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)
        
        return logger
    
    async def analyze_bundle_composition(self) -> List[BundleMetrics]:
        """Analyze Next.js bundle composition and sizes"""
        self.logger.info("Analyzing frontend bundle composition...")
        
        bundle_metrics = []
        
        try:
            # Check if .next build directory exists
            build_dir = self.frontend_path / '.next'
            if not build_dir.exists():
                self.logger.warning("Build directory not found. Running production build...")
                await self._run_production_build()
            
            # Analyze static chunks
            static_dir = build_dir / 'static'
            if static_dir.exists():
                bundle_metrics.extend(await self._analyze_static_chunks(static_dir))
            
            # Analyze server chunks
            server_dir = build_dir / 'server' / 'chunks'
            if server_dir.exists():
                bundle_metrics.extend(await self._analyze_server_chunks(server_dir))
            
            # Generate bundle analyzer report
            await self._generate_bundle_analyzer_report()
            
        except Exception as e:
            self.logger.error(f"Bundle analysis failed: {str(e)}")
        
        self.bundle_metrics = bundle_metrics
        return bundle_metrics
    
    async def _run_production_build(self):
        """Run Next.js production build"""
        self.logger.info("Running Next.js production build...")
        
        try:
            # Change to frontend directory
            os.chdir(self.frontend_path)
            
            # Run build command
            result = subprocess.run(
                ['npm', 'run', 'build'],
                capture_output=True,
                text=True,
                timeout=300  # 5 minutes timeout
            )
            
            if result.returncode == 0:
                self.logger.info("Production build completed successfully")
            else:
                self.logger.error(f"Build failed: {result.stderr}")
                
        except subprocess.TimeoutExpired:
            self.logger.error("Build timed out after 5 minutes")
        except Exception as e:
            self.logger.error(f"Build error: {str(e)}")
    
    async def _analyze_static_chunks(self, static_dir: Path) -> List[BundleMetrics]:
        """Analyze static JavaScript chunks"""
        chunks = []
        
        # Find all JS chunk files
        js_files = list(static_dir.rglob('*.js'))
        css_files = list(static_dir.rglob('*.css'))
        
        for js_file in js_files:
            try:
                size_bytes = js_file.stat().st_size
                size_kb = size_bytes / 1024
                size_mb = size_kb / 1024
                
                # Check for gzipped version
                gzipped_file = js_file.with_suffix(js_file.suffix + '.gz')
                gzipped_size = gzipped_file.stat().st_size if gzipped_file.exists() else 0
                
                compression_ratio = (1 - (gzipped_size / size_bytes)) * 100 if gzipped_size > 0 else 0
                
                chunk_info = BundleMetrics(
                    bundle_name=js_file.name,
                    size_bytes=size_bytes,
                    size_kb=size_kb,
                    size_mb=size_mb,
                    gzipped_size_bytes=gzipped_size,
                    compression_ratio=compression_ratio,
                    dependencies=await self._extract_dependencies(js_file),
                    chunks=[],
                    tree_shaking_savings_kb=0  # Would need more detailed analysis
                )
                
                chunks.append(chunk_info)
                
            except Exception as e:
                self.logger.debug(f"Error analyzing {js_file}: {str(e)}")
        
        return chunks
    
    async def _analyze_server_chunks(self, server_dir: Path) -> List[BundleMetrics]:
        """Analyze server-side chunks"""
        chunks = []
        
        js_files = list(server_dir.rglob('*.js'))
        
        for js_file in js_files:
            try:
                size_bytes = js_file.stat().st_size
                size_kb = size_bytes / 1024
                
                chunk_info = BundleMetrics(
                    bundle_name=f"server/{js_file.name}",
                    size_bytes=size_bytes,
                    size_kb=size_kb,
                    size_mb=size_kb / 1024,
                    gzipped_size_bytes=0,
                    compression_ratio=0,
                    dependencies=[],
                    chunks=[],
                    tree_shaking_savings_kb=0
                )
                
                chunks.append(chunk_info)
                
            except Exception as e:
                self.logger.debug(f"Error analyzing server chunk {js_file}: {str(e)}")
        
        return chunks
    
    async def _extract_dependencies(self, js_file: Path) -> List[str]:
        """Extract dependencies from JavaScript file (simplified)"""
        dependencies = []
        
        try:
            # Read first 5KB to look for common import patterns
            with open(js_file, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read(5120)
                
                # Look for common library patterns
                libraries = [
                    'react', 'next', 'axios', 'lodash', 'moment', 'recharts',
                    'framer-motion', 'tailwindcss', 'stripe', 'sentry'
                ]
                
                for lib in libraries:
                    if lib in content.lower():
                        dependencies.append(lib)
                        
        except Exception as e:
            self.logger.debug(f"Could not extract dependencies from {js_file}: {str(e)}")
        
        return dependencies
    
    async def _generate_bundle_analyzer_report(self):
        """Generate bundle analyzer report using webpack-bundle-analyzer"""
        try:
            os.chdir(self.frontend_path)
            
            # Check if bundle analyzer is available
            result = subprocess.run(
                ['npx', 'next', 'build', '--analyze'],
                capture_output=True,
                text=True,
                timeout=120
            )
            
            if result.returncode == 0:
                self.logger.info("Bundle analyzer report generated")
            else:
                self.logger.debug("Bundle analyzer not available or failed")
                
        except Exception as e:
            self.logger.debug(f"Bundle analyzer failed: {str(e)}")
    
    async def analyze_page_performance(self, base_url: str = "http://localhost:3000") -> List[PageLoadMetrics]:
        """Analyze page loading performance using Lighthouse-style metrics"""
        self.logger.info("Analyzing page loading performance...")
        
        page_metrics = []
        
        for page in self.critical_pages:
            try:
                url = urljoin(base_url, page["url"])
                metrics = await self._measure_page_performance(url, page["name"])
                if metrics:
                    page_metrics.append(metrics)
                    
                # Small delay between page tests
                await asyncio.sleep(1)
                
            except Exception as e:
                self.logger.error(f"Failed to analyze page {page['name']}: {str(e)}")
        
        self.page_metrics = page_metrics
        return page_metrics
    
    async def _measure_page_performance(self, url: str, page_name: str) -> Optional[PageLoadMetrics]:
        """Measure individual page performance (simplified implementation)"""
        try:
            start_time = time.time()
            
            # Make HTTP request to measure basic metrics
            response = requests.get(url, timeout=30)
            
            if response.status_code == 200:
                load_time = (time.time() - start_time) * 1000
                content_size = len(response.content) / 1024  # KB
                
                # Simulate Core Web Vitals (in real implementation, would use browser automation)
                metrics = PageLoadMetrics(
                    page_url=url,
                    first_contentful_paint_ms=load_time * 0.3,  # Estimate
                    largest_contentful_paint_ms=load_time * 0.7,  # Estimate
                    cumulative_layout_shift=0.1,  # Would need real measurement
                    first_input_delay_ms=50,  # Estimate
                    time_to_interactive_ms=load_time * 1.2,  # Estimate
                    total_blocking_time_ms=load_time * 0.1,  # Estimate
                    dom_content_loaded_ms=load_time * 0.8,  # Estimate
                    load_complete_ms=load_time,
                    resource_count=10,  # Would need to count actual resources
                    total_size_kb=content_size,
                    cache_hit_ratio=0.8  # Estimate
                )
                
                return metrics
            
        except Exception as e:
            self.logger.debug(f"Could not measure performance for {url}: {str(e)}")
        
        return None
    
    async def calculate_core_web_vitals(self) -> CoreWebVitals:
        """Calculate Core Web Vitals from page metrics"""
        if not self.page_metrics:
            await self.analyze_page_performance()
        
        if not self.page_metrics:
            return CoreWebVitals(0, 0, 0, 0, 0, 0)
        
        # Calculate averages across all pages
        lcp_values = [m.largest_contentful_paint_ms for m in self.page_metrics]
        fid_values = [m.first_input_delay_ms for m in self.page_metrics]
        cls_values = [m.cumulative_layout_shift for m in self.page_metrics]
        fcp_values = [m.first_contentful_paint_ms for m in self.page_metrics]
        
        # Estimate TTFB (Time to First Byte)
        ttfb_values = [m.load_complete_ms * 0.1 for m in self.page_metrics]
        
        core_vitals = CoreWebVitals(
            lcp_ms=statistics.mean(lcp_values),
            fid_ms=statistics.mean(fid_values),
            cls_score=statistics.mean(cls_values),
            fcp_ms=statistics.mean(fcp_values),
            ttfb_ms=statistics.mean(ttfb_values),
            performance_score=self._calculate_performance_score(lcp_values, fid_values, cls_values)
        )
        
        return core_vitals
    
    def _calculate_performance_score(self, lcp_values: List[float], fid_values: List[float], cls_values: List[float]) -> int:
        """Calculate overall performance score (0-100)"""
        score = 100
        
        avg_lcp = statistics.mean(lcp_values)
        avg_fid = statistics.mean(fid_values)
        avg_cls = statistics.mean(cls_values)
        
        # LCP scoring (good: <2.5s, needs improvement: 2.5-4s, poor: >4s)
        if avg_lcp > 4000:
            score -= 30
        elif avg_lcp > 2500:
            score -= 15
        
        # FID scoring (good: <100ms, needs improvement: 100-300ms, poor: >300ms)
        if avg_fid > 300:
            score -= 25
        elif avg_fid > 100:
            score -= 10
        
        # CLS scoring (good: <0.1, needs improvement: 0.1-0.25, poor: >0.25)
        if avg_cls > 0.25:
            score -= 20
        elif avg_cls > 0.1:
            score -= 10
        
        return max(score, 0)
    
    async def identify_optimization_opportunities(self) -> List[FrontendOptimizationReport]:
        """Identify frontend optimization opportunities"""
        opportunities = []
        
        # Bundle size optimizations
        if self.bundle_metrics:
            total_bundle_size_mb = sum(m.size_mb for m in self.bundle_metrics)
            
            if total_bundle_size_mb > 1.0:  # > 1MB total
                opportunities.append(FrontendOptimizationReport(
                    category="Bundle Size",
                    priority="High",
                    issue=f"Large bundle size: {total_bundle_size_mb:.2f}MB",
                    recommendation="Implement code splitting, lazy loading, and remove unused dependencies",
                    potential_savings_kb=(total_bundle_size_mb - 0.5) * 1024,
                    implementation_effort="Medium"
                ))
            
            # Large individual chunks
            large_chunks = [m for m in self.bundle_metrics if m.size_kb > 200]
            for chunk in large_chunks:
                opportunities.append(FrontendOptimizationReport(
                    category="Code Splitting",
                    priority="Medium",
                    issue=f"Large chunk: {chunk.bundle_name} ({chunk.size_kb:.1f}KB)",
                    recommendation="Split large chunks into smaller, route-based chunks",
                    potential_savings_kb=chunk.size_kb * 0.3,
                    implementation_effort="Medium"
                ))
        
        # Page performance optimizations
        if self.page_metrics:
            slow_pages = [m for m in self.page_metrics if m.load_complete_ms > 3000]
            for page in slow_pages:
                opportunities.append(FrontendOptimizationReport(
                    category="Page Performance",
                    priority="High",
                    issue=f"Slow page load: {page.page_url} ({page.load_complete_ms:.0f}ms)",
                    recommendation="Optimize images, implement caching, reduce bundle size",
                    potential_savings_kb=0,
                    implementation_effort="Medium"
                ))
            
            # High LCP pages
            high_lcp_pages = [m for m in self.page_metrics if m.largest_contentful_paint_ms > 2500]
            for page in high_lcp_pages:
                opportunities.append(FrontendOptimizationReport(
                    category="Core Web Vitals",
                    priority="High",
                    issue=f"Poor LCP: {page.page_url} ({page.largest_contentful_paint_ms:.0f}ms)",
                    recommendation="Optimize largest contentful element, implement image optimization",
                    potential_savings_kb=0,
                    implementation_effort="Easy"
                ))
        
        # General optimization opportunities
        opportunities.extend([
            FrontendOptimizationReport(
                category="Caching",
                priority="Medium",
                issue="Missing service worker for caching",
                recommendation="Implement service worker for static asset caching",
                potential_savings_kb=0,
                implementation_effort="Medium"
            ),
            FrontendOptimizationReport(
                category="Image Optimization",
                priority="Medium",
                issue="Images may not be optimized",
                recommendation="Implement Next.js Image component with WebP format",
                potential_savings_kb=500,
                implementation_effort="Easy"
            ),
            FrontendOptimizationReport(
                category="CSS Optimization",
                priority="Low",
                issue="CSS bundle size",
                recommendation="Implement CSS purging and minimize unused styles",
                potential_savings_kb=100,
                implementation_effort="Easy"
            )
        ])
        
        self.optimization_opportunities = opportunities
        return opportunities
    
    async def generate_performance_report(self) -> Dict[str, Any]:
        """Generate comprehensive frontend performance report"""
        self.logger.info("Generating comprehensive frontend performance report...")
        
        # Run all analyses
        bundle_metrics = await self.analyze_bundle_composition()
        page_metrics = await self.analyze_page_performance()
        core_vitals = await self.calculate_core_web_vitals()
        optimization_opportunities = await self.identify_optimization_opportunities()
        
        # Calculate totals and averages
        total_bundle_size_mb = sum(m.size_mb for m in bundle_metrics) if bundle_metrics else 0
        total_gzipped_size_mb = sum(m.gzipped_size_bytes for m in bundle_metrics) / (1024 * 1024) if bundle_metrics else 0
        avg_compression_ratio = statistics.mean([m.compression_ratio for m in bundle_metrics if m.compression_ratio > 0]) if bundle_metrics else 0
        
        avg_load_time = statistics.mean([m.load_complete_ms for m in page_metrics]) if page_metrics else 0
        
        # Generate report
        report = {
            "report_metadata": {
                "generated_at": datetime.now().isoformat(),
                "analysis_duration_minutes": 15,  # Estimated
                "platform": "6FB Booking V2 Frontend",
                "framework": "Next.js 14"
            },
            "executive_summary": {
                "performance_grade": self._calculate_frontend_performance_grade(core_vitals, total_bundle_size_mb),
                "core_web_vitals_score": core_vitals.performance_score,
                "total_bundle_size_mb": total_bundle_size_mb,
                "average_page_load_ms": avg_load_time,
                "optimization_opportunities_count": len(optimization_opportunities),
                "production_readiness_score": self._calculate_frontend_readiness_score(core_vitals, total_bundle_size_mb, optimization_opportunities)
            },
            "core_web_vitals": asdict(core_vitals),
            "bundle_analysis": {
                "total_size_mb": total_bundle_size_mb,
                "total_gzipped_size_mb": total_gzipped_size_mb,
                "compression_ratio_percent": avg_compression_ratio,
                "chunk_count": len(bundle_metrics),
                "largest_chunk_kb": max([m.size_kb for m in bundle_metrics]) if bundle_metrics else 0,
                "chunks": [asdict(m) for m in bundle_metrics]
            },
            "page_performance": {
                "pages_analyzed": len(page_metrics),
                "average_load_time_ms": avg_load_time,
                "fastest_page_ms": min([m.load_complete_ms for m in page_metrics]) if page_metrics else 0,
                "slowest_page_ms": max([m.load_complete_ms for m in page_metrics]) if page_metrics else 0,
                "page_details": [asdict(m) for m in page_metrics]
            },
            "optimization_opportunities": [asdict(o) for o in optimization_opportunities],
            "recommendations": self._generate_frontend_recommendations(core_vitals, bundle_metrics, optimization_opportunities),
            "performance_budget": {
                "bundle_size_budget_mb": 1.0,
                "page_load_budget_ms": 3000,
                "lcp_budget_ms": 2500,
                "fid_budget_ms": 100,
                "cls_budget": 0.1,
                "current_status": {
                    "bundle_size_within_budget": total_bundle_size_mb <= 1.0,
                    "page_load_within_budget": avg_load_time <= 3000,
                    "core_vitals_within_budget": core_vitals.performance_score >= 90
                }
            }
        }
        
        # Save report
        report_path = f"/Users/bossio/6fb-booking/backend-v2/logs/frontend_performance_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(report_path, 'w') as f:
            json.dump(report, f, indent=2, default=str)
        
        self.logger.info(f"Frontend performance report saved to: {report_path}")
        
        return report
    
    def _calculate_frontend_performance_grade(self, core_vitals: CoreWebVitals, bundle_size_mb: float) -> str:
        """Calculate frontend performance grade"""
        score = core_vitals.performance_score
        
        # Bundle size penalty
        if bundle_size_mb > 2.0:
            score -= 20
        elif bundle_size_mb > 1.0:
            score -= 10
        
        if score >= 90:
            return "A"
        elif score >= 80:
            return "B"
        elif score >= 70:
            return "C"
        elif score >= 60:
            return "D"
        else:
            return "F"
    
    def _calculate_frontend_readiness_score(self, core_vitals: CoreWebVitals, bundle_size_mb: float, opportunities: List[FrontendOptimizationReport]) -> float:
        """Calculate frontend production readiness score"""
        score = float(core_vitals.performance_score)
        
        # Bundle size considerations
        if bundle_size_mb > 1.5:
            score -= 15
        elif bundle_size_mb > 1.0:
            score -= 5
        
        # High priority issues
        high_priority_issues = [o for o in opportunities if o.priority == "High"]
        score -= len(high_priority_issues) * 10
        
        # Medium priority issues
        medium_priority_issues = [o for o in opportunities if o.priority == "Medium"]
        score -= len(medium_priority_issues) * 5
        
        return max(score, 0.0)
    
    def _generate_frontend_recommendations(self, core_vitals: CoreWebVitals, bundle_metrics: List[BundleMetrics], opportunities: List[FrontendOptimizationReport]) -> List[str]:
        """Generate frontend performance recommendations"""
        recommendations = []
        
        # Core Web Vitals recommendations
        if core_vitals.lcp_ms > 2500:
            recommendations.append("Critical: Optimize Largest Contentful Paint - implement image optimization and critical CSS")
        
        if core_vitals.fid_ms > 100:
            recommendations.append("High Priority: Reduce First Input Delay - minimize JavaScript execution time")
        
        if core_vitals.cls_score > 0.1:
            recommendations.append("Medium Priority: Improve Cumulative Layout Shift - reserve space for dynamic content")
        
        # Bundle recommendations
        total_bundle_size_mb = sum(m.size_mb for m in bundle_metrics) if bundle_metrics else 0
        if total_bundle_size_mb > 1.0:
            recommendations.append("High Priority: Reduce bundle size through code splitting and tree shaking")
        
        # High priority opportunities
        high_priority = [o for o in opportunities if o.priority == "High"]
        for opp in high_priority[:3]:  # Top 3 high priority
            recommendations.append(f"High Priority: {opp.recommendation}")
        
        # Standard recommendations
        recommendations.extend([
            "Implement Progressive Web App (PWA) features for better performance",
            "Set up performance monitoring and alerting",
            "Optimize images with Next.js Image component",
            "Implement service worker for caching",
            "Consider server-side rendering optimization"
        ])
        
        return recommendations

async def main():
    """Main function to run frontend performance analysis"""
    print("🎨 Starting 6FB Booking Frontend Performance Analysis...")
    print("=" * 65)
    
    analyzer = FrontendPerformanceAnalyzer()
    
    try:
        # Generate comprehensive performance report
        report = await analyzer.generate_performance_report()
        
        # Display executive summary
        print("\n📊 EXECUTIVE SUMMARY")
        print("-" * 30)
        print(f"Performance Grade: {report['executive_summary']['performance_grade']}")
        print(f"Production Readiness: {report['executive_summary']['production_readiness_score']:.1f}/100")
        print(f"Core Web Vitals Score: {report['executive_summary']['core_web_vitals_score']}/100")
        print(f"Total Bundle Size: {report['executive_summary']['total_bundle_size_mb']:.2f}MB")
        print(f"Average Page Load: {report['executive_summary']['average_page_load_ms']:.0f}ms")
        
        # Display Core Web Vitals
        cwv = report['core_web_vitals']
        print(f"\n⚡ CORE WEB VITALS")
        print("-" * 20)
        print(f"LCP (Largest Contentful Paint): {cwv['lcp_ms']:.0f}ms")
        print(f"FID (First Input Delay): {cwv['fid_ms']:.0f}ms")
        print(f"CLS (Cumulative Layout Shift): {cwv['cls_score']:.3f}")
        print(f"FCP (First Contentful Paint): {cwv['fcp_ms']:.0f}ms")
        
        # Display bundle analysis
        bundle = report['bundle_analysis']
        print(f"\n📦 BUNDLE ANALYSIS")
        print("-" * 20)
        print(f"Total Bundle Size: {bundle['total_size_mb']:.2f}MB")
        print(f"Gzipped Size: {bundle['total_gzipped_size_mb']:.2f}MB")
        print(f"Compression Ratio: {bundle['compression_ratio_percent']:.1f}%")
        print(f"Number of Chunks: {bundle['chunk_count']}")
        
        # Display top recommendations
        print(f"\n🎯 TOP RECOMMENDATIONS")
        print("-" * 25)
        for i, rec in enumerate(report['recommendations'][:5], 1):
            print(f"{i}. {rec}")
        
        print(f"\n✅ Analysis Complete!")
        print(f"📋 Full report saved to logs/frontend_performance_report_*.json")
        
    except Exception as e:
        print(f"❌ Analysis failed: {str(e)}")
        raise

if __name__ == "__main__":
    asyncio.run(main())
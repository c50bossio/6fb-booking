#!/usr/bin/env node
/**
 * Frontend Performance Analyzer for 6FB Booking Platform
 * Analyzes bundle sizes, loading times, and optimization opportunities
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class FrontendPerformanceAnalyzer {
    constructor() {
        this.buildDir = '.next';
        this.staticDir = path.join(this.buildDir, 'static');
        this.results = {
            timestamp: new Date().toISOString(),
            bundle_analysis: {},
            performance_metrics: {},
            optimization_opportunities: [],
            recommendations: []
        };
    }

    analyzeBundleSizes() {
        console.log('📦 Analyzing Bundle Sizes...');

        try {
            const staticPath = this.staticDir;

            if (!fs.existsSync(staticPath)) {
                console.log('❌ Build directory not found. Running build...');
                execSync('npm run build', { stdio: 'inherit' });
            }

            // Analyze chunks directory
            const chunksPath = path.join(staticPath, 'chunks');
            const cssPath = path.join(staticPath, 'css');

            const bundleAnalysis = {
                chunks: this.analyzeDirectory(chunksPath, 'JavaScript Chunks'),
                css: this.analyzeDirectory(cssPath, 'CSS Bundles'),
                media: this.analyzeDirectory(path.join(staticPath, 'media'), 'Media Files'),
                total_build_size: this.getDirectorySize(this.buildDir)
            };

            this.results.bundle_analysis = bundleAnalysis;

            // Find largest files
            const allFiles = [
                ...bundleAnalysis.chunks.files,
                ...bundleAnalysis.css.files
            ].sort((a, b) => b.size_kb - a.size_kb);

            console.log('\n🎯 Bundle Size Analysis:');
            console.log(`   Total Build Size: ${(bundleAnalysis.total_build_size / 1024 / 1024).toFixed(2)} MB`);
            console.log(`   JavaScript Chunks: ${bundleAnalysis.chunks.total_size_kb.toFixed(0)} KB (${bundleAnalysis.chunks.file_count} files)`);
            console.log(`   CSS Bundles: ${bundleAnalysis.css.total_size_kb.toFixed(0)} KB (${bundleAnalysis.css.file_count} files)`);
            console.log(`   Media Files: ${bundleAnalysis.media.total_size_kb.toFixed(0)} KB (${bundleAnalysis.media.file_count} files)`);

            console.log('\n🔍 Largest Files:');
            allFiles.slice(0, 5).forEach((file, index) => {
                console.log(`   ${index + 1}. ${file.name}: ${file.size_kb.toFixed(0)} KB`);
            });

            return bundleAnalysis;

        } catch (error) {
            console.error('❌ Bundle analysis failed:', error.message);
            return null;
        }
    }

    analyzeDirectory(dirPath, description) {
        if (!fs.existsSync(dirPath)) {
            return {
                description,
                file_count: 0,
                total_size_kb: 0,
                files: [],
                exists: false
            };
        }

        const files = fs.readdirSync(dirPath);
        const fileDetails = [];
        let totalSize = 0;

        files.forEach(file => {
            const filePath = path.join(dirPath, file);
            const stats = fs.statSync(filePath);

            if (stats.isFile()) {
                const sizeKB = stats.size / 1024;
                totalSize += sizeKB;

                fileDetails.push({
                    name: file,
                    size_kb: sizeKB,
                    path: filePath
                });
            }
        });

        return {
            description,
            file_count: fileDetails.length,
            total_size_kb: totalSize,
            files: fileDetails.sort((a, b) => b.size_kb - a.size_kb),
            exists: true
        };
    }

    getDirectorySize(dirPath) {
        if (!fs.existsSync(dirPath)) {
            return 0;
        }

        let totalSize = 0;

        function calculateSize(currentPath) {
            const files = fs.readdirSync(currentPath);

            files.forEach(file => {
                const filePath = path.join(currentPath, file);
                const stats = fs.statSync(filePath);

                if (stats.isDirectory()) {
                    calculateSize(filePath);
                } else {
                    totalSize += stats.size;
                }
            });
        }

        calculateSize(dirPath);
        return totalSize;
    }

    analyzePerformanceMetrics() {
        console.log('\n⚡ Analyzing Performance Metrics...');

        const metrics = {
            build_performance: this.analyzeBuildPerformance(),
            runtime_performance: this.analyzeRuntimePerformance(),
            accessibility_features: this.analyzeAccessibilityFeatures()
        };

        this.results.performance_metrics = metrics;

        console.log('   Build Performance:', metrics.build_performance.status);
        console.log('   Runtime Optimizations:', metrics.runtime_performance.optimizations_count);
        console.log('   Accessibility Features:', metrics.accessibility_features.features_count);

        return metrics;
    }

    analyzeBuildPerformance() {
        // Check for build optimization indicators
        const nextConfigPath = path.join(process.cwd(), 'next.config.js');
        const packageJsonPath = path.join(process.cwd(), 'package.json');

        let buildOptimizations = {
            next_config_exists: fs.existsSync(nextConfigPath),
            build_optimization_enabled: false,
            minification_enabled: true, // Next.js default
            tree_shaking_enabled: true, // Next.js default
            code_splitting_enabled: true, // Next.js default
            status: 'good'
        };

        // Check Next.js config for optimizations
        if (buildOptimizations.next_config_exists) {
            try {
                const configContent = fs.readFileSync(nextConfigPath, 'utf8');
                buildOptimizations.build_optimization_enabled =
                    configContent.includes('optimize') ||
                    configContent.includes('minify') ||
                    configContent.includes('compress');
            } catch (error) {
                console.warn('Could not read next.config.js');
            }
        }

        return buildOptimizations;
    }

    analyzeRuntimePerformance() {
        // Analyze the source code for performance optimizations
        const srcPath = path.join(process.cwd(), 'src');
        let optimizations = {
            lazy_loading_components: 0,
            memoization_usage: 0,
            optimized_images: 0,
            optimizations_count: 0
        };

        if (fs.existsSync(srcPath)) {
            this.scanDirectoryForOptimizations(srcPath, optimizations);
        }

        optimizations.optimizations_count =
            optimizations.lazy_loading_components +
            optimizations.memoization_usage +
            optimizations.optimized_images;

        return optimizations;
    }

    scanDirectoryForOptimizations(dirPath, optimizations) {
        const files = fs.readdirSync(dirPath);

        files.forEach(file => {
            const filePath = path.join(dirPath, file);
            const stats = fs.statSync(filePath);

            if (stats.isDirectory()) {
                this.scanDirectoryForOptimizations(filePath, optimizations);
            } else if (file.endsWith('.tsx') || file.endsWith('.ts') || file.endsWith('.jsx') || file.endsWith('.js')) {
                try {
                    const content = fs.readFileSync(filePath, 'utf8');

                    // Check for lazy loading
                    if (content.includes('React.lazy') || content.includes('dynamic(')) {
                        optimizations.lazy_loading_components++;
                    }

                    // Check for memoization
                    if (content.includes('React.memo') || content.includes('useMemo') || content.includes('useCallback')) {
                        optimizations.memoization_usage++;
                    }

                    // Check for optimized images
                    if (content.includes('next/image') || content.includes('Image from')) {
                        optimizations.optimized_images++;
                    }
                } catch (error) {
                    // Skip files that can't be read
                }
            }
        });
    }

    analyzeAccessibilityFeatures() {
        const srcPath = path.join(process.cwd(), 'src');
        let features = {
            aria_labels_used: 0,
            semantic_html_used: 0,
            keyboard_navigation: 0,
            screen_reader_support: 0,
            features_count: 0
        };

        if (fs.existsSync(srcPath)) {
            this.scanDirectoryForAccessibility(srcPath, features);
        }

        features.features_count =
            features.aria_labels_used +
            features.semantic_html_used +
            features.keyboard_navigation +
            features.screen_reader_support;

        return features;
    }

    scanDirectoryForAccessibility(dirPath, features) {
        const files = fs.readdirSync(dirPath);

        files.forEach(file => {
            const filePath = path.join(dirPath, file);
            const stats = fs.statSync(filePath);

            if (stats.isDirectory()) {
                this.scanDirectoryForAccessibility(filePath, features);
            } else if (file.endsWith('.tsx') || file.endsWith('.jsx')) {
                try {
                    const content = fs.readFileSync(filePath, 'utf8');

                    // Check for accessibility features
                    if (content.includes('aria-') || content.includes('role=')) {
                        features.aria_labels_used++;
                    }

                    if (content.includes('<nav') || content.includes('<main') || content.includes('<section') || content.includes('<header')) {
                        features.semantic_html_used++;
                    }

                    if (content.includes('onKeyDown') || content.includes('tabIndex') || content.includes('onKeyPress')) {
                        features.keyboard_navigation++;
                    }

                    if (content.includes('screen-reader') || content.includes('sr-only') || content.includes('visually-hidden')) {
                        features.screen_reader_support++;
                    }
                } catch (error) {
                    // Skip files that can't be read
                }
            }
        });
    }

    identifyOptimizationOpportunities() {
        console.log('\n🎯 Identifying Optimization Opportunities...');

        const opportunities = [];
        const bundle = this.results.bundle_analysis;
        const performance = this.results.performance_metrics;

        // Bundle size opportunities
        if (bundle && bundle.chunks) {
            if (bundle.chunks.total_size_kb > 1000) {
                opportunities.push({
                    type: 'bundle_size',
                    priority: 'high',
                    description: 'JavaScript bundle size is large (>1MB)',
                    recommendation: 'Consider code splitting and lazy loading',
                    current_size_kb: bundle.chunks.total_size_kb
                });
            }

            if (bundle.css.total_size_kb > 200) {
                opportunities.push({
                    type: 'css_size',
                    priority: 'medium',
                    description: 'CSS bundle size is large (>200KB)',
                    recommendation: 'Consider CSS tree-shaking and unused CSS removal',
                    current_size_kb: bundle.css.total_size_kb
                });
            }

            // Check for large individual files
            const largeFiles = [
                ...bundle.chunks.files,
                ...bundle.css.files
            ].filter(file => file.size_kb > 100);

            if (largeFiles.length > 0) {
                opportunities.push({
                    type: 'large_files',
                    priority: 'medium',
                    description: `${largeFiles.length} files are larger than 100KB`,
                    recommendation: 'Review and optimize large files',
                    large_files: largeFiles.slice(0, 3).map(f => ({ name: f.name, size_kb: f.size_kb }))
                });
            }
        }

        // Performance opportunities
        if (performance) {
            if (performance.runtime_performance.lazy_loading_components < 5) {
                opportunities.push({
                    type: 'lazy_loading',
                    priority: 'medium',
                    description: 'Limited use of lazy loading components',
                    recommendation: 'Implement lazy loading for non-critical components',
                    current_count: performance.runtime_performance.lazy_loading_components
                });
            }

            if (performance.runtime_performance.memoization_usage < 10) {
                opportunities.push({
                    type: 'memoization',
                    priority: 'low',
                    description: 'Limited use of React memoization',
                    recommendation: 'Consider using React.memo, useMemo, and useCallback for expensive operations',
                    current_count: performance.runtime_performance.memoization_usage
                });
            }

            if (performance.accessibility_features.features_count < 20) {
                opportunities.push({
                    type: 'accessibility',
                    priority: 'high',
                    description: 'Limited accessibility features detected',
                    recommendation: 'Enhance accessibility with ARIA labels, semantic HTML, and keyboard navigation',
                    current_count: performance.accessibility_features.features_count
                });
            }
        }

        this.results.optimization_opportunities = opportunities;

        console.log(`   Found ${opportunities.length} optimization opportunities`);
        opportunities.forEach((opp, index) => {
            console.log(`   ${index + 1}. [${opp.priority.toUpperCase()}] ${opp.description}`);
        });

        return opportunities;
    }

    generateRecommendations() {
        console.log('\n💡 Generating Recommendations...');

        const recommendations = [];
        const opportunities = this.results.optimization_opportunities;

        // High priority recommendations
        const highPriorityOpps = opportunities.filter(opp => opp.priority === 'high');
        if (highPriorityOpps.length > 0) {
            recommendations.push({
                category: 'Critical',
                items: highPriorityOpps.map(opp => opp.recommendation)
            });
        }

        // Medium priority recommendations
        const mediumPriorityOpps = opportunities.filter(opp => opp.priority === 'medium');
        if (mediumPriorityOpps.length > 0) {
            recommendations.push({
                category: 'Important',
                items: mediumPriorityOpps.map(opp => opp.recommendation)
            });
        }

        // General performance recommendations
        const generalRecommendations = [
            'Implement service worker for caching static assets',
            'Use Next.js Image component for all images',
            'Enable compression (gzip/brotli) on the server',
            'Implement proper meta tags for SEO',
            'Use React.Suspense for better loading states',
            'Implement error boundaries for better error handling'
        ];

        recommendations.push({
            category: 'General Performance',
            items: generalRecommendations
        });

        // Low priority recommendations
        const lowPriorityOpps = opportunities.filter(opp => opp.priority === 'low');
        if (lowPriorityOpps.length > 0) {
            recommendations.push({
                category: 'Nice to Have',
                items: lowPriorityOpps.map(opp => opp.recommendation)
            });
        }

        this.results.recommendations = recommendations;

        recommendations.forEach(category => {
            console.log(`\n   ${category.category}:`);
            category.items.forEach(item => {
                console.log(`     • ${item}`);
            });
        });

        return recommendations;
    }

    generateReport() {
        console.log('\n📊 Generating Performance Report...');

        // Calculate overall performance score
        let score = 100;
        const bundle = this.results.bundle_analysis;
        const opportunities = this.results.optimization_opportunities;

        // Deduct points for large bundles
        if (bundle && bundle.chunks) {
            if (bundle.chunks.total_size_kb > 1000) score -= 20;
            else if (bundle.chunks.total_size_kb > 500) score -= 10;

            if (bundle.css.total_size_kb > 200) score -= 10;
            else if (bundle.css.total_size_kb > 100) score -= 5;
        }

        // Deduct points for high priority issues
        const highPriorityCount = opportunities.filter(opp => opp.priority === 'high').length;
        score -= highPriorityCount * 15;

        // Deduct points for medium priority issues
        const mediumPriorityCount = opportunities.filter(opp => opp.priority === 'medium').length;
        score -= mediumPriorityCount * 5;

        score = Math.max(0, score); // Ensure score doesn't go below 0

        const summary = {
            overall_score: score,
            performance_grade: score >= 90 ? 'Excellent' : score >= 80 ? 'Good' : score >= 70 ? 'Fair' : 'Needs Improvement',
            total_bundle_size_mb: bundle ? (bundle.total_build_size / 1024 / 1024).toFixed(2) : 0,
            javascript_size_kb: bundle ? bundle.chunks.total_size_kb.toFixed(0) : 0,
            css_size_kb: bundle ? bundle.css.total_size_kb.toFixed(0) : 0,
            optimization_opportunities: opportunities.length,
            high_priority_issues: highPriorityCount,
            recommendations_count: this.results.recommendations.reduce((total, cat) => total + cat.items.length, 0)
        };

        this.results.performance_summary = summary;

        console.log('\n🏆 FRONTEND PERFORMANCE SUMMARY:');
        console.log(`   Overall Score: ${score}/100 (${summary.performance_grade})`);
        console.log(`   Total Build Size: ${summary.total_bundle_size_mb} MB`);
        console.log(`   JavaScript: ${summary.javascript_size_kb} KB`);
        console.log(`   CSS: ${summary.css_size_kb} KB`);
        console.log(`   Optimization Opportunities: ${summary.optimization_opportunities}`);
        console.log(`   High Priority Issues: ${summary.high_priority_issues}`);

        return summary;
    }

    saveReport() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const reportPath = path.join(process.cwd(), `frontend_performance_report_${timestamp}.json`);

        fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));

        console.log(`\n📄 Report saved to: ${reportPath}`);
        return reportPath;
    }

    async run() {
        console.log('🚀 6FB BOOKING FRONTEND PERFORMANCE ANALYSIS');
        console.log('='.repeat(60));

        try {
            // Run analysis steps
            this.analyzeBundleSizes();
            this.analyzePerformanceMetrics();
            this.identifyOptimizationOpportunities();
            this.generateRecommendations();
            const summary = this.generateReport();
            const reportPath = this.saveReport();

            console.log('\n🎉 Frontend performance analysis complete!');
            console.log(`   Report saved to: ${reportPath}`);

            return {
                success: true,
                summary,
                reportPath,
                results: this.results
            };

        } catch (error) {
            console.error('❌ Analysis failed:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

// Run the analysis if this script is executed directly
if (require.main === module) {
    const analyzer = new FrontendPerformanceAnalyzer();
    analyzer.run().then(result => {
        process.exit(result.success ? 0 : 1);
    });
}

module.exports = FrontendPerformanceAnalyzer;

#!/usr/bin/env node

/**
 * CSS Responsive Design Audit
 * Analyzes the codebase for responsive design patterns and potential issues
 */

const fs = require('fs');
const path = require('path');

class ResponsiveCSSAudit {
  constructor() {
    this.results = {
      summary: {
        filesScanned: 0,
        componentsWithResponsive: 0,
        issuesFound: 0
      },
      issues: [],
      recommendations: [],
      goodPractices: []
    };
  }

  // Scan all relevant files
  scanDirectory(dir, extensions = ['.tsx', '.ts', '.css']) {
    const files = [];
    
    function traverse(currentDir) {
      const items = fs.readdirSync(currentDir);
      
      for (const item of items) {
        const fullPath = path.join(currentDir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
          traverse(fullPath);
        } else if (stat.isFile() && extensions.some(ext => item.endsWith(ext))) {
          files.push(fullPath);
        }
      }
    }
    
    traverse(dir);
    return files;
  }

  // Analyze a single file
  analyzeFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const fileName = path.basename(filePath);
    const analysis = {
      file: filePath,
      hasResponsiveClasses: false,
      responsivePatterns: [],
      issues: [],
      recommendations: []
    };

    // Check for Tailwind responsive classes
    const responsiveClasses = [
      'sm:', 'md:', 'lg:', 'xl:', '2xl:',
      'grid-cols-', 'flex-col', 'flex-row',
      'hidden', 'block', 'inline'
    ];

    responsiveClasses.forEach(pattern => {
      if (content.includes(pattern)) {
        analysis.hasResponsiveClasses = true;
        analysis.responsivePatterns.push(pattern);
      }
    });

    // Check for potential issues
    this.checkForIssues(content, analysis, fileName);
    
    // Check for good practices
    this.checkForGoodPractices(content, analysis);

    return analysis;
  }

  checkForIssues(content, analysis, fileName) {
    // Fixed width elements that might not be responsive
    const fixedWidthPatterns = [
      /w-\d{3,}/g, // Very large fixed widths like w-96, w-128
      /width:\s*\d{3,}px/g, // Fixed pixel widths over 100px
      /min-width:\s*\d{3,}px/g
    ];

    fixedWidthPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        analysis.issues.push({
          type: 'fixed-width',
          message: `Fixed width elements detected: ${matches.join(', ')}`,
          severity: 'medium'
        });
      }
    });

    // Check for missing mobile-first approach
    if (content.includes('lg:') || content.includes('xl:')) {
      if (!content.includes('sm:') && !content.includes('md:')) {
        analysis.issues.push({
          type: 'mobile-first',
          message: 'Large screen classes without mobile/tablet considerations',
          severity: 'low'
        });
      }
    }

    // Check for potential touch target issues
    if (content.includes('button') || content.includes('click')) {
      if (!content.includes('p-') && !content.includes('py-') && !content.includes('px-')) {
        analysis.issues.push({
          type: 'touch-targets',
          message: 'Buttons may lack adequate padding for touch devices',
          severity: 'medium'
        });
      }
    }

    // Check for horizontal scroll risks
    const overflowRisks = [
      /overflow-x-auto/g,
      /whitespace-nowrap/g,
      /flex-nowrap/g
    ];

    overflowRisks.forEach(pattern => {
      if (content.match(pattern)) {
        analysis.recommendations.push({
          type: 'overflow',
          message: 'Consider responsive alternatives to horizontal scrolling'
        });
      }
    });

    // Check if it's a key component that should be responsive
    const keyComponents = ['Sidebar', 'Modal', 'Calendar', 'Table', 'Form'];
    if (keyComponents.some(comp => fileName.includes(comp))) {
      if (!analysis.hasResponsiveClasses) {
        analysis.issues.push({
          type: 'missing-responsive',
          message: `Key component "${fileName}" lacks responsive design classes`,
          severity: 'high'
        });
      }
    }
  }

  checkForGoodPractices(content, analysis) {
    // Grid responsiveness
    if (content.includes('grid-cols-1') && content.includes('md:grid-cols-')) {
      analysis.recommendations.push({
        type: 'good-practice',
        message: 'Good mobile-first grid implementation'
      });
    }

    // Responsive text sizing
    if (content.includes('text-sm') && content.includes('md:text-base')) {
      analysis.recommendations.push({
        type: 'good-practice',
        message: 'Responsive typography implemented'
      });
    }

    // Responsive spacing
    if (content.includes('p-4') && content.includes('md:p-6')) {
      analysis.recommendations.push({
        type: 'good-practice',
        message: 'Responsive spacing implemented'
      });
    }
  }

  // Run the complete audit
  runAudit() {
    console.log('🔍 Starting Responsive CSS Audit...\n');

    const srcDir = path.join(process.cwd(), 'src');
    const files = this.scanDirectory(srcDir);
    
    this.results.summary.filesScanned = files.length;

    files.forEach(file => {
      const analysis = this.analyzeFile(file);
      
      if (analysis.hasResponsiveClasses) {
        this.results.summary.componentsWithResponsive++;
      }

      if (analysis.issues.length > 0) {
        this.results.summary.issuesFound += analysis.issues.length;
        this.results.issues.push(...analysis.issues.map(issue => ({
          ...issue,
          file: analysis.file
        })));
      }

      if (analysis.recommendations.length > 0) {
        this.results.recommendations.push(...analysis.recommendations.map(rec => ({
          ...rec,
          file: analysis.file
        })));
      }
    });

    this.generateReport();
  }

  generateReport() {
    console.log('📊 Responsive Design Audit Results\n');
    
    // Summary
    console.log('📈 Summary:');
    console.log(`   Files Scanned: ${this.results.summary.filesScanned}`);
    console.log(`   Components with Responsive Design: ${this.results.summary.componentsWithResponsive}`);
    console.log(`   Issues Found: ${this.results.summary.issuesFound}`);
    console.log('');

    // Issues by severity
    const highIssues = this.results.issues.filter(i => i.severity === 'high');
    const mediumIssues = this.results.issues.filter(i => i.severity === 'medium');
    const lowIssues = this.results.issues.filter(i => i.severity === 'low');

    if (highIssues.length > 0) {
      console.log('🚨 High Priority Issues:');
      highIssues.forEach(issue => {
        console.log(`   ❌ ${issue.message}`);
        console.log(`      File: ${path.relative(process.cwd(), issue.file)}`);
      });
      console.log('');
    }

    if (mediumIssues.length > 0) {
      console.log('⚠️  Medium Priority Issues:');
      mediumIssues.forEach(issue => {
        console.log(`   ⚡ ${issue.message}`);
        console.log(`      File: ${path.relative(process.cwd(), issue.file)}`);
      });
      console.log('');
    }

    if (lowIssues.length > 0) {
      console.log('💡 Low Priority Issues:');
      lowIssues.forEach(issue => {
        console.log(`   💭 ${issue.message}`);
        console.log(`      File: ${path.relative(process.cwd(), issue.file)}`);
      });
      console.log('');
    }

    // Good practices
    const goodPractices = this.results.recommendations.filter(r => r.type === 'good-practice');
    if (goodPractices.length > 0) {
      console.log('✅ Good Practices Found:');
      goodPractices.forEach(practice => {
        console.log(`   👍 ${practice.message}`);
      });
      console.log('');
    }

    // General recommendations
    console.log('🎯 Recommendations:');
    console.log('   1. Ensure all components use mobile-first responsive design');
    console.log('   2. Use relative units (rem, %, vw/vh) instead of fixed pixels');
    console.log('   3. Test touch targets are at least 44px in height');
    console.log('   4. Implement responsive typography scaling');
    console.log('   5. Use CSS Grid and Flexbox for flexible layouts');
    console.log('');

    // Specific Tailwind patterns to check
    console.log('🔧 Tailwind CSS Responsive Patterns to Verify:');
    console.log('   ✓ grid-cols-1 md:grid-cols-2 lg:grid-cols-3');
    console.log('   ✓ text-sm md:text-base lg:text-lg');
    console.log('   ✓ p-4 md:p-6 lg:p-8');
    console.log('   ✓ w-full md:w-auto');
    console.log('   ✓ flex-col md:flex-row');
    console.log('   ✓ hidden md:block');
    console.log('');

    // Component-specific checks
    console.log('🎨 Component-Specific Responsive Checklist:');
    console.log('   📱 Sidebar: Should collapse on mobile (<768px)');
    console.log('   📅 Calendar: Should stack vertically on mobile');
    console.log('   📋 Forms: Inputs should be full-width on mobile');
    console.log('   🗂️  Tables: Should have horizontal scroll or stack');
    console.log('   🎭 Modals: Should fit mobile viewport with proper padding');
    
    // Save detailed report
    fs.writeFileSync('./responsive-audit-report.json', JSON.stringify(this.results, null, 2));
    console.log('\n📄 Detailed report saved to: responsive-audit-report.json');
  }
}

// Run the audit
if (require.main === module) {
  const audit = new ResponsiveCSSAudit();
  audit.runAudit();
}

module.exports = ResponsiveCSSAudit;
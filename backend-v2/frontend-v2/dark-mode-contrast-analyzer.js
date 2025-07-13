const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

/**
 * Comprehensive Dark Mode Contrast Analyzer
 * Analyzes all pages for WCAG AA compliance in both light and dark modes
 */

// WCAG AA contrast ratios
const CONTRAST_RATIOS = {
  normal: 4.5,      // Normal text
  large: 3.0,       // Large text (18pt+ or 14pt+ bold)
  ui: 3.0           // UI components (non-text)
};

// Convert hex to RGB
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

// Parse RGB string to RGB object
function parseRgb(rgbString) {
  const match = rgbString.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/);
  return match ? {
    r: parseInt(match[1]),
    g: parseInt(match[2]),
    b: parseInt(match[3])
  } : null;
}

// Calculate relative luminance
function getLuminance(rgb) {
  const { r, g, b } = rgb;
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

// Calculate contrast ratio between two colors
function getContrastRatio(color1, color2) {
  const lum1 = getLuminance(color1);
  const lum2 = getLuminance(color2);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
}

// Determine if text is large (18pt+ or 14pt+ bold)
function isLargeText(fontSize, fontWeight) {
  const size = parseFloat(fontSize);
  const weight = parseInt(fontWeight) || (fontWeight === 'bold' ? 700 : 400);
  return size >= 24 || (size >= 18.66 && weight >= 700); // 18.66px ≈ 14pt
}

// Analyze elements on page
async function analyzePageContrast(page, mode) {
  return await page.evaluate((mode) => {
    const elements = [];
    const violations = [];
    
    // Helper functions (must be defined inside evaluate)
    function parseRgb(rgbString) {
      const match = rgbString.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/);
      return match ? {
        r: parseInt(match[1]),
        g: parseInt(match[2]),
        b: parseInt(match[3])
      } : null;
    }
    
    function getLuminance(rgb) {
      const { r, g, b } = rgb;
      const [rs, gs, bs] = [r, g, b].map(c => {
        c = c / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
    }
    
    function getContrastRatio(color1, color2) {
      const lum1 = getLuminance(color1);
      const lum2 = getLuminance(color2);
      const brightest = Math.max(lum1, lum2);
      const darkest = Math.min(lum1, lum2);
      return (brightest + 0.05) / (darkest + 0.05);
    }
    
    function isLargeText(fontSize, fontWeight) {
      const size = parseFloat(fontSize);
      const weight = parseInt(fontWeight) || (fontWeight === 'bold' ? 700 : 400);
      return size >= 24 || (size >= 18.66 && weight >= 700);
    }
    
    function getBackgroundColor(element) {
      let current = element;
      let bgColor = 'rgba(0, 0, 0, 0)';
      
      while (current && current !== document.body) {
        const styles = window.getComputedStyle(current);
        const bg = styles.backgroundColor;
        
        if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
          bgColor = bg;
          break;
        }
        current = current.parentElement;
      }
      
      // Default to white for light mode, dark for dark mode
      if (bgColor === 'rgba(0, 0, 0, 0)' || bgColor === 'transparent') {
        bgColor = mode === 'dark' ? 'rgb(17, 24, 39)' : 'rgb(255, 255, 255)';
      }
      
      return bgColor;
    }
    
    // Get all text elements
    const textSelectors = [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'span', 'div', 'a', 'label', 
      'button', 'input[type="text"]', 'input[type="email"]', 'input[type="password"]',
      'textarea', 'select', 'li', 'td', 'th'
    ];
    
    textSelectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(el => {
        const rect = el.getBoundingClientRect();
        
        // Skip hidden elements
        if (rect.width === 0 || rect.height === 0) return;
        
        const styles = window.getComputedStyle(el);
        const textContent = el.textContent?.trim();
        
        // Skip elements without text content (unless they're inputs)
        if (!textContent && !['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)) return;
        
        const textColor = styles.color;
        const backgroundColor = getBackgroundColor(el);
        const fontSize = styles.fontSize;
        const fontWeight = styles.fontWeight;
        
        const textRgb = parseRgb(textColor);
        const bgRgb = parseRgb(backgroundColor);
        
        if (textRgb && bgRgb) {
          const contrastRatio = getContrastRatio(textRgb, bgRgb);
          const isLarge = isLargeText(fontSize, fontWeight);
          const requiredRatio = isLarge ? 3.0 : 4.5;
          const passes = contrastRatio >= requiredRatio;
          
          const elementInfo = {
            tagName: el.tagName,
            text: textContent || el.placeholder || el.value || '[input]',
            selector: el.id ? `#${el.id}` : `.${el.className.split(' ').join('.')}`,
            textColor,
            backgroundColor,
            fontSize,
            fontWeight,
            contrastRatio: Math.round(contrastRatio * 100) / 100,
            requiredRatio,
            isLarge,
            passes,
            className: el.className,
            id: el.id
          };
          
          elements.push(elementInfo);
          
          if (!passes) {
            violations.push({
              ...elementInfo,
              severity: contrastRatio < 2 ? 'critical' : contrastRatio < 3 ? 'high' : 'medium'
            });
          }
        }
      });
    });
    
    return { elements, violations };
  }, mode);
}

// Main analysis function
async function runContrastAnalysis() {
  const browser = await puppeteer.launch({ 
    headless: false, // Set to true for production
    defaultViewport: { width: 1280, height: 720 }
  });
  
  try {
    const page = await browser.newPage();
    
    // Enable console logging from the page
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('Page Error:', msg.text());
      }
    });
    
    const results = {
      lightMode: {},
      darkMode: {},
      summary: {
        totalViolations: 0,
        criticalViolations: 0,
        pagesAnalyzed: 0
      }
    };
    
    // Pages to analyze
    const pagesToAnalyze = [
      { url: 'http://localhost:3000', name: 'homepage' },
      { url: 'http://localhost:3000/login', name: 'login' },
      { url: 'http://localhost:3000/register', name: 'register' },
      { url: 'http://localhost:3000/dashboard', name: 'dashboard' },
      { url: 'http://localhost:3000/calendar', name: 'calendar' },
      { url: 'http://localhost:3000/appointments', name: 'appointments' },
      { url: 'http://localhost:3000/settings', name: 'settings' }
    ];
    
    for (const pageInfo of pagesToAnalyze) {
      console.log(`\n🔍 Analyzing ${pageInfo.name}...`);
      
      try {
        // Test Light Mode
        console.log(`  📱 Light mode...`);
        await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
        await page.goto(pageInfo.url, { waitUntil: 'networkidle2', timeout: 10000 });
        await new Promise(resolve => setTimeout(resolve, 2000)); // Let theme load
        
        const lightResults = await analyzePageContrast(page, 'light');
        results.lightMode[pageInfo.name] = lightResults;
        
        // Take screenshot
        await page.screenshot({ 
          path: `dark-mode-analysis-${pageInfo.name}-light.png`,
          fullPage: true 
        });
        
        // Test Dark Mode
        console.log(`  🌙 Dark mode...`);
        await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }]);
        await page.reload({ waitUntil: 'networkidle2' });
        await new Promise(resolve => setTimeout(resolve, 2000)); // Let theme load
        
        const darkResults = await analyzePageContrast(page, 'dark');
        results.darkMode[pageInfo.name] = darkResults;
        
        // Take screenshot
        await page.screenshot({ 
          path: `dark-mode-analysis-${pageInfo.name}-dark.png`,
          fullPage: true 
        });
        
        // Update summary
        results.summary.totalViolations += darkResults.violations.length + lightResults.violations.length;
        results.summary.criticalViolations += [
          ...darkResults.violations, 
          ...lightResults.violations
        ].filter(v => v.severity === 'critical').length;
        results.summary.pagesAnalyzed++;
        
        console.log(`    ✅ Light: ${lightResults.violations.length} violations`);
        console.log(`    ✅ Dark: ${darkResults.violations.length} violations`);
        
      } catch (error) {
        console.log(`    ❌ Error analyzing ${pageInfo.name}: ${error.message}`);
        results.lightMode[pageInfo.name] = { error: error.message };
        results.darkMode[pageInfo.name] = { error: error.message };
      }
    }
    
    // Generate detailed report
    const reportPath = 'dark-mode-contrast-analysis-report.json';
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
    
    // Generate human-readable summary
    const summaryPath = 'dark-mode-contrast-summary.md';
    let summary = `# Dark Mode Contrast Analysis Report\n\n`;
    summary += `**Generated:** ${new Date().toISOString()}\n\n`;
    summary += `## Summary\n`;
    summary += `- **Pages Analyzed:** ${results.summary.pagesAnalyzed}\n`;
    summary += `- **Total Violations:** ${results.summary.totalViolations}\n`;
    summary += `- **Critical Violations:** ${results.summary.criticalViolations}\n\n`;
    
    summary += `## Violations by Page\n\n`;
    
    for (const pageInfo of pagesToAnalyze) {
      const lightViolations = results.lightMode[pageInfo.name]?.violations || [];
      const darkViolations = results.darkMode[pageInfo.name]?.violations || [];
      
      if (lightViolations.length > 0 || darkViolations.length > 0) {
        summary += `### ${pageInfo.name.charAt(0).toUpperCase() + pageInfo.name.slice(1)}\n\n`;
        
        if (lightViolations.length > 0) {
          summary += `**Light Mode Issues (${lightViolations.length}):**\n`;
          lightViolations.forEach(v => {
            summary += `- **${v.severity.toUpperCase()}**: ${v.tagName} "${v.text.substring(0, 50)}" - Contrast: ${v.contrastRatio} (needs ${v.requiredRatio})\n`;
            summary += `  - Classes: \`${v.className}\`\n`;
            summary += `  - Colors: ${v.textColor} on ${v.backgroundColor}\n\n`;
          });
        }
        
        if (darkViolations.length > 0) {
          summary += `**Dark Mode Issues (${darkViolations.length}):**\n`;
          darkViolations.forEach(v => {
            summary += `- **${v.severity.toUpperCase()}**: ${v.tagName} "${v.text.substring(0, 50)}" - Contrast: ${v.contrastRatio} (needs ${v.requiredRatio})\n`;
            summary += `  - Classes: \`${v.className}\`\n`;
            summary += `  - Colors: ${v.textColor} on ${v.backgroundColor}\n\n`;
          });
        }
      }
    }
    
    summary += `## Recommendations\n\n`;
    summary += `1. **Critical Issues**: Fix all elements with contrast ratio < 2.0 immediately\n`;
    summary += `2. **High Priority**: Address elements with contrast ratio < 3.0\n`;
    summary += `3. **Medium Priority**: Improve elements with contrast ratio < 4.5 for normal text\n`;
    summary += `4. **Add dark: variants**: Ensure all components have proper dark mode classes\n`;
    summary += `5. **Test systematically**: Use this analyzer regularly during development\n\n`;
    
    summary += `## Technical Details\n\n`;
    summary += `- **WCAG Standard**: AA (4.5:1 for normal text, 3:1 for large text)\n`;
    summary += `- **Large Text**: ≥24px or ≥18.66px with font-weight ≥700\n`;
    summary += `- **Analysis Method**: Computed styles + contrast ratio calculation\n`;
    summary += `- **Screenshots**: Saved for each page in both modes\n`;
    
    fs.writeFileSync(summaryPath, summary);
    
    console.log(`\n📊 Analysis Complete!`);
    console.log(`📄 Detailed Report: ${reportPath}`);
    console.log(`📋 Summary Report: ${summaryPath}`);
    console.log(`📸 Screenshots: dark-mode-analysis-*.png`);
    
    return results;
    
  } finally {
    await browser.close();
  }
}

// Run the analysis
if (require.main === module) {
  runContrastAnalysis()
    .then((results) => {
      console.log('\n✅ Dark mode contrast analysis completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Analysis failed:', error);
      process.exit(1);
    });
}

module.exports = { runContrastAnalysis };
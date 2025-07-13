const puppeteer = require('puppeteer');
const fs = require('fs');

/**
 * Simple Dark Mode Contrast Analysis
 * Focus on login page to identify major issues
 */

async function analyzeLoginPage() {
  const browser = await puppeteer.launch({ 
    headless: false,
    defaultViewport: { width: 1280, height: 720 }
  });
  
  try {
    const page = await browser.newPage();
    
    // Helper function to calculate contrast
    const contrastAnalysis = `
      function parseRgb(rgbString) {
        const match = rgbString.match(/rgba?\\((\\d+),\\s*(\\d+),\\s*(\\d+)(?:,\\s*[\\d.]+)?\\)/);
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
      
      function getBackgroundColor(element) {
        let current = element;
        while (current && current !== document.body) {
          const styles = window.getComputedStyle(current);
          const bg = styles.backgroundColor;
          if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
            return bg;
          }
          current = current.parentElement;
        }
        return document.documentElement.classList.contains('dark') ? 
          'rgb(17, 24, 39)' : 'rgb(255, 255, 255)';
      }
    `;
    
    const results = { light: [], dark: [] };
    
    // Test Light Mode
    console.log('🌞 Testing Light Mode...');
    await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle2' });
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Take screenshot
    await page.screenshot({ path: 'login-light-mode.png', fullPage: true });
    
    // Analyze light mode
    const lightAnalysis = await page.evaluate((contrastCode) => {
      eval(contrastCode);
      
      const issues = [];
      const selectors = ['h1', 'h2', 'h3', 'p', 'label', 'button', 'input', 'a', 'span'];
      
      selectors.forEach(selector => {
        document.querySelectorAll(selector).forEach(el => {
          const rect = el.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) return;
          
          const styles = window.getComputedStyle(el);
          const text = el.textContent?.trim() || el.placeholder || el.value || '[input]';
          if (!text) return;
          
          const textColor = styles.color;
          const backgroundColor = getBackgroundColor(el);
          
          const textRgb = parseRgb(textColor);
          const bgRgb = parseRgb(backgroundColor);
          
          if (textRgb && bgRgb) {
            const contrast = getContrastRatio(textRgb, bgRgb);
            const fontSize = parseFloat(styles.fontSize);
            const isLarge = fontSize >= 18;
            const needed = isLarge ? 3.0 : 4.5;
            
            if (contrast < needed) {
              issues.push({
                element: selector,
                text: text.substring(0, 30),
                textColor,
                backgroundColor,
                contrast: Math.round(contrast * 100) / 100,
                needed,
                className: el.className,
                severity: contrast < 2 ? 'critical' : contrast < 3 ? 'high' : 'medium'
              });
            }
          }
        });
      });
      
      return issues;
    }, contrastAnalysis);
    
    results.light = lightAnalysis;
    console.log(`  Found ${lightAnalysis.length} contrast issues`);
    
    // Test Dark Mode
    console.log('🌙 Testing Dark Mode...');
    await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }]);
    await page.reload({ waitUntil: 'networkidle2' });
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Take screenshot
    await page.screenshot({ path: 'login-dark-mode.png', fullPage: true });
    
    // Analyze dark mode
    const darkAnalysis = await page.evaluate((contrastCode) => {
      eval(contrastCode);
      
      const issues = [];
      const selectors = ['h1', 'h2', 'h3', 'p', 'label', 'button', 'input', 'a', 'span'];
      
      selectors.forEach(selector => {
        document.querySelectorAll(selector).forEach(el => {
          const rect = el.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) return;
          
          const styles = window.getComputedStyle(el);
          const text = el.textContent?.trim() || el.placeholder || el.value || '[input]';
          if (!text) return;
          
          const textColor = styles.color;
          const backgroundColor = getBackgroundColor(el);
          
          const textRgb = parseRgb(textColor);
          const bgRgb = parseRgb(backgroundColor);
          
          if (textRgb && bgRgb) {
            const contrast = getContrastRatio(textRgb, bgRgb);
            const fontSize = parseFloat(styles.fontSize);
            const isLarge = fontSize >= 18;
            const needed = isLarge ? 3.0 : 4.5;
            
            if (contrast < needed) {
              issues.push({
                element: selector,
                text: text.substring(0, 30),
                textColor,
                backgroundColor,
                contrast: Math.round(contrast * 100) / 100,
                needed,
                className: el.className,
                severity: contrast < 2 ? 'critical' : contrast < 3 ? 'high' : 'medium'
              });
            }
          }
        });
      });
      
      return issues;
    }, contrastAnalysis);
    
    results.dark = darkAnalysis;
    console.log(`  Found ${darkAnalysis.length} contrast issues`);
    
    // Generate report
    const report = {
      timestamp: new Date().toISOString(),
      page: 'login',
      summary: {
        lightIssues: results.light.length,
        darkIssues: results.dark.length,
        total: results.light.length + results.dark.length
      },
      results
    };
    
    fs.writeFileSync('simple-contrast-analysis.json', JSON.stringify(report, null, 2));
    
    // Generate readable report
    let markdown = `# Simple Dark Mode Contrast Analysis\\n\\n`;
    markdown += `**Page:** Login\\n`;
    markdown += `**Timestamp:** ${new Date().toISOString()}\\n\\n`;
    markdown += `## Summary\\n`;
    markdown += `- Light Mode Issues: ${results.light.length}\\n`;
    markdown += `- Dark Mode Issues: ${results.dark.length}\\n`;
    markdown += `- Total Issues: ${results.light.length + results.dark.length}\\n\\n`;
    
    if (results.light.length > 0) {
      markdown += `## Light Mode Issues\\n\\n`;
      results.light.forEach(issue => {
        markdown += `- **${issue.severity.toUpperCase()}**: ${issue.element} "${issue.text}"\\n`;
        markdown += `  - Contrast: ${issue.contrast} (needs ${issue.needed})\\n`;
        markdown += `  - Colors: ${issue.textColor} on ${issue.backgroundColor}\\n`;
        markdown += `  - Classes: \`${issue.className}\`\\n\\n`;
      });
    }
    
    if (results.dark.length > 0) {
      markdown += `## Dark Mode Issues\\n\\n`;
      results.dark.forEach(issue => {
        markdown += `- **${issue.severity.toUpperCase()}**: ${issue.element} "${issue.text}"\\n`;
        markdown += `  - Contrast: ${issue.contrast} (needs ${issue.needed})\\n`;
        markdown += `  - Colors: ${issue.textColor} on ${issue.backgroundColor}\\n`;
        markdown += `  - Classes: \`${issue.className}\`\\n\\n`;
      });
    }
    
    fs.writeFileSync('simple-contrast-report.md', markdown);
    
    console.log('\\n📊 Analysis Complete!');
    console.log('📄 Report: simple-contrast-analysis.json');
    console.log('📋 Summary: simple-contrast-report.md');
    console.log('📸 Screenshots: login-light-mode.png, login-dark-mode.png');
    
    return report;
    
  } finally {
    await browser.close();
  }
}

// Run analysis
analyzeLoginPage()
  .then(() => {
    console.log('\\n✅ Analysis completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\\n❌ Analysis failed:', error);
    process.exit(1);
  });
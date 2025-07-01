const puppeteer = require('puppeteer');
const fs = require('fs');

async function analyzeDarkModeIssues() {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1280, height: 720 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    
    console.log('🔍 Starting dark mode analysis...');
    
    // Navigate to the dashboard
    await page.goto('http://localhost:3000/dashboard', { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });

    const results = {
      timestamp: new Date().toISOString(),
      issues: [],
      screenshots: [],
      contrast_violations: [],
      theme_inconsistencies: []
    };

    // Function to take screenshot and analyze
    async function analyzeMode(mode) {
      console.log(`📸 Analyzing ${mode} mode...`);
      
      // Toggle to the specified mode
      if (mode === 'dark') {
        // Try to find and click the theme toggle
        try {
          await page.waitForSelector('button[aria-label*="theme"], button[title*="theme"], [data-testid="theme-toggle"]', { timeout: 5000 });
          await page.click('button[aria-label*="theme"], button[title*="theme"], [data-testid="theme-toggle"]');
          await page.waitForTimeout(1000); // Wait for theme transition
        } catch (e) {
          console.log('⚠️ Could not find theme toggle, trying manual dark mode activation...');
          await page.evaluate(() => {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
          });
          await page.waitForTimeout(1000);
        }
      }

      // Take screenshot
      const screenshotPath = `/Users/bossio/6fb-booking/backend-v2/frontend-v2/dark_mode_${mode}_analysis.png`;
      await page.screenshot({ 
        path: screenshotPath, 
        fullPage: true 
      });
      results.screenshots.push(screenshotPath);

      // Analyze contrast issues
      const contrastIssues = await page.evaluate((currentMode) => {
        const issues = [];
        const elements = document.querySelectorAll('*');
        
        elements.forEach((el, index) => {
          const styles = window.getComputedStyle(el);
          const textColor = styles.color;
          const bgColor = styles.backgroundColor;
          const text = el.textContent?.trim();
          
          // Skip elements without visible text
          if (!text || text.length === 0) return;
          if (el.offsetWidth === 0 || el.offsetHeight === 0) return;
          
          // Check for problematic combinations in dark mode
          if (currentMode === 'dark') {
            // Dark text on dark background
            if (textColor.includes('rgb(') && bgColor.includes('rgb(')) {
              const textRgb = textColor.match(/\\d+/g);
              const bgRgb = bgColor.match(/\\d+/g);
              
              if (textRgb && bgRgb) {
                const textLuminance = (parseInt(textRgb[0]) + parseInt(textRgb[1]) + parseInt(textRgb[2])) / 3;
                const bgLuminance = (parseInt(bgRgb[0]) + parseInt(bgRgb[1]) + parseInt(bgRgb[2])) / 3;
                
                // Both dark (low contrast)
                if (textLuminance < 120 && bgLuminance < 120 && Math.abs(textLuminance - bgLuminance) < 50) {
                  issues.push({
                    element: el.tagName.toLowerCase(),
                    class: el.className,
                    text: text.substring(0, 50),
                    textColor,
                    bgColor,
                    issue: 'Dark text on dark background - low contrast',
                    selector: el.id ? `#${el.id}` : `.${el.className.split(' ')[0]}`
                  });
                }
                
                // Light text on light background
                if (textLuminance > 200 && bgLuminance > 200) {
                  issues.push({
                    element: el.tagName.toLowerCase(),
                    class: el.className,
                    text: text.substring(0, 50),
                    textColor,
                    bgColor,
                    issue: 'Light text on light background in dark mode',
                    selector: el.id ? `#${el.id}` : `.${el.className.split(' ')[0]}`
                  });
                }
              }
            }
            
            // Check for elements that should be dark but aren't
            if (bgColor === 'rgba(0, 0, 0, 0)' || bgColor === 'rgb(255, 255, 255)' || bgColor.includes('248, 250, 252')) {
              issues.push({
                element: el.tagName.toLowerCase(),
                class: el.className,
                text: text.substring(0, 50),
                bgColor,
                issue: 'Element with light background in dark mode',
                selector: el.id ? `#${el.id}` : `.${el.className.split(' ')[0]}`
              });
            }
          }
        });
        
        return issues;
      }, mode);

      results.contrast_violations = results.contrast_violations.concat(
        contrastIssues.map(issue => ({ ...issue, mode }))
      );

      // Check for theme inconsistencies
      const themeIssues = await page.evaluate((currentMode) => {
        const issues = [];
        
        // Check if dark class is properly applied
        const hasDarkClass = document.documentElement.classList.contains('dark');
        if (currentMode === 'dark' && !hasDarkClass) {
          issues.push('Dark mode activated but html element missing dark class');
        }
        
        // Check for hardcoded light colors in dark mode
        const allElements = document.querySelectorAll('*');
        allElements.forEach(el => {
          const styles = window.getComputedStyle(el);
          
          if (currentMode === 'dark') {
            // Look for hardcoded white/light backgrounds
            if (styles.backgroundColor === 'rgb(255, 255, 255)' || 
                styles.backgroundColor === 'rgb(248, 250, 252)' ||
                styles.backgroundColor === 'rgb(249, 250, 251)') {
              issues.push({
                selector: el.id ? `#${el.id}` : `.${el.className.split(' ')[0]}`,
                issue: 'Hardcoded light background in dark mode',
                bgColor: styles.backgroundColor,
                element: el.tagName.toLowerCase()
              });
            }
            
            // Look for hardcoded dark text colors in dark mode
            if (styles.color === 'rgb(0, 0, 0)' || 
                styles.color === 'rgb(17, 24, 39)' ||
                styles.color === 'rgb(31, 41, 55)') {
              issues.push({
                selector: el.id ? `#${el.id}` : `.${el.className.split(' ')[0]}`,
                issue: 'Hardcoded dark text in dark mode',
                textColor: styles.color,
                element: el.tagName.toLowerCase()
              });
            }
          }
        });
        
        return issues;
      }, mode);

      results.theme_inconsistencies = results.theme_inconsistencies.concat(
        themeIssues.map(issue => typeof issue === 'string' ? { issue, mode } : { ...issue, mode })
      );

      console.log(`✅ ${mode} mode analysis complete - found ${contrastIssues.length} contrast issues, ${themeIssues.length} theme issues`);
    }

    // Analyze both light and dark modes
    await analyzeMode('light');
    await analyzeMode('dark');

    // Generate comprehensive report
    const report = `
# Dark Mode Analysis Report
Generated: ${results.timestamp}

## Summary
- Screenshots taken: ${results.screenshots.length}
- Contrast violations found: ${results.contrast_violations.length}
- Theme inconsistencies found: ${results.theme_inconsistencies.length}

## Contrast Violations
${results.contrast_violations.map((issue, i) => `
### Issue ${i + 1} (${issue.mode} mode)
- **Element**: ${issue.element}
- **Selector**: ${issue.selector}
- **Issue**: ${issue.issue}
- **Text**: "${issue.text}"
- **Text Color**: ${issue.textColor || 'N/A'}
- **Background**: ${issue.bgColor || 'N/A'}
`).join('\\n')}

## Theme Inconsistencies
${results.theme_inconsistencies.map((issue, i) => `
### Issue ${i + 1} (${issue.mode} mode)
- **Element**: ${issue.element || 'N/A'}
- **Selector**: ${issue.selector || 'N/A'}
- **Issue**: ${issue.issue}
- **Background**: ${issue.bgColor || 'N/A'}
- **Text Color**: ${issue.textColor || 'N/A'}
`).join('\\n')}

## Recommendations
1. **Implement consistent dark mode classes**: Ensure all components use Tailwind's dark: prefix
2. **Update contrast ratios**: Use proper text/background combinations
3. **Global theme propagation**: Make sure dark class affects all nested components
4. **Remove hardcoded colors**: Replace fixed colors with theme-aware variables
5. **Component audit**: Review each component for dark mode compatibility

## Screenshots
${results.screenshots.map(path => `- ${path}`).join('\\n')}
`;

    // Save the report
    fs.writeFileSync('/Users/bossio/6fb-booking/backend-v2/frontend-v2/dark_mode_analysis_report.md', report);
    
    // Save detailed JSON results
    fs.writeFileSync('/Users/bossio/6fb-booking/backend-v2/frontend-v2/dark_mode_analysis_results.json', JSON.stringify(results, null, 2));

    console.log('📊 Analysis complete!');
    console.log(`📝 Report saved to: dark_mode_analysis_report.md`);
    console.log(`📋 Detailed results: dark_mode_analysis_results.json`);
    console.log(`🖼️ Screenshots: ${results.screenshots.join(', ')}`);
    
    return results;

  } catch (error) {
    console.error('❌ Error during analysis:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

// Run the analysis
analyzeDarkModeIssues()
  .then(results => {
    console.log('\\n🎉 Dark mode analysis completed successfully!');
    console.log(`Found ${results.contrast_violations.length} contrast issues and ${results.theme_inconsistencies.length} theme inconsistencies.`);
  })
  .catch(error => {
    console.error('💥 Analysis failed:', error);
    process.exit(1);
  });
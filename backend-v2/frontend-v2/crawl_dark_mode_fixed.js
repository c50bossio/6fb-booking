const puppeteer = require('puppeteer');
const fs = require('fs');

// Custom delay function
async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

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
          const themeToggle = await page.$('button[aria-label*="theme"], button[title*="theme"], [data-testid="theme-toggle"], button:has-text("theme")');
          if (themeToggle) {
            await themeToggle.click();
            await delay(1000);
          } else {
            throw new Error('Theme toggle not found');
          }
        } catch (e) {
          console.log('⚠️ Could not find theme toggle, trying manual dark mode activation...');
          await page.evaluate(() => {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
          });
          await delay(1000);
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
          // Skip if element index is too high to avoid timeout
          if (index > 500) return;
          
          const styles = window.getComputedStyle(el);
          const textColor = styles.color;
          const bgColor = styles.backgroundColor;
          const text = el.textContent?.trim();
          
          // Skip elements without visible text
          if (!text || text.length === 0) return;
          if (el.offsetWidth === 0 || el.offsetHeight === 0) return;
          
          // Check for problematic combinations in dark mode
          if (currentMode === 'dark') {
            // Look for specific problematic patterns
            const hasLightBg = bgColor === 'rgb(255, 255, 255)' || 
                              bgColor === 'rgb(248, 250, 252)' ||
                              bgColor === 'rgb(249, 250, 251)' ||
                              bgColor === 'rgb(243, 244, 246)';
                              
            const hasDarkText = textColor === 'rgb(0, 0, 0)' || 
                               textColor === 'rgb(17, 24, 39)' ||
                               textColor === 'rgb(31, 41, 55)' ||
                               textColor === 'rgb(75, 85, 99)';
            
            if (hasLightBg) {
              issues.push({
                element: el.tagName.toLowerCase(),
                class: el.className,
                text: text.substring(0, 50),
                textColor,
                bgColor,
                issue: 'Light background in dark mode',
                selector: el.id ? `#${el.id}` : `.${el.className.split(' ')[0]}`
              });
            }
            
            if (hasDarkText) {
              issues.push({
                element: el.tagName.toLowerCase(),
                class: el.className,
                text: text.substring(0, 50),
                textColor,
                bgColor,
                issue: 'Dark text in dark mode - poor contrast',
                selector: el.id ? `#${el.id}` : `.${el.className.split(' ')[0]}`
              });
            }
            
            // Check for gray text on gray backgrounds
            if (textColor.includes('156, 163, 175') || textColor.includes('107, 114, 128')) {
              if (bgColor.includes('55, 65, 81') || bgColor.includes('31, 41, 55')) {
                issues.push({
                  element: el.tagName.toLowerCase(),
                  class: el.className,
                  text: text.substring(0, 50),
                  textColor,
                  bgColor,
                  issue: 'Gray text on gray background - low contrast',
                  selector: el.id ? `#${el.id}` : `.${el.className.split(' ')[0]}`
                });
              }
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
          issues.push({ issue: 'Dark mode activated but html element missing dark class' });
        }
        
        // Count components that don't respond to dark mode
        const elementsWithClasses = document.querySelectorAll('[class*="bg-"], [class*="text-"]');
        let componentsWithoutDarkSupport = 0;
        
        elementsWithClasses.forEach(el => {
          const classList = Array.from(el.classList);
          const hasBgClass = classList.some(cls => cls.startsWith('bg-'));
          const hasTextClass = classList.some(cls => cls.startsWith('text-'));
          const hasDarkBgClass = classList.some(cls => cls.startsWith('dark:bg-'));
          const hasDarkTextClass = classList.some(cls => cls.startsWith('dark:text-'));
          
          if (currentMode === 'dark') {
            if (hasBgClass && !hasDarkBgClass) {
              componentsWithoutDarkSupport++;
              if (componentsWithoutDarkSupport <= 10) { // Limit to first 10 issues
                issues.push({
                  selector: el.id ? `#${el.id}` : `.${el.className.split(' ')[0]}`,
                  issue: 'Component has background class but no dark: variant',
                  element: el.tagName.toLowerCase(),
                  classes: classList.filter(cls => cls.startsWith('bg-')).join(', ')
                });
              }
            }
            
            if (hasTextClass && !hasDarkTextClass) {
              if (componentsWithoutDarkSupport <= 10) {
                issues.push({
                  selector: el.id ? `#${el.id}` : `.${el.className.split(' ')[0]}`,
                  issue: 'Component has text class but no dark: variant',
                  element: el.tagName.toLowerCase(),
                  classes: classList.filter(cls => cls.startsWith('text-')).join(', ')
                });
              }
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
    const report = `# Dark Mode Analysis Report
Generated: ${results.timestamp}

## Summary
- Screenshots taken: ${results.screenshots.length}
- Contrast violations found: ${results.contrast_violations.length}
- Theme inconsistencies found: ${results.theme_inconsistencies.length}

## Key Issues Found

### Contrast Violations
${results.contrast_violations.slice(0, 20).map((issue, i) => `${i + 1}. **${issue.element}** (${issue.selector}): ${issue.issue}
   - Text: "${issue.text}"
   - Colors: ${issue.textColor} on ${issue.bgColor}`).join('\\n')}

### Theme Inconsistencies
${results.theme_inconsistencies.slice(0, 20).map((issue, i) => `${i + 1}. **${issue.element || 'Global'}** (${issue.selector || 'N/A'}): ${issue.issue}
   - Classes: ${issue.classes || 'N/A'}`).join('\\n')}

## Recommendations
1. **Add dark: prefixes**: All bg- and text- classes need dark: variants
2. **Fix hardcoded colors**: Replace fixed RGB values with theme-aware classes
3. **Update contrast ratios**: Ensure sufficient contrast in dark mode
4. **Global dark mode propagation**: Verify dark class affects all components
5. **Component audit needed**: Many components lack dark mode support

## Screenshots Saved
${results.screenshots.map(path => `- ${path.split('/').pop()}`).join('\\n')}
`;

    // Save the report
    fs.writeFileSync('/Users/bossio/6fb-booking/backend-v2/frontend-v2/dark_mode_analysis_report.md', report);
    
    console.log('📊 Analysis complete!');
    console.log(`📝 Report saved to: dark_mode_analysis_report.md`);
    console.log(`🖼️ Screenshots: ${results.screenshots.map(p => p.split('/').pop()).join(', ')}`);
    
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
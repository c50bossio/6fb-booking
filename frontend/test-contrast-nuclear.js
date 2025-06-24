const puppeteer = require('puppeteer');

async function testContrastNuclear() {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });

  // Check computed styles of problematic elements
  const contrastResults = await page.evaluate(() => {
    const results = [];

    // Test stats text
    const statsTexts = document.querySelectorAll('.stats-text, div[class*="text-sm"][class*="font-medium"]');
    statsTexts.forEach(el => {
      const styles = window.getComputedStyle(el);
      results.push({
        element: 'Stats Text',
        text: el.textContent.trim(),
        color: styles.color,
        fontWeight: styles.fontWeight,
        opacity: styles.opacity,
        backgroundColor: window.getComputedStyle(el.parentElement).backgroundColor
      });
    });

    // Test main descriptions
    const descriptions = document.querySelectorAll('.main-description, .features-description, p[class*="text-xl"]');
    descriptions.forEach(el => {
      const styles = window.getComputedStyle(el);
      results.push({
        element: 'Description',
        text: el.textContent.trim().substring(0, 50) + '...',
        color: styles.color,
        fontWeight: styles.fontWeight,
        opacity: styles.opacity
      });
    });

    // Test feature descriptions
    const features = document.querySelectorAll('.feature-description, div[class*="feature"] p');
    features.forEach((el, i) => {
      if (i < 3) { // Test first 3
        const styles = window.getComputedStyle(el);
        results.push({
          element: 'Feature Description',
          text: el.textContent.trim().substring(0, 40) + '...',
          color: styles.color,
          fontWeight: styles.fontWeight,
          opacity: styles.opacity
        });
      }
    });

    // Test pricing text
    const pricingTexts = document.querySelectorAll('.plan-description, .plan-period, .feature-item');
    pricingTexts.forEach((el, i) => {
      if (i < 3) { // Test first 3
        const styles = window.getComputedStyle(el);
        results.push({
          element: 'Pricing Text',
          text: el.textContent.trim().substring(0, 30) + '...',
          color: styles.color,
          fontWeight: styles.fontWeight,
          opacity: styles.opacity
        });
      }
    });

    // Test navigation links
    const navLinks = document.querySelectorAll('header a:not([class*="premium"])');
    navLinks.forEach(el => {
      const styles = window.getComputedStyle(el);
      results.push({
        element: 'Nav Link',
        text: el.textContent.trim(),
        color: styles.color,
        fontWeight: styles.fontWeight,
        opacity: styles.opacity
      });
    });

    // Test footer links
    const footerLinks = document.querySelectorAll('footer a');
    footerLinks.forEach((el, i) => {
      if (i < 3) { // Test first 3
        const styles = window.getComputedStyle(el);
        results.push({
          element: 'Footer Link',
          text: el.textContent.trim(),
          color: styles.color,
          fontWeight: styles.fontWeight,
          opacity: styles.opacity,
          backgroundColor: window.getComputedStyle(el.closest('footer')).backgroundColor
        });
      }
    });

    return results;
  });

  console.log('\n=== NUCLEAR CONTRAST TEST RESULTS ===\n');

  // Analyze results
  let issues = 0;
  contrastResults.forEach(result => {
    const rgbMatch = result.color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (rgbMatch) {
      const [_, r, g, b] = rgbMatch;
      const brightness = (parseInt(r) * 299 + parseInt(g) * 587 + parseInt(b) * 114) / 1000;

      // Check for contrast issues
      if (result.element.includes('Footer')) {
        // Footer should have light text (brightness > 180)
        if (brightness < 180) {
          console.log(`❌ ${result.element}: "${result.text}"`);
          console.log(`   Color: ${result.color} (Too dark for footer)`);
          console.log(`   Background: ${result.backgroundColor || 'N/A'}`);
          issues++;
        } else {
          console.log(`✅ ${result.element}: "${result.text}" - Good contrast`);
        }
      } else {
        // Regular text should be dark (brightness < 100)
        if (brightness > 150) {
          console.log(`❌ ${result.element}: "${result.text}"`);
          console.log(`   Color: ${result.color} (Too light)`);
          console.log(`   Weight: ${result.fontWeight}, Opacity: ${result.opacity}`);
          issues++;
        } else {
          console.log(`✅ ${result.element}: "${result.text}" - Good contrast`);
        }
      }
    }
  });

  console.log(`\n=== SUMMARY: ${issues} contrast issues found ===`);

  // Take screenshots
  await page.screenshot({ path: 'contrast-nuclear-full.png', fullPage: true });

  // Focus on problem areas
  const statsSection = await page.$('.grid.grid-cols-2.md\\:grid-cols-4');
  if (statsSection) {
    await statsSection.screenshot({ path: 'contrast-nuclear-stats.png' });
  }

  const featuresSection = await page.$('#features');
  if (featuresSection) {
    await featuresSection.screenshot({ path: 'contrast-nuclear-features.png' });
  }

  await browser.close();
}

testContrastNuclear().catch(console.error);

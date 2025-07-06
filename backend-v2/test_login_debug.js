const puppeteer = require('puppeteer');

async function debugLogin() {
  console.log('🔍 Debugging Login Page\n');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  try {
    console.log('Navigating to login page...');
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle0' });
    
    // Get all form elements
    const formInfo = await page.evaluate(() => {
      const forms = document.querySelectorAll('form');
      const inputs = document.querySelectorAll('input');
      const buttons = document.querySelectorAll('button');
      const links = document.querySelectorAll('a');
      
      return {
        formCount: forms.length,
        inputCount: inputs.length,
        inputs: Array.from(inputs).map(i => ({
          type: i.type,
          name: i.name,
          id: i.id,
          placeholder: i.placeholder,
          visible: i.offsetParent !== null
        })),
        buttons: Array.from(buttons).map(b => ({
          text: b.textContent?.trim(),
          type: b.type,
          visible: b.offsetParent !== null
        })),
        links: Array.from(links).map(a => ({
          text: a.textContent?.trim(),
          href: a.href
        })),
        pageTitle: document.title,
        bodyText: document.body.innerText.substring(0, 1000)
      };
    });
    
    console.log('\n📋 Page Analysis:');
    console.log('=================');
    console.log('Title:', formInfo.pageTitle);
    console.log('Forms found:', formInfo.formCount);
    console.log('Inputs found:', formInfo.inputCount);
    
    console.log('\n📝 Inputs:');
    formInfo.inputs.forEach((input, i) => {
      console.log(`  ${i + 1}. Type: ${input.type}, Name: ${input.name}, ID: ${input.id}, Visible: ${input.visible}`);
    });
    
    console.log('\n🔘 Buttons:');
    formInfo.buttons.forEach((button, i) => {
      console.log(`  ${i + 1}. Text: "${button.text}", Type: ${button.type}, Visible: ${button.visible}`);
    });
    
    console.log('\n🔗 Links:');
    formInfo.links.forEach((link, i) => {
      console.log(`  ${i + 1}. Text: "${link.text}", Href: ${link.href}`);
    });
    
    console.log('\n📄 Page Content Preview:');
    console.log(formInfo.bodyText);
    
    // Take screenshot
    await page.screenshot({ path: 'login_page_debug.png', fullPage: true });
    console.log('\n📸 Screenshot saved: login_page_debug.png');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    console.log('\nKeeping browser open for 30 seconds for manual inspection...');
    await new Promise(resolve => setTimeout(resolve, 30000));
    await browser.close();
  }
}

debugLogin().catch(console.error);
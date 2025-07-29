const puppeteer = require('puppeteer');

async function monitor() {
  console.log('🔍 LIVE LOGIN MONITORING');
  console.log('Opening browser for manual login test...');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    devtools: true,
    args: ['--start-maximized']
  });
  
  const page = await browser.newPage();
  
  // Monitor requests
  page.on('request', req => {
    if (req.url().includes('auth') || req.url().includes('login')) {
      console.log('REQUEST:', req.method(), req.url());
    }
  });
  
  page.on('response', res => {
    if (res.url().includes('auth') || res.url().includes('login')) {
      console.log('RESPONSE:', res.status(), res.url());
    }
  });
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('BROWSER ERROR:', msg.text());
    }
  });
  
  // Go to login
  await page.goto('http://localhost:3000/login');
  console.log('✅ Login page loaded');
  console.log('👆 Please manually login with: admin@bookedbarber.com / admin123');
  console.log('🔍 Watching all network activity...');
  
  // Monitor for changes every 5 seconds
  setInterval(async () => {
    const url = page.url();
    if (url.includes('/dashboard')) {
      console.log('🎉 SUCCESS\! Reached dashboard:', url);
    } else if (url.includes('error=')) {
      console.log('❌ ERROR detected in URL:', url);
    }
  }, 5000);
}

monitor().catch(console.error);
EOF < /dev/null
async function verifyLogin() {
  const puppeteer = require("puppeteer");
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  
  console.log("=== FINAL LOGIN VERIFICATION ===");
  
  await page.goto("http://localhost:3000/login");
  console.log("1. ✅ Login page loaded");
  
  await page.type("#email", "admin@bookedbarber.com");
  await page.type("#password", "admin123");
  console.log("2. ✅ Credentials entered");
  
  await page.click("button[type=submit]");
  await new Promise(r => setTimeout(r, 5000));
  
  const url = page.url();
  console.log("3. Final URL:", url);
  
  if (url.includes("/dashboard") && \!url.includes("error=")) {
    console.log("🎉 SUCCESS\! Login is working correctly\!");
    console.log("✅ User can login and access dashboard");
  } else {
    console.log("❌ Login failed, redirected to:", url);
  }
  
  const cookies = await page.cookies();
  const authCookies = cookies.filter(c => 
    c.name.includes("access_token") || 
    c.name.includes("refresh_token") || 
    c.name.includes("csrf_token")
  );
  console.log("4. Auth cookies set:", authCookies.length);
  
  console.log("
=== LOGIN VERIFICATION COMPLETE ===");
}

verifyLogin();

const puppeteer = require("puppeteer");

async function liveDebug() {
  console.log("🔍 LIVE DEBUGGING SESSION - Manual Login Monitoring");
  console.log("📍 This will monitor what happens when you manually login");
  console.log("🖥️  I will keep the browser open and watch everything");
  
  const browser = await puppeteer.launch({ 
    headless: false,
    devtools: true,
    args: ["--start-maximized"]
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  
  // Monitor EVERYTHING
  page.on("request", req => {
    const url = req.url();
    if (url.includes("auth") || url.includes("login") || url.includes("dashboard")) {
      console.log(`📤 ${req.method()} ${url}`);
      if (req.postData()) {
        console.log(`   📝 Body: ${req.postData()}`);
      }
    }
  });
  
  page.on("response", async res => {
    const url = res.url();
    if (url.includes("auth") || url.includes("login") || url.includes("dashboard")) {
      console.log(`📥 ${res.status()} ${url}`);
      const headers = res.headers();
      if (headers["set-cookie"]) {
        console.log(`   🍪 Set-Cookie: ${headers["set-cookie"]}`);
      }
    }
  });
  
  page.on("console", msg => {
    const type = msg.type();
    const text = msg.text();
    if (type === "error" || text.includes("login") || text.includes("auth")) {
      console.log(`🖥️  Console ${type.toUpperCase()}: ${text}`);
    }
  });
  
  page.on("pageerror", error => {
    console.log(`💥 JavaScript ERROR: ${error.message}`);
  });
  
  // Navigate to login
  console.log("🚀 Opening login page...");
  await page.goto("http://localhost:3000/login");
  
  console.log("📋 Initial cookies:");
  const initialCookies = await page.cookies();
  initialCookies.forEach(cookie => {
    console.log(`   ${cookie.name}: ${cookie.value.substring(0, 30)}...`);
  });
  
  console.log("\n⏳ READY FOR MANUAL LOGIN");
  console.log("👆 Please manually login with: admin@bookedbarber.com / admin123");
  console.log("🔍 I will monitor all network activity and show you what happens...");
  console.log("\n--- MONITORING STARTED ---");
  
  // Keep monitoring for 5 minutes
  let monitorTime = 0;
  const interval = setInterval(async () => {
    monitorTime += 10;
    
    // Check URL every 10 seconds
    const currentUrl = page.url();
    if (currentUrl \!== "http://localhost:3000/login") {
      console.log(`🔄 URL changed to: ${currentUrl}`);
    }
    
    // Show cookie status every 30 seconds
    if (monitorTime % 30 === 0) {
      const currentCookies = await page.cookies();
      const authCookies = currentCookies.filter(c => 
        c.name.includes("token") || c.name.includes("csrf")
      );
      console.log(`🍪 Current auth cookies: ${authCookies.length}`);
    }
    
    // Stop after 5 minutes
    if (monitorTime >= 300) {
      clearInterval(interval);
      console.log("\n⏰ Monitoring session ended (5 minutes)");
      console.log("📊 Final Status:");
      console.log(`   URL: ${page.url()}`);
      const finalCookies = await page.cookies();
      console.log(`   Total cookies: ${finalCookies.length}`);
      
      // Keep browser open for manual inspection
      console.log("\n🔍 Browser will stay open for manual inspection");
    }
  }, 10000);
}

liveDebug().catch(console.error);

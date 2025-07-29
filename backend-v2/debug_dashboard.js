const puppeteer = require("puppeteer");

async function debugDashboard() {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  
  // Monitor ALL requests after dashboard loads
  page.on("request", req => {
    console.log("REQUEST:", req.method(), req.url());
  });
  
  page.on("response", res => {
    console.log("RESPONSE:", res.status(), res.url());
    if (res.status() === 401) {
      console.log("\!\!\! 401 UNAUTHORIZED \!\!\!");
    }
  });
  
  page.on("console", msg => {
    console.log("CONSOLE:", msg.type(), msg.text());
  });
  
  // Direct navigation to dashboard (bypassing login)
  console.log("Going directly to dashboard...");
  await page.goto("http://localhost:3000/dashboard");
  
  console.log("Waiting 10 seconds to see what happens...");
  await new Promise(r => setTimeout(r, 10000));
  
  console.log("Final URL:", page.url());
}

debugDashboard();

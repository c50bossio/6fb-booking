const puppeteer = require("puppeteer");

async function verify() {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  
  console.log("VERIFYING LOGIN...");
  
  await page.goto("http://localhost:3000/login");
  await page.type("#email", "admin@bookedbarber.com");
  await page.type("#password", "admin123");
  await page.click("button[type=submit]");
  
  await new Promise(r => setTimeout(r, 5000));
  
  const url = page.url();
  console.log("Final URL:", url);
  
  if (url.includes("/dashboard")) {
    console.log("SUCCESS\! Login works\!");
  } else {
    console.log("FAILED\! Redirected to:", url);
  }
}

verify();

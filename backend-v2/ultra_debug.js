const puppeteer = require("puppeteer");

async function debug() {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  
  page.on("request", req => {
    if (req.url().includes("auth")) console.log("REQ:", req.url());
  });
  
  page.on("response", res => {
    if (res.url().includes("auth")) {
      console.log("RES:", res.status(), res.url());
      const cookies = res.headers()["set-cookie"];
      if (cookies) console.log("COOKIES:", cookies);
    }
  });
  
  await page.goto("http://localhost:3000/login");
  console.log("Initial cookies:", (await page.cookies()).length);
  
  await page.type("#email", "admin@bookedbarber.com");
  await page.type("#password", "admin123");
  await page.click("button[type=submit]");
  
  await new Promise(r => setTimeout(r, 5000));
  
  console.log("Final URL:", page.url());
  console.log("Final cookies:", (await page.cookies()).length);
}

debug();

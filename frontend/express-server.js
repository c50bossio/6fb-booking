const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 4000;

// Serve static files from the .next/out directory if it exists, otherwise .next/static
const staticPath = fs.existsSync('.next/out') ? '.next/out' : '.next/static';
const buildPath = '.next';

console.log(`Attempting to serve from: ${path.resolve(staticPath)}`);
console.log(`Build path: ${path.resolve(buildPath)}`);

// Middleware to serve static files
app.use(express.static(path.join(__dirname, staticPath)));
app.use('/static', express.static(path.join(__dirname, '.next/static')));
app.use('/_next', express.static(path.join(__dirname, '.next')));

// Serve the main pages
app.get('/', (req, res) => {
  const indexPath = path.join(__dirname, staticPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>6FB Booking Platform</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; margin: 0; padding: 40px; background: #f5f5f5; }
          .container { max-width: 800px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          h1 { color: #333; margin-bottom: 30px; }
          .nav-links { display: flex; flex-wrap: wrap; gap: 15px; margin-bottom: 30px; }
          .nav-link { 
            display: inline-block; 
            padding: 10px 15px; 
            background: #007acc; 
            color: white; 
            text-decoration: none; 
            border-radius: 5px; 
            transition: background 0.2s;
          }
          .nav-link:hover { background: #005999; }
          .status { padding: 20px; background: #e8f5e8; border-left: 4px solid #4caf50; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🚀 6FB Booking Platform - Express Server</h1>
          
          <div class="status">
            <strong>✅ Server Status:</strong> Running on Express.js<br>
            <strong>📁 Static Path:</strong> ${staticPath}<br>
            <strong>🏗️ Build Path:</strong> ${buildPath}<br>
            <strong>🔗 Port:</strong> ${PORT}
          </div>

          <h2>🔐 Authentication Testing</h2>
          <div class="nav-links">
            <a href="/login" class="nav-link">Login Page</a>
            <a href="/signup" class="nav-link">Signup Page</a>
            <a href="/dashboard" class="nav-link">Dashboard</a>
            <a href="/auth/google/callback" class="nav-link">Google OAuth Callback</a>
          </div>

          <h2>📋 Available Pages</h2>
          <div class="nav-links">
            <a href="/appointments" class="nav-link">Appointments</a>
            <a href="/barbers" class="nav-link">Barbers</a>
            <a href="/clients" class="nav-link">Clients</a>
            <a href="/payments" class="nav-link">Payments</a>
            <a href="/settings" class="nav-link">Settings</a>
            <a href="/analytics" class="nav-link">Analytics</a>
          </div>

          <h2>🛠️ Development Tools</h2>
          <div class="nav-links">
            <a href="/debug-login" class="nav-link">Debug Login</a>
            <a href="/test-login" class="nav-link">Test Login</a>
            <a href="/api/health" class="nav-link">Health Check</a>
          </div>

          <p><strong>Note:</strong> This is a fallback Express server serving the Next.js build files. 
          If pages don't load correctly, the Next.js production server might need additional configuration.</p>
        </div>
      </body>
      </html>
    `);
  }
});

// Handle common routes
const routes = [
  '/login', '/signup', '/dashboard', '/appointments', '/barbers', '/clients', 
  '/payments', '/settings', '/analytics', '/debug-login', '/test-login',
  '/auth/google/callback', '/reset-password', '/payouts'
];

routes.forEach(route => {
  app.get(route, (req, res) => {
    const filePath = path.join(__dirname, staticPath, `${route}.html`);
    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      // Fallback to serving a basic page structure
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>6FB - ${route}</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; margin: 0; padding: 40px; background: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); text-align: center; }
            .back-link { color: #007acc; text-decoration: none; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>6FB Platform</h1>
            <h2>Page: ${route}</h2>
            <p>This page is being served by the Express fallback server.</p>
            <p>The Next.js build for this route needs to be properly configured.</p>
            <a href="/" class="back-link">← Back to Home</a>
          </div>
        </body>
        </html>
      `);
    }
  });
});

// API health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    server: 'express-fallback',
    timestamp: new Date().toISOString(),
    port: PORT,
    staticPath: staticPath
  });
});

// Catch-all handler
app.get('*', (req, res) => {
  res.status(404).send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>404 - Page Not Found</title>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; margin: 0; padding: 40px; background: #f5f5f5; text-align: center; }
        .container { max-width: 500px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .back-link { color: #007acc; text-decoration: none; display: inline-block; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>404 - Page Not Found</h1>
        <p>The requested page <code>${req.path}</code> was not found.</p>
        <a href="/" class="back-link">← Back to Home</a>
      </div>
    </body>
    </html>
  `);
});

app.listen(PORT, () => {
  console.log(`🚀 Express server running on http://localhost:${PORT}`);
  console.log(`📁 Serving static files from: ${path.resolve(staticPath)}`);
  console.log(`🔗 Available routes: ${routes.join(', ')}`);
  console.log('');
  console.log('🔐 Authentication Testing URLs:');
  console.log(`   Login:    http://localhost:${PORT}/login`);
  console.log(`   Signup:   http://localhost:${PORT}/signup`);
  console.log(`   Dashboard: http://localhost:${PORT}/dashboard`);
  console.log('');
});
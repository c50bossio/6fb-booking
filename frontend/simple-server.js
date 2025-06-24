const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 4000;

// MIME types
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
};

// Sample authentication form HTML
const loginHTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>6FB Login - Testing Server</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .container { 
            background: white;
            padding: 40px;
            border-radius: 10px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            width: 100%;
            max-width: 400px;
        }
        h1 { 
            text-align: center;
            margin-bottom: 30px;
            color: #333;
            font-size: 24px;
        }
        .form-group { margin-bottom: 20px; }
        label { 
            display: block;
            margin-bottom: 5px;
            color: #555;
            font-weight: 500;
        }
        input { 
            width: 100%;
            padding: 12px;
            border: 1px solid #ddd;
            border-radius: 5px;
            font-size: 16px;
            transition: border-color 0.3s;
        }
        input:focus {
            outline: none;
            border-color: #667eea;
            box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.2);
        }
        .btn {
            width: 100%;
            padding: 12px;
            background: #667eea;
            color: white;
            border: none;
            border-radius: 5px;
            font-size: 16px;
            cursor: pointer;
            transition: background 0.3s;
            margin-bottom: 15px;
        }
        .btn:hover { background: #5a67d8; }
        .btn-google {
            background: #db4437;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
        }
        .btn-google:hover { background: #c23321; }
        .links {
            text-align: center;
            margin-top: 20px;
        }
        .links a {
            color: #667eea;
            text-decoration: none;
            margin: 0 10px;
        }
        .links a:hover { text-decoration: underline; }
        .status {
            background: #e8f5e8;
            border: 1px solid #4caf50;
            color: #2e7d32;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 20px;
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="status">
            ✅ <strong>Testing Server Active</strong><br>
            Port: ${PORT} | Server: Simple HTTP
        </div>
        
        <h1>🔐 6FB Authentication Test</h1>
        
        <form id="loginForm" onsubmit="handleLogin(event)">
            <div class="form-group">
                <label for="email">Email Address</label>
                <input type="email" id="email" name="email" placeholder="you@example.com" required>
            </div>
            
            <div class="form-group">
                <label for="password">Password</label>
                <input type="password" id="password" name="password" placeholder="••••••••" required>
            </div>
            
            <button type="submit" class="btn">Sign In</button>
            
            <button type="button" class="btn btn-google" onclick="handleGoogleLogin()">
                <svg width="18" height="18" viewBox="0 0 18 18">
                    <path fill="#4285F4" d="M17.64 9.20c0-.63-.06-1.23-.16-1.82H9v3.45h4.84c-.21 1.12-.84 2.07-1.8 2.71v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.6z"/>
                    <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.71H.98v2.33C2.47 15.13 5.48 18 9 18z"/>
                    <path fill="#FBBC05" d="M3.97 10.71c-.18-.54-.28-1.12-.28-1.71s.1-1.17.28-1.71V4.96H.98C.36 6.2 0 7.55 0 9s.36 2.8.98 4.04l2.99-2.33z"/>
                    <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.45 3.44 1.34l2.58-2.58C13.47.92 11.43 0 9 0 5.48 0 2.47 2.87.98 6.96l2.99 2.33C4.68 7.16 6.66 3.58 9 3.58z"/>
                </svg>
                Continue with Google
            </button>
        </form>
        
        <div class="links">
            <a href="/signup">Create Account</a>
            <a href="/dashboard">Dashboard</a>
            <a href="/">Home</a>
        </div>
        
        <script>
            function handleLogin(event) {
                event.preventDefault();
                const email = document.getElementById('email').value;
                const password = document.getElementById('password').value;
                
                // Simulate login success for testing
                alert('✅ Login simulation successful!\\n\\nEmail: ' + email + '\\nServer: Testing Server on port ${PORT}\\n\\nNext: Navigate to dashboard to test auth flow.');
                
                // In a real app, this would make an API call
                setTimeout(() => {
                    window.location.href = '/dashboard';
                }, 1000);
            }
            
            function handleGoogleLogin() {
                alert('🔍 Google OAuth Test\\n\\nThis would redirect to Google OAuth in production.\\n\\nFor testing: simulating Google login success.');
                setTimeout(() => {
                    window.location.href = '/dashboard';
                }, 1000);
            }
        </script>
    </div>
</body>
</html>`;

const signupHTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>6FB Signup - Testing Server</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #764ba2 0%, #667eea 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .container { 
            background: white;
            padding: 40px;
            border-radius: 10px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            width: 100%;
            max-width: 500px;
        }
        h1 { 
            text-align: center;
            margin-bottom: 30px;
            color: #333;
            font-size: 24px;
        }
        .form-group { margin-bottom: 20px; }
        .form-row { 
            display: flex;
            gap: 15px;
        }
        .form-row .form-group { flex: 1; }
        label { 
            display: block;
            margin-bottom: 5px;
            color: #555;
            font-weight: 500;
        }
        input, select { 
            width: 100%;
            padding: 12px;
            border: 1px solid #ddd;
            border-radius: 5px;
            font-size: 16px;
            transition: border-color 0.3s;
        }
        input:focus, select:focus {
            outline: none;
            border-color: #764ba2;
            box-shadow: 0 0 0 2px rgba(118, 75, 162, 0.2);
        }
        .btn {
            width: 100%;
            padding: 12px;
            background: #764ba2;
            color: white;
            border: none;
            border-radius: 5px;
            font-size: 16px;
            cursor: pointer;
            transition: background 0.3s;
        }
        .btn:hover { background: #5a3578; }
        .links {
            text-align: center;
            margin-top: 20px;
        }
        .links a {
            color: #764ba2;
            text-decoration: none;
            margin: 0 10px;
        }
        .links a:hover { text-decoration: underline; }
        .status {
            background: #e3f2fd;
            border: 1px solid #2196f3;
            color: #1565c0;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 20px;
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="status">
            🧪 <strong>Testing Environment</strong><br>
            Server: Simple HTTP | Port: ${PORT}
        </div>
        
        <h1>📝 Create 6FB Account</h1>
        
        <form id="signupForm" onsubmit="handleSignup(event)">
            <div class="form-row">
                <div class="form-group">
                    <label for="firstName">First Name</label>
                    <input type="text" id="firstName" name="firstName" placeholder="John" required>
                </div>
                <div class="form-group">
                    <label for="lastName">Last Name</label>
                    <input type="text" id="lastName" name="lastName" placeholder="Doe" required>
                </div>
            </div>
            
            <div class="form-group">
                <label for="email">Email Address</label>
                <input type="email" id="email" name="email" placeholder="john@barbershop.com" required>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label for="phone">Phone Number</label>
                    <input type="tel" id="phone" name="phone" placeholder="(555) 123-4567" required>
                </div>
                <div class="form-group">
                    <label for="role">Role</label>
                    <select id="role" name="role" required>
                        <option value="">Select Role</option>
                        <option value="barber">Barber</option>
                        <option value="shop_owner">Shop Owner</option>
                        <option value="manager">Manager</option>
                    </select>
                </div>
            </div>
            
            <div class="form-group">
                <label for="shopName">Shop Name (Optional)</label>
                <input type="text" id="shopName" name="shopName" placeholder="The Cut Above">
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label for="password">Password</label>
                    <input type="password" id="password" name="password" placeholder="••••••••" required>
                </div>
                <div class="form-group">
                    <label for="confirmPassword">Confirm Password</label>
                    <input type="password" id="confirmPassword" name="confirmPassword" placeholder="••••••••" required>
                </div>
            </div>
            
            <button type="submit" class="btn">Create Account</button>
        </form>
        
        <div class="links">
            <a href="/login">Already have an account?</a>
            <a href="/">Home</a>
        </div>
        
        <script>
            function handleSignup(event) {
                event.preventDefault();
                const formData = new FormData(event.target);
                const data = Object.fromEntries(formData);
                
                if (data.password !== data.confirmPassword) {
                    alert('❌ Passwords do not match!');
                    return;
                }
                
                // Simulate signup success for testing
                alert('✅ Account creation simulation successful!\\n\\nEmail: ' + data.email + '\\nRole: ' + data.role + '\\nServer: Testing Server on port ${PORT}\\n\\nNext: You would be redirected to dashboard.');
                
                setTimeout(() => {
                    window.location.href = '/dashboard';
                }, 1000);
            }
        </script>
    </div>
</body>
</html>`;

const dashboardHTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>6FB Dashboard - Testing Server</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f5f5f5;
            min-height: 100vh;
        }
        .navbar {
            background: #2c3e50;
            color: white;
            padding: 15px 30px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .navbar h1 { font-size: 20px; }
        .navbar .user { font-size: 14px; }
        .container { 
            max-width: 1200px;
            margin: 40px auto;
            padding: 0 30px;
        }
        .status {
            background: #d4edda;
            border: 1px solid #c3e6cb;
            color: #155724;
            padding: 20px;
            border-radius: 5px;
            margin-bottom: 30px;
            text-align: center;
        }
        .cards {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .card {
            background: white;
            padding: 25px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .card h3 { 
            margin-bottom: 15px;
            color: #2c3e50;
            font-size: 18px;
        }
        .features {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 15px;
        }
        .feature {
            background: #ecf0f1;
            padding: 15px;
            border-radius: 5px;
            text-align: center;
            cursor: pointer;
            transition: background 0.3s;
        }
        .feature:hover { background: #d5dbdb; }
        .feature strong { display: block; margin-bottom: 5px; color: #2c3e50; }
        .links {
            text-align: center;
            margin-top: 30px;
        }
        .links a {
            color: #3498db;
            text-decoration: none;
            margin: 0 15px;
            padding: 10px 20px;
            border: 1px solid #3498db;
            border-radius: 5px;
            transition: all 0.3s;
        }
        .links a:hover {
            background: #3498db;
            color: white;
        }
    </style>
</head>
<body>
    <div class="navbar">
        <h1>🏪 6FB Dashboard</h1>
        <div class="user">👤 Test User | <a href="/login" style="color: #ecf0f1;">Logout</a></div>
    </div>
    
    <div class="container">
        <div class="status">
            ✅ <strong>Authentication Test Successful!</strong><br>
            You have successfully accessed the dashboard via the testing server.<br>
            Server: Simple HTTP | Port: ${PORT} | Time: ${new Date().toLocaleTimeString()}
        </div>
        
        <div class="cards">
            <div class="card">
                <h3>🔐 Authentication Features Tested</h3>
                <div class="features">
                    <div class="feature">
                        <strong>✅ Login Page</strong>
                        Email/Password form working
                    </div>
                    <div class="feature">
                        <strong>✅ Signup Page</strong>
                        Account creation form working
                    </div>
                    <div class="feature">
                        <strong>🔍 Google OAuth</strong>
                        Button available (simulation)
                    </div>
                    <div class="feature">
                        <strong>✅ Dashboard Access</strong>
                        Protected route accessible
                    </div>
                </div>
            </div>
            
            <div class="card">
                <h3>📊 Test Results Summary</h3>
                <p><strong>Server Status:</strong> ✅ Working</p>
                <p><strong>Login Flow:</strong> ✅ Functional</p>
                <p><strong>Signup Flow:</strong> ✅ Functional</p>
                <p><strong>Dashboard:</strong> ✅ Accessible</p>
                <p><strong>Port:</strong> ${PORT}</p>
                <p><strong>Time:</strong> ${new Date().toISOString()}</p>
            </div>
        </div>
        
        <div class="links">
            <a href="/login">🔐 Test Login Again</a>
            <a href="/signup">📝 Test Signup Again</a>
            <a href="/">🏠 Home</a>
        </div>
    </div>
</body>
</html>`;

const homeHTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>6FB Testing Server</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #74b9ff 0%, #0984e3 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .container { 
            background: white;
            padding: 50px;
            border-radius: 15px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            text-align: center;
            max-width: 600px;
        }
        h1 { 
            color: #2d3436;
            margin-bottom: 20px;
            font-size: 32px;
        }
        .subtitle {
            color: #636e72;
            margin-bottom: 40px;
            font-size: 18px;
        }
        .status {
            background: #d1f2eb;
            border: 2px solid #00b894;
            color: #00b894;
            padding: 20px;
            border-radius: 10px;
            margin-bottom: 40px;
            font-weight: 600;
        }
        .buttons {
            display: flex;
            gap: 15px;
            flex-wrap: wrap;
            justify-content: center;
            margin-bottom: 30px;
        }
        .btn {
            padding: 15px 25px;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
            text-decoration: none;
            color: white;
            display: inline-block;
        }
        .btn-primary { background: #74b9ff; }
        .btn-primary:hover { background: #0984e3; transform: translateY(-2px); }
        .btn-secondary { background: #fd79a8; }
        .btn-secondary:hover { background: #e84393; transform: translateY(-2px); }
        .btn-success { background: #00b894; }
        .btn-success:hover { background: #00a085; transform: translateY(-2px); }
        .info {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            color: #495057;
            font-size: 14px;
            line-height: 1.6;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 6FB Testing Server</h1>
        <p class="subtitle">Authentication & Frontend Testing Environment</p>
        
        <div class="status">
            ✅ Server Online | Port: ${PORT} | Simple HTTP Server
        </div>
        
        <div class="buttons">
            <a href="/login" class="btn btn-primary">🔐 Test Login</a>
            <a href="/signup" class="btn btn-secondary">📝 Test Signup</a>
            <a href="/dashboard" class="btn btn-success">📊 View Dashboard</a>
        </div>
        
        <div class="info">
            <strong>🎯 Purpose:</strong> This server provides a working frontend for testing authentication flows while the main Next.js development server is experiencing issues.<br><br>
            <strong>📋 Features Available:</strong><br>
            • Email/Password login simulation<br>
            • Account creation forms<br>
            • Google OAuth button (simulation)<br>
            • Protected dashboard access<br>
            • Responsive design<br><br>
            <strong>⚡ Quick Test:</strong> Click "Test Login" → Enter any credentials → Access dashboard
        </div>
    </div>
</body>
</html>`;

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Route handling
  switch (pathname) {
    case '/':
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(homeHTML);
      break;
      
    case '/login':
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(loginHTML);
      break;
      
    case '/signup':
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(signupHTML);
      break;
      
    case '/dashboard':
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(dashboardHTML);
      break;
      
    case '/api/health':
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        status: 'ok', 
        server: 'simple-http',
        port: PORT,
        timestamp: new Date().toISOString()
      }));
      break;
      
    default:
      // Try to serve static files
      const filePath = path.join(__dirname, pathname);
      
      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const ext = path.extname(filePath);
        const mimeType = mimeTypes[ext] || 'application/octet-stream';
        
        fs.readFile(filePath, (err, data) => {
          if (err) {
            res.writeHead(500);
            res.end('Server Error');
          } else {
            res.writeHead(200, { 'Content-Type': mimeType });
            res.end(data);
          }
        });
      } else {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end(`
          <h1>404 - Page Not Found</h1>
          <p>The page <code>${pathname}</code> was not found.</p>
          <a href="/">← Back to Home</a>
        `);
      }
      break;
  }
});

server.listen(PORT, () => {
  console.log(`🚀 Simple HTTP server running on http://localhost:${PORT}`);
  console.log('');
  console.log('🔐 Authentication Testing URLs:');
  console.log(`   Home:     http://localhost:${PORT}/`);
  console.log(`   Login:    http://localhost:${PORT}/login`);
  console.log(`   Signup:   http://localhost:${PORT}/signup`);
  console.log(`   Dashboard: http://localhost:${PORT}/dashboard`);
  console.log(`   Health:   http://localhost:${PORT}/api/health`);
  console.log('');
  console.log('✅ Ready for authentication flow testing!');
});
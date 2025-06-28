# Puppeteer Page Analysis for 6FB Booking

This tool uses Puppeteer to automatically crawl and analyze all pages in the 6FB Booking application to identify duplicates, dead links, and redundant content.

## Prerequisites

1. **Node.js** (v14 or higher)
2. **Python** (for backend server)
3. **Chrome/Chromium** (automatically downloaded by Puppeteer)

## Installation

1. Install Puppeteer in the root directory:
```bash
cd /Users/bossio/6fb-booking
npm install puppeteer
```

2. Ensure backend dependencies are installed:
```bash
cd backend
pip install -r requirements.txt
cd ..
```

3. Ensure frontend dependencies are installed:
```bash
cd frontend
npm install
cd ..
```

## Usage

### Basic Usage

Run the analysis from the project root:
```bash
node analyze-pages-puppeteer.js
```

### What the Script Does

1. **Server Management**
   - Automatically starts frontend and backend servers if not running
   - Waits for servers to be ready before crawling

2. **Page Discovery**
   - Crawls all accessible pages starting from the homepage
   - Follows internal links recursively
   - Scans public HTML files in the frontend/public directory

3. **Authentication Testing**
   - Attempts to find and use login forms
   - Crawls authenticated pages if login succeeds

4. **Analysis Features**
   - Identifies duplicate content by comparing page content hashes
   - Detects dead or broken links
   - Categorizes pages (auth, dashboard, booking, public, etc.)
   - Finds demo/test pages that might not belong in production
   - Identifies redundant authentication pages

5. **Concurrent Crawling**
   - Uses up to 5 concurrent page crawls for faster analysis
   - Handles timeouts and errors gracefully

## Output

The script generates two report files:

1. **JSON Report**: `page-analysis-report-[timestamp].json`
   - Machine-readable format with all data
   - Complete page information and metadata

2. **Markdown Report**: `page-analysis-report-[timestamp].md`
   - Human-readable format
   - Summary statistics
   - List of all discovered pages
   - Duplicate content groups
   - Dead links
   - Actionable recommendations

## Configuration

You can modify the configuration at the top of the script:

```javascript
const CONFIG = {
  frontendUrl: 'http://localhost:3000',
  backendUrl: 'http://localhost:8000',
  maxConcurrency: 5,              // Number of pages to crawl simultaneously
  crawlTimeout: 60000,            // Overall crawl timeout (ms)
  pageLoadTimeout: 30000,         // Individual page load timeout (ms)
  startupDelay: 5000,             // Delay after starting servers (ms)
  authCredentials: {              // Test credentials for auth crawl
    email: 'test@example.com',
    password: 'testpassword123'
  }
};
```

## Interpreting Results

### Summary Section
- **Total Pages Discovered**: All unique pages found
- **Dead Links**: Links that returned errors or timeouts
- **Public Pages**: Pages accessible without authentication
- **Auth-Required Pages**: Pages that need login
- **Duplicate Content Groups**: Sets of pages with identical content

### Recommendations
The script provides recommendations based on:
- **DUPLICATE_CONTENT**: Pages with identical content
- **DEAD_LINKS**: Broken or inaccessible links
- **REDUNDANT_AUTH**: Multiple authentication pages
- **DEMO_PAGES**: Test/demo pages in production

### Page Types
- **AUTH_FORM**: Pages with login forms
- **DASHBOARD**: Analytics and dashboard pages
- **BOOKING**: Appointment and booking pages
- **FORM_PAGE**: Pages with data entry forms
- **NAVIGATION_HUB**: Pages with many links
- **CONTENT_PAGE**: General content pages

## Troubleshooting

### Script won't start
- Ensure you're in the project root directory
- Check that Node.js is installed: `node --version`
- Install Puppeteer: `npm install puppeteer`

### Servers fail to start
- Check if ports 3000 and 8000 are already in use
- Ensure Python virtual environment is activated for backend
- Check for missing dependencies

### Authentication crawl fails
- Update test credentials in CONFIG
- Ensure test user exists in the database
- Check login form selectors match your implementation

### Timeout errors
- Increase `pageLoadTimeout` in CONFIG
- Check network connectivity
- Ensure servers are responding properly

## Advanced Usage

### Custom Starting Points
Add additional entry points to crawl:
```javascript
// In the main() function, after initial crawl
await crawlPage(browser, `${CONFIG.frontendUrl}/custom-page`);
```

### Exclude Patterns
Add patterns to skip certain URLs:
```javascript
// In crawlPage() function
if (url.includes('skip-this')) return;
```

### Custom Analysis
Add custom analysis logic in the `analyzeResults()` function to detect specific patterns or issues relevant to your application.

## Cleanup

The script automatically:
- Closes the Puppeteer browser
- Stops any servers it started
- Handles interruptions gracefully (Ctrl+C)

## Security Note

This script is for development/testing only. Do not run it against production servers without proper authorization.

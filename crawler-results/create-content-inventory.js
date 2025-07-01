const fs = require('fs').promises;
const path = require('path');

async function createContentInventory() {
    const resultsDir = __dirname;
    
    // Read the comprehensive analysis report
    const reportPath = path.join(resultsDir, 'comprehensive-analysis-report.json');
    const report = JSON.parse(await fs.readFile(reportPath, 'utf8'));
    
    const workingPages = report.pages.filter(p => p.status === 200);
    
    const inventory = {
        overview: {
            totalPagesDiscovered: report.metadata.totalPages,
            workingPages: workingPages.length,
            siteHealthScore: report.insights.siteHealth.healthScore,
            technologies: report.summary.technologies,
            generatedAt: new Date().toISOString()
        },
        workingRoutes: workingPages.map(page => ({
            route: page.route,
            title: page.title,
            status: page.status,
            responseTime: page.responseTime,
            components: Object.entries(page.components).filter(([k,v]) => v).map(([k]) => k),
            forms: page.forms.length,
            purpose: inferPagePurpose(page),
            accessibility: {
                imagesWithoutAlt: page.accessibility.imagesWithoutAlt,
                seoScore: calculateSEOScore(page)
            }
        })),
        siteArchitecture: {
            coreFeatures: identifyCoreFeatures(workingPages),
            authenticationFlow: analyzeAuthFlow(workingPages),
            bookingFlow: analyzeBookingFlow(workingPages),
            userJourneys: identifyUserJourneys(workingPages)
        },
        recommendations: {
            immediate: [
                'Only 5 out of 70 tested routes are working - investigate Next.js routing configuration',
                'Many pages exist in src/app but are returning 404 - check route structure',
                'Implement proper error pages for 404s',
                'Add authentication guards for protected routes'
            ],
            development: [
                'Complete the dashboard implementation',
                'Implement customer portal routes',
                'Add settings and configuration pages',
                'Build out analytics and reporting pages'
            ],
            production: [
                'Add proper meta descriptions and SEO tags',
                'Implement proper error handling',
                'Add loading states and skeleton screens',
                'Optimize performance and bundle size'
            ]
        }
    };
    
    // Save content inventory
    const inventoryPath = path.join(resultsDir, 'content-inventory.json');
    await fs.writeFile(inventoryPath, JSON.stringify(inventory, null, 2));
    
    // Generate human-readable content inventory
    const readableInventory = generateReadableInventory(inventory);
    const readableInventoryPath = path.join(resultsDir, 'content-inventory.md');
    await fs.writeFile(readableInventoryPath, readableInventory);
    
    console.log(`Content inventory generated:`);
    console.log(`- JSON: ${inventoryPath}`);
    console.log(`- Readable: ${readableInventoryPath}`);
    
    return inventory;
}

function inferPagePurpose(page) {
    const route = page.route;
    const title = page.title.toLowerCase();
    const components = Object.entries(page.components).filter(([k,v]) => v).map(([k]) => k);
    
    if (route === '/') return 'Landing page - main entry point';
    if (route === '/login') return 'User authentication';
    if (route === '/dashboard') return 'Main dashboard - authenticated user home';
    if (route === '/book') return 'Booking flow - appointment scheduling';
    if (route === '/api/health') return 'API health check endpoint';
    
    return 'Page purpose unclear - needs investigation';
}

function calculateSEOScore(page) {
    let score = 0;
    if (page.seo.hasTitle) score += 2;
    if (page.seo.titleLength > 10 && page.seo.titleLength < 60) score += 1;
    if (page.seo.hasDescription) score += 2;
    if (page.seo.h1Count === 1) score += 2;
    if (page.seo.hasOpenGraph) score += 1;
    return Math.min(score, 8);
}

function identifyCoreFeatures(workingPages) {
    const features = [];
    
    workingPages.forEach(page => {
        if (page.route === '/') features.push('Landing Page');
        if (page.route === '/login') features.push('Authentication');
        if (page.route === '/dashboard') features.push('Dashboard');
        if (page.route === '/book') features.push('Booking System');
        if (page.route.includes('api')) features.push('API Layer');
    });
    
    return [...new Set(features)];
}

function analyzeAuthFlow(workingPages) {
    const authPages = workingPages.filter(p => 
        p.route.includes('login') || 
        p.route.includes('signup') || 
        p.route.includes('auth')
    );
    
    return {
        availablePages: authPages.map(p => p.route),
        status: authPages.length > 0 ? 'Partially Implemented' : 'Not Implemented',
        notes: 'Login page exists but signup/register pages are missing'
    };
}

function analyzeBookingFlow(workingPages) {
    const bookingPages = workingPages.filter(p => 
        p.route.includes('book') || 
        p.route.includes('appointment') || 
        p.route.includes('calendar')
    );
    
    return {
        availablePages: bookingPages.map(p => p.route),
        status: bookingPages.length > 0 ? 'Basic Implementation' : 'Not Implemented',
        notes: '/book page exists and loads successfully'
    };
}

function identifyUserJourneys(workingPages) {
    return [
        {
            journey: 'New User Registration',
            steps: ['/ (Landing)', '/signup (404)', '/login (Working)'],
            status: 'Broken - signup page missing',
            completion: '33%'
        },
        {
            journey: 'Existing User Login',
            steps: ['/ (Landing)', '/login (Working)', '/dashboard (Working)'],
            status: 'Working',
            completion: '100%'
        },
        {
            journey: 'Booking Appointment',
            steps: ['/book (Working)', '/payment/* (404)', '/confirmation (404)'],
            status: 'Partially Broken',
            completion: '33%'
        },
        {
            journey: 'Dashboard Management',
            steps: ['/dashboard (Working)', '/dashboard/* (All 404)'],
            status: 'Broken - sub-pages missing',
            completion: '10%'
        }
    ];
}

function generateReadableInventory(inventory) {
    return `# 6FB Booking Content Inventory

## Site Overview
- **Total Pages Discovered**: ${inventory.overview.totalPagesDiscovered}
- **Working Pages**: ${inventory.overview.workingPages}
- **Health Score**: ${inventory.overview.siteHealthScore}%
- **Technology Stack**: ${inventory.overview.technologies.join(', ')}
- **Generated**: ${inventory.overview.generatedAt}

## Working Routes Analysis

${inventory.workingRoutes.map(route => `
### ${route.route} (${route.status})
- **Title**: ${route.title}
- **Purpose**: ${route.purpose}
- **Response Time**: ${route.responseTime}ms
- **Forms**: ${route.forms}
- **Components Detected**: ${route.components.join(', ') || 'None'}
- **SEO Score**: ${route.accessibility.seoScore}/8
`).join('\n')}

## Site Architecture

### Core Features Available
${inventory.siteArchitecture.coreFeatures.map(feature => `- ${feature}`).join('\n')}

### Authentication Flow
- **Status**: ${inventory.siteArchitecture.authenticationFlow.status}
- **Available Pages**: ${inventory.siteArchitecture.authenticationFlow.availablePages.join(', ')}
- **Notes**: ${inventory.siteArchitecture.authenticationFlow.notes}

### Booking Flow
- **Status**: ${inventory.siteArchitecture.bookingFlow.status}
- **Available Pages**: ${inventory.siteArchitecture.bookingFlow.availablePages.join(', ')}
- **Notes**: ${inventory.siteArchitecture.bookingFlow.notes}

## User Journey Analysis

${inventory.siteArchitecture.userJourneys.map(journey => `
### ${journey.journey}
- **Completion**: ${journey.completion}
- **Status**: ${journey.status}
- **Steps**: ${journey.steps.join(' → ')}
`).join('\n')}

## Recommendations

### Immediate Actions Required
${inventory.recommendations.immediate.map(rec => `- ${rec}`).join('\n')}

### Development Priorities
${inventory.recommendations.development.map(rec => `- ${rec}`).join('\n')}

### Production Readiness
${inventory.recommendations.production.map(rec => `- ${rec}`).join('\n')}

## Next Steps

1. **Route Investigation**: Check Next.js configuration and ensure pages in src/app are properly routed
2. **Authentication**: Complete the signup/registration flow
3. **Dashboard**: Implement dashboard sub-pages (appointments, calendar, clients, etc.)
4. **Booking Flow**: Complete payment and confirmation pages
5. **Error Handling**: Add proper 404 and error pages
6. **Testing**: Set up comprehensive testing for all routes
7. **SEO**: Add meta descriptions and improve page titles
8. **Performance**: Optimize loading times and add caching

---
*Generated by 6FB Content Inventory Tool on ${new Date().toISOString()}*
`;
}

// Run if called directly
if (require.main === module) {
    createContentInventory().catch(console.error);
}

module.exports = createContentInventory;
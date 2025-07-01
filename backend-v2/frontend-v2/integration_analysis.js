/**
 * Comprehensive Frontend-Backend Integration Analysis
 * Analyzes code structure and configuration to identify integration issues
 */

const fs = require('fs');
const path = require('path');

class IntegrationAnalyzer {
    constructor() {
        this.backendPath = path.join(__dirname, '..');
        this.frontendPath = __dirname;
        this.results = {
            summary: { criticalIssues: 0, warnings: 0, recommendations: 0 },
            authentication: { issues: [], status: 'unknown' },
            apiCommunication: { issues: [], status: 'unknown' },
            dataFlow: { issues: [], status: 'unknown' },
            payment: { issues: [], status: 'unknown' },
            booking: { issues: [], status: 'unknown' },
            errorHandling: { issues: [], status: 'unknown' },
            configuration: { issues: [], status: 'unknown' }
        };
    }

    log(message, type = 'info') {
        const timestamp = new Date().toISOString();
        const prefix = {
            info: '🔍',
            warn: '⚠️',
            error: '❌',
            success: '✅'
        }[type] || '📝';
        
        console.log(`[${timestamp}] ${prefix} ${message}`);
    }

    addIssue(category, severity, message, recommendation = null) {
        const issue = { severity, message, recommendation };
        this.results[category].issues.push(issue);
        
        if (severity === 'critical') this.results.summary.criticalIssues++;
        else if (severity === 'warning') this.results.summary.warnings++;
        else if (severity === 'recommendation') this.results.summary.recommendations++;
    }

    updateStatus(category, status) {
        this.results[category].status = status;
    }

    readFile(filePath) {
        try {
            return fs.readFileSync(filePath, 'utf8');
        } catch (error) {
            return null;
        }
    }

    fileExists(filePath) {
        try {
            return fs.existsSync(filePath);
        } catch (error) {
            return false;
        }
    }

    analyzeBackendConfiguration() {
        this.log('Analyzing backend configuration...');
        
        // Check main.py
        const mainPy = this.readFile(path.join(this.backendPath, 'main.py'));
        if (!mainPy) {
            this.addIssue('configuration', 'critical', 'Backend main.py not found');
            this.updateStatus('configuration', 'critical');
            return;
        }

        // Check CORS configuration
        if (mainPy.includes('CORSMiddleware')) {
            this.log('CORS middleware configured', 'success');
            
            // Check if localhost:3000 is allowed
            if (mainPy.includes('localhost:3000')) {
                this.log('Frontend origin allowed in CORS', 'success');
            } else {
                this.addIssue('configuration', 'critical', 
                    'Frontend origin (localhost:3000) not found in CORS configuration',
                    'Add "http://localhost:3000" to allow_origins in CORS middleware');
            }
        } else {
            this.addIssue('configuration', 'critical', 'CORS middleware not configured');
        }

        // Check API versioning
        if (mainPy.includes('/api/v1')) {
            this.log('API versioning detected', 'success');
        } else {
            this.addIssue('configuration', 'warning', 'API versioning not found');
        }

        // Check models import
        if (mainPy.includes('import models')) {
            this.log('Models imported', 'success');
        } else {
            this.addIssue('configuration', 'warning', 'Models import not found in main.py');
        }

        this.updateStatus('configuration', 'analyzed');
    }

    analyzeFrontendConfiguration() {
        this.log('Analyzing frontend configuration...');
        
        // Check package.json
        const packageJson = this.readFile(path.join(this.frontendPath, 'package.json'));
        if (!packageJson) {
            this.addIssue('configuration', 'critical', 'Frontend package.json not found');
            return;
        }

        const pkg = JSON.parse(packageJson);
        
        // Check Next.js
        if (pkg.dependencies && pkg.dependencies.next) {
            this.log(`Next.js version: ${pkg.dependencies.next}`, 'success');
        } else {
            this.addIssue('configuration', 'critical', 'Next.js not found in dependencies');
        }

        // Check React
        if (pkg.dependencies && pkg.dependencies.react) {
            this.log(`React version: ${pkg.dependencies.react}`, 'success');
        } else {
            this.addIssue('configuration', 'critical', 'React not found in dependencies');
        }

        // Check Stripe
        if (pkg.dependencies && (pkg.dependencies['@stripe/stripe-js'] || pkg.dependencies['@stripe/react-stripe-js'])) {
            this.log('Stripe integration detected', 'success');
        } else {
            this.addIssue('payment', 'warning', 'Stripe client libraries not found');
        }
    }

    analyzeAPIClient() {
        this.log('Analyzing API client configuration...');
        
        const apiFile = this.readFile(path.join(this.frontendPath, 'lib', 'api.ts'));
        if (!apiFile) {
            this.addIssue('apiCommunication', 'critical', 'API client file (lib/api.ts) not found');
            this.updateStatus('apiCommunication', 'critical');
            return;
        }

        // Check API URL configuration
        if (apiFile.includes('NEXT_PUBLIC_API_URL')) {
            this.log('API URL environment variable detected', 'success');
        } else {
            this.addIssue('apiCommunication', 'warning', 'API URL environment variable not found');
        }

        // Check default API URL
        if (apiFile.includes('localhost:8000')) {
            this.log('Default API URL points to backend', 'success');
        } else {
            this.addIssue('apiCommunication', 'critical', 
                'Default API URL does not point to backend (localhost:8000)',
                'Update API_URL to point to localhost:8000');
        }

        // Check authentication headers
        if (apiFile.includes('Authorization') || apiFile.includes('Bearer')) {
            this.log('Authentication headers detected', 'success');
        } else {
            this.addIssue('authentication', 'warning', 'Authentication headers not found in API client');
        }

        // Check error handling
        if (apiFile.includes('catch') && apiFile.includes('error')) {
            this.log('Error handling detected in API client', 'success');
        } else {
            this.addIssue('errorHandling', 'warning', 'Limited error handling in API client');
        }

        this.updateStatus('apiCommunication', 'analyzed');
    }

    analyzeAuthenticationFlow() {
        this.log('Analyzing authentication flow...');
        
        // Check backend auth router
        const authRouter = this.readFile(path.join(this.backendPath, 'routers', 'auth.py'));
        if (!authRouter) {
            this.addIssue('authentication', 'critical', 'Backend auth router not found');
        } else {
            // Check login endpoint
            if (authRouter.includes('/login')) {
                this.log('Login endpoint found', 'success');
            } else {
                this.addIssue('authentication', 'critical', 'Login endpoint not found');
            }

            // Check token creation
            if (authRouter.includes('create_access_token') || authRouter.includes('jwt')) {
                this.log('JWT token creation detected', 'success');
            } else {
                this.addIssue('authentication', 'warning', 'JWT token creation not found');
            }
        }

        // Check frontend login page
        const loginPage = this.readFile(path.join(this.frontendPath, 'app', 'login', 'page.tsx'));
        if (!loginPage) {
            this.addIssue('authentication', 'critical', 'Frontend login page not found');
        } else {
            // Check form submission
            if (loginPage.includes('onSubmit') || loginPage.includes('handleSubmit')) {
                this.log('Login form submission detected', 'success');
            } else {
                this.addIssue('authentication', 'warning', 'Login form submission handler not found');
            }

            // Check API call
            if (loginPage.includes('/api') || loginPage.includes('fetch')) {
                this.log('API call in login page detected', 'success');
            } else {
                this.addIssue('authentication', 'warning', 'API call not found in login page');
            }
        }

        this.updateStatus('authentication', 'analyzed');
    }

    analyzeBookingFlow() {
        this.log('Analyzing booking flow...');
        
        // Check backend booking router
        const bookingRouter = this.readFile(path.join(this.backendPath, 'routers', 'bookings.py'));
        if (!bookingRouter) {
            this.addIssue('booking', 'critical', 'Backend booking router not found');
        } else {
            // Check booking endpoints
            if (bookingRouter.includes('/available-slots')) {
                this.log('Available slots endpoint found', 'success');
            } else {
                this.addIssue('booking', 'warning', 'Available slots endpoint not found');
            }

            if (bookingRouter.includes('/book') || bookingRouter.includes('create')) {
                this.log('Booking creation endpoint found', 'success');
            } else {
                this.addIssue('booking', 'critical', 'Booking creation endpoint not found');
            }
        }

        // Check frontend booking page
        const bookingPage = this.readFile(path.join(this.frontendPath, 'app', 'book', 'page.tsx'));
        if (!bookingPage) {
            this.addIssue('booking', 'critical', 'Frontend booking page not found');
        } else {
            // Check calendar component
            if (bookingPage.includes('Calendar') || bookingPage.includes('calendar')) {
                this.log('Calendar component usage detected', 'success');
            } else {
                this.addIssue('booking', 'warning', 'Calendar component not found in booking page');
            }
        }

        // Check calendar component
        const calendarComponent = this.readFile(path.join(this.frontendPath, 'components', 'Calendar.tsx'));
        if (!calendarComponent) {
            this.addIssue('booking', 'warning', 'Calendar component file not found');
        } else {
            // Check API integration
            if (calendarComponent.includes('fetch') || calendarComponent.includes('api')) {
                this.log('API integration in calendar detected', 'success');
            } else {
                this.addIssue('booking', 'warning', 'Limited API integration in calendar component');
            }
        }

        this.updateStatus('booking', 'analyzed');
    }

    analyzePaymentIntegration() {
        this.log('Analyzing payment integration...');
        
        // Check backend payment router
        const paymentRouter = this.readFile(path.join(this.backendPath, 'routers', 'payments.py'));
        if (!paymentRouter) {
            this.addIssue('payment', 'critical', 'Backend payment router not found');
        } else {
            // Check Stripe integration
            if (paymentRouter.includes('stripe') || paymentRouter.includes('Stripe')) {
                this.log('Stripe integration in backend detected', 'success');
            } else {
                this.addIssue('payment', 'warning', 'Stripe integration not found in backend');
            }

            // Check payment intent
            if (paymentRouter.includes('payment_intent') || paymentRouter.includes('PaymentIntent')) {
                this.log('Payment intent creation detected', 'success');
            } else {
                this.addIssue('payment', 'warning', 'Payment intent creation not found');
            }
        }

        // Check frontend payment component
        const paymentForm = this.readFile(path.join(this.frontendPath, 'components', 'PaymentForm.tsx'));
        if (!paymentForm) {
            this.addIssue('payment', 'warning', 'Frontend payment form component not found');
        } else {
            // Check Stripe elements
            if (paymentForm.includes('StripeElement') || paymentForm.includes('@stripe')) {
                this.log('Stripe elements integration detected', 'success');
            } else {
                this.addIssue('payment', 'warning', 'Stripe elements not found in payment form');
            }
        }

        this.updateStatus('payment', 'analyzed');
    }

    analyzeDataFlow() {
        this.log('Analyzing data flow and state management...');
        
        // Check models
        const models = this.readFile(path.join(this.backendPath, 'models.py'));
        if (!models) {
            this.addIssue('dataFlow', 'critical', 'Backend models file not found');
        } else {
            // Check User model
            if (models.includes('class User')) {
                this.log('User model found', 'success');
            } else {
                this.addIssue('dataFlow', 'critical', 'User model not found');
            }

            // Check Appointment model
            if (models.includes('class Appointment')) {
                this.log('Appointment model found', 'success');
            } else {
                this.addIssue('dataFlow', 'warning', 'Appointment model not found');
            }
        }

        // Check database configuration
        const database = this.readFile(path.join(this.backendPath, 'database.py'));
        if (!database) {
            this.addIssue('dataFlow', 'critical', 'Database configuration not found');
        } else {
            if (database.includes('SQLAlchemy') || database.includes('engine')) {
                this.log('Database ORM configured', 'success');
            } else {
                this.addIssue('dataFlow', 'warning', 'Database ORM configuration unclear');
            }
        }

        this.updateStatus('dataFlow', 'analyzed');
    }

    analyzeErrorHandling() {
        this.log('Analyzing error handling...');
        
        // Check if there's error boundary in frontend
        const layoutFile = this.readFile(path.join(this.frontendPath, 'app', 'layout.tsx'));
        if (layoutFile) {
            if (layoutFile.includes('ErrorBoundary') || layoutFile.includes('error')) {
                this.log('Error handling in layout detected', 'success');
            } else {
                this.addIssue('errorHandling', 'recommendation', 
                    'Consider adding error boundaries for better error handling');
            }
        }

        // Check backend error handling
        const mainPy = this.readFile(path.join(this.backendPath, 'main.py'));
        if (mainPy) {
            if (mainPy.includes('HTTPException') || mainPy.includes('exception_handler')) {
                this.log('Exception handling in backend detected', 'success');
            } else {
                this.addIssue('errorHandling', 'warning', 
                    'Limited exception handling in backend main file');
            }
        }

        this.updateStatus('errorHandling', 'analyzed');
    }

    generateReport() {
        this.log('Generating comprehensive integration report...');
        
        const report = {
            timestamp: new Date().toISOString(),
            summary: this.results.summary,
            overallStatus: this.calculateOverallStatus(),
            sections: {}
        };

        Object.keys(this.results).forEach(section => {
            if (section !== 'summary') {
                report.sections[section] = this.results[section];
            }
        });

        return report;
    }

    calculateOverallStatus() {
        const { criticalIssues, warnings } = this.results.summary;
        
        if (criticalIssues > 0) return 'critical';
        if (warnings > 3) return 'warning';
        if (warnings > 0) return 'attention';
        return 'good';
    }

    printReport(report) {
        console.log('\n' + '='.repeat(80));
        console.log('📋 COMPREHENSIVE FRONTEND-BACKEND INTEGRATION REPORT');
        console.log('='.repeat(80));
        
        console.log(`\\n📊 Summary:`);
        console.log(`   Overall Status: ${this.getStatusEmoji(report.overallStatus)} ${report.overallStatus.toUpperCase()}`);
        console.log(`   Critical Issues: ${report.summary.criticalIssues}`);
        console.log(`   Warnings: ${report.summary.warnings}`);
        console.log(`   Recommendations: ${report.summary.recommendations}`);
        
        console.log(`\\n🔍 Detailed Analysis:`);
        Object.entries(report.sections).forEach(([section, data]) => {
            console.log(`\\n   ${section.charAt(0).toUpperCase() + section.slice(1)}:`);
            console.log(`   Status: ${this.getStatusEmoji(data.status)} ${data.status}`);
            
            if (data.issues.length > 0) {
                data.issues.forEach(issue => {
                    const emoji = this.getSeverityEmoji(issue.severity);
                    console.log(`     ${emoji} ${issue.message}`);
                    if (issue.recommendation) {
                        console.log(`       💡 ${issue.recommendation}`);
                    }
                });
            } else {
                console.log(`     ✅ No issues found`);
            }
        });

        console.log(`\\n🎯 Key Integration Points:`);
        this.printKeyIntegrationPoints();

        console.log(`\\n🚀 Next Steps:`);
        this.printNextSteps(report);
        
        console.log('\\n' + '='.repeat(80));
    }

    printKeyIntegrationPoints() {
        console.log(`   • Authentication: JWT tokens between frontend and backend`);
        console.log(`   • API Communication: Frontend (localhost:3000) → Backend (localhost:8000)`);
        console.log(`   • Data Flow: React state management ↔ FastAPI + SQLAlchemy`);
        console.log(`   • Payment Processing: Stripe integration on both ends`);
        console.log(`   • Booking System: Calendar UI ↔ Appointment management API`);
    }

    printNextSteps(report) {
        if (report.summary.criticalIssues > 0) {
            console.log(`   1. 🔴 Fix critical issues first - these prevent basic functionality`);
        }
        
        if (report.summary.warnings > 0) {
            console.log(`   2. ⚠️  Address warnings to improve reliability`);
        }
        
        console.log(`   3. 🧪 Run integration tests after fixes`);
        console.log(`   4. 📝 Update documentation for any configuration changes`);
        console.log(`   5. 🚀 Deploy and test in staging environment`);
    }

    getStatusEmoji(status) {
        const emojis = {
            'critical': '🔴',
            'warning': '⚠️',
            'attention': '🟡',
            'good': '✅',
            'analyzed': '📋',
            'unknown': '❓'
        };
        return emojis[status] || '❓';
    }

    getSeverityEmoji(severity) {
        const emojis = {
            'critical': '🔴',
            'warning': '⚠️',
            'recommendation': '💡'
        };
        return emojis[severity] || '📝';
    }

    async analyze() {
        this.log('Starting comprehensive integration analysis...');
        
        this.analyzeBackendConfiguration();
        this.analyzeFrontendConfiguration();
        this.analyzeAPIClient();
        this.analyzeAuthenticationFlow();
        this.analyzeBookingFlow();
        this.analyzePaymentIntegration();
        this.analyzeDataFlow();
        this.analyzeErrorHandling();
        
        const report = this.generateReport();
        this.printReport(report);
        
        // Save report to file
        const reportPath = path.join(__dirname, 'integration_analysis_report.json');
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        this.log(`Report saved to: ${reportPath}`, 'success');
        
        return report;
    }
}

// Run analysis if called directly
if (require.main === module) {
    const analyzer = new IntegrationAnalyzer();
    analyzer.analyze().then(report => {
        const exitCode = report.summary.criticalIssues > 0 ? 1 : 0;
        process.exit(exitCode);
    }).catch(error => {
        console.error('💥 Analysis failed:', error);
        process.exit(1);
    });
}

module.exports = IntegrationAnalyzer;
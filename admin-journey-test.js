#!/usr/bin/env node
/**
 * Admin User Journey Testing Script for BookedBarber V2
 * Comprehensive testing of admin-level functionality and premium calendar features
 */

const https = require('https');
const http = require('http');

const BACKEND_URL = 'http://localhost:8000';
const FRONTEND_URL = 'http://localhost:3000';

class AdminJourneyTester {
    constructor() {
        this.token = null;
        this.adminUserId = null;
        this.testResults = {
            adminAuth: { status: 'pending', details: [] },
            multiLocation: { status: 'pending', details: [] },
            adminCalendar: { status: 'pending', details: [] },
            revenueAnalytics: { status: 'pending', details: [] },
            systemConfig: { status: 'pending', details: [] },
            bulkOperations: { status: 'pending', details: [] }
        };
    }

    async makeRequest(url, options = {}) {
        return new Promise((resolve, reject) => {
            const client = url.startsWith('https') ? https : http;
            const reqOptions = {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    ...(this.token && { 'Authorization': `Bearer ${this.token}` }),
                    ...options.headers
                }
            };

            const req = client.request(url, reqOptions, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const parsed = JSON.parse(data);
                        resolve({ status: res.statusCode, data: parsed, headers: res.headers });
                    } catch (e) {
                        resolve({ status: res.statusCode, data: data, headers: res.headers });
                    }
                });
            });

            req.on('error', reject);
            
            if (options.body) {
                req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
            }
            
            req.end();
        });
    }

    log(category, message, status = 'info') {
        const timestamp = new Date().toISOString();
        const symbols = { success: '✅', failure: '❌', info: 'ℹ️', warning: '⚠️' };
        console.log(`[${timestamp}] ${symbols[status] || 'ℹ️'} [${category}] ${message}`);
        
        if (this.testResults[category]) {
            this.testResults[category].details.push({ timestamp, message, status });
        }
    }

    async testAdminAuthentication() {
        this.log('adminAuth', 'Starting admin authentication testing...');

        try {
            // First, try to create admin user
            const registerRes = await this.makeRequest(`${BACKEND_URL}/api/v1/auth/register`, {
                method: 'POST',
                body: {
                    email: 'admin@bookedbarber.com',
                    password: 'admin123',
                    name: 'Admin User',
                    role: 'admin'
                }
            });

            if (registerRes.status === 200 || registerRes.status === 201) {
                this.log('adminAuth', 'Admin user created successfully', 'success');
            } else if (registerRes.status === 400 && registerRes.data.detail?.includes('already registered')) {
                this.log('adminAuth', 'Admin user already exists, proceeding with login', 'info');
            } else {
                this.log('adminAuth', `Failed to create admin user: ${registerRes.data.detail || 'Unknown error'}`, 'failure');
            }

            // Test admin login
            const loginRes = await this.makeRequest(`${BACKEND_URL}/api/v1/auth/login`, {
                method: 'POST',
                body: {
                    email: 'admin@bookedbarber.com',
                    password: 'admin123'
                }
            });

            if (loginRes.status === 200 && loginRes.data.access_token) {
                this.token = loginRes.data.access_token;
                this.adminUserId = loginRes.data.user_id;
                this.log('adminAuth', 'Admin login successful', 'success');
                this.testResults.adminAuth.status = 'success';

                // Verify admin role
                const profileRes = await this.makeRequest(`${BACKEND_URL}/api/v1/auth/me`);
                if (profileRes.status === 200 && profileRes.data.role === 'admin') {
                    this.log('adminAuth', 'Admin role verified successfully', 'success');
                } else {
                    this.log('adminAuth', 'Admin role verification failed', 'failure');
                }
            } else {
                this.log('adminAuth', `Admin login failed: ${loginRes.data.detail || 'Unknown error'}`, 'failure');
                this.testResults.adminAuth.status = 'failure';
                return false;
            }

            // Test admin dashboard access (frontend)
            try {
                const dashboardRes = await this.makeRequest(`${FRONTEND_URL}/admin/dashboard`, {
                    method: 'GET',
                    headers: {
                        'Cookie': `token=${this.token}`
                    }
                });

                if (dashboardRes.status === 200) {
                    this.log('adminAuth', 'Admin dashboard accessible', 'success');
                } else {
                    this.log('adminAuth', `Admin dashboard access issue: Status ${dashboardRes.status}`, 'warning');
                }
            } catch (e) {
                this.log('adminAuth', `Admin dashboard test error: ${e.message}`, 'warning');
            }

            return true;
        } catch (error) {
            this.log('adminAuth', `Authentication error: ${error.message}`, 'failure');
            this.testResults.adminAuth.status = 'failure';
            return false;
        }
    }

    async testMultiLocationManagement() {
        this.log('multiLocation', 'Starting multi-location management testing...');

        try {
            // Get locations
            const locationsRes = await this.makeRequest(`${BACKEND_URL}/api/v1/locations`);
            
            if (locationsRes.status === 200) {
                const locations = locationsRes.data;
                this.log('multiLocation', `Found ${locations.length} locations`, 'success');

                if (locations.length === 0) {
                    // Create test locations for admin testing
                    const testLocations = [
                        { name: 'Main Street Barbershop', address: '123 Main St, City, State', phone: '555-0101' },
                        { name: 'Downtown Location', address: '456 Downtown Ave, City, State', phone: '555-0102' }
                    ];

                    for (const loc of testLocations) {
                        const createRes = await this.makeRequest(`${BACKEND_URL}/api/v1/locations`, {
                            method: 'POST',
                            body: loc
                        });

                        if (createRes.status === 200 || createRes.status === 201) {
                            this.log('multiLocation', `Created location: ${loc.name}`, 'success');
                        }
                    }
                }

                // Test location selector functionality
                const updatedLocationsRes = await this.makeRequest(`${BACKEND_URL}/api/v1/locations`);
                if (updatedLocationsRes.status === 200 && updatedLocationsRes.data.length > 0) {
                    this.log('multiLocation', 'Location selector data available', 'success');
                    this.testResults.multiLocation.status = 'success';
                } else {
                    this.log('multiLocation', 'No locations available for testing', 'warning');
                }
            } else {
                this.log('multiLocation', 'Failed to retrieve locations', 'failure');
                this.testResults.multiLocation.status = 'failure';
            }

            // Test location-aware calendar filtering
            const calendarRes = await this.makeRequest(`${BACKEND_URL}/api/v1/calendar/appointments?location_id=1`);
            if (calendarRes.status === 200) {
                this.log('multiLocation', 'Location-aware calendar filtering functional', 'success');
            } else {
                this.log('multiLocation', 'Location-aware calendar filtering issues detected', 'warning');
            }

        } catch (error) {
            this.log('multiLocation', `Multi-location testing error: ${error.message}`, 'failure');
            this.testResults.multiLocation.status = 'failure';
        }
    }

    async testAdminCalendarFeatures() {
        this.log('adminCalendar', 'Starting admin calendar features testing...');

        try {
            // Test admin-level appointment management
            const appointmentsRes = await this.makeRequest(`${BACKEND_URL}/api/v1/appointments`);
            
            if (appointmentsRes.status === 200) {
                const appointments = appointmentsRes.data;
                this.log('adminCalendar', `Admin can view ${appointments.length} appointments`, 'success');

                // Test admin appointment creation
                const newAppointment = {
                    client_name: 'Admin Test Client',
                    client_email: 'admin.test@example.com',
                    service_name: 'Admin Test Service',
                    start_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                    duration_minutes: 60,
                    price: 50.00
                };

                const createRes = await this.makeRequest(`${BACKEND_URL}/api/v1/appointments`, {
                    method: 'POST',
                    body: newAppointment
                });

                if (createRes.status === 200 || createRes.status === 201) {
                    this.log('adminCalendar', 'Admin appointment creation successful', 'success');
                    
                    // Test admin appointment modification
                    const appointmentId = createRes.data.id;
                    const updateRes = await this.makeRequest(`${BACKEND_URL}/api/v1/appointments/${appointmentId}`, {
                        method: 'PUT',
                        body: { ...newAppointment, notes: 'Updated by admin' }
                    });

                    if (updateRes.status === 200) {
                        this.log('adminCalendar', 'Admin appointment modification successful', 'success');
                    }
                } else {
                    this.log('adminCalendar', 'Admin appointment creation failed', 'failure');
                }

                this.testResults.adminCalendar.status = 'success';
            } else {
                this.log('adminCalendar', 'Failed to access appointments as admin', 'failure');
                this.testResults.adminCalendar.status = 'failure';
            }

            // Test premium calendar features
            const calendarViewsRes = await this.makeRequest(`${BACKEND_URL}/api/v1/calendar/views`);
            if (calendarViewsRes.status === 200) {
                this.log('adminCalendar', 'Premium calendar views accessible', 'success');
            }

        } catch (error) {
            this.log('adminCalendar', `Admin calendar testing error: ${error.message}`, 'failure');
            this.testResults.adminCalendar.status = 'failure';
        }
    }

    async testRevenueAnalytics() {
        this.log('revenueAnalytics', 'Starting revenue analytics testing...');

        try {
            // Test revenue dashboard
            const revenueRes = await this.makeRequest(`${BACKEND_URL}/api/v1/analytics/revenue`);
            
            if (revenueRes.status === 200) {
                this.log('revenueAnalytics', 'Revenue analytics accessible', 'success');
                
                // Test location-based revenue reporting
                const locationRevenueRes = await this.makeRequest(`${BACKEND_URL}/api/v1/analytics/revenue?location_id=1`);
                if (locationRevenueRes.status === 200) {
                    this.log('revenueAnalytics', 'Location-based revenue reporting functional', 'success');
                }

                // Test appointment analytics
                const appointmentAnalyticsRes = await this.makeRequest(`${BACKEND_URL}/api/v1/analytics/appointments`);
                if (appointmentAnalyticsRes.status === 200) {
                    this.log('revenueAnalytics', 'Appointment analytics accessible', 'success');
                }

                this.testResults.revenueAnalytics.status = 'success';
            } else {
                this.log('revenueAnalytics', 'Revenue analytics not accessible', 'failure');
                this.testResults.revenueAnalytics.status = 'failure';
            }

        } catch (error) {
            this.log('revenueAnalytics', `Revenue analytics testing error: ${error.message}`, 'failure');
            this.testResults.revenueAnalytics.status = 'failure';
        }
    }

    async testSystemConfiguration() {
        this.log('systemConfig', 'Starting system configuration testing...');

        try {
            // Test user management
            const usersRes = await this.makeRequest(`${BACKEND_URL}/api/v1/users`);
            
            if (usersRes.status === 200) {
                this.log('systemConfig', 'User management accessible', 'success');

                // Test service management
                const servicesRes = await this.makeRequest(`${BACKEND_URL}/api/v1/services`);
                if (servicesRes.status === 200) {
                    this.log('systemConfig', 'Service management accessible', 'success');
                }

                // Test system health monitoring
                const healthRes = await this.makeRequest(`${BACKEND_URL}/health`);
                if (healthRes.status === 200) {
                    this.log('systemConfig', 'System health monitoring functional', 'success');
                }

                this.testResults.systemConfig.status = 'success';
            } else {
                this.log('systemConfig', 'System configuration not accessible', 'failure');
                this.testResults.systemConfig.status = 'failure';
            }

        } catch (error) {
            this.log('systemConfig', `System configuration testing error: ${error.message}`, 'failure');
            this.testResults.systemConfig.status = 'failure';
        }
    }

    async testBulkOperations() {
        this.log('bulkOperations', 'Starting bulk operations testing...');

        try {
            // Test bulk appointment operations
            const appointmentsRes = await this.makeRequest(`${BACKEND_URL}/api/v1/appointments`);
            
            if (appointmentsRes.status === 200) {
                const appointments = appointmentsRes.data;
                
                if (appointments.length > 0) {
                    // Test bulk status update
                    const bulkUpdateRes = await this.makeRequest(`${BACKEND_URL}/api/v1/appointments/bulk-update`, {
                        method: 'POST',
                        body: {
                            appointment_ids: appointments.slice(0, 2).map(a => a.id),
                            status: 'confirmed'
                        }
                    });

                    if (bulkUpdateRes.status === 200) {
                        this.log('bulkOperations', 'Bulk appointment operations functional', 'success');
                    } else {
                        this.log('bulkOperations', 'Bulk appointment operations not available', 'warning');
                    }
                }

                // Test data export
                const exportRes = await this.makeRequest(`${BACKEND_URL}/api/v1/export/appointments`);
                if (exportRes.status === 200) {
                    this.log('bulkOperations', 'Data export functionality accessible', 'success');
                } else {
                    this.log('bulkOperations', 'Data export functionality not available', 'warning');
                }

                this.testResults.bulkOperations.status = 'success';
            } else {
                this.log('bulkOperations', 'Bulk operations not accessible', 'failure');
                this.testResults.bulkOperations.status = 'failure';
            }

        } catch (error) {
            this.log('bulkOperations', `Bulk operations testing error: ${error.message}`, 'failure');
            this.testResults.bulkOperations.status = 'failure';
        }
    }

    generateReport() {
        console.log('\n' + '='.repeat(80));
        console.log('ADMIN USER JOURNEY TESTING REPORT');
        console.log('BookedBarber V2 Premium Calendar System');
        console.log('='.repeat(80));

        const categories = [
            { key: 'adminAuth', name: 'Admin Authentication and Dashboard' },
            { key: 'multiLocation', name: 'Multi-Location Calendar Management' },
            { key: 'adminCalendar', name: 'Advanced Admin Calendar Features' },
            { key: 'revenueAnalytics', name: 'Revenue Analytics and Reporting' },
            { key: 'systemConfig', name: 'System Configuration and Management' },
            { key: 'bulkOperations', name: 'Bulk Operations and Administration' }
        ];

        let totalTests = 0;
        let passedTests = 0;

        categories.forEach(category => {
            const result = this.testResults[category.key];
            const status = result.status === 'success' ? '✅ PASS' : 
                          result.status === 'failure' ? '❌ FAIL' : '⚠️ PARTIAL';
            
            console.log(`\n${category.name}: ${status}`);
            
            if (result.details.length > 0) {
                result.details.forEach(detail => {
                    const symbol = detail.status === 'success' ? '  ✅' : 
                                  detail.status === 'failure' ? '  ❌' : '  ℹ️';
                    console.log(`${symbol} ${detail.message}`);
                });
            }

            totalTests++;
            if (result.status === 'success') passedTests++;
        });

        console.log('\n' + '='.repeat(80));
        console.log(`SUMMARY: ${passedTests}/${totalTests} test categories passed`);
        console.log(`Overall Success Rate: ${((passedTests/totalTests) * 100).toFixed(1)}%`);
        
        if (passedTests === totalTests) {
            console.log('🎉 EXCELLENT: All admin workflows executed successfully!');
        } else if (passedTests >= totalTests * 0.8) {
            console.log('👍 GOOD: Most admin functionality working correctly');
        } else if (passedTests >= totalTests * 0.5) {
            console.log('⚠️ PARTIAL: Some admin features need attention');
        } else {
            console.log('❌ CRITICAL: Major admin functionality issues detected');
        }

        console.log('='.repeat(80));

        return {
            totalTests,
            passedTests,
            successRate: (passedTests/totalTests) * 100,
            details: this.testResults
        };
    }

    async runFullTest() {
        console.log('🚀 Starting BookedBarber V2 Admin Journey Testing...\n');

        const authSuccess = await this.testAdminAuthentication();
        
        if (authSuccess) {
            await this.testMultiLocationManagement();
            await this.testAdminCalendarFeatures();
            await this.testRevenueAnalytics();
            await this.testSystemConfiguration();
            await this.testBulkOperations();
        } else {
            console.log('❌ Authentication failed - skipping remaining tests');
        }

        return this.generateReport();
    }
}

// Run the test if this script is executed directly
if (require.main === module) {
    const tester = new AdminJourneyTester();
    tester.runFullTest().then(results => {
        process.exit(results.passedTests === results.totalTests ? 0 : 1);
    }).catch(error => {
        console.error('Test execution failed:', error);
        process.exit(1);
    });
}

module.exports = AdminJourneyTester;
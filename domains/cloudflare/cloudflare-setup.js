/**
 * BookedBarber V2 CloudFlare Configuration Script
 * Automatically configures CloudFlare settings for optimal performance and security
 */

const https = require('https');

class CloudFlareSetup {
    constructor(apiToken, zoneId) {
        this.apiToken = apiToken;
        this.zoneId = zoneId;
        this.baseURL = 'https://api.cloudflare.com/client/v4';
    }

    // Helper method to make CloudFlare API requests
    async makeRequest(endpoint, method = 'GET', data = null) {
        return new Promise((resolve, reject) => {
            const url = new URL(`${this.baseURL}${endpoint}`);
            const options = {
                hostname: url.hostname,
                path: url.pathname + url.search,
                method: method,
                headers: {
                    'Authorization': `Bearer ${this.apiToken}`,
                    'Content-Type': 'application/json'
                }
            };

            if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
                const postData = JSON.stringify(data);
                options.headers['Content-Length'] = Buffer.byteLength(postData);
            }

            const req = https.request(options, (res) => {
                let responseData = '';
                res.on('data', chunk => responseData += chunk);
                res.on('end', () => {
                    try {
                        const parsed = JSON.parse(responseData);
                        if (parsed.success) {
                            resolve(parsed.result);
                        } else {
                            reject(new Error(`CloudFlare API Error: ${JSON.stringify(parsed.errors)}`));
                        }
                    } catch (e) {
                        reject(new Error(`JSON Parse Error: ${e.message}`));
                    }
                });
            });

            req.on('error', reject);

            if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
                req.write(JSON.stringify(data));
            }

            req.end();
        });
    }

    // Configure DNS records
    async configureDNS() {
        console.log('🌐 Configuring DNS records...');
        
        const dnsRecords = [
            {
                type: 'A',
                name: 'bookedbarber.com',
                content: '192.0.2.1', // Replace with your server IP
                ttl: 1, // Automatic
                proxied: true
            },
            {
                type: 'CNAME',
                name: 'www',
                content: 'bookedbarber.com',
                ttl: 1,
                proxied: true
            },
            {
                type: 'CNAME',
                name: 'api',
                content: 'bookedbarber.com',
                ttl: 1,
                proxied: true
            },
            {
                type: 'CNAME',
                name: 'app',
                content: 'bookedbarber.com',
                ttl: 1,
                proxied: true
            },
            {
                type: 'CNAME',
                name: 'admin',
                content: 'bookedbarber.com',
                ttl: 1,
                proxied: true
            }
        ];

        for (const record of dnsRecords) {
            try {
                await this.makeRequest(`/zones/${this.zoneId}/dns_records`, 'POST', record);
                console.log(`✅ Created DNS record: ${record.name} (${record.type})`);
            } catch (error) {
                console.log(`⚠️  DNS record may already exist: ${record.name} - ${error.message}`);
            }
        }
    }

    // Configure page rules for caching and performance
    async configurePageRules() {
        console.log('📄 Configuring page rules...');
        
        const pageRules = [
            {
                targets: [{ target: 'url', constraint: { operator: 'matches', value: 'bookedbarber.com/api/*' }}],
                actions: [
                    { id: 'cache_level', value: 'bypass' },
                    { id: 'browser_cache_ttl', value: 0 }
                ],
                priority: 1,
                status: 'active'
            },
            {
                targets: [{ target: 'url', constraint: { operator: 'matches', value: '*.bookedbarber.com/*.(jpg|jpeg|png|gif|ico|svg|css|js|woff|woff2|ttf|eot)' }}],
                actions: [
                    { id: 'cache_level', value: 'cache_everything' },
                    { id: 'browser_cache_ttl', value: 31536000 }, // 1 year
                    { id: 'edge_cache_ttl', value: 7776000 } // 3 months
                ],
                priority: 2,
                status: 'active'
            },
            {
                targets: [{ target: 'url', constraint: { operator: 'matches', value: 'admin.bookedbarber.com/*' }}],
                actions: [
                    { id: 'security_level', value: 'high' },
                    { id: 'cache_level', value: 'bypass' }
                ],
                priority: 3,
                status: 'active'
            }
        ];

        for (const rule of pageRules) {
            try {
                await this.makeRequest(`/zones/${this.zoneId}/pagerules`, 'POST', rule);
                console.log(`✅ Created page rule with priority ${rule.priority}`);
            } catch (error) {
                console.log(`⚠️  Page rule error: ${error.message}`);
            }
        }
    }

    // Configure security settings
    async configureSecurity() {
        console.log('🔒 Configuring security settings...');
        
        const securitySettings = [
            { id: 'security_level', value: 'medium' },
            { id: 'ssl', value: 'flexible' }, // Change to 'full' when you have SSL on origin
            { id: 'tls_1_3', value: 'on' },
            { id: 'automatic_https_rewrites', value: 'on' },
            { id: 'opportunistic_encryption', value: 'on' },
            { id: 'always_use_https', value: 'on' },
            { id: 'browser_integrity_check', value: 'on' },
            { id: 'challenge_ttl', value: 1800 },
            { id: 'hotlink_protection', value: 'on' },
            { id: 'ip_geolocation', value: 'on' },
            { id: 'server_side_exclude', value: 'on' }
        ];

        for (const setting of securitySettings) {
            try {
                await this.makeRequest(`/zones/${this.zoneId}/settings/${setting.id}`, 'PATCH', { value: setting.value });
                console.log(`✅ Configured security setting: ${setting.id} = ${setting.value}`);
            } catch (error) {
                console.log(`⚠️  Security setting error for ${setting.id}: ${error.message}`);
            }
        }
    }

    // Configure performance settings
    async configurePerformance() {
        console.log('⚡ Configuring performance settings...');
        
        const performanceSettings = [
            { id: 'minify', value: { css: 'on', html: 'on', js: 'on' }},
            { id: 'brotli', value: 'on' },
            { id: 'early_hints', value: 'on' },
            { id: 'rocket_loader', value: 'off' }, // Can interfere with React
            { id: 'mirage2', value: 'on' },
            { id: 'polish', value: 'lossless' },
            { id: 'webp', value: 'on' },
            { id: 'always_online', value: 'on' },
            { id: 'development_mode', value: 'off' }
        ];

        for (const setting of performanceSettings) {
            try {
                await this.makeRequest(`/zones/${this.zoneId}/settings/${setting.id}`, 'PATCH', { value: setting.value });
                console.log(`✅ Configured performance setting: ${setting.id}`);
            } catch (error) {
                console.log(`⚠️  Performance setting error for ${setting.id}: ${error.message}`);
            }
        }
    }

    // Configure caching settings
    async configureCaching() {
        console.log('💾 Configuring caching settings...');
        
        const cachingSettings = [
            { id: 'cache_level', value: 'aggressive' },
            { id: 'browser_cache_ttl', value: 14400 }, // 4 hours
            { id: 'sort_query_string_for_cache', value: 'on' }
        ];

        for (const setting of cachingSettings) {
            try {
                await this.makeRequest(`/zones/${this.zoneId}/settings/${setting.id}`, 'PATCH', { value: setting.value });
                console.log(`✅ Configured caching setting: ${setting.id} = ${setting.value}`);
            } catch (error) {
                console.log(`⚠️  Caching setting error for ${setting.id}: ${error.message}`);
            }
        }
    }

    // Configure WAF rules
    async configureWAF() {
        console.log('🛡️  Configuring Web Application Firewall...');
        
        // Note: WAF configuration requires a paid CloudFlare plan
        try {
            const wafSettings = [
                { id: 'waf', value: 'on' },
                { id: 'security_header', value: { strict_transport_security: { enabled: true, max_age: 31536000, include_subdomains: true }}}
            ];

            for (const setting of wafSettings) {
                try {
                    await this.makeRequest(`/zones/${this.zoneId}/settings/${setting.id}`, 'PATCH', { value: setting.value });
                    console.log(`✅ Configured WAF setting: ${setting.id}`);
                } catch (error) {
                    console.log(`⚠️  WAF setting error for ${setting.id}: ${error.message}`);
                }
            }
        } catch (error) {
            console.log('⚠️  WAF configuration requires a paid CloudFlare plan');
        }
    }

    // Main configuration function
    async configure() {
        console.log('🚀 Starting CloudFlare configuration for BookedBarber V2...\n');
        
        try {
            await this.configureDNS();
            console.log('');
            
            await this.configureSecurity();
            console.log('');
            
            await this.configurePerformance();
            console.log('');
            
            await this.configureCaching();
            console.log('');
            
            await this.configurePageRules();
            console.log('');
            
            await this.configureWAF();
            console.log('');
            
            console.log('✅ CloudFlare configuration completed successfully!');
            console.log('\n📋 Next steps:');
            console.log('1. Update your server IP in the DNS A record');
            console.log('2. Change SSL mode to "Full (Strict)" when you have SSL on origin');
            console.log('3. Test your website at https://bookedbarber.com');
            console.log('4. Monitor performance at CloudFlare Analytics dashboard');
            
        } catch (error) {
            console.error('❌ Configuration failed:', error.message);
            process.exit(1);
        }
    }

    // Purge cache function
    async purgeCache(urls = null) {
        console.log('🧹 Purging CloudFlare cache...');
        
        const purgeData = urls ? { files: urls } : { purge_everything: true };
        
        try {
            await this.makeRequest(`/zones/${this.zoneId}/purge_cache`, 'POST', purgeData);
            console.log('✅ Cache purged successfully');
        } catch (error) {
            console.error('❌ Cache purge failed:', error.message);
        }
    }
}

// Main execution
async function main() {
    const apiToken = process.env.CLOUDFLARE_API_TOKEN;
    const zoneId = process.env.CLOUDFLARE_ZONE_ID;
    
    if (!apiToken || !zoneId) {
        console.error('❌ Missing required environment variables:');
        console.error('   CLOUDFLARE_API_TOKEN - Your CloudFlare API token');
        console.error('   CLOUDFLARE_ZONE_ID - Your CloudFlare zone ID');
        console.error('\nTo get these values:');
        console.error('1. Go to https://dash.cloudflare.com/profile/api-tokens');
        console.error('2. Create a token with Zone:Edit permissions');
        console.error('3. Get your Zone ID from the right sidebar of your domain overview');
        process.exit(1);
    }
    
    const cf = new CloudFlareSetup(apiToken, zoneId);
    
    const command = process.argv[2];
    
    switch (command) {
        case 'configure':
            await cf.configure();
            break;
        case 'purge':
            await cf.purgeCache();
            break;
        case 'purge-files':
            const urls = process.argv.slice(3);
            await cf.purgeCache(urls);
            break;
        default:
            console.log('BookedBarber V2 CloudFlare Setup Tool');
            console.log('');
            console.log('Usage:');
            console.log('  node cloudflare-setup.js configure     - Configure all CloudFlare settings');
            console.log('  node cloudflare-setup.js purge        - Purge all cache');
            console.log('  node cloudflare-setup.js purge-files <url1> <url2> - Purge specific files');
            console.log('');
            console.log('Environment variables required:');
            console.log('  CLOUDFLARE_API_TOKEN - Your CloudFlare API token');
            console.log('  CLOUDFLARE_ZONE_ID   - Your CloudFlare zone ID');
            break;
    }
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = CloudFlareSetup;
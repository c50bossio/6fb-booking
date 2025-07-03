#!/usr/bin/env node
/**
 * Health check script for BookedBarber V2 Frontend
 * Validates Next.js application availability and basic functionality
 */

const http = require('http');

function checkHealth() {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: '/api/health',
            method: 'GET',
            timeout: 5000
        };

        const req = http.request(options, (res) => {
            if (res.statusCode === 200) {
                console.log('Frontend health check passed');
                resolve(true);
            } else {
                console.error(`Frontend health check failed with status: ${res.statusCode}`);
                reject(false);
            }
        });

        req.on('error', (err) => {
            console.error('Frontend health check failed:', err.message);
            reject(false);
        });

        req.on('timeout', () => {
            console.error('Frontend health check timed out');
            req.destroy();
            reject(false);
        });

        req.end();
    });
}

// Fallback health check - try to access root path if /api/health fails
function fallbackHealthCheck() {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: '/',
            method: 'GET',
            timeout: 5000
        };

        const req = http.request(options, (res) => {
            if (res.statusCode < 400) {
                console.log('Frontend fallback health check passed');
                resolve(true);
            } else {
                console.error(`Frontend fallback health check failed with status: ${res.statusCode}`);
                reject(false);
            }
        });

        req.on('error', (err) => {
            console.error('Frontend fallback health check failed:', err.message);
            reject(false);
        });

        req.on('timeout', () => {
            console.error('Frontend fallback health check timed out');
            req.destroy();
            reject(false);
        });

        req.end();
    });
}

async function main() {
    try {
        await checkHealth();
        process.exit(0);
    } catch (error) {
        console.log('Primary health check failed, trying fallback...');
        try {
            await fallbackHealthCheck();
            process.exit(0);
        } catch (fallbackError) {
            console.error('All health checks failed');
            process.exit(1);
        }
    }
}

main();
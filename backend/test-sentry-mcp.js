#!/usr/bin/env node

/**
 * Test script for Sentry MCP Server
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function testMCPServer() {
  console.log('🧪 Testing Sentry MCP Server...\n');

  const serverPath = join(__dirname, 'sentry-mcp-server.js');
  
  // Start the MCP server
  const serverProcess = spawn('node', [serverPath], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: {
      ...process.env,
      SENTRY_AUTH_TOKEN: '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',
      SENTRY_ORG: 'sixfb',
      SENTRY_PYTHON_PROJECT: '4509526819012608',
      SENTRY_NODEJS_PROJECT: '4509526890643456'
    }
  });

  let output = '';
  let errorOutput = '';

  serverProcess.stdout.on('data', (data) => {
    output += data.toString();
  });

  serverProcess.stderr.on('data', (data) => {
    errorOutput += data.toString();
  });

  // Test initialization
  const initMessage = {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: {
        name: 'test-client',
        version: '1.0.0'
      }
    }
  };

  serverProcess.stdin.write(JSON.stringify(initMessage) + '\n');

  // Test tool listing
  const listToolsMessage = {
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/list'
  };

  setTimeout(() => {
    serverProcess.stdin.write(JSON.stringify(listToolsMessage) + '\n');
  }, 100);

  // Test sentry_list_issues call
  const callToolMessage = {
    jsonrpc: '2.0',
    id: 3,
    method: 'tools/call',
    params: {
      name: 'sentry_list_issues',
      arguments: {
        project: 'python',
        limit: 5
      }
    }
  };

  setTimeout(() => {
    serverProcess.stdin.write(JSON.stringify(callToolMessage) + '\n');
  }, 200);

  // Wait for responses
  setTimeout(() => {
    serverProcess.kill();
    
    console.log('📊 Test Results:');
    console.log('================\n');
    
    if (errorOutput.includes('Sentry MCP Server running')) {
      console.log('✅ Server started successfully');
    } else {
      console.log('❌ Server failed to start');
      console.log('Error output:', errorOutput);
    }

    if (output) {
      console.log('\n📤 Server output:');
      console.log(output);
    }

    if (errorOutput && !errorOutput.includes('Sentry MCP Server running')) {
      console.log('\n🔥 Error output:');
      console.log(errorOutput);
    }

    console.log('\n🎯 Next steps:');
    console.log('1. Restart Claude Desktop to load the new MCP server');
    console.log('2. Use the tools: sentry_list_issues, sentry_get_issue, sentry_get_events');
    console.log('3. Check Sentry dashboards:');
    console.log('   - Python: https://sentry.io/organizations/sixfb/issues/?project=4509526819012608');
    console.log('   - Node.js: https://sentry.io/organizations/sixfb/issues/?project=4509526890643456');
  }, 1000);
}

testMCPServer().catch(console.error);
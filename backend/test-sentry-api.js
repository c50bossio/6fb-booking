#!/usr/bin/env node

import axios from 'axios';

const SENTRY_AUTH_TOKEN = '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';
const SENTRY_ORG = 'bossio-solution-inc';

async function testSentryAPI() {
  console.log('🔍 Testing Sentry API access...\n');

  // Test 1: List organizations
  try {
    console.log('1. Testing organization access...');
    const orgResponse = await axios.get('https://sentry.io/api/0/organizations/', {
      headers: { Authorization: `Bearer ${SENTRY_AUTH_TOKEN}` }
    });
    console.log('✅ Organizations accessible:', orgResponse.data.length, 'found');
    
    const sixfbOrg = orgResponse.data.find(org => org.slug === 'sixfb');
    if (sixfbOrg) {
      console.log('✅ Found sixfb organization:', sixfbOrg.name);
    } else {
      console.log('❌ sixfb organization not found');
      console.log('Available organizations:');
      orgResponse.data.forEach(org => {
        console.log(`   - ${org.name} (slug: ${org.slug})`);
      });
    }
  } catch (error) {
    console.log('❌ Organization access failed:', error.message);
  }

  console.log('\n');

  // Test 2: List projects
  try {
    console.log('2. Testing projects access...');
    const projectsResponse = await axios.get(`https://sentry.io/api/0/organizations/${SENTRY_ORG}/projects/`, {
      headers: { Authorization: `Bearer ${SENTRY_AUTH_TOKEN}` }
    });
    console.log('✅ Projects accessible:', projectsResponse.data.length, 'found');
    
    projectsResponse.data.forEach(project => {
      console.log(`   - ${project.name} (slug: ${project.slug}, id: ${project.id})`);
    });
  } catch (error) {
    console.log('❌ Projects access failed:', error.message);
    if (error.response) {
      console.log('   Status:', error.response.status);
      console.log('   Data:', error.response.data);
    }
  }

  console.log('\n');

  // Test 3: List issues for first project found
  try {
    console.log('3. Testing issues access...');
    const projectsResponse = await axios.get(`https://sentry.io/api/0/organizations/${SENTRY_ORG}/projects/`, {
      headers: { Authorization: `Bearer ${SENTRY_AUTH_TOKEN}` }
    });
    
    if (projectsResponse.data.length > 0) {
      const firstProject = projectsResponse.data[0];
      console.log(`   Using project: ${firstProject.name} (${firstProject.slug})`);
      
      const issuesResponse = await axios.get(
        `https://sentry.io/api/0/projects/${SENTRY_ORG}/${firstProject.slug}/issues/`,
        {
          headers: { Authorization: `Bearer ${SENTRY_AUTH_TOKEN}` },
          params: { limit: 5, statsPeriod: '24h' }
        }
      );
      
      console.log('✅ Issues accessible:', issuesResponse.data.length, 'found in last 24h');
      
      issuesResponse.data.forEach((issue, index) => {
        console.log(`   ${index + 1}. ${issue.title} (${issue.level})`);
      });
    }
  } catch (error) {
    console.log('❌ Issues access failed:', error.message);
    if (error.response) {
      console.log('   Status:', error.response.status);
    }
  }
}

testSentryAPI().catch(console.error);
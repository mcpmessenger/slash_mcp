#!/usr/bin/env node

/**
 * MCP Hub Integration Setup Script
 * This script sets up the GitHub MCP and Supabase integrations
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const INTEGRATION_FILES = ['GitHubMCPTool.js', 'SupabaseMCPTool.js'];

const REQUIRED_ENV_VARS = ['GITHUB_PERSONAL_ACCESS_TOKEN', 'SUPABASE_URL', 'SUPABASE_ANON_KEY'];

function checkEnvironment() {
  console.log('🔍 Checking environment configuration...');

  const missing = REQUIRED_ENV_VARS.filter((envVar) => !process.env[envVar]);

  if (missing.length > 0) {
    console.log('❌ Missing required environment variables:');
    missing.forEach((envVar) => console.log(`   - ${envVar}`));
    console.log('\n💡 Please update your .env file with the required values');
    return false;
  }

  console.log('✅ Environment configuration looks good');
  return true;
}

function checkIntegrationFiles() {
  console.log('📁 Checking integration files...');

  const integrationsDir = path.join(process.cwd(), 'server', 'integrations');

  if (!fs.existsSync(integrationsDir)) {
    console.log('❌ Integrations directory not found: server/integrations/');
    return false;
  }

  const missing = INTEGRATION_FILES.filter(
    (file) => !fs.existsSync(path.join(integrationsDir, file)),
  );

  if (missing.length > 0) {
    console.log('❌ Missing integration files:');
    missing.forEach((file) => console.log(`   - ${file}`));
    console.log('\n💡 Please copy the integration files to server/integrations/');
    return false;
  }

  console.log('✅ Integration files found');
  return true;
}

function checkDockerAvailability() {
  console.log('🐳 Checking Docker availability...');

  return new Promise((resolve) => {
    const docker = spawn('docker', ['--version'], { stdio: 'pipe' });

    docker.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Docker is available');
        resolve(true);
      } else {
        console.log('⚠️  Docker not available - will use binary mode for GitHub MCP');
        resolve(false);
      }
    });

    docker.on('error', () => {
      console.log('⚠️  Docker not available - will use binary mode for GitHub MCP');
      resolve(false);
    });
  });
}

function testGitHubConnection() {
  console.log('🔗 Testing GitHub API connection...');

  return new Promise((resolve) => {
    const https = require('https');

    const options = {
      hostname: 'api.github.com',
      path: '/user',
      method: 'GET',
      headers: {
        Authorization: `Bearer ${process.env.GITHUB_PERSONAL_ACCESS_TOKEN}`,
        'User-Agent': 'MCP-Hub-Integration-Test',
      },
    };

    const req = https.request(options, (res) => {
      if (res.statusCode === 200) {
        console.log('✅ GitHub API connection successful');
        resolve(true);
      } else {
        console.log(`❌ GitHub API connection failed: ${res.statusCode}`);
        resolve(false);
      }
    });

    req.on('error', (err) => {
      console.log(`❌ GitHub API connection error: ${err.message}`);
      resolve(false);
    });

    req.setTimeout(5000, () => {
      console.log('❌ GitHub API connection timeout');
      resolve(false);
    });

    req.end();
  });
}

function testSupabaseConnection() {
  console.log('🗄️  Testing Supabase connection...');

  return new Promise((resolve) => {
    const https = require('https');
    const url = new URL(process.env.SUPABASE_URL);

    const options = {
      hostname: url.hostname,
      path: '/rest/v1/',
      method: 'GET',
      headers: {
        apikey: process.env.SUPABASE_ANON_KEY,
        Authorization: `Bearer ${process.env.SUPABASE_ANON_KEY}`,
      },
    };

    const req = https.request(options, (res) => {
      if (res.statusCode === 200) {
        console.log('✅ Supabase connection successful');
        resolve(true);
      } else {
        console.log(`❌ Supabase connection failed: ${res.statusCode}`);
        resolve(false);
      }
    });

    req.on('error', (err) => {
      console.log(`❌ Supabase connection error: ${err.message}`);
      resolve(false);
    });

    req.setTimeout(5000, () => {
      console.log('❌ Supabase connection timeout');
      resolve(false);
    });

    req.end();
  });
}

async function runSetup() {
  console.log('🚀 MCP Hub Integration Setup\n');

  // Check environment
  if (!checkEnvironment()) {
    process.exit(1);
  }

  // Check integration files
  if (!checkIntegrationFiles()) {
    process.exit(1);
  }

  // Check Docker availability
  await checkDockerAvailability();

  // Test connections
  const githubOk = await testGitHubConnection();
  const supabaseOk = await testSupabaseConnection();

  console.log('\n📊 Setup Summary:');
  console.log(`   Environment: ✅`);
  console.log(`   Integration Files: ✅`);
  console.log(`   GitHub Connection: ${githubOk ? '✅' : '❌'}`);
  console.log(`   Supabase Connection: ${supabaseOk ? '✅' : '❌'}`);

  if (githubOk && supabaseOk) {
    console.log('\n🎉 Setup completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Start the MCP Hub server: npm run backend');
    console.log('2. Start the frontend: npm run dev');
    console.log('3. Test the integrations through the UI');
  } else {
    console.log('\n⚠️  Setup completed with warnings');
    console.log('Please check the failed connections before proceeding');
  }
}

// Run setup if called directly
if (require.main === module) {
  runSetup().catch(console.error);
}

module.exports = { runSetup };

#!/usr/bin/env node

/**
 * MCP Hub Integration Dependencies Update Script
 * This script updates package.json with required dependencies for GitHub MCP and Supabase integrations
 */

const fs = require('fs');
const path = require('path');

const REQUIRED_DEPENDENCIES = {
  // Supabase integration
  '@supabase/supabase-js': '^2.39.0',

  // Enhanced validation and schema handling
  zod: '^3.22.4',

  // Process management for GitHub MCP server
  'cross-spawn': '^7.0.3',

  // Enhanced error handling
  'http-errors': '^2.0.0',

  // Additional utilities
  uuid: '^9.0.1',
  'mime-types': '^2.1.35',
};

const REQUIRED_DEV_DEPENDENCIES = {
  // Testing utilities
  '@types/uuid': '^9.0.7',
  '@types/mime-types': '^2.1.4',
};

function updatePackageJson() {
  const packageJsonPath = path.join(process.cwd(), 'package.json');

  if (!fs.existsSync(packageJsonPath)) {
    console.error('❌ package.json not found in current directory');
    process.exit(1);
  }

  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

    // Initialize dependencies if they don't exist
    if (!packageJson.dependencies) {
      packageJson.dependencies = {};
    }
    if (!packageJson.devDependencies) {
      packageJson.devDependencies = {};
    }

    // Add required dependencies
    let dependenciesAdded = 0;
    Object.entries(REQUIRED_DEPENDENCIES).forEach(([pkg, version]) => {
      if (!packageJson.dependencies[pkg]) {
        packageJson.dependencies[pkg] = version;
        dependenciesAdded++;
        console.log(`✅ Added dependency: ${pkg}@${version}`);
      } else {
        console.log(`ℹ️  Dependency already exists: ${pkg}`);
      }
    });

    // Add required dev dependencies
    Object.entries(REQUIRED_DEV_DEPENDENCIES).forEach(([pkg, version]) => {
      if (!packageJson.devDependencies[pkg]) {
        packageJson.devDependencies[pkg] = version;
        dependenciesAdded++;
        console.log(`✅ Added dev dependency: ${pkg}@${version}`);
      } else {
        console.log(`ℹ️  Dev dependency already exists: ${pkg}`);
      }
    });

    // Add integration-specific scripts if they don't exist
    if (!packageJson.scripts) {
      packageJson.scripts = {};
    }

    const newScripts = {
      'test:integration': 'jest --testPathPattern=integration',
      'test:github': 'jest --testPathPattern=github',
      'test:supabase': 'jest --testPathPattern=supabase',
      'setup:integrations': 'node scripts/setup-integrations.js',
    };

    Object.entries(newScripts).forEach(([script, command]) => {
      if (!packageJson.scripts[script]) {
        packageJson.scripts[script] = command;
        console.log(`✅ Added script: ${script}`);
      }
    });

    // Write updated package.json
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');

    console.log(`\n🎉 Package.json updated successfully!`);

    if (dependenciesAdded > 0) {
      console.log(`\n📦 Run 'npm install' to install ${dependenciesAdded} new dependencies`);
    }

    console.log('\n📋 Next steps:');
    console.log('1. Run: npm install');
    console.log('2. Copy env.integration.example to .env');
    console.log('3. Update .env with your actual credentials');
    console.log('4. Place integration files in server/integrations/');
    console.log('5. Run: npm run test:integration');
  } catch (error) {
    console.error('❌ Error updating package.json:', error.message);
    process.exit(1);
  }
}

// Run the update
updatePackageJson();

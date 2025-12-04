#!/usr/bin/env node
/**
 * Helper script to update rule type values across the codebase.
 * 
 * This script updates rule type string values in:
 * - Schema file (source of truth)
 * - Test configuration files
 * - Sample data files
 * - Backend test files
 * 
 * Usage:
 *   node scripts/update-rule-types.js
 * 
 * IMPORTANT: 
 * - Edit the RULE_TYPE_MAPPINGS object below to change values
 * - The schema file is the single source of truth
 * - All other files are updated to match the schema
 */

const fs = require('fs');
const path = require('path');

// =============================================================================
// CONFIGURATION - Edit these values to update rule types across the codebase
// =============================================================================

const RULE_TYPE_MAPPINGS = {
  // Format: { 'Original Name': 'Current Schema Value' }
  // The left side is the semantic/original name (what it represents)
  // The right side is the current value in the schema (what it's called now)
  // Edit the RIGHT side to change values throughout the codebase
  
  // Current mappings (edit right-hand value to change):
  'Condition': 'GCondition',              // Condition rules (boolean-returning, referenceable by Condition)
  'Condition Group': 'SCondition Group',        // Condition group rules (boolean-returning, referenceable by ConditionGroup)
  'List': 'AList',           // List rules (array-returning)
  
  // Add more mappings as needed:
  // 'Original Name': 'Current Schema Value',
};

// Files to update (relative to project root)
const FILES_TO_UPDATE = {
  schema: 'backend/src/main/resources/static/schemas/rule-schema-current.json',
  frontendTestConfig: 'frontend/tests/testConfig.js',
  sampleDataDir: 'backend/src/main/resources/static/rules/samples',
  backendTests: 'backend/src/test/java/com/rulebuilder/service/RuleValidationServiceTest.java',
};

// =============================================================================
// SCRIPT LOGIC - No need to edit below this line
// =============================================================================

const projectRoot = path.join(__dirname, '..');

function readFile(filePath) {
  const fullPath = path.join(projectRoot, filePath);
  return fs.readFileSync(fullPath, 'utf8');
}

function writeFile(filePath, content) {
  const fullPath = path.join(projectRoot, filePath);
  fs.writeFileSync(fullPath, content, 'utf8');
}

function updateSchema() {
  console.log('\n📋 Updating schema file...');
  const schemaPath = FILES_TO_UPDATE.schema;
  let content = readFile(schemaPath);
  let changed = false;

  Object.entries(RULE_TYPE_MAPPINGS).forEach(([originalName, currentValue]) => {
    if (originalName !== currentValue) {
      const regex = new RegExp(`"${originalName}"`, 'g');
      const newContent = content.replace(regex, `"${currentValue}"`);
      if (newContent !== content) {
        console.log(`  ✓ Replaced "${originalName}" → "${currentValue}"`);
        content = newContent;
        changed = true;
      }
    }
  });

  if (changed) {
    writeFile(schemaPath, content);
    console.log('  ✅ Schema updated');
  } else {
    console.log('  ℹ️  No changes needed');
  }
}

function updateFrontendTestConfig() {
  console.log('\n📋 Updating frontend test config...');
  const configPath = FILES_TO_UPDATE.frontendTestConfig;
  let content = readFile(configPath);
  let changed = false;

  Object.entries(RULE_TYPE_MAPPINGS).forEach(([originalName, currentValue]) => {
    if (originalName !== currentValue) {
      // Update string literals in the TEST_RULE_TYPES object
      const regex = new RegExp(`'${originalName}'`, 'g');
      const newContent = content.replace(regex, `'${currentValue}'`);
      if (newContent !== content) {
        console.log(`  ✓ Replaced '${originalName}' → '${currentValue}'`);
        content = newContent;
        changed = true;
      }
    }
  });

  if (changed) {
    writeFile(configPath, content);
    console.log('  ✅ Frontend test config updated');
  } else {
    console.log('  ℹ️  No changes needed');
  }
}

function updateSampleData() {
  console.log('\n📋 Updating sample data files...');
  const sampleDir = path.join(projectRoot, FILES_TO_UPDATE.sampleDataDir);
  
  if (!fs.existsSync(sampleDir)) {
    console.log('  ⚠️  Sample data directory not found');
    return;
  }

  const files = fs.readdirSync(sampleDir).filter(f => f.endsWith('.json'));
  let totalChanged = 0;

  files.forEach(file => {
    const filePath = path.join(FILES_TO_UPDATE.sampleDataDir, file);
    let content = readFile(filePath);
    let fileChanged = false;

    Object.entries(RULE_TYPE_MAPPINGS).forEach(([originalName, currentValue]) => {
      if (originalName !== currentValue) {
        const regex = new RegExp(`"${originalName}"`, 'g');
        const newContent = content.replace(regex, `"${currentValue}"`);
        if (newContent !== content) {
          content = newContent;
          fileChanged = true;
        }
      }
    });

    if (fileChanged) {
      writeFile(filePath, content);
      console.log(`  ✓ Updated ${file}`);
      totalChanged++;
    }
  });

  if (totalChanged > 0) {
    console.log(`  ✅ Updated ${totalChanged} sample data file(s)`);
  } else {
    console.log('  ℹ️  No changes needed');
  }
}

function updateBackendTests() {
  console.log('\n📋 Updating backend test files...');
  const testPath = FILES_TO_UPDATE.backendTests;
  let content = readFile(testPath);
  let changed = false;

  Object.entries(RULE_TYPE_MAPPINGS).forEach(([originalName, currentValue]) => {
    if (originalName !== currentValue) {
      // Update JSON string literals in test data
      const regex = new RegExp(`"${originalName}"`, 'g');
      const newContent = content.replace(regex, `"${currentValue}"`);
      if (newContent !== content) {
        console.log(`  ✓ Replaced "${originalName}" → "${currentValue}"`);
        content = newContent;
        changed = true;
      }
    }
  });

  if (changed) {
    writeFile(testPath, content);
    console.log('  ✅ Backend tests updated');
  } else {
    console.log('  ℹ️  No changes needed');
  }
}

function validateMappings() {
  console.log('\n🔍 Validating rule type mappings...');
  
  const hasChanges = Object.entries(RULE_TYPE_MAPPINGS).some(
    ([originalName, currentValue]) => originalName !== currentValue
  );
  
  if (!hasChanges) {
    console.log('  ⚠️  No changes configured in RULE_TYPE_MAPPINGS');
    console.log('  ℹ️  Edit the RULE_TYPE_MAPPINGS object to specify changes');
    return false;
  }
  
  console.log('  ✓ Mappings configured:');
  Object.entries(RULE_TYPE_MAPPINGS).forEach(([originalName, currentValue]) => {
    if (originalName !== currentValue) {
      console.log(`    "${originalName}" → "${currentValue}"`);
    }
  });
  
  return true;
}

function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  Rule Type Update Script');
  console.log('═══════════════════════════════════════════════════════════');
  
  if (!validateMappings()) {
    console.log('\n✨ No changes to apply. Exiting.');
    return;
  }
  
  console.log('\n⚠️  WARNING: This will modify multiple files!');
  console.log('   Make sure you have committed any important changes.');
  
  // In a real scenario, you might want to add a confirmation prompt here
  // For now, we'll proceed automatically
  
  try {
    updateSchema();
    updateFrontendTestConfig();
    updateSampleData();
    updateBackendTests();
    
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('  ✅ All files updated successfully!');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('\n📝 Next steps:');
    console.log('  1. Review changes: git diff');
    console.log('  2. Run backend tests: cd backend && mvn test');
    console.log('  3. Run frontend tests: cd frontend && npm test');
    console.log('  4. Commit changes if all tests pass');
    
  } catch (error) {
    console.error('\n❌ Error updating files:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { RULE_TYPE_MAPPINGS, updateSchema, updateFrontendTestConfig, updateSampleData, updateBackendTests };

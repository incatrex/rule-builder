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
 *   node scripts/update-rule-types.js [--dry-run]
 * 
 * Options:
 *   --dry-run, -n    Preview changes without modifying files
 * 
 * IMPORTANT: 
 * - Edit the RULE_TYPE_MAPPINGS object below to change values
 * - The schema file is the single source of truth
 * - Backend code extracts values from schema at runtime (no hardcoded values)
 * - Frontend gets values from backend API (no hardcoded values except tests)
 * - After running this script, you MUST rebuild the backend: mvn clean package
 * 
 * SCHEMA-DRIVEN ARCHITECTURE:
 * - Application code extracts rule types from schema automatically
 * - This script only updates test files and sample data
 * - No application code changes needed when renaming rule types
 */

const fs = require('fs');
const path = require('path');

// =============================================================================
// CONFIGURATION - Edit these values to update rule types across the codebase
// =============================================================================

const RULE_TYPE_MAPPINGS = {
  // Format: { 'Current Schema Value': 'New Schema Value' }
  // To rename rule types, edit the mappings below:
  // - Left side: Current value in schema
  // - Right side: New value you want
  
  // Example: To rename back to originals, uncomment these:
  'GCondition': 'Condition',
  'SCondition Group': 'Condition Group',
  'AList': 'List',
  
  // Example: To rename to something completely new:
  // 'GCondition': 'BusinessRule',
  // 'SCondition Group': 'RuleGroup',
  // 'AList': 'DataList',
};

// Files to update (relative to project root)
const FILES_TO_UPDATE = {
  schema: 'backend/src/main/resources/static/schemas/rule-schema-current.json',
  frontendUnitTestConfig: 'frontend/tests/testConfig.js',
  frontendE2ETestConfig: 'frontend/e2e/testConfig.js',
  sampleDataDir: 'backend/src/main/resources/static/rules/samples',
  backendTests: 'backend/src/test/java/com/rulebuilder/service/RuleValidationServiceTest.java',
  backendTestUtils: 'backend/src/test/java/com/rulebuilder/testutil/TestRuleTypes.java',
};

// Command line arguments
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run') || args.includes('-n');

// =============================================================================
// SCRIPT LOGIC - No need to edit below this line
// =============================================================================

const projectRoot = path.join(__dirname, '..');

function escapeRegex(str) {
  // Escape special regex characters
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function readFile(filePath) {
  const fullPath = path.join(projectRoot, filePath);
  return fs.readFileSync(fullPath, 'utf8');
}

function writeFile(filePath, content) {
  const fullPath = path.join(projectRoot, filePath);
  if (DRY_RUN) {
    console.log(`  [DRY RUN] Would write to: ${filePath}`);
  } else {
    fs.writeFileSync(fullPath, content, 'utf8');
  }
}

function updateSchema() {
  console.log('\n📋 Updating schema file...');
  const schemaPath = FILES_TO_UPDATE.schema;
  let content = readFile(schemaPath);
  let changed = false;

  Object.entries(RULE_TYPE_MAPPINGS).forEach(([oldValue, newValue]) => {
    if (oldValue !== newValue) {
      const escapedOld = escapeRegex(oldValue);
      const regex = new RegExp(`"${escapedOld}"`, 'g');
      const newContent = content.replace(regex, `"${newValue}"`);
      if (newContent !== content) {
        console.log(`  ✓ Replaced "${oldValue}" → "${newValue}"`);
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

function updateTestConfig(configPath, description) {
  console.log(`\n📋 Updating ${description}...`);
  let content = readFile(configPath);
  let changed = false;

  Object.entries(RULE_TYPE_MAPPINGS).forEach(([oldValue, newValue]) => {
    if (oldValue !== newValue) {
      const escapedOld = escapeRegex(oldValue);
      // Update both single and double quoted strings
      const singleQuoteRegex = new RegExp(`'${escapedOld}'`, 'g');
      const doubleQuoteRegex = new RegExp(`"${escapedOld}"`, 'g');
      
      let newContent = content.replace(singleQuoteRegex, `'${newValue}'`);
      newContent = newContent.replace(doubleQuoteRegex, `"${newValue}"`);
      
      if (newContent !== content) {
        console.log(`  ✓ Replaced '${oldValue}' → '${newValue}'`);
        content = newContent;
        changed = true;
      }
    }
  });

  if (changed) {
    writeFile(configPath, content);
    console.log(`  ✅ ${description} updated`);
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

    Object.entries(RULE_TYPE_MAPPINGS).forEach(([oldValue, newValue]) => {
      if (oldValue !== newValue) {
        const escapedOld = escapeRegex(oldValue);
        const regex = new RegExp(`"${escapedOld}"`, 'g');
        const newContent = content.replace(regex, `"${newValue}"`);
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

  Object.entries(RULE_TYPE_MAPPINGS).forEach(([oldValue, newValue]) => {
    if (oldValue !== newValue) {
      const escapedOld = escapeRegex(oldValue);
      // Update JSON string literals in test data
      const regex = new RegExp(`"${escapedOld}"`, 'g');
      const newContent = content.replace(regex, `"${newValue}"`);
      if (newContent !== content) {
        console.log(`  ✓ Replaced "${oldValue}" → "${newValue}"`);
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

function updateBackendTestUtils() {
  console.log('\n📋 Updating backend test utilities (comments only)...');
  const testPath = FILES_TO_UPDATE.backendTestUtils;
  let content = readFile(testPath);
  let changed = false;

  Object.entries(RULE_TYPE_MAPPINGS).forEach(([oldValue, newValue]) => {
    if (oldValue !== newValue) {
      const escapedOld = escapeRegex(oldValue);
      // Update string literals in comments and JSON examples
      const doubleQuoteRegex = new RegExp(`"${escapedOld}"`, 'g');
      const newContent = content.replace(doubleQuoteRegex, `"${newValue}"`);
      
      if (newContent !== content) {
        console.log(`  ✓ Replaced "${oldValue}" → "${newValue}" in comments`);
        content = newContent;
        changed = true;
      }
    }
  });

  if (changed) {
    writeFile(testPath, content);
    console.log('  ✅ Backend test utilities updated');
  } else {
    console.log('  ℹ️  No changes needed');
  }
}

function validateMappings() {
  console.log('\n🔍 Validating rule type mappings...');
  
  if (Object.keys(RULE_TYPE_MAPPINGS).length === 0) {
    console.log('  ⚠️  No mappings configured in RULE_TYPE_MAPPINGS');
    console.log('  ℹ️  Edit the RULE_TYPE_MAPPINGS object to specify changes');
    console.log('  ℹ️  Example: {\'GCondition\': \'Condition\', \'AList\': \'List\'} ');
    return false;
  }
  
  const hasChanges = Object.entries(RULE_TYPE_MAPPINGS).some(
    ([oldValue, newValue]) => oldValue !== newValue
  );
  
  if (!hasChanges) {
    console.log('  ⚠️  All mappings have identical old and new values');
    console.log('  ℹ️  Edit the RIGHT side of mappings to specify new values');
    return false;
  }
  
  console.log('  ✓ Mappings configured:');
  Object.entries(RULE_TYPE_MAPPINGS).forEach(([oldValue, newValue]) => {
    if (oldValue !== newValue) {
      console.log(`    "${oldValue}" → "${newValue}"`);
    }
  });
  
  return true;
}

function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  Rule Type Update Script');
  console.log('═══════════════════════════════════════════════════════════');
  
  if (DRY_RUN) {
    console.log('\n🔍 DRY RUN MODE - No files will be modified');
  }
  
  if (!validateMappings()) {
    console.log('\n✨ No changes to apply. Exiting.');
    return;
  }
  
  if (!DRY_RUN) {
    console.log('\n⚠️  WARNING: This will modify multiple files!');
    console.log('   Make sure you have committed any important changes.');
  }
  
  try {
    updateSchema();
    updateTestConfig(FILES_TO_UPDATE.frontendUnitTestConfig, 'frontend unit test config');
    updateTestConfig(FILES_TO_UPDATE.frontendE2ETestConfig, 'frontend E2E test config');
    updateSampleData();
    updateBackendTests();
    updateBackendTestUtils();
    
    console.log('\n═══════════════════════════════════════════════════════════');
    if (DRY_RUN) {
      console.log('  ✅ Dry run completed - no files were modified');
      console.log('  ℹ️  Run without --dry-run to apply changes');
    } else {
      console.log('  ✅ All files updated successfully!');
    }
    console.log('═══════════════════════════════════════════════════════════');
    
    if (!DRY_RUN) {
      console.log('\n📝 Next steps:');
      console.log('  1. Review changes: git diff');
      console.log('  2. Rebuild backend: cd backend && mvn clean package -DskipTests');
      console.log('  3. Restart backend: ./scripts/start-backend.sh');
      console.log('  4. Run backend tests: cd backend && mvn test');
      console.log('  5. Run frontend tests: cd frontend && npm test');
      console.log('  6. Run E2E tests: npm run test:e2e --prefix frontend');
      console.log('  7. Commit changes if all tests pass');
    }
    
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

module.exports = { RULE_TYPE_MAPPINGS, updateSchema, updateTestConfig, updateSampleData, updateBackendTests, updateBackendTestUtils };

#!/usr/bin/env node

/**
 * Schema-to-Config Generator
 * 
 * Reads the integrated JSON schema and generates config.json and fields.json
 * This ensures single source of truth for rule structure and UI configuration.
 * 
 * Usage: node scripts/generate-config.js
 */

const fs = require('fs');
const path = require('path');

const SCHEMA_PATH = path.join(__dirname, '../backend/src/main/resources/static/schemas/rule-schema-current.json');
const CONFIG_OUTPUT_PATH = path.join(__dirname, '../backend/src/main/resources/static/config.json');
const FIELDS_OUTPUT_PATH = path.join(__dirname, '../backend/src/main/resources/static/fields.json');

function generateConfigFromSchema() {
  console.log('🔄 Reading integrated schema...');
  
  // Read the clean integrated schema
  const schemaContent = fs.readFileSync(SCHEMA_PATH, 'utf8');
  const schema = JSON.parse(schemaContent);
  
  console.log('🔄 Generating config.json...');
  
  // Generate config.json
  const config = {
    conjunctions: {
      AND: { label: "AND", formatConj: "AND" },
      OR: { label: "OR", formatConj: "OR" }
    },
    operators: generateOperators(schema.operators),
    widgets: generateWidgets(),
    types: generateTypes(schema.operators),
    funcs: generateFunctions(schema.functions),
    settings: schema.ui.settings
  };

  console.log('🔄 Generating fields.json...');
  
  // Generate fields.json
  const fields = generateFields(schema.fields);

  // Write output files
  console.log('💾 Writing config.json...');
  fs.writeFileSync(CONFIG_OUTPUT_PATH, JSON.stringify(config, null, 2));
  
  console.log('💾 Writing fields.json...');
  fs.writeFileSync(FIELDS_OUTPUT_PATH, JSON.stringify(fields, null, 2));

  console.log('✅ Successfully generated configuration files from schema!');
  console.log(`   📄 Config: ${CONFIG_OUTPUT_PATH}`);
  console.log(`   📄 Fields: ${FIELDS_OUTPUT_PATH}`);
}

function generateOperators(operatorsSchema) {
  const operators = {};
  
  Object.keys(operatorsSchema).forEach(operatorKey => {
    const operatorDef = operatorsSchema[operatorKey];
    
    operators[operatorKey] = {
      label: operatorDef.label,
      labelForFormat: operatorDef.label,
      ...(operatorDef.cardinality !== undefined && { cardinality: operatorDef.cardinality }),
      ...(operatorDef.minCardinality !== undefined && { minCardinality: operatorDef.minCardinality }),
      ...(operatorDef.maxCardinality !== undefined && { maxCardinality: operatorDef.maxCardinality }),
      ...(operatorDef.defaultCardinality !== undefined && { defaultCardinality: operatorDef.defaultCardinality }),
      ...(operatorDef.separator && { separator: operatorDef.separator })
    };
  });
  
  return operators;
}

function generateWidgets() {
  return {
    text: { type: "text" },
    number: { type: "number" },
    date: {
      type: "date",
      dateFormat: "YYYY-MM-DD",
      valueFormat: "YYYY-MM-DD"
    },
    boolean: { type: "boolean" },
    select: { type: "select" },
    multiselect: { type: "multiselect" }
  };
}

function generateTypes(operatorsSchema) {
  const types = {};
  
  // Group operators by supported types
  Object.keys(operatorsSchema).forEach(operatorKey => {
    const operatorDef = operatorsSchema[operatorKey];
    
    operatorDef.types.forEach(typeName => {
      if (!types[typeName]) {
        types[typeName] = {
          defaultOperator: 'equal',
          widgets: {}
        };
      }
      
      // Initialize widget for this type if not exists
      if (!types[typeName].widgets[typeName]) {
        types[typeName].widgets[typeName] = {
          operators: []
        };
      }
      
      // Add operator to this type's widget
      if (!types[typeName].widgets[typeName].operators.includes(operatorKey)) {
        types[typeName].widgets[typeName].operators.push(operatorKey);
      }
    });
  });
  
  return types;
}

function generateFunctions(functionsSchema) {
  const funcs = {};
  
  Object.keys(functionsSchema).forEach(functionKey => {
    const functionDef = functionsSchema[functionKey];
    const [categoryName, funcName] = functionKey.split('.');
    
    // Initialize category if not exists
    if (!funcs[categoryName]) {
      funcs[categoryName] = {
        label: `${categoryName} Functions`,
        type: "!struct",
        subfields: {}
      };
    }
    
    // Build function configuration from schema
    const funcConfig = {
      label: functionDef.label,
      returnType: functionDef.returnType
    };
    
    // Copy UI configuration
    if (functionDef.ui) {
      Object.assign(funcConfig, functionDef.ui);
    }
    
    funcs[categoryName].subfields[funcName] = funcConfig;
  });
  
  return funcs;
}

function generateFields(fieldsSchema) {
  const fields = {};
  
  Object.keys(fieldsSchema).forEach(fieldKey => {
    const fieldDef = fieldsSchema[fieldKey];
    const [tableName, fieldName] = fieldKey.split('.');
    
    // Initialize table if not exists
    if (!fields[tableName]) {
      fields[tableName] = {
        label: tableName.replace(/([A-Z0-9]+)/g, ' $1').trim(),
        type: "!struct",
        subfields: {}
      };
    }
    
    // Build field configuration
    const fieldConfig = {
      label: fieldDef.label,
      type: fieldDef.type,
      preferWidgets: [fieldDef.type] // Default widget preference
    };
    
    if (fieldDef.fieldSettings) {
      fieldConfig.fieldSettings = fieldDef.fieldSettings;
    }
    
    fields[tableName].subfields[fieldName] = fieldConfig;
  });
  
  return fields;
}

// Helper to validate the generated configuration
function validateGeneration() {
  console.log('🔍 Validating generated files...');
  
  try {
    const config = JSON.parse(fs.readFileSync(CONFIG_OUTPUT_PATH, 'utf8'));
    const fields = JSON.parse(fs.readFileSync(FIELDS_OUTPUT_PATH, 'utf8'));
    
    // Basic validation checks
    if (!config.operators || !config.funcs || !config.settings) {
      throw new Error('Generated config.json missing required sections');
    }
    
    if (!fields.TABLE1 || !fields.TABLE2) {
      throw new Error('Generated fields.json missing expected tables');
    }
    
    console.log('✅ Generated files are valid!');
    
    // Show summary
    const funcCount = Object.keys(config.funcs).reduce((total, category) => {
      return total + Object.keys(config.funcs[category].subfields || {}).length;
    }, 0);
    
    const fieldCount = Object.keys(fields).reduce((total, table) => {
      return total + Object.keys(fields[table].subfields || {}).length;
    }, 0);
    
    console.log('📊 Summary:');
    console.log(`   Functions: ${funcCount}`);
    console.log(`   Operators: ${Object.keys(config.operators).length}`);
    console.log(`   Fields: ${fieldCount}`);
    
    return true;
  } catch (error) {
    console.error('❌ Validation failed:', error.message);
    return false;
  }
}

// Main execution
try {
  generateConfigFromSchema();
  
  if (validateGeneration()) {
    console.log('\n🎉 Schema-to-config generation completed successfully!');
    console.log('   The configuration files are now generated from the schema.');
    console.log('   Any changes to the schema will be reflected in the UI configuration.');
  } else {
    process.exit(1);
  }
} catch (error) {
  console.error('❌ Generation failed:', error.message);
  console.error(error.stack);
  process.exit(1);
}
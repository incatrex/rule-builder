# Validation Service Test Results

## Overview

Created a comprehensive test suite for `RuleValidationService` that validates rules against the JSON Schema using the `networknt/json-schema-validator` library. The service returns **raw, unmodified** error data from the validator.

## Service API

### ValidationResult
```java
{
  String schemaFilename;      // "rule-schema-current.json"
  String schemaVersion;       // "2.0.3" (extracted from schema)
  Integer errorCount;         // Number of validation errors found
  List<ValidationError> errors; // Array of validation errors
}
```

### ValidationError (Maps to ValidationMessage)
```java
{
  String type;                    // Error type: "required", "type", "enum", "pattern", "oneOf", etc.
  String code;                    // Error code: "1028", "1008", etc.
  String path;                    // JSON Path: "$.definition.expressions[0].name"
  String schemaPath;              // Schema location: "#/required"
  String message;                 // Human-readable message
  Map<String, Object> arguments;  // Additional error arguments
  Object details;                 // Additional details (if available)
}
```

## Test Coverage (21 tests)

### ✅ Valid Rules (3 tests)
- **Valid simple expression rule** - Zero errors
- **Valid condition rule** - Zero errors
- **Valid case rule** - Zero errors

### 🔴 Missing Required Fields (3 tests)
- **Missing 'structure' field** - `required` error
- **Missing 'uuId' field** - `required` error
- **Missing 'metadata.id' field** - `required` error with nested path

### 🔴 Invalid Enum Values (3 tests)
- **Invalid 'structure' value** - `enum` error
- **Invalid 'returnType' value** - `enum` error
- **Invalid 'ruleType' value** - `enum` error

### 🔴 Invalid Type Errors (2 tests)
- **Wrong type for 'version'** (string instead of integer) - `type` error
- **Wrong type for 'metadata'** (array instead of object) - `type` error

### 🔴 Pattern Violations (2 tests)
- **Invalid UUID pattern** - `pattern` error with regex shown
- **Invalid field pattern** - `pattern` error (field names must be UPPERCASE.UPPERCASE)

### 🔴 oneOf Errors (2 tests)
- **Invalid expression type** - Generates CASCADE of 16 errors (known issue)
- **Missing required field for expression type** - Multiple oneOf-related errors

### 🔴 Additional Properties (1 test)
- **Unknown property at root** - `additionalProperties` error

### 🔴 Array Constraints (2 tests)
- **Empty 'whenClauses' array** - `minItems` error
- **ExpressionGroup with only one expression** - `minItems` error

### 🔴 Complex Nested Structures (1 test)
- **Multiple errors in deeply nested structure** - All errors reported individually

### ✅ Utility Tests (2 tests)
- **ValidationResult metadata** - Confirms schema filename and version
- **ValidationError structure** - Confirms all properties present

## Sample Error Output

### Example 1: Missing Required Field
```
Error Count: 1

Error #1:
  type: required
  code: 1028
  path: $.metadata
  schemaPath: #/properties/metadata/required
  message: $.metadata.id: is missing but it is required
  arguments: {arg0=id}
```

### Example 2: Invalid Enum
```
Error Count: 1

Error #1:
  type: enum
  code: 1008
  path: $.structure
  schemaPath: #/properties/structure/enum
  message: $.structure: does not have a value in the enumeration [case, condition, expression]
  arguments: {arg0=[case, condition, expression]}
```

### Example 3: Pattern Violation
```
Error Count: 1

Error #1:
  type: pattern
  code: 1023
  path: $.uuId
  schemaPath: #/properties/uuId/pattern
  message: $.uuId: does not match the regex pattern ^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$
  arguments: {arg0=^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$}
```

### Example 4: oneOf Cascade (VERBOSE!)
```
Error Count: 16

Error #1:
  type: oneOf
  code: 1022
  path: $.definition
  schemaPath: #/else/else/then/properties/definition/oneOf
  message: $.definition: should be valid to one and only one schema, but 0 are valid
  arguments: {arg0=0}

Error #2:
  type: enum
  code: 1008
  path: $.definition.type
  schemaPath: #/definitions/Expression/properties/type/enum
  message: $.definition.type: does not have a value in the enumeration [value, field, function, ruleRef]
  arguments: {arg0=[value, field, function, ruleRef]}

Error #3:
  type: oneOf
  code: 1022
  path: $.definition
  schemaPath: #/definitions/Expression/oneOf
  message: $.definition: should be valid to one and only one schema, but 0 are valid
  arguments: {arg0=0}

Error #4-16: Additional const errors for each failed oneOf branch...
```

### Example 5: Additional Property
```
Error Count: 1

Error #1:
  type: additionalProperties
  code: 1001
  path: $
  schemaPath: #/additionalProperties
  message: $.unknownField: is not defined in the schema and the schema does not allow additional properties
  arguments: {arg0=unknownField}
```

## Key Observations

### ✅ Strengths
1. **JSON Path notation** - Clear location of errors (e.g., `$.definition.expressions[0].name`)
2. **Error codes** - Consistent numeric codes for error types
3. **Arguments map** - Additional context available when needed
4. **Schema path** - Shows which part of schema was violated
5. **Comprehensive** - Catches all validation errors

### ⚠️ Known Issues
1. **oneOf cascade** - Invalid data matching multiple oneOf branches generates 10-16 errors per issue
2. **Technical messages** - Messages are schema-focused, not user-friendly
3. **No line numbers** - Library doesn't track source line numbers natively
4. **Verbose paths** - Long JSON paths for deeply nested structures

### 📍 JSON Path Examples
- Root level: `$`
- Top-level property: `$.structure`
- Nested object: `$.metadata.id`
- Array element: `$.definition.expressions[0]`
- Deep nesting: `$.definition.expressions[0].function.args[1].value`

## Next Steps for Enhancement

Based on these raw results, potential enhancements could include:

1. **Filter oneOf errors** - Show only the most relevant error from oneOf cascades
2. **Humanize messages** - Convert technical messages to user-friendly text
3. **Group by path** - Combine related errors for same field
4. **Add context** - Include field names and expected values
5. **Severity levels** - Distinguish between critical and informational errors
6. **Line numbers** - Calculate line numbers from JSON paths (if needed)

## Test Execution

All 21 tests pass successfully:
```
[INFO] Tests run: 21, Failures: 0, Errors: 0, Skipped: 0
[INFO] BUILD SUCCESS
```

## Files Created

1. `RuleValidationService.java` - Service that performs validation
2. `ValidationResult.java` - Result wrapper with metadata
3. `ValidationError.java` - Error representation matching ValidationMessage
4. `RuleValidationServiceTest.java` - Comprehensive test suite (21 tests)
5. `ValidationTestRunner.java` - Standalone runner to view raw output
6. `RuleValidationControllerV1.java` - Updated controller to use new service

## Running the Test Runner

To see raw validation output:
```bash
cd /workspaces/rule-builder/backend
mvn test-compile exec:java -Dexec.mainClass="com.rulebuilder.service.ValidationTestRunner" -Dexec.classpathScope=test
```

To run the test suite:
```bash
cd /workspaces/rule-builder/backend
mvn test -Dtest=RuleValidationServiceTest
```

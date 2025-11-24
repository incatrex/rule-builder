#!/bin/bash

# Test script to verify uuid and version appear at top of saved JSON

echo "Testing JSON field ordering..."

# Create a test rule with uuid at the end (old behavior)
TEST_RULE='{
  "ruleId": "FIELD_ORDER_TEST",
  "structure": "condition",
  "returnType": "boolean",
  "ruleType": "test",
  "definition": {
    "type": "condition",
    "field": "testField",
    "operator": "equals",
    "value": "testValue"
  },
  "uuId": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
}'

# Save the rule
echo ""
echo "Saving test rule..."
RESPONSE=$(curl -s -X PUT http://localhost:8080/api/rules/FIELD_ORDER_TEST/999 \
  -H "Content-Type: application/json" \
  -d "$TEST_RULE")

echo "Response: $RESPONSE"

# Wait a moment for file to be written
sleep 1

# Find and display the saved file
echo ""
echo "Checking saved file..."
SAVED_FILE=$(find /workspaces/rule-builder/backend/src/main/resources/static/rules -name "FIELD_ORDER_TEST*.json" | head -1)

if [ -z "$SAVED_FILE" ]; then
  echo "ERROR: Saved file not found!"
  exit 1
fi

echo "Found file: $SAVED_FILE"
echo ""
echo "First 10 lines of saved JSON:"
head -10 "$SAVED_FILE"

echo ""
echo "Checking field order..."
LINE_NUM_UUID=$(grep -n '"uuid"' "$SAVED_FILE" | cut -d: -f1 | head -1)
LINE_NUM_VERSION=$(grep -n '"version"' "$SAVED_FILE" | cut -d: -f1 | head -1)
LINE_NUM_RULEID=$(grep -n '"ruleId"' "$SAVED_FILE" | cut -d: -f1 | head -1)

echo "uuid appears on line: $LINE_NUM_UUID"
echo "version appears on line: $LINE_NUM_VERSION"
echo "ruleId appears on line: $LINE_NUM_RULEID"

if [ "$LINE_NUM_UUID" -eq 2 ] && [ "$LINE_NUM_VERSION" -eq 3 ]; then
  echo ""
  echo "✅ SUCCESS: uuid and version are at the top of the JSON!"
else
  echo ""
  echo "❌ FAIL: uuid and version are not at the top"
fi

# Cleanup
rm -f "$SAVED_FILE"
echo ""
echo "Cleaned up test file"

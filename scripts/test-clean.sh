#!/bin/bash

# Clean up test rule files
# Deletes all JSON files in backend/src/main/resources/static/rules/
# that start with TEST_ and have a timestamp in the filename

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RULES_DIR="$SCRIPT_DIR/../backend/src/main/resources/static/rules"

echo "========================================="
echo "Cleaning Test Rule Files"
echo "========================================="
echo ""
echo "Searching for TEST_* rule files with timestamps..."
echo ""

# Find and delete TEST_ files with timestamps (pattern: TEST_*_YYYYMMDD_HHMMSS[uuid][version].json)
# or TEST_*_timestamp[uuid][version].json
deleted_count=0

if [ -d "$RULES_DIR" ]; then
  # Find files matching pattern: TEST_*_<numbers>[uuid][version].json
  while IFS= read -r file; do
    if [ -f "$file" ]; then
      echo "Deleting: $(basename "$file")"
      rm "$file"
      ((deleted_count++))
    fi
  done < <(find "$RULES_DIR" -type f -name "TEST_*[0-9][0-9][0-9][0-9][0-9][0-9]*\[*\]\[*\].json")
  
  echo ""
  echo "========================================="
  echo "Cleanup Complete"
  echo "========================================="
  echo "Deleted $deleted_count test rule file(s)"
else
  echo "Rules directory not found: $RULES_DIR"
  exit 1
fi

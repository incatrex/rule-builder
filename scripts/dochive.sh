#!/bin/bash

# dochive.sh - Archive markdown files with names matching a search string
# Usage: ./scripts/dochive.sh "search string" [target_folder]

set -e

# Check if search string provided
if [ -z "$1" ]; then
    echo "Usage: $0 \"search string\" [target_folder]"
    echo "Example: $0 \"deprecated\""
    echo "Example: $0 \"analysis\" docs/old-analysis"
    exit 1
fi

SEARCH_STRING="$1"
ARCHIVE_DIR="${2:-docs/archive}"  # Default to docs/archive if not provided
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Create archive directory if it doesn't exist
mkdir -p "$PROJECT_ROOT/$ARCHIVE_DIR"

echo "=========================================="
echo "Archiving Markdown Files"
echo "=========================================="
echo "Searching filenames for: '$SEARCH_STRING'"
echo "Archive location: $ARCHIVE_DIR"
echo ""

# Counter for archived files
ARCHIVED_COUNT=0

# Find all .md files containing the search string
while IFS= read -r file; do
    # Skip files already in archive
    if [[ "$file" == *"/docs/archive/"* ]]; then
        continue
    fi
    
    # Get the basename
    filename=$(basename "$file")
    
    # Skip files that already have a timestamp prefix (YYYY-MM-DD_HHMM format)
    if [[ "$filename" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}_[0-9]{4}_ ]]; then
        echo "⏭️  Skipping (already timestamped): $file"
        continue
    fi
    
    # Try to get the earliest git commit date for this file
    if git ls-files --error-unmatch "$file" >/dev/null 2>&1; then
        # File is tracked by git, get earliest commit date
        git_date=$(git log --follow --format=%aI --reverse "$file" 2>/dev/null | head -1)
        
        if [ -n "$git_date" ]; then
            # Convert to YYYY-MM-DD_HHMM format
            timestamp=$(date -d "$git_date" '+%Y-%m-%d_%H%M' 2>/dev/null || date -j -f "%Y-%m-%dT%H:%M:%S" "${git_date:0:19}" '+%Y-%m-%d_%H%M' 2>/dev/null)
        else
            # Fallback to file creation date
            timestamp=$(stat -c '%w' "$file" 2>/dev/null | head -c 16 | tr ' :' '__' || stat -f '%SB' -t '%Y-%m-%d_%H%M' "$file" 2>/dev/null)
        fi
    else
        # Not tracked by git, use file system date
        # Try Linux stat first, then macOS stat
        timestamp=$(stat -c '%w' "$file" 2>/dev/null | head -c 16 | tr ' :' '__' || stat -f '%SB' -t '%Y-%m-%d_%H%M' "$file" 2>/dev/null)
    fi
    
    # If timestamp is empty or invalid, use current date
    if [ -z "$timestamp" ] || [[ "$timestamp" == "-"* ]]; then
        timestamp=$(date '+%Y-%m-%d_%H%M')
    fi
    
    # Create new filename
    new_filename="${timestamp}_${filename}"
    destination="$PROJECT_ROOT/$ARCHIVE_DIR/$new_filename"
    
    # Check if file already exists in archive (shouldn't happen with timestamp, but just in case)
    if [ -f "$destination" ]; then
        echo "⚠️  Skipping (already exists in archive): $new_filename"
        continue
    fi
    
    # Move the file
    echo "📦 Archiving: $file"
    echo "   → $ARCHIVE_DIR/$new_filename"
    
    mv "$file" "$destination"
    ARCHIVED_COUNT=$((ARCHIVED_COUNT + 1))
    
done < <(find "$PROJECT_ROOT" -type f -name "*.md" -iname "*${SEARCH_STRING}*" 2>/dev/null)

echo ""
echo "=========================================="
if [ $ARCHIVED_COUNT -eq 0 ]; then
    echo "No files found with names matching '$SEARCH_STRING'"
else
    echo "✅ Archived $ARCHIVED_COUNT file(s)"
fi
echo "=========================================="

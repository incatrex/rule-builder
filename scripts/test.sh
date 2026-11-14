#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "========================================="
echo "Running Rule Builder Tests"
echo "========================================="
echo ""

# Run backend tests
echo "🧪 Running backend tests..."
cd "$ROOT/backend" || exit 1
mvn -B test
BACKEND_EXIT=$?
echo ""

# Run frontend tests
echo "🧪 Running frontend tests..."
cd "$ROOT/frontend" || exit 1
npm run test:run
FRONTEND_EXIT=$?
echo ""

cd "$ROOT"

if [ $BACKEND_EXIT -eq 0 ] && [ $FRONTEND_EXIT -eq 0 ]; then
    echo "========================================="
    echo "✅ All tests passed!"
    echo "========================================="
    exit 0
else
    echo "========================================="
    echo "❌ Some tests failed"
    echo "========================================="
    exit 1
fi

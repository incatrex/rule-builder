#!/bin/bash

echo "========================================="
echo "Running Rule Builder Tests"
echo "========================================="
echo ""

# Run backend tests
echo "🧪 Running backend tests..."
cd backend
mvn test
BACKEND_EXIT=$?
echo ""

# Run frontend tests
echo "🧪 Running frontend tests..."
cd ../frontend
npm test
FRONTEND_EXIT=$?
echo ""

cd ..

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

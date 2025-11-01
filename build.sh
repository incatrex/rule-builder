#!/bin/bash

echo "Building Rule Builder..."
echo "================================"
echo ""

# Build backend
echo "Building backend..."
cd backend
mvn clean package
if [ $? -ne 0 ]; then
    echo "Backend build failed!"
    exit 1
fi
echo "Backend build successful!"

# Build frontend
echo ""
echo "Building frontend..."
cd ../frontend
npm run build
if [ $? -ne 0 ]; then
    echo "Frontend build failed!"
    exit 1
fi
echo "Frontend build successful!"

echo ""
echo "================================"
echo "Build complete!"
echo "Backend JAR: backend/target/rule-builder-backend-1.0.0.jar"
echo "Frontend dist: frontend/dist/"
echo "================================"

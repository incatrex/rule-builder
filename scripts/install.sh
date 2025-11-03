#!/bin/bash

echo "=== Rule Builder Installation Script ==="
echo ""

# Install backend dependencies and build
echo "Installing backend dependencies..."
cd backend
mvn clean install
if [ $? -ne 0 ]; then
    echo "Backend installation failed!"
    exit 1
fi
echo "Backend installation complete!"
echo ""

# Install frontend dependencies and build
echo "Installing frontend dependencies..."
cd ../frontend
npm install
if [ $? -ne 0 ]; then
    echo "Frontend installation failed!"
    exit 1
fi
echo "Frontend installation complete!"
echo ""

# Build frontend
echo "Building frontend..."
npm run build
if [ $? -ne 0 ]; then
    echo "Frontend build failed!"
    exit 1
fi
echo "Frontend build complete!"
echo ""

# Copy frontend build to backend static resources
echo "Copying frontend build to backend..."
rm -rf ../backend/src/main/resources/static/app
mkdir -p ../backend/src/main/resources/static/app
cp -r dist/* ../backend/src/main/resources/static/app/
echo ""

echo "=== Installation Complete! ==="
echo ""
echo "To run the application:"
echo "  1. Start the backend: cd backend && mvn spring-boot:run"
echo "  2. Access the application at: http://localhost:8080"
echo ""
echo "For development with hot reload:"
echo "  1. Start the backend: cd backend && mvn spring-boot:run"
echo "  2. Start the frontend dev server: cd frontend && npm run dev"
echo "  3. Access the frontend at: http://localhost:3003"

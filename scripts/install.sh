#!/bin/bash
# Install dependencies and build the app.
# The frontend is built first and copied into the backend's static resources,
# so the backend jar packaged afterwards contains the current UI.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
STATIC_APP="$ROOT/backend/src/main/resources/static/app"

fail() { echo "$1"; exit 1; }

echo "=== Rule Builder Installation Script ==="
echo ""

# Frontend: install dependencies and build
echo "Installing frontend dependencies..."
cd "$ROOT/frontend"
npm install || fail "Frontend installation failed!"
echo "Frontend installation complete!"
echo ""

echo "Building frontend..."
npm run build || fail "Frontend build failed!"
echo "Frontend build complete!"
echo ""

# Copy frontend build into backend static resources (before packaging the jar)
echo "Copying frontend build to backend..."
rm -rf "$STATIC_APP"
mkdir -p "$STATIC_APP"
cp -r dist/* "$STATIC_APP/"
echo ""

# Backend: build, test and package (includes the frontend copied above)
echo "Installing backend dependencies and building..."
cd "$ROOT/backend"
mvn -B clean install || fail "Backend installation failed!"
echo "Backend installation complete!"
echo ""

echo "=== Installation Complete! ==="
echo ""
echo "To run the application:"
echo "  1. Start the backend: ./scripts/start-backend.sh"
echo "  2. Access the application at: http://localhost:8080"
echo ""
echo "For development with hot reload:"
echo "  1. Start the backend: ./scripts/start-backend.sh"
echo "  2. Start the frontend dev server: ./scripts/start-frontend.sh"
echo "  3. Access the frontend at: http://localhost:3003"

#!/bin/bash

echo "========================================="
echo "Starting Rule Builder Frontend"
echo "========================================="
echo ""
echo "Frontend will be available at: http://localhost:3003"
echo "Hot reload is enabled - changes will be detected automatically"
echo ""
echo "Press Ctrl+C to stop the server"
echo "========================================="
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$ROOT/frontend" || exit 1
npm run dev

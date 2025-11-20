#!/bin/bash

# Integration Test Runner - E2E Playwright Tests
# Runs E2E tests that require both backend and frontend to be running

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "🚀 Starting Rule Builder E2E Integration Tests"
echo "================================================"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

BACKEND_STARTED=false
FRONTEND_STARTED=false
BACKEND_PID=""
FRONTEND_PID=""

# Cleanup function
cleanup() {
    echo -e "\n${YELLOW}Cleaning up...${NC}"
    if [ -n "$FRONTEND_PID" ] && [ "$FRONTEND_STARTED" = "true" ]; then
        echo "Stopping frontend (PID: $FRONTEND_PID)..."
        kill $FRONTEND_PID 2>/dev/null || true
        echo -e "${GREEN}✓ Frontend stopped${NC}"
    fi
    if [ -n "$BACKEND_PID" ] && [ "$BACKEND_STARTED" = "true" ]; then
        echo "Stopping backend (PID: $BACKEND_PID)..."
        kill $BACKEND_PID 2>/dev/null || true
        echo -e "${GREEN}✓ Backend stopped${NC}"
    fi
}

# Set trap to cleanup on exit
trap cleanup EXIT

# Check if backend is running
echo -e "\n${YELLOW}Checking if backend is running...${NC}"
if curl -s http://localhost:8080/api/rules/ui/config > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Backend is already running${NC}"
else
    echo -e "${YELLOW}Starting backend...${NC}"
    
    # Start backend in background
    cd "$PROJECT_ROOT/backend"
    mvn spring-boot:run > /tmp/backend.log 2>&1 &
    BACKEND_PID=$!
    BACKEND_STARTED=true
    
    echo "Backend PID: $BACKEND_PID"
    echo "Waiting for backend to start..."
    
    # Wait up to 60 seconds for backend to be ready
    for i in {1..60}; do
        if curl -s http://localhost:8080/api/rules/ui/config > /dev/null 2>&1; then
            echo -e "${GREEN}✓ Backend started successfully${NC}"
            break
        fi
        echo -n "."
        sleep 1
    done
    
    if ! curl -s http://localhost:8080/api/rules/ui/config > /dev/null 2>&1; then
        echo -e "\n${RED}✗ Backend failed to start within 60 seconds${NC}"
        echo "Check logs at /tmp/backend.log"
        exit 1
    fi
fi

# Check if frontend is running
echo -e "\n${YELLOW}Checking if frontend is running...${NC}"
if curl -s http://localhost:3003 > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Frontend is already running${NC}"
else
    echo -e "${YELLOW}Starting frontend...${NC}"
    
    # Start frontend in background
    cd "$PROJECT_ROOT/frontend"
    npm run dev > /tmp/frontend.log 2>&1 &
    FRONTEND_PID=$!
    FRONTEND_STARTED=true
    
    echo "Frontend PID: $FRONTEND_PID"
    echo "Waiting for frontend to start..."
    
    # Wait up to 30 seconds for frontend to be ready
    for i in {1..30}; do
        if curl -s http://localhost:3003 > /dev/null 2>&1; then
            echo -e "${GREEN}✓ Frontend started successfully${NC}"
            break
        fi
        echo -n "."
        sleep 1
    done
    
    if ! curl -s http://localhost:3003 > /dev/null 2>&1; then
        echo -e "\n${RED}✗ Frontend failed to start within 30 seconds${NC}"
        echo "Check logs at /tmp/frontend.log"
        exit 1
    fi
fi

# Run the E2E Playwright tests
echo -e "\n${YELLOW}Running Playwright E2E tests...${NC}"
cd "$PROJECT_ROOT/frontend"

if npx playwright test e2e/rule-versioning.spec.js --timeout=120000; then
    echo -e "\n${GREEN}✅ E2E integration tests passed!${NC}"
    EXIT_CODE=0
else
    echo -e "\n${RED}✗ E2E integration tests failed${NC}"
    EXIT_CODE=1
fi

exit $EXIT_CODE

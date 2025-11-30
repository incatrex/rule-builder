#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"
FRONTEND_DIR="$PROJECT_ROOT/frontend"
BACKEND_DIR="$PROJECT_ROOT/backend"

# PID files
BACKEND_PID_FILE="/tmp/rule-builder-backend.pid"
FRONTEND_PID_FILE="/tmp/rule-builder-frontend.pid"

echo "========================================="
echo -e "${BLUE}Rule Builder E2E Test Runner${NC}"
echo "========================================="
echo ""

# Function to check if a port is in use
check_port() {
    local port=$1
    lsof -i :$port > /dev/null 2>&1
    return $?
}

# Function to get the frontend port
get_frontend_port() {
    # Check common ports
    if check_port 3003; then
        echo "3003"
    elif check_port 3004; then
        echo "3004"
    elif check_port 3000; then
        echo "3000"
    else
        echo ""
    fi
}

# Function to start backend
start_backend() {
    if check_port 8080; then
        echo -e "${GREEN}✓ Backend already running on port 8080${NC}"
        return 0
    fi
    
    echo -e "${YELLOW}Starting backend...${NC}"
    cd "$BACKEND_DIR"
    mvn spring-boot:run > /tmp/rule-builder-backend.log 2>&1 &
    local pid=$!
    echo $pid > "$BACKEND_PID_FILE"
    
    # Wait for backend to be ready (max 60 seconds)
    local count=0
    while ! check_port 8080 && [ $count -lt 60 ]; do
        sleep 1
        count=$((count + 1))
        echo -n "."
    done
    echo ""
    
    if check_port 8080; then
        echo -e "${GREEN}✓ Backend started successfully on port 8080${NC}"
        return 0
    else
        echo -e "${RED}✗ Backend failed to start${NC}"
        return 1
    fi
}

# Function to start frontend
start_frontend() {
    local port=$(get_frontend_port)
    if [ -n "$port" ]; then
        echo -e "${GREEN}✓ Frontend already running on port $port${NC}"
        echo "$port"
        return 0
    fi
    
    echo -e "${YELLOW}Starting frontend...${NC}"
    cd "$FRONTEND_DIR"
    npm run dev > /tmp/rule-builder-frontend.log 2>&1 &
    local pid=$!
    echo $pid > "$FRONTEND_PID_FILE"
    
    # Wait for frontend to be ready (max 30 seconds)
    local count=0
    while [ -z "$(get_frontend_port)" ] && [ $count -lt 30 ]; do
        sleep 1
        count=$((count + 1))
        echo -n "."
    done
    echo ""
    
    port=$(get_frontend_port)
    if [ -n "$port" ]; then
        echo -e "${GREEN}✓ Frontend started successfully on port $port${NC}"
        echo "$port"
        return 0
    else
        echo -e "${RED}✗ Frontend failed to start${NC}"
        return 1
    fi
}

# Function to cleanup on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}Cleaning up...${NC}"
    
    # Only kill processes we started
    if [ -f "$BACKEND_PID_FILE" ]; then
        local pid=$(cat "$BACKEND_PID_FILE")
        if ps -p $pid > /dev/null 2>&1; then
            echo "Stopping backend (PID: $pid)..."
            kill $pid 2>/dev/null
        fi
        rm -f "$BACKEND_PID_FILE"
    fi
    
    if [ -f "$FRONTEND_PID_FILE" ]; then
        local pid=$(cat "$FRONTEND_PID_FILE")
        if ps -p $pid > /dev/null 2>&1; then
            echo "Stopping frontend (PID: $pid)..."
            kill $pid 2>/dev/null
        fi
        rm -f "$FRONTEND_PID_FILE"
    fi
    
    echo -e "${GREEN}Cleanup complete${NC}"
}

# Set trap to cleanup on script exit
trap cleanup EXIT INT TERM

# Start services
echo "Checking and starting services..."
echo ""

start_backend || exit 1
FRONTEND_PORT=$(start_frontend) || exit 1

echo ""
echo -e "${GREEN}✓ All services ready${NC}"
echo "  - Backend:  http://localhost:8080"
echo "  - Frontend: http://localhost:$FRONTEND_PORT"
echo ""

# Update playwright test files with correct port if needed
echo -e "${YELLOW}Verifying Playwright test configuration...${NC}"
cd "$FRONTEND_DIR"

# Check if port in test file matches current frontend port
CURRENT_PORT_IN_TEST=$(grep -oP "localhost:\K[0-9]+" e2e/condition-naming-scenarios-sequential.spec.js 2>/dev/null | head -1)

if [ "$CURRENT_PORT_IN_TEST" != "$FRONTEND_PORT" ]; then
    echo "  Updating test port from $CURRENT_PORT_IN_TEST to $FRONTEND_PORT..."
    # Use sed to update port in place
    sed -i "s|localhost:[0-9]\+|localhost:$FRONTEND_PORT|g" e2e/condition-naming-scenarios-sequential.spec.js 2>/dev/null
fi

echo -e "${GREEN}✓ Configuration complete${NC}"
echo ""

# Get list of test files
cd "$FRONTEND_DIR/e2e"
TEST_FILES=($(ls -1 *.spec.js 2>/dev/null))

if [ ${#TEST_FILES[@]} -eq 0 ]; then
    echo -e "${RED}No test files found in e2e/ directory${NC}"
    exit 1
fi

# Display menu
echo "========================================="
echo -e "${BLUE}Select a test to run:${NC}"
echo "========================================="
echo ""
echo "  0) Run all tests"
echo ""

for i in "${!TEST_FILES[@]}"; do
    echo "  $((i+1))) ${TEST_FILES[$i]}"
done

echo ""
echo "========================================="
read -p "Enter your choice (0-${#TEST_FILES[@]}): " choice

# Validate input
if ! [[ "$choice" =~ ^[0-9]+$ ]]; then
    echo -e "${RED}Invalid choice${NC}"
    exit 1
fi

if [ "$choice" -lt 0 ] || [ "$choice" -gt ${#TEST_FILES[@]} ]; then
    echo -e "${RED}Choice out of range${NC}"
    exit 1
fi

echo ""
echo "========================================="

# Run selected test(s)
cd "$FRONTEND_DIR"

if [ "$choice" -eq 0 ]; then
    echo -e "${BLUE}Running all E2E tests...${NC}"
    echo "========================================="
    echo ""
    npx playwright test --reporter=list
else
    selected_test="${TEST_FILES[$((choice-1))]}"
    echo -e "${BLUE}Running test: $selected_test${NC}"
    echo "========================================="
    echo ""
    npx playwright test "e2e/$selected_test" --reporter=list
fi

TEST_EXIT_CODE=$?

echo ""
echo "========================================="
if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✓ Tests completed successfully${NC}"
else
    echo -e "${RED}✗ Tests failed with exit code $TEST_EXIT_CODE${NC}"
fi
echo "========================================="
echo ""
echo "Press Enter to exit..."
read

exit $TEST_EXIT_CODE

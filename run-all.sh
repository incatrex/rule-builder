#!/bin/bash

echo "Starting Rule Builder (Backend + Frontend)..."
echo "================================"
echo ""

# Start backend in background
echo "Starting backend on port 8080..."
cd backend
mvn spring-boot:run &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 5

# Start frontend
echo ""
echo "Starting frontend on port 3000..."
cd ../frontend
npm run dev &
FRONTEND_PID=$!

echo ""
echo "================================"
echo "Backend running on: http://localhost:8080"
echo "Frontend running on: http://localhost:3000"
echo "================================"
echo ""
echo "Press Ctrl+C to stop both services"

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID

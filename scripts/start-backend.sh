#!/bin/bash

echo "========================================="
echo "Starting Rule Builder Backend"
echo "========================================="
echo ""
echo "Backend will be available at: http://localhost:8080"
echo "Hot reload is enabled - changes will be detected automatically"
echo ""
echo "Press Ctrl+C to stop the server"
echo "========================================="
echo ""

cd backend
mvn spring-boot:run

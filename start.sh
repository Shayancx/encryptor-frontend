#!/bin/bash

# Function to cleanup on exit
cleanup() {
    echo "Shutting down..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit
}

trap cleanup EXIT INT TERM

# Start backend
echo "Starting backend on port 9292..."
cd backend && bundle exec rackup -p 9292 &
BACKEND_PID=$!
cd ..

# Wait for backend to start
sleep 3

# Start frontend
echo "Starting frontend on port 3000..."
npm run dev &
FRONTEND_PID=$!

echo ""
echo "🚀 Encryptor.link is running!"
echo "  Frontend: http://localhost:3000"
echo "  Backend:  http://localhost:9292"
echo ""
echo "Press Ctrl+C to stop both servers"

# Wait for processes
wait

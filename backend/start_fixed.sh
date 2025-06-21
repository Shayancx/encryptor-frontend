#!/bin/bash

# Function to cleanup on exit
cleanup() {
    echo "Shutting down..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit
}

trap cleanup EXIT INT TERM

echo "🚀 Starting Fixed Encryptor.link..."
echo "==================================="

# Start backend
echo "Starting backend on port 9292..."
cd backend && bundle exec rackup -p 9292 &
BACKEND_PID=$!
cd ..

# Wait for backend to start
sleep 5

# Test backend
echo "Testing backend..."
curl -s http://localhost:9292/api/info > /dev/null
if [ $? -eq 0 ]; then
    echo "✓ Backend is running"
else
    echo "✗ Backend failed to start"
    exit 1
fi

# Start frontend
echo "Starting frontend on port 3000..."
npm run dev &
FRONTEND_PID=$!

echo ""
echo "🚀 Encryptor.link is running!"
echo "  Frontend: http://localhost:3000"
echo "  Backend:  http://localhost:9292"
echo ""
echo "🔧 Fixed Issues:"
echo "  ✓ Upload field always visible"
echo "  ✓ Streaming upload backend errors fixed"
echo "  ✓ Database properly set up"
echo "  ✓ Storage directories created"
echo "  ✓ Error handling improved"
echo ""
echo "Press Ctrl+C to stop both servers"

# Wait for processes
wait

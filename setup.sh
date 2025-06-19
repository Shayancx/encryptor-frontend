#!/bin/bash

echo "🎯 Setting up Encryptor.link Complete Environment..."
echo "=================================================="

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
npm install

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
bundle install
cd ..

# Set up database
echo "🗄️  Setting up database..."
cd backend
ruby scripts/setup_database.rb
cd ..

# Create necessary directories
mkdir -p backend/logs
mkdir -p backend/storage/encrypted
mkdir -p backend/tmp

echo "✅ Setup completed successfully!"
echo ""
echo "🚀 To start the application:"
echo "  1. Backend:  cd backend && bundle exec rackup -p 9292"
echo "  2. Frontend: npm run dev"
echo ""
echo "🌐 Application will be available at:"
echo "  Frontend: http://localhost:3000"
echo "  Backend:  http://localhost:9292"

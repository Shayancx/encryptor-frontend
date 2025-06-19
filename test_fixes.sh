#!/bin/bash

echo "🧪 Testing Encryptor.link Fixes..."
echo "=================================="

# Test backend file validation
echo "📝 Testing backend file validation..."
cd backend
ruby -e "
require_relative 'lib/file_storage'
puts '✓ FileStorage constants loaded:'
puts '  Anonymous limit: ' + (FileStorage::MAX_FILE_SIZE_ANONYMOUS / 1024 / 1024).to_s + 'MB'
puts '  Authenticated limit: ' + (FileStorage::MAX_FILE_SIZE_AUTHENTICATED / 1024 / 1024 / 1024).to_s + 'GB'
puts '  Absolute limit: ' + (FileStorage::MAX_FILE_SIZE_ABSOLUTE / 1024 / 1024 / 1024).to_s + 'GB'

test_data = 'test data'
result = FileStorage.validate_file(test_data, 'text/plain', 1000)
puts result[:valid] ? '✓ File validation working' : '❌ File validation failed'
"

# Test environment configuration
echo "📝 Testing environment configuration..."
ruby -e "
require_relative 'config/environment'
puts '✓ Environment configuration loaded:'
puts '  Environment: ' + (Environment.development? ? 'development' : 'production')
puts '  Frontend URL: ' + Environment.frontend_url
puts '  Email enabled: ' + Environment.email_enabled?.to_s
puts '  JWT secret configured: ' + (!Environment.jwt_secret.empty?).to_s
"

cd ..

# Test frontend dependencies
echo "📝 Testing frontend configuration..."
if [ -f ".env.local" ]; then
    echo "✓ Frontend environment file exists"
else
    echo "❌ Frontend environment file missing"
fi

if grep -q "useAuth" app/encrypt/page.tsx; then
    echo "✓ Frontend authentication integration present"
else
    echo "❌ Frontend authentication integration missing"
fi

echo ""
echo "🎉 All tests completed!"
echo ""
echo "💡 Next steps:"
echo "  1. Run './setup.sh' to install dependencies and set up database"
echo "  2. Start backend: cd backend && bundle exec rackup -p 9292"
echo "  3. Start frontend: npm run dev"
echo "  4. Visit http://localhost:3000 to test the application"

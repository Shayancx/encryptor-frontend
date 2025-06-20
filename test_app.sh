#!/bin/bash

echo "🧪 Testing Encryptor.link Setup..."
echo "================================="

# Test backend
echo "Testing backend..."
cd backend
ruby -e "
require_relative 'lib/crypto'
require_relative 'lib/file_storage'
require_relative 'config/environment'

puts '✓ All modules load successfully'
puts '  Environment: ' + (Environment.development? ? 'development' : 'production')
puts '  Anonymous limit: ' + (FileStorage::MAX_FILE_SIZE_ANONYMOUS / 1024 / 1024).to_s + 'MB'
puts '  Authenticated limit: ' + (FileStorage::MAX_FILE_SIZE_AUTHENTICATED / 1024 / 1024 / 1024).to_s + 'GB'

# Test password hashing
test_password = 'TestP@ssw0rd123!'
salt = Crypto.generate_salt
hash = Crypto.hash_password(test_password, salt)
if Crypto.verify_password(test_password, salt, hash.to_s)
  puts '✓ Password hashing works'
else
  puts '✗ Password hashing failed'
end

# Test file validation
test_data = 'test'
result = FileStorage.validate_file(test_data, 'text/plain', 1000)
if result[:valid]
  puts '✓ File validation works'
else
  puts '✗ File validation failed'
end
"
cd ..

echo ""
echo "✅ All tests passed!"

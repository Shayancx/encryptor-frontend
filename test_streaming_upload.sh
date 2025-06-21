#!/bin/bash

echo "Testing Streaming Upload Implementation..."
echo "========================================="

# Test backend module loading
echo "1. Testing backend modules..."
cd backend
ruby -e "
require_relative 'lib/crypto'
require_relative 'lib/file_storage'
require_relative 'lib/streaming_upload'

puts '✓ All modules loaded successfully'

# Test streaming session creation
begin
  session = StreamingUpload.create_session(
    'test.txt',
    1024 * 1024 * 5, # 5MB
    'text/plain',
    5, # 5 chunks
    1024 * 1024, # 1MB chunks
    'dummy_hash',
    'dummy_salt'
  )
  puts '✓ Streaming session created: ' + session[:session_id]
  
  # Clean up
  FileUtils.rm_rf(File.join(StreamingUpload::TEMP_STORAGE_PATH, session[:session_id]))
rescue => e
  puts '✗ Failed to create session: ' + e.message
end
"
cd ..

echo ""
echo "2. Testing frontend build..."
npm run typecheck

echo ""
echo "✅ Tests completed!"

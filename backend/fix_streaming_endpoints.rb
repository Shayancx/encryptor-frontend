# Fix for streaming endpoints

# Read the current app.rb
content = File.read('app.rb')

# Replace the streaming endpoints section
streaming_endpoints = <<-'RUBY_CODE'
      # Streaming upload endpoints
      r.on 'streaming' do
        # Initialize streaming upload session
        r.post 'initialize' do
          begin
            data = request.params
            
            unless data['filename'] && data['fileSize'] && data['mimeType'] && data['password']
              response.status = 400
              return { error: 'Missing required fields: filename, fileSize, mimeType, password' }
            end
            
            # Validate password
            password_check = Crypto.validate_password_strength(data['password'])
            unless password_check[:valid]
              response.status = 400
              return { error: password_check[:error] }
            end
            
            # Check file size limit
            file_size = data['fileSize'].to_i
            max_size = authenticated? ? FileStorage::MAX_FILE_SIZE_AUTHENTICATED : FileStorage::MAX_FILE_SIZE_ANONYMOUS
            
            if file_size > max_size
              response.status = 400
              return { 
                error: "File too large. Max size: #{max_size / 1024 / 1024}MB",
                authenticated: authenticated?,
                upgrade_available: !authenticated?
              }
            end
            
            # Generate salt and hash password
            salt = Crypto.generate_salt
            password_hash = Crypto.hash_password(data['password'], salt)
            
            # Create session
            session = StreamingUpload.create_session(
              data['filename'],
              file_size,
              data['mimeType'],
              data['totalChunks'].to_i,
              data['chunkSize'].to_i,
              password_hash.to_s,
              salt,
              authenticated? ? current_user[:id] : nil
            )
            
            LOGGER.info "Streaming session created: #{session[:session_id]} for file: #{data['filename']}"
            
            session
          rescue => e
            LOGGER.error "Streaming initialize error: #{e.message}\n#{e.backtrace.join("\n")}"
            response.status = 500
            { error: "Failed to initialize streaming upload: #{e.message}" }
          end
        end
        
        # Upload chunk
        r.post 'chunk' do
          begin
            # Handle both form data and JSON
            if request.content_type&.include?('multipart/form-data')
              session_id = request.params['session_id']
              chunk_index = request.params['chunk_index'].to_i
              iv = request.params['iv']
              
              # Get chunk data from uploaded file
              chunk_file = request.params['chunk_data']
              if chunk_file.respond_to?(:read)
                chunk_data = chunk_file.read
              elsif chunk_file.respond_to?(:[]) && chunk_file[:tempfile]
                chunk_data = chunk_file[:tempfile].read
              else
                raise "Invalid chunk data format"
              end
            else
              # JSON format
              data = request.params
              session_id = data['session_id']
              chunk_index = data['chunk_index'].to_i
              chunk_data = Base64.strict_decode64(data['chunk_data']) if data['chunk_data']
              iv = data['iv']
            end
            
            unless session_id && !chunk_index.nil? && chunk_data && iv
              response.status = 400
              return { error: 'Missing required fields: session_id, chunk_index, chunk_data, iv' }
            end
            
            result = StreamingUpload.store_chunk(session_id, chunk_index, chunk_data, iv)
            
            LOGGER.info "Chunk #{chunk_index} stored for session: #{session_id}"
            
            result
          rescue => e
            LOGGER.error "Chunk upload error: #{e.message}\n#{e.backtrace.join("\n")}"
            response.status = 500
            { error: "Failed to upload chunk: #{e.message}" }
          end
        end
        
        # Finalize upload
        r.post 'finalize' do
          begin
            data = request.params
            session_id = data['session_id']
            salt = data['salt']
            
            unless session_id && salt
              response.status = 400
              return { error: 'Missing required fields: session_id, salt' }
            end
            
            file_id = StreamingUpload.finalize_session(session_id, salt)
            
            LOGGER.info "Streaming upload finalized: #{file_id}"
            
            { 
              file_id: file_id,
              share_url: "/view/#{file_id}"
            }
          rescue => e
            LOGGER.error "Finalize error: #{e.message}\n#{e.backtrace.join("\n")}"
            response.status = 500
            { error: "Failed to finalize upload: #{e.message}" }
          end
        end
        
        # Get file info
        r.get 'info', String do |file_id|
          begin
            info = StreamingUpload.get_file_info(file_id)
            info
          rescue => e
            LOGGER.error "Get file info error: #{e.message}"
            response.status = 404
            { error: 'File not found' }
          end
        end
        
        # Download chunk
        r.post 'download', String, 'chunk', Integer do |file_id, chunk_index|
          begin
            data = request.params
            password = data['password']
            
            unless password
              response.status = 401
              return { error: 'Password required' }
            end
            
            chunk_data = StreamingUpload.read_chunk(file_id, chunk_index, password)
            chunk_data
          rescue => e
            LOGGER.error "Chunk download error: #{e.message}\n#{e.backtrace.join("\n")}"
            response.status = 500
            { error: e.message }
          end
        end
      end
RUBY_CODE

# Find and replace the streaming endpoints section
if content.include?('# Streaming upload endpoints')
  # Replace existing section
  new_content = content.gsub(
    /# Add this to app\.rb after the regular upload endpoint.*?end\n\n/m,
    streaming_endpoints + "\n\n"
  )
  
  # If that didn't work, try different pattern
  if new_content == content
    new_content = content.gsub(
      /# Streaming upload endpoints.*?(?=\n      # Download endpoints|\n\n      # Download endpoints)/m,
      streaming_endpoints
    )
  end
else
  # Add streaming endpoints before download endpoints
  new_content = content.gsub(
    /(# Download endpoints)/,
    streaming_endpoints + "\n      \\1"
  )
end

# Write the updated content
File.write('app.rb', new_content)
puts "✓ Streaming endpoints updated"
RUBY_CODE

ruby fix_streaming_endpoints.rb

# 7. Install missing gems
print_status "Installing required gems..."

# Check if Gemfile has required gems
if ! grep -q "gem 'json'" Gemfile; then
    echo "gem 'json', '~> 2.6'" >> Gemfile
fi

if ! grep -q "gem 'base64'" Gemfile; then
    echo "gem 'base64', '~> 0.2.0'" >> Gemfile
fi

bundle install

cd ..

# 8. Install frontend dependencies
print_status "Installing frontend dependencies..."

npm install

# 9. Create test script to verify everything works
print_status "Creating test script..."

cat > test_complete_setup.sh << 'EOF'
#!/bin/bash

echo "🧪 Testing Complete Encryptor.link Setup..."
echo "=========================================="

# Test backend
echo "Testing backend modules..."
cd backend
ruby -e "
require_relative 'lib/crypto'
require_relative 'lib/file_storage'
require_relative 'lib/streaming_upload'
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
result = FileStorage.validate_file(test_data, 'text/plain', 1000, 1000)
if result[:valid]
  puts '✓ File validation works'
else
  puts '✗ File validation failed: ' + result[:error]
end

# Test streaming upload session creation
begin
  session = StreamingUpload.create_session('test.txt', 1000, 'text/plain', 1, 1000, hash.to_s, salt)
  puts '✓ Streaming upload session creation works'
  puts '  Session ID: ' + session[:session_id]
  puts '  File ID: ' + session[:file_id]
  
  # Clean up test session
  temp_path = File.join(StreamingUpload::TEMP_STORAGE_PATH, session[:session_id])
  FileUtils.rm_rf(temp_path) if Dir.exist?(temp_path)
rescue => e
  puts '✗ Streaming upload failed: ' + e.message
  puts e.backtrace.first(3).join('\n')
end

# Test database connection
begin
  require_relative 'app'
  file_count = DB[:encrypted_files].count
  account_count = DB[:accounts].count
  puts '✓ Database connection works'
  puts '  Files: ' + file_count.to_s
  puts '  Accounts: ' + account_count.to_s
  puts '  Tables: ' + DB.tables.join(', ')
rescue => e
  puts '✗ Database connection failed: ' + e.message
end
"
cd ..

echo ""
echo "✅ All tests completed!"
echo ""
echo "🚀 To start the application:"
echo "  1. Backend:  cd backend && bundle exec rackup -p 9292"
echo "  2. Frontend: npm run dev"
echo ""
echo "🌐 Application will be available at:"
echo "  Frontend: http://localhost:3000"
echo "  Backend:  http://localhost:9292"

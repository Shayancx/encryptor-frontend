# Read current app.rb
content = File.read('app.rb')

# Find the position where streaming endpoints should be inserted
insert_position = content.index('# Download endpoints')

if insert_position.nil?
  puts "Could not find insertion point in app.rb"
  exit 1
end

# Define the streaming endpoints code
streaming_code = <<-'STREAMING_ENDPOINTS'
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
            LOGGER.error "Streaming initialize error: #{e.message}"
            LOGGER.error e.backtrace.join("\n")
            response.status = 500
            { error: "Failed to initialize streaming upload: #{e.message}" }
          end
        end
        
        # Upload chunk
        r.post 'chunk' do
          begin
            # Handle multipart form data
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
              response.status = 400
              return { error: "Invalid chunk data format" }
            end
            
            unless session_id && !chunk_index.nil? && chunk_data && iv
              response.status = 400
              return { error: 'Missing required fields: session_id, chunk_index, chunk_data, iv' }
            end
            
            result = StreamingUpload.store_chunk(session_id, chunk_index, chunk_data, iv)
            
            LOGGER.info "Chunk #{chunk_index} stored for session: #{session_id}"
            
            result
          rescue => e
            LOGGER.error "Chunk upload error: #{e.message}"
            LOGGER.error e.backtrace.join("\n")
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
            LOGGER.error "Finalize error: #{e.message}"
            LOGGER.error e.backtrace.join("\n")
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
            LOGGER.error "Chunk download error: #{e.message}"
            LOGGER.error e.backtrace.join("\n")
            response.status = 500
            { error: e.message }
          end
        end
      end

      
STREAMING_ENDPOINTS

# Remove existing streaming endpoints if they exist
content = content.gsub(/# Streaming upload endpoints.*?(?=\n      # Download endpoints)/m, '')
content = content.gsub(/# Add this to app\.rb after the regular upload endpoint.*?(?=\n# Download endpoints|\n\n      # Download endpoints)/m, '')

# Insert new streaming endpoints
new_content = content.sub('# Download endpoints', streaming_code + '# Download endpoints')

File.write('app.rb', new_content)
puts "✓ Streaming endpoints fixed in app.rb"

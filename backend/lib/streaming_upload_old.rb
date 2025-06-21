require 'securerandom'
require 'json'
require 'fileutils'

module StreamingUpload
  TEMP_STORAGE_PATH = File.expand_path('../storage/temp', __dir__)
  
  class << self
    def initialize_storage
      FileUtils.mkdir_p(TEMP_STORAGE_PATH)
      FileUtils.mkdir_p(File.expand_path('../storage/encrypted', __dir__))
    end
    
    def create_session(filename, file_size, mime_type, total_chunks, chunk_size, password_hash, salt, account_id = nil)
      session_id = SecureRandom.hex(16)
      file_id = Crypto.generate_file_id
      
      # Create temp directory for chunks
      session_path = File.join(TEMP_STORAGE_PATH, session_id)
      FileUtils.mkdir_p(session_path)
      
      # Store session metadata
      metadata = {
        session_id: session_id,
        file_id: file_id,
        filename: filename,
        file_size: file_size,
        mime_type: mime_type,
        total_chunks: total_chunks,
        chunk_size: chunk_size,
        password_hash: password_hash,
        salt: salt,
        account_id: account_id,
        created_at: Time.now.to_i,
        chunks_received: []
      }
      
      File.write(File.join(session_path, 'metadata.json'), metadata.to_json)
      
      {
        session_id: session_id,
        file_id: file_id
      }
    rescue => e
      puts "Error creating session: #{e.message}"
      puts e.backtrace
      raise e
    end
    
    def store_chunk(session_id, chunk_index, chunk_data, iv)
      session_path = File.join(TEMP_STORAGE_PATH, session_id)
      
      unless File.exist?(session_path)
        raise "Invalid session: #{session_id}"
      end
      
      begin
        # Read metadata
        metadata_file = File.join(session_path, 'metadata.json')
        unless File.exist?(metadata_file)
          raise "Session metadata not found"
        end
        
        metadata = JSON.parse(File.read(metadata_file))
        
        # Store chunk
        chunk_file = File.join(session_path, "chunk_#{chunk_index}")
        File.open(chunk_file, 'wb') do |f|
          f.write(chunk_data)
        end
        
        # Store chunk IV
        iv_file = File.join(session_path, "chunk_#{chunk_index}.iv")
        File.write(iv_file, iv)
        
        # Update metadata
        metadata['chunks_received'] << chunk_index unless metadata['chunks_received'].include?(chunk_index)
        metadata['chunks_received'].sort!
        File.write(metadata_file, metadata.to_json)
        
        {
          chunks_received: metadata['chunks_received'].length,
          total_chunks: metadata['total_chunks']
        }
      rescue => e
        puts "Error storing chunk: #{e.message}"
        puts e.backtrace
        raise e
      end
    end
    
    def finalize_session(session_id, salt)
      session_path = File.join(TEMP_STORAGE_PATH, session_id)
      metadata_file = File.join(session_path, 'metadata.json')
      
      unless File.exist?(metadata_file)
        raise "Session not found: #{session_id}"
      end
      
      begin
        metadata = JSON.parse(File.read(metadata_file))
        
        # Verify all chunks received
        expected_chunks = (0...metadata['total_chunks']).to_a
        received_chunks = metadata['chunks_received'].sort
        
        if received_chunks != expected_chunks
          missing = expected_chunks - received_chunks
          raise "Missing chunks: #{missing.join(', ')} (received #{received_chunks.length} of #{metadata['total_chunks']})"
        end
        
        # Combine chunks into final file
        file_id = metadata['file_id']
        final_path = FileStorage.generate_file_path(file_id)
        
        # Ensure final directory exists
        FileUtils.mkdir_p(File.dirname(final_path))
        
        File.open(final_path, 'wb') do |output|
          # Write metadata header
          header = {
            version: 2, # Version 2 indicates chunked file
            total_chunks: metadata['total_chunks'],
            chunk_size: metadata['chunk_size'],
            salt: salt
          }
          header_json = header.to_json
          output.write([header_json.bytesize].pack('N'))
          output.write(header_json)
          
          # Write each chunk with its IV
          metadata['total_chunks'].times do |i|
            chunk_file = File.join(session_path, "chunk_#{i}")
            iv_file = File.join(session_path, "chunk_#{i}.iv")
            
            unless File.exist?(chunk_file) && File.exist?(iv_file)
              raise "Missing chunk or IV file for chunk #{i}"
            end
            
            chunk_data = File.read(chunk_file, mode: 'rb')
            iv_data = File.read(iv_file)
            
            # Write chunk header: [iv_length, iv, chunk_length, chunk_data]
            output.write([iv_data.bytesize].pack('N'))
            output.write(iv_data)
            output.write([chunk_data.bytesize].pack('N'))
            output.write(chunk_data)
          end
        end
        
        # Store file record in database
        expires_at = Time.now + (24 * 3600) # 24 hours
        
        DB[:encrypted_files].insert(
          file_id: file_id,
          password_hash: metadata['password_hash'],
          salt: metadata['salt'],
          file_path: final_path,
          original_filename: metadata['filename'],
          mime_type: metadata['mime_type'],
          file_size: metadata['file_size'],
          encryption_iv: '', # Not used for chunked files
          created_at: Time.now,
          expires_at: expires_at,
          ip_address: '127.0.0.1',
          account_id: metadata['account_id'],
          is_chunked: true
        )
        
        # Clean up temp files
        FileUtils.rm_rf(session_path)
        
        file_id
      rescue => e
        puts "Error finalizing session: #{e.message}"
        puts e.backtrace
        # Don't clean up on error for debugging
        raise e
      end
    end
    
    def read_chunk(file_id, chunk_index, password)
      file_record = DB[:encrypted_files].where(file_id: file_id).first
      
      unless file_record
        raise "File not found: #{file_id}"
      end
      
      unless Crypto.verify_password(password, file_record[:salt], file_record[:password_hash])
        raise "Invalid password"
      end
      
      unless file_record[:is_chunked]
        raise "File is not chunked"
      end
      
      File.open(file_record[:file_path], 'rb') do |f|
        # Read header
        header_size = f.read(4).unpack('N')[0]
        header = JSON.parse(f.read(header_size))
        
        if chunk_index >= header['total_chunks']
          raise "Chunk index out of range"
        end
        
        # Skip to requested chunk
        chunk_index.times do
          iv_size = f.read(4).unpack('N')[0]
          f.seek(iv_size, IO::SEEK_CUR)
          chunk_size = f.read(4).unpack('N')[0]
          f.seek(chunk_size, IO::SEEK_CUR)
        end
        
        # Read chunk
        iv_size = f.read(4).unpack('N')[0]
        iv = f.read(iv_size)
        chunk_size = f.read(4).unpack('N')[0]
        chunk_data = f.read(chunk_size)
        
        {
          data: Base64.strict_encode64(chunk_data),
          iv: iv,
          salt: header['salt']
        }
      end
    rescue => e
      puts "Error reading chunk: #{e.message}"
      puts e.backtrace
      raise e
    end
    
    def get_file_info(file_id)
      file_record = DB[:encrypted_files].where(file_id: file_id).first
      
      unless file_record
        raise "File not found: #{file_id}"
      end
      
      unless file_record[:is_chunked]
        raise "File is not chunked"
      end
      
      File.open(file_record[:file_path], 'rb') do |f|
        # Read header
        header_size = f.read(4).unpack('N')[0]
        header = JSON.parse(f.read(header_size))
        
        {
          filename: file_record[:original_filename],
          mime_type: file_record[:mime_type],
          file_size: file_record[:file_size],
          total_chunks: header['total_chunks'],
          chunk_size: header['chunk_size'],
          salt: header['salt']
        }
      end
    rescue => e
      puts "Error getting file info: #{e.message}"
      puts e.backtrace
      raise e
    end
    
    def cleanup_old_sessions
      return unless Dir.exist?(TEMP_STORAGE_PATH)
      
      Dir.glob(File.join(TEMP_STORAGE_PATH, '*')).each do |session_path|
        next unless File.directory?(session_path)
        
        metadata_file = File.join(session_path, 'metadata.json')
        next unless File.exist?(metadata_file)
        
        begin
          metadata = JSON.parse(File.read(metadata_file))
          # Remove sessions older than 1 hour
          if Time.now.to_i - metadata['created_at'] > 3600
            FileUtils.rm_rf(session_path)
          end
        rescue
          # Remove corrupted sessions
          FileUtils.rm_rf(session_path)
        end
      end
    rescue => e
      puts "Error cleaning up sessions: #{e.message}"
    end
  end
end

# Initialize storage when module is loaded
StreamingUpload.initialize_storage

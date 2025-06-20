require 'securerandom'
require 'json'

module StreamingUpload
  TEMP_STORAGE_PATH = File.expand_path('../storage/temp', __dir__)
  
  class << self
    def initialize_storage
      FileUtils.mkdir_p(TEMP_STORAGE_PATH)
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
    end
    
    def store_chunk(session_id, chunk_index, chunk_data, iv)
      session_path = File.join(TEMP_STORAGE_PATH, session_id)
      
      unless File.exist?(session_path)
        raise "Invalid session"
      end
      
      # Read metadata
      metadata = JSON.parse(File.read(File.join(session_path, 'metadata.json')))
      
      # Store chunk
      chunk_file = File.join(session_path, "chunk_#{chunk_index}")
      File.open(chunk_file, 'wb') do |f|
        f.write(chunk_data)
      end
      
      # Store chunk IV
      iv_file = File.join(session_path, "chunk_#{chunk_index}.iv")
      File.write(iv_file, iv)
      
      # Update metadata
      metadata['chunks_received'] << chunk_index
      metadata['chunks_received'].uniq!
      File.write(File.join(session_path, 'metadata.json'), metadata.to_json)
      
      {
        chunks_received: metadata['chunks_received'].length,
        total_chunks: metadata['total_chunks']
      }
    end
    
    def finalize_session(session_id, salt)
      session_path = File.join(TEMP_STORAGE_PATH, session_id)
      metadata = JSON.parse(File.read(File.join(session_path, 'metadata.json')))
      
      # Verify all chunks received
      if metadata['chunks_received'].length != metadata['total_chunks']
        raise "Missing chunks: received #{metadata['chunks_received'].length} of #{metadata['total_chunks']}"
      end
      
      # Combine chunks into final file
      file_id = metadata['file_id']
      final_path = FileStorage.generate_file_path(file_id)
      
      File.open(final_path, 'wb') do |output|
        # Write metadata header
        header = {
          version: 2, # Version 2 indicates chunked file
          total_chunks: metadata['total_chunks'],
          chunk_size: metadata['chunk_size'],
          salt: salt
        }
        output.write([header.to_json.bytesize].pack('N'))
        output.write(header.to_json)
        
        # Write each chunk with its IV
        metadata['total_chunks'].times do |i|
          chunk_file = File.join(session_path, "chunk_#{i}")
          iv_file = File.join(session_path, "chunk_#{i}.iv")
          
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
        expires_at: Time.now + 86400, # 24 hours
        ip_address: '0.0.0.0',
        account_id: metadata['account_id'],
        is_chunked: true
      )
      
      # Clean up temp files
      FileUtils.rm_rf(session_path)
      
      file_id
    end
    
    def read_chunk(file_id, chunk_index, password)
      file_record = DB[:encrypted_files].where(file_id: file_id).first
      
      unless file_record
        raise "File not found"
      end
      
      unless Crypto.verify_password(password, file_record[:salt], file_record[:password_hash])
        raise "Invalid password"
      end
      
      File.open(file_record[:file_path], 'rb') do |f|
        # Read header
        header_size = f.read(4).unpack('N')[0]
        header = JSON.parse(f.read(header_size))
        
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
    end
    
    def get_file_info(file_id)
      file_record = DB[:encrypted_files].where(file_id: file_id).first
      
      unless file_record
        raise "File not found"
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
    end
    
    def cleanup_old_sessions
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
    end
  end
end

# Initialize storage
StreamingUpload.initialize_storage

require 'fileutils'
require 'pathname'

module FileStorage
  STORAGE_PATH = File.expand_path('../storage/encrypted', __dir__)
  # MAX_FILE_SIZE is now dynamic based on auth status
  
  ALLOWED_MIME_TYPES = %w[
    text/plain
    text/html
    text/css
    text/javascript
    application/json
    application/pdf
    application/zip
    application/x-zip-compressed
    image/jpeg
    image/png
    image/gif
    image/webp
    image/svg+xml
    video/mp4
    video/webm
    audio/mpeg
    audio/wav
    application/octet-stream
  ].freeze
  
  class << self
    def initialize_storage
      FileUtils.mkdir_p(STORAGE_PATH)
    end
    
    # Validate the uploaded file against size and MIME type restrictions
    # @param file_data [String] Raw binary file data
    # @param mime_type [String] MIME type provided by the client
    # @param max_size [Integer] Maximum allowed file size in bytes
    # @return [Hash] Validation result with :valid boolean and optional :error
    def validate_file(file_data, mime_type, max_size)
      return { valid: false, error: "File is too large (max #{max_size / 1024 / 1024}MB)" } if file_data.bytesize > max_size
      return { valid: false, error: "File type not allowed" } unless ALLOWED_MIME_TYPES.include?(mime_type)
      
      { valid: true }
    end
    
    def generate_file_path(file_id)
      # Create subdirectories to avoid too many files in one directory
      subdir = file_id[0..1]
      FileUtils.mkdir_p(File.join(STORAGE_PATH, subdir))
      File.join(STORAGE_PATH, subdir, "#{file_id}.enc")
    end
    
    def store_encrypted_file(file_id, encrypted_data)
      file_path = generate_file_path(file_id)
      
      # Ensure no collision
      raise "File already exists" if File.exist?(file_path)
      
      File.open(file_path, 'wb') do |f|
        f.write(encrypted_data)
      end
      
      file_path
    end
    
    def read_encrypted_file(file_path)
      return nil unless File.exist?(file_path)
      
      File.read(file_path, mode: 'rb')
    end
    
    def delete_file(file_path)
      return unless File.exist?(file_path)
      
      File.delete(file_path)
      
      # Clean up empty directories
      dir = File.dirname(file_path)
      Dir.rmdir(dir) if Dir.empty?(dir)
    rescue Errno::ENOTEMPTY
      # Directory not empty, that's fine
    end
    
    def cleanup_expired_files(db)
      db[:encrypted_files].where(Sequel.lit('expires_at < ?', Time.now)).each do |file|
        delete_file(file[:file_path])
        db[:encrypted_files].where(id: file[:id]).delete
      end
    end
  end
end

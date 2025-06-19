require 'fileutils'
require 'pathname'

module FileStorage
  STORAGE_PATH = File.expand_path('../storage/encrypted', __dir__)
  
  # File size limits (in bytes)
  MAX_FILE_SIZE_ANONYMOUS = 100 * 1024 * 1024      # 100MB for anonymous users
  MAX_FILE_SIZE_AUTHENTICATED = 4 * 1024 * 1024 * 1024  # 4GB for authenticated users
  MAX_FILE_SIZE_ABSOLUTE = 5 * 1024 * 1024 * 1024   # 5GB absolute maximum
  
  ALLOWED_MIME_TYPES = %w[
    text/plain
    text/html
    text/css
    text/javascript
    application/json
    application/pdf
    application/zip
    application/x-zip-compressed
    application/x-rar-compressed
    application/x-7z-compressed
    application/x-tar
    application/gzip
    image/jpeg
    image/png
    image/gif
    image/webp
    image/svg+xml
    image/bmp
    video/mp4
    video/webm
    video/ogg
    video/quicktime
    video/x-msvideo
    audio/mpeg
    audio/wav
    audio/flac
    audio/ogg
    audio/mp4
    audio/aac
    audio/opus
    audio/webm
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
      # Check file size
      if file_data.bytesize > max_size
        max_size_mb = (max_size / 1024.0 / 1024.0).round(1)
        return { valid: false, error: "File is too large (max #{max_size_mb}MB)" }
      end
      
      # Check absolute maximum
      if file_data.bytesize > MAX_FILE_SIZE_ABSOLUTE
        return { valid: false, error: "File exceeds absolute maximum size limit (5GB)" }
      end
      
      # Check MIME type
      unless ALLOWED_MIME_TYPES.include?(mime_type)
        return { valid: false, error: "File type '#{mime_type}' is not allowed" }
      end
      
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
    
    # Helper method to get upload limit for user type
    def upload_limit_for_user(authenticated)
      authenticated ? MAX_FILE_SIZE_AUTHENTICATED : MAX_FILE_SIZE_ANONYMOUS
    end
  end
end

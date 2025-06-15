#!/usr/bin/env ruby

# Quick patch to update backend for 8-character IDs and all file types
# Run from backend directory: ruby apply_8char_patch.rb

puts "Applying 8-character ID patch..."

# Update lib/crypto.rb
crypto_file = 'lib/crypto.rb'
if File.exist?(crypto_file)
  content = File.read(crypto_file)
  
  # Replace the generate_file_id method
  new_method = <<-RUBY
    # Generate a secure 8-character file ID
    def generate_file_id
      chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
      (0...8).map { chars[SecureRandom.random_number(chars.length)] }.join
    end
  RUBY
  
  content.gsub!(/def generate_file_id.*?end/m, new_method.strip)
  
  File.write(crypto_file, content)
  puts "✓ Updated crypto.rb"
end

# Update lib/file_storage.rb
storage_file = 'lib/file_storage.rb'
if File.exist?(storage_file)
  content = File.read(storage_file)
  
  # Comment out ALLOWED_MIME_TYPES
  content.gsub!(/^(\s*ALLOWED_MIME_TYPES\s*=.*?)$/m, '# \1')
  
  # Update validate_file to accept all types
  content.gsub!(/def validate_file.*?end/m) do |match|
    <<-RUBY
def validate_file(file_data, mime_type)
      return { valid: false, error: "File is too large (max 5GB)" } if file_data.bytesize > MAX_FILE_SIZE
      { valid: true }
    end
    RUBY
  end
  
  File.write(storage_file, content)
  puts "✓ Updated file_storage.rb"
end

puts "✓ Patch applied! Restart your backend server."

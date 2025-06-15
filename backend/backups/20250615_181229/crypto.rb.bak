require 'openssl'
require 'base64'
require 'bcrypt'
require 'securerandom'

module Crypto
  AES_KEY_SIZE = 32 # 256 bits
  AES_IV_SIZE = 16  # 128 bits
  PBKDF2_ITERATIONS = 250_000
  
  class << self
    # Generate a secure random salt
    def generate_salt
      SecureRandom.hex(32)
    end
    
    # Generate a secure file ID
    def generate_file_id
      SecureRandom.uuid
    end
    
    # Hash password with bcrypt
    def hash_password(password, salt)
      BCrypt::Password.create("#{password}#{salt}", cost: 12)
    end
    
    # Verify password against hash
    def verify_password(password, salt, hash)
      BCrypt::Password.new(hash) == "#{password}#{salt}"
    end
    
    # Derive encryption key from password
    def derive_key(password, salt)
      OpenSSL::PKCS5.pbkdf2_hmac(
        password,
        salt,
        PBKDF2_ITERATIONS,
        AES_KEY_SIZE,
        OpenSSL::Digest::SHA256.new
      )
    end
    
    # Encrypt data with AES-256-GCM
    def encrypt_file(file_path, password, salt)
      cipher = OpenSSL::Cipher.new('AES-256-GCM')
      cipher.encrypt
      
      key = derive_key(password, salt)
      iv = cipher.random_iv
      
      cipher.key = key
      cipher.iv = iv
      
      encrypted_data = ''
      auth_tag = nil
      
      File.open(file_path, 'rb') do |file|
        while chunk = file.read(4096)
          encrypted_data += cipher.update(chunk)
        end
        encrypted_data += cipher.final
        auth_tag = cipher.auth_tag
      end
      
      # Return IV and auth tag for storage
      {
        data: encrypted_data,
        iv: Base64.strict_encode64(iv),
        auth_tag: Base64.strict_encode64(auth_tag)
      }
    end
    
    # Decrypt file with AES-256-GCM
    def decrypt_file(encrypted_data, password, salt, iv_base64, auth_tag_base64)
      cipher = OpenSSL::Cipher.new('AES-256-GCM')
      cipher.decrypt
      
      key = derive_key(password, salt)
      iv = Base64.strict_decode64(iv_base64)
      auth_tag = Base64.strict_decode64(auth_tag_base64)
      
      cipher.key = key
      cipher.iv = iv
      cipher.auth_tag = auth_tag
      
      decrypted = cipher.update(encrypted_data) + cipher.final
      decrypted
    rescue OpenSSL::Cipher::CipherError
      nil # Invalid password or corrupted data
    end
    
    # Validate password strength
    def validate_password_strength(password)
      return { valid: false, error: "Password must be at least 8 characters long" } if password.length < 8
      return { valid: false, error: "Password must contain at least one uppercase letter" } unless password =~ /[A-Z]/
      return { valid: false, error: "Password must contain at least one lowercase letter" } unless password =~ /[a-z]/
      return { valid: false, error: "Password must contain at least one number" } unless password =~ /\d/
      
      { valid: true }
    end
  end
end

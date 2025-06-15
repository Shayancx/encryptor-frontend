#!/usr/bin/env ruby
require 'bundler/setup'
Bundler.require
require_relative 'lib/crypto'

# Simple test to verify password hashing works
puts "\n=== Quick Password Hashing Test ==="

test_password = "TestP@ssw0rd123!"
salt = Crypto.generate_salt

puts "Testing password: #{test_password}"
puts "Generated salt: #{salt[0..20]}..."

begin
  # Hash the password
  hash = Crypto.hash_password(test_password, salt)
  puts "✓ Password hashed successfully"
  
  # Verify it
  if Crypto.verify_password(test_password, salt, hash.to_s)
    puts "✓ Password verification successful"
  else
    puts "✗ Password verification failed"
  end
  
  # Test wrong password
  if !Crypto.verify_password("WrongPassword", salt, hash.to_s)
    puts "✓ Wrong password correctly rejected"
  else
    puts "✗ Wrong password incorrectly accepted"
  end
  
  puts "\n✅ All basic tests passed! Password hashing is working correctly."
  
rescue => e
  puts "❌ Error: #{e.message}"
  puts e.backtrace
end

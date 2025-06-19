#!/usr/bin/env ruby

require 'bundler/setup'
require 'sequel'
require 'bcrypt'

DB = Sequel.sqlite('db/encryptor.db')

puts "=== Database Verification ==="
puts "Tables: #{DB.tables.sort.join(', ')}"
puts ""

if DB.tables.include?(:accounts)
  puts "✓ Accounts table exists"
  puts "  Columns: #{DB[:accounts].columns.join(', ')}"
  puts "  Row count: #{DB[:accounts].count}"
else
  puts "✗ Accounts table missing!"
end

puts ""

if DB.tables.include?(:encrypted_files)
  puts "✓ Encrypted files table exists"
  columns = DB[:encrypted_files].columns
  if columns.include?(:account_id)
    puts "✓ account_id column exists"
  else
    puts "✗ account_id column missing!"
  end
else
  puts "✗ Encrypted files table missing!"
end

puts ""
puts "=== Testing Account Creation ==="

begin
  # Create a test account
  test_email = "verify_test_#{Time.now.to_i}@example.com"
  account_id = DB[:accounts].insert(
    email: test_email,
    status_id: 'verified',
    password_hash: BCrypt::Password.create('TestPassword123!'),
    created_at: Time.now
  )
  
  puts "✓ Successfully created test account"
  puts "  ID: #{account_id}"
  puts "  Email: #{test_email}"
  
  # Clean up
  DB[:accounts].where(id: account_id).delete
  puts "✓ Cleaned up test account"
rescue => e
  puts "✗ Failed to create account: #{e.message}"
end

puts ""
puts "=== Setup Verification Complete ==="

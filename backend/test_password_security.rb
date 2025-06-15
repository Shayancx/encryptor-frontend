#!/usr/bin/env ruby
require "bundler/setup"
Bundler.require

#!/usr/bin/env ruby

require_relative 'lib/crypto'
require 'benchmark'

puts "\n=== Password Security Test Suite ==="
puts "Testing bcrypt implementation and security features\n\n"

# Test 1: Basic password hashing and verification
puts "Test 1: Basic password hashing and verification"
test_password = "MySecureP@ssw0rd!"
salt = Crypto.generate_salt

begin
  hashed = Crypto.hash_password(test_password, salt)
  puts "✓ Password hashed successfully"
  puts "  Hash length: #{hashed.length} characters"
  
  # Verify correct password
  if Crypto.verify_password(test_password, salt, hashed)
    puts "✓ Correct password verified"
  else
    puts "✗ Failed to verify correct password"
  end
  
  # Verify incorrect password
  if !Crypto.verify_password("WrongPassword123!", salt, hashed)
    puts "✓ Incorrect password rejected"
  else
    puts "✗ Failed to reject incorrect password"
  end
rescue => e
  puts "✗ Error: #{e.message}"
end

# Test 2: Password strength validation
puts "\nTest 2: Password strength validation"
test_cases = {
  "weak" => "Weak password",
  "12345678" => "Too simple",
  "password" => "Common password",
  "Password1" => "Missing special character",
  "MyStr0ng!Pass" => "Strong password"
}

test_cases.each do |password, description|
  result = Crypto.validate_password_strength(password)
  if result[:valid]
    puts "✓ '#{password}' - #{description}: ACCEPTED"
  else
    puts "✗ '#{password}' - #{description}: REJECTED (#{result[:error]})"
  end
end

# Test 3: Performance benchmark
puts "\nTest 3: Performance benchmark"
password = "BenchmarkP@ssw0rd!"
salt = Crypto.generate_salt

# Measure hashing time
hash_time = Benchmark.realtime do
  Crypto.hash_password(password, salt)
end
puts "Password hashing time: #{(hash_time * 1000).round(2)}ms"

# Measure verification time
hashed = Crypto.hash_password(password, salt)
verify_time = Benchmark.realtime do
  100.times { Crypto.verify_password(password, salt, hashed) }
end
puts "Average verification time: #{(verify_time * 10).round(2)}ms"

# Test 4: Timing attack resistance
puts "\nTest 4: Timing attack resistance"
correct_password = "CorrectP@ssw0rd!"
hashed = Crypto.hash_password(correct_password, salt)

# Test similar passwords
similar_passwords = [
  "CorrectP@ssw0rd!",  # Correct
  "CorrectP@ssw0re!",  # One char different
  "WrongPassword123!", # Completely different
  "C",                 # Very short
  "C" * 100           # Very long
]

times = similar_passwords.map do |pwd|
  Benchmark.realtime { Crypto.verify_password(pwd, salt, hashed) }
end

# Calculate standard deviation
avg_time = times.sum / times.length
variance = times.map { |t| (t - avg_time) ** 2 }.sum / times.length
std_dev = Math.sqrt(variance)

puts "Average verification time: #{(avg_time * 1000).round(2)}ms"
puts "Standard deviation: #{(std_dev * 1000).round(2)}ms"
if std_dev < 0.001
  puts "✓ Good timing attack resistance (low variation)"
else
  puts "⚠ Higher timing variation detected"
end

# Test 5: Salt uniqueness
puts "\nTest 5: Salt generation uniqueness"
salts = 1000.times.map { Crypto.generate_salt }
if salts.uniq.length == salts.length
  puts "✓ All 1000 salts are unique"
else
  puts "✗ Duplicate salts detected!"
end

# Test 6: Secure password generation
puts "\nTest 6: Secure password generation"
5.times do |i|
  pwd = Crypto.generate_secure_password
  validation = Crypto.validate_password_strength(pwd)
  puts "Generated password #{i+1}: #{pwd[0..3]}... (#{validation[:valid] ? 'STRONG' : 'WEAK'})"
end

puts "\n=== All tests completed ==="

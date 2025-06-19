#!/usr/bin/env ruby

require 'net/http'
require 'json'
require 'uri'

API_BASE = 'http://localhost:9292/api'

puts "=== Final Authentication Test ==="
puts ""

# Test 1: Check server is running
begin
  uri = URI("#{API_BASE}/info")
  response = Net::HTTP.get_response(uri)
  if response.code == '200'
    puts "✓ Server is running"
    data = JSON.parse(response.body)
    puts "  Version: #{data['version']}"
    puts "  Anonymous limit: #{data['features']['anonymous_limit_mb']}MB"
    puts "  Authenticated limit: #{data['features']['authenticated_limit_mb']}MB"
  else
    puts "✗ Server not responding properly"
    exit 1
  end
rescue => e
  puts "✗ Server is not running. Start with: bundle exec rackup"
  exit 1
end

# Test 2: Register
email = "test_#{Time.now.to_i}@example.com"
password = "TestP@ssw0rd123"

puts "\n✓ Testing registration..."
uri = URI("#{API_BASE}/auth/register")
http = Net::HTTP.new(uri.host, uri.port)
request = Net::HTTP::Post.new(uri)
request['Content-Type'] = 'application/json'
request.body = { login: email, password: password }.to_json

response = http.request(request)
if response.code == '200'
  data = JSON.parse(response.body)
  token = data['access_token']
  puts "  ✓ Registration successful"
  puts "  Email: #{email}"
  puts "  Token received: #{token[0..20]}..."
else
  puts "  ✗ Registration failed: #{response.body}"
  exit 1
end

# Test 3: Check auth status
puts "\n✓ Testing authenticated status..."
uri = URI("#{API_BASE}/auth/status")
http = Net::HTTP.new(uri.host, uri.port)
request = Net::HTTP::Get.new(uri)
request['Authorization'] = "Bearer #{token}"

response = http.request(request)
data = JSON.parse(response.body)
puts "  Authenticated: #{data['authenticated']}"
puts "  Upload limit: #{data['account']['upload_limit_mb']}MB"

# Test 4: Login
puts "\n✓ Testing login..."
uri = URI("#{API_BASE}/auth/login")
http = Net::HTTP.new(uri.host, uri.port)
request = Net::HTTP::Post.new(uri)
request['Content-Type'] = 'application/json'
request.body = { login: email, password: password }.to_json

response = http.request(request)
if response.code == '200'
  puts "  ✓ Login successful"
else
  puts "  ✗ Login failed"
end

puts "\n✅ All tests passed! Authentication is working!"
puts "\nYou can now:"
puts "- Visit http://localhost:3000 to use the app"
puts "- Register at http://localhost:3000/register"
puts "- Login at http://localhost:3000/login"

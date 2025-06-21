#!/usr/bin/env ruby
require 'net/http'
require 'json'
require 'base64'
require 'securerandom'

API_BASE = 'http://localhost:9292/api'

puts "Testing streaming upload..."

# Test data
filename = "test-#{Time.now.to_i}.bin"
file_size = 2 * 1024 * 1024 # 2MB
chunk_size = 1024 * 1024 # 1MB
total_chunks = 2
password = "TestP@ssw0rd123!"

# Initialize session
uri = URI("#{API_BASE}/streaming/initialize")
http = Net::HTTP.new(uri.host, uri.port)
request = Net::HTTP::Post.new(uri)
request['Content-Type'] = 'application/json'
request.body = {
  filename: filename,
  fileSize: file_size,
  mimeType: 'application/octet-stream',
  totalChunks: total_chunks,
  chunkSize: chunk_size,
  password: password
}.to_json

response = http.request(request)
if response.code == '200'
  result = JSON.parse(response.body)
  puts "✓ Session initialized: #{result['session_id']}"
  puts "  File ID: #{result['file_id']}"
else
  puts "✗ Failed to initialize: #{response.body}"
end

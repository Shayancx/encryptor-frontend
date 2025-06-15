#!/bin/bash

echo "Testing password security..."
echo

# Test the old way (GET with password in URL)
echo "1. Testing GET request (old insecure way):"
curl -s "http://localhost:9292/api/download/test123?password=MyPassword" | jq '.'
echo

# Test the new way (POST with password in body)
echo "2. Testing POST request (new secure way):"
curl -s -X POST "http://localhost:9292/api/download/test123" \
  -H "Content-Type: application/json" \
  -d '{"password": "MyPassword"}' | jq '.'
echo

echo "Check your server logs - passwords should be [FILTERED] not visible!"

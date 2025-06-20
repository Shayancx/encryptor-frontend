#!/bin/bash

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "🧪 Running Encryptor.link Backend Tests"
echo "======================================"

# Run all tests
echo -e "${YELLOW}Running all tests...${NC}"
bundle exec rspec

# Run specific test suites
echo ""
echo -e "${YELLOW}Test Suite Options:${NC}"
echo "1. Run unit tests only: bundle exec rspec spec/lib"
echo "2. Run integration tests: bundle exec rspec spec/integration"
echo "3. Run performance tests: bundle exec rspec spec/performance"
echo "4. Run with coverage: bundle exec rspec"
echo "5. Run in parallel: bundle exec parallel_rspec spec"
echo "6. Run specific file: bundle exec rspec spec/lib/crypto_spec.rb"
echo "7. Run with seed: bundle exec rspec --seed 12345"

# Generate coverage report
echo ""
echo -e "${YELLOW}Coverage report generated at: coverage/index.html${NC}"

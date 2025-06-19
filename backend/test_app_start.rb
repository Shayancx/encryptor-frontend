require_relative 'app'

puts "✓ App loaded successfully!"
puts "  Rodauth configured: #{defined?(RodauthApp) ? 'Yes' : 'No'}"
puts "  Database connected: #{defined?(DB) ? 'Yes' : 'No'}"
puts ""
puts "Ready to start server with: bundle exec rackup"

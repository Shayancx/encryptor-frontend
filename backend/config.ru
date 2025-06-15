require_relative 'app'

# Only bind to localhost for security
if ENV['RACK_ENV'] == 'production'
  set :bind, '127.0.0.1'
  set :port, 9292
end

run EncryptorAPI.freeze.app

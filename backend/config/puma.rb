# Puma configuration for production
workers ENV.fetch("WEB_CONCURRENCY") { 2 }
threads_count = ENV.fetch("RAILS_MAX_THREADS") { 5 }
threads threads_count, threads_count

preload_app!

port        ENV.fetch("PORT") { 9292 }
environment ENV.fetch("RACK_ENV") { "development" }

# Only bind to localhost in production
if ENV['RACK_ENV'] == 'production'
  bind 'tcp://127.0.0.1:9292'
else
  bind 'tcp://0.0.0.0:9292'
end

pidfile ENV.fetch("PIDFILE") { "tmp/pids/server.pid" }

# Allow puma to be restarted by `rails restart` command.
plugin :tmp_restart

# Middleware to filter sensitive data from logs
class SecureLoggerMiddleware
  def initialize(app)
    @app = app
  end
  
  def call(env)
    # Filter query strings
    if env['QUERY_STRING'] && env['QUERY_STRING'].include?('password=')
      env['QUERY_STRING'] = env['QUERY_STRING'].gsub(/password=[^&]+/, 'password=[FILTERED]')
    end
    
    # Filter request URIs
    if env['REQUEST_URI'] && env['REQUEST_URI'].include?('password=')
      env['REQUEST_URI'] = env['REQUEST_URI'].gsub(/password=[^&]+/, 'password=[FILTERED]')
    end
    
    @app.call(env)
  end
end

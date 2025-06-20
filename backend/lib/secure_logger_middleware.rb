# Middleware to filter sensitive data from logs
class SecureLoggerMiddleware
  def initialize(app)
    @app = app
  end
  
  def call(env)
    # Filter query strings - handle all password parameters
    if env['QUERY_STRING'] && env['QUERY_STRING'].include?('password')
      env['QUERY_STRING'] = filter_passwords(env['QUERY_STRING'])
    end
    
    # Filter request URIs
    if env['REQUEST_URI'] && env['REQUEST_URI'].include?('password')
      env['REQUEST_URI'] = filter_passwords(env['REQUEST_URI'])
    end
    
    @app.call(env)
  end
  
  private
  
  def filter_passwords(string)
    # Filter all password-related parameters
    string.gsub(/(\w*password\w*=)[^&]+/i, '\1[FILTERED]')
  end
end

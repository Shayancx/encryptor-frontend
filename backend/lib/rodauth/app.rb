require 'rodauth'
require 'jwt'

module RodauthApp
  def self.configure(app)
    app.plugin :rodauth, json: :only do
      enable :login, :logout, :create_account, :verify_account,
             :reset_password, :change_password, :change_login,
             :jwt, :active_sessions

      # Database configuration
      db DB
      
      # JWT configuration for API usage
      jwt_secret ENV.fetch('JWT_SECRET') { SecureRandom.hex(32) }
      
      # Account configuration
      account_password_hash_column :password_hash
      accounts_table :accounts
      
      # Session configuration
      use_database_authentication_functions? false
      
      # Password requirements (matching existing validation)
      password_meets_requirements? do |password|
        super && password.length >= 8 &&
          password =~ /[A-Z]/ && password =~ /[a-z]/ &&
          password =~ /\d/ && password =~ /[!@#$%^&*(),.?":{}|<>]/
      end
      
      # Email configuration (disabled for now, can be enabled later)
      skip_status_checks? true
      verify_account_skip_resend_email true
      reset_password_skip_resend_email true
      
      # JSON responses
      only_json? true
      
      # Paths
      prefix "/api/auth"
      login_route "login"
      logout_route "logout"
      create_account_route "register"
      
      # Hooks
      after_login do
        response.headers['X-User-Id'] = account[:id].to_s
      end
      
      # Custom error messages
      login_error_flash "Invalid email or password"
      create_account_error_flash "Could not create account"
    end
  end
  
  # Helper method to check if user is authenticated
  def authenticated?
    rodauth.logged_in?
  end
  
  # Helper method to get current account
  def current_account
    rodauth.account if authenticated?
  end
  
  # Helper method to get upload limit based on auth status
  def upload_limit
    authenticated? ? 4 * 1024 * 1024 * 1024 : 100 * 1024 * 1024  # 4GB : 100MB
  end
end

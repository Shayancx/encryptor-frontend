require 'sequel'

DB = Sequel.sqlite('db/encryptor.db')

puts "Current tables: #{DB.tables}"

# Create accounts table if needed
unless DB.tables.include?(:accounts)
  puts "Creating accounts table..."
  DB.create_table(:accounts) do
    primary_key :id
    String :email, null: false, unique: true
    String :status_id, null: false, default: 'verified'
    String :password_hash, null: false, size: 60
    DateTime :created_at, null: false
    DateTime :updated_at
    DateTime :last_login_at
    
    index :email, unique: true
  end
  puts "Accounts table created"
end

# Add account_id to encrypted_files if needed
if DB.tables.include?(:encrypted_files)
  columns = DB[:encrypted_files].columns
  unless columns.include?(:account_id)
    puts "Adding account_id to encrypted_files..."
    DB.alter_table(:encrypted_files) do
      add_column :account_id, :Bignum
      add_index :account_id
    end
    puts "account_id column added"
  else
    puts "account_id column already exists"
  end
end

puts "Database setup complete!"
puts "Tables: #{DB.tables}"
puts "Encrypted files columns: #{DB[:encrypted_files].columns}" if DB.tables.include?(:encrypted_files)
puts "Accounts columns: #{DB[:accounts].columns}" if DB.tables.include?(:accounts)

-- Drop all tables (use with caution!)
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
DROP FUNCTION IF EXISTS update_updated_at_column();
DROP TABLE IF EXISTS otp_codes;
DROP TABLE IF EXISTS users;
DROP TYPE IF EXISTS user_role;

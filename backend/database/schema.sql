-- Easy Shopping BNPL Platform Database Schema
-- PostgreSQL Database Migration Script

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (authentication for all roles)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('customer', 'vendor', 'admin')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Customer profiles
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  bvn VARCHAR(11) NOT NULL CHECK (LENGTH(bvn) = 11),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Vendor profiles
CREATE TABLE IF NOT EXISTS vendors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  business_name VARCHAR(200) NOT NULL,
  business_category VARCHAR(100) NOT NULL,
  settlement_account_number VARCHAR(20) NOT NULL,
  settlement_bank_code VARCHAR(10) NOT NULL,
  approval_status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  approved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Customer bank accounts (for payment)
CREATE TABLE IF NOT EXISTS customer_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  account_number VARCHAR(20) NOT NULL CHECK (LENGTH(account_number) = 10),
  bank_code VARCHAR(10) NOT NULL,
  bank_name VARCHAR(100) NOT NULL,
  account_name VARCHAR(200) NOT NULL,
  priority INT NOT NULL DEFAULT 1,
  verified BOOLEAN DEFAULT FALSE,
  bvn_verified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(customer_id, account_number)
);

-- Products
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
  category VARCHAR(100) NOT NULL,
  stock_quantity INT DEFAULT 0 CHECK (stock_quantity >= 0),
  images JSONB DEFAULT '[]',
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'out_of_stock', 'archived')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create mandates table first (referenced by orders)
CREATE TABLE IF NOT EXISTS mandates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID,
  customer_account_id UUID NOT NULL REFERENCES customer_accounts(id),
  onepipe_mandate_id VARCHAR(255) UNIQUE NOT NULL,
  virtual_account VARCHAR(20),
  amount_per_installment DECIMAL(10,2) NOT NULL CHECK (amount_per_installment > 0),
  total_installments INT NOT NULL CHECK (total_installments > 0),
  installments_paid INT DEFAULT 0 CHECK (installments_paid >= 0),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending_auth' CHECK (status IN ('pending_auth', 'active', 'completed', 'failed', 'replaced')),
  replaced_by_mandate_id UUID REFERENCES mandates(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Orders
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  vendor_id UUID NOT NULL REFERENCES vendors(id),
  total_amount DECIMAL(10,2) NOT NULL CHECK (total_amount > 0),
  installments INT,
  amount_per_installment DECIMAL(10,2),
  installments_paid INT DEFAULT 0 CHECK (installments_paid >= 0),
  amount_paid DECIMAL(10,2) DEFAULT 0 CHECK (amount_paid >= 0),
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'authorized', 'active', 'shipped', 'completed', 'failed')),
  current_mandate_id UUID REFERENCES mandates(id),
  order_items JSONB NOT NULL,
  shipping_address TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add foreign key constraint to mandates.order_id
ALTER TABLE mandates ADD CONSTRAINT fk_mandates_order_id FOREIGN KEY (order_id) REFERENCES orders(id);

-- Payment attempts (webhook logs)
CREATE TABLE IF NOT EXISTS payment_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mandate_id UUID NOT NULL REFERENCES mandates(id),
  installment_number INT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  status VARCHAR(50) NOT NULL CHECK (status IN ('attempted', 'success', 'failed')),
  failure_reason TEXT,
  transaction_reference VARCHAR(255) UNIQUE NOT NULL,
  webhook_data JSONB NOT NULL,
  attempted_at TIMESTAMP DEFAULT NOW()
);

-- Platform settings
CREATE TABLE IF NOT EXISTS settings (
  key VARCHAR(100) PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_customers_user_id ON customers(user_id);
CREATE INDEX IF NOT EXISTS idx_vendors_user_id ON vendors(user_id);
CREATE INDEX IF NOT EXISTS idx_vendors_approval_status ON vendors(approval_status);
CREATE INDEX IF NOT EXISTS idx_customer_accounts_customer_id ON customer_accounts(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_accounts_priority ON customer_accounts(customer_id, priority);
CREATE INDEX IF NOT EXISTS idx_products_vendor_id ON products(vendor_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_vendor_id ON orders(vendor_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_mandates_onepipe_mandate_id ON mandates(onepipe_mandate_id);
CREATE INDEX IF NOT EXISTS idx_mandates_order_id ON mandates(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_attempts_mandate_id ON payment_attempts(mandate_id);
CREATE INDEX IF NOT EXISTS idx_payment_attempts_transaction_ref ON payment_attempts(transaction_reference);

-- Insert default platform settings
INSERT INTO settings (key, value) VALUES
  ('platform_fee_percentage', '2.0'),
  ('installment_options', '[2,3,4]'),
  ('max_backup_accounts', '3')
ON CONFLICT (key) DO NOTHING;

-- Create admin user (password: admin123 - CHANGE IN PRODUCTION!)
-- Password hash for 'admin123' using bcrypt
INSERT INTO users (email, password_hash, role) VALUES
  ('admin@easyshopping.com', '$2a$10$YourHashHere', 'admin')
ON CONFLICT (email) DO NOTHING;

COMMENT ON TABLE users IS 'User authentication table for all roles';
COMMENT ON TABLE customers IS 'Customer profile information including BVN';
COMMENT ON TABLE vendors IS 'Vendor/merchant business profiles';
COMMENT ON TABLE customer_accounts IS 'Linked bank accounts for customers with priority system';
COMMENT ON TABLE products IS 'Product catalog managed by vendors';
COMMENT ON TABLE orders IS 'Customer orders with installment tracking';
COMMENT ON TABLE mandates IS 'OnePipe payment mandates for recurring payments';
COMMENT ON TABLE payment_attempts IS 'Webhook logs for payment reconciliation';
COMMENT ON TABLE settings IS 'Platform-wide configuration settings';

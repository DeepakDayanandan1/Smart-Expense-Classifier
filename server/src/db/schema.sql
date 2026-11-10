-- ========================================================
-- Smart Expense Classifier Database Schema
-- Compatible with PostgreSQL, MySQL, and SQLite
-- ========================================================

-- Expenses Table
CREATE TABLE IF NOT EXISTS expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  merchant VARCHAR(255) NOT NULL,
  expense_date VARCHAR(50) NOT NULL,
  total DECIMAL(10, 2) NOT NULL,
  tax DECIMAL(10, 2) DEFAULT 0.00,
  category VARCHAR(100) NOT NULL,
  raw_ocr_text TEXT,
  image_url VARCHAR(500),
  confidence_score DECIMAL(5, 2) DEFAULT 0.95,
  ocr_crosscheck_status VARCHAR(50) DEFAULT 'matched',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Budgets Table (For Budget Tracking Extension)
CREATE TABLE IF NOT EXISTS budgets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category VARCHAR(100) UNIQUE NOT NULL,
  monthly_limit DECIMAL(10, 2) NOT NULL,
  alert_threshold DECIMAL(5, 2) DEFAULT 80.0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Initial Category Budgets (Defaults in ₹ INR)
INSERT OR IGNORE INTO budgets (category, monthly_limit, alert_threshold) VALUES
('Food', 12000.00, 80.0),
('Travel', 5000.00, 80.0),
('Utilities', 4000.00, 80.0),
('Shopping', 8000.00, 80.0),
('Entertainment', 3000.00, 80.0),
('Healthcare', 4000.00, 80.0),
('Other', 2500.00, 80.0);



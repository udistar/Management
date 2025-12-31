-- MBox Manager Database Schema
-- Run this SQL in your Supabase SQL Editor

-- 1. Sales Data Table (매출 데이터)
CREATE TABLE IF NOT EXISTS sales_data (
  id BIGSERIAL PRIMARY KEY,
  date TEXT NOT NULL,
  spec TEXT NOT NULL,
  client TEXT NOT NULL,
  amount NUMERIC DEFAULT 0,
  transport NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. In/Out Data Table (입출고 데이터)
CREATE TABLE IF NOT EXISTS inout_data (
  id BIGSERIAL PRIMARY KEY,
  date TEXT NOT NULL,
  spec TEXT NOT NULL,
  client TEXT NOT NULL,
  type TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Purchase Data Table (매입 데이터)
CREATE TABLE IF NOT EXISTS purchase_data (
  id BIGSERIAL PRIMARY KEY,
  date TEXT NOT NULL,
  spec TEXT NOT NULL,
  client TEXT NOT NULL,
  amount NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Rental Data Table (임대 현황)
CREATE TABLE IF NOT EXISTS rental_data (
  id BIGSERIAL PRIMARY KEY,
  spec TEXT NOT NULL,
  client TEXT NOT NULL,
  address TEXT,
  contact TEXT,
  start_date TEXT,
  end_date TEXT,
  days_left INTEGER,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Upload Metadata Table (업로드 메타데이터)
CREATE TABLE IF NOT EXISTS upload_metadata (
  id BIGSERIAL PRIMARY KEY,
  filename TEXT NOT NULL,
  upload_date TEXT NOT NULL,
  sales_count INTEGER DEFAULT 0,
  inout_count INTEGER DEFAULT 0,
  purchase_count INTEGER DEFAULT 0,
  rental_count INTEGER DEFAULT 0,
  asset_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Enable Row Level Security (RLS)
ALTER TABLE sales_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE inout_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE rental_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE upload_metadata ENABLE ROW LEVEL SECURITY;

-- 7. Create policies to allow public access (adjust as needed for production)
CREATE POLICY "Enable read access for all users" ON sales_data FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON sales_data FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable delete access for all users" ON sales_data FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON inout_data FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON inout_data FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable delete access for all users" ON inout_data FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON purchase_data FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON purchase_data FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable delete access for all users" ON purchase_data FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON rental_data FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON rental_data FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable delete access for all users" ON rental_data FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON upload_metadata FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON upload_metadata FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable delete access for all users" ON upload_metadata FOR DELETE USING (true);

-- 8. Create Storage Bucket for Excel files
INSERT INTO storage.buckets (id, name, public) 
VALUES ('excel-files', 'excel-files', true)
ON CONFLICT (id) DO NOTHING;

-- 9. Create storage policy
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'excel-files');
CREATE POLICY "Public Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'excel-files');
CREATE POLICY "Public Delete" ON storage.objects FOR DELETE USING (bucket_id = 'excel-files');
